import type { DbExecutor, DbTransaction } from '@server/lib/drizzle/db.js';
import { getExecutor } from '@server/lib/drizzle/db.js';
import { externalCallbacks } from '@server/lib/drizzle/schema.js';
import {
  deliverGenshinMarketCallback,
  isGenshinMarketCallbackConfigured,
  type GenshinMarketCallbackKind,
} from '@server/lib/genshinMarket/callbackClient.js';
import { and, asc, eq, isNull, lte, sql } from 'drizzle-orm';

/**
 * 道友 → 主站 HTTP 回调 outbox。
 *
 * 与业务事务同提交（死亡、成就、建号确认都在同一个 tx 内入队），
 * 中继按 next_attempt_at 指数退避投递：1m → 5m → 15m → 1h → 6h，最多 12 次；
 * 主站明确拒绝（4xx）时直接标记投递完成并记录原因，不再重试。
 */

const RELAY_INTERVAL_MS = 15_000;
const RELAY_BATCH_SIZE = 50;
const MAX_ATTEMPTS = 12;
const BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 6 * 60 * 60_000];

export type ExternalCallbackRow = typeof externalCallbacks.$inferSelect;

export async function enqueueExternalCallback(
  input: {
    kind: GenshinMarketCallbackKind;
    externalUserId: string;
    journeyId?: string | null;
    cultivatorId?: string | null;
    payload: Record<string, unknown>;
    deduplicationKey: string;
  },
  tx: DbTransaction | DbExecutor = getExecutor(),
): Promise<void> {
  await tx
    .insert(externalCallbacks)
    .values({
      kind: input.kind,
      externalUserId: input.externalUserId,
      journeyId: input.journeyId ?? null,
      cultivatorId: input.cultivatorId ?? null,
      payload: input.payload,
      deduplicationKey: input.deduplicationKey.slice(0, 160),
    })
    .onConflictDoNothing({ target: externalCallbacks.deduplicationKey });
}

export function listDueExternalCallbacks(
  limit: number,
  now = new Date(),
  q: DbExecutor = getExecutor(),
): Promise<ExternalCallbackRow[]> {
  return q
    .select()
    .from(externalCallbacks)
    .where(and(isNull(externalCallbacks.deliveredAt), lte(externalCallbacks.nextAttemptAt, now)))
    .orderBy(asc(externalCallbacks.nextAttemptAt))
    .limit(limit);
}

function backoffFor(attempts: number): number {
  return BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)];
}

/** 投递一条；返回是否已完成（成功或永久失败） */
export async function deliverExternalCallback(
  row: ExternalCallbackRow,
  q: DbExecutor = getExecutor(),
): Promise<boolean> {
  const result = await deliverGenshinMarketCallback(row.kind as GenshinMarketCallbackKind, row.payload);
  const attempts = row.attempts + 1;

  if (result.ok) {
    await q
      .update(externalCallbacks)
      .set({ deliveredAt: new Date(), attempts, lastError: null })
      .where(eq(externalCallbacks.id, row.id));
    return true;
  }

  const exhausted = attempts >= MAX_ATTEMPTS;
  if (!result.retryable || exhausted) {
    // 业务拒绝或重试耗尽：标记完成但保留 lastError 供排查；主站有对账任务兜底
    console.error('[external-callback] delivery abandoned', {
      id: row.id, kind: row.kind, journeyId: row.journeyId, attempts, error: result.error, retryable: result.retryable,
    });
    await q
      .update(externalCallbacks)
      .set({ deliveredAt: new Date(), attempts, lastError: `abandoned: ${result.error}`.slice(0, 2000) })
      .where(eq(externalCallbacks.id, row.id));
    return true;
  }

  await q
    .update(externalCallbacks)
    .set({
      attempts,
      nextAttemptAt: new Date(Date.now() + backoffFor(attempts)),
      lastError: result.error.slice(0, 2000),
    })
    .where(eq(externalCallbacks.id, row.id));
  return false;
}

/** 投递一批到期回调；返回成功投递条数 */
export async function relayExternalCallbacks(limit = RELAY_BATCH_SIZE): Promise<number> {
  if (!isGenshinMarketCallbackConfigured()) return 0;
  const rows = await listDueExternalCallbacks(limit);
  let delivered = 0;
  for (const row of rows) {
    try {
      if (await deliverExternalCallback(row)) delivered += 1;
    } catch (error) {
      console.error('[external-callback] relay error', { id: row.id, kind: row.kind, error });
    }
  }
  return delivered;
}

let relayTimer: ReturnType<typeof setInterval> | undefined;
let relayWork: Promise<void> | undefined;

function scheduleRelay(): void {
  if (relayWork) return;
  relayWork = relayExternalCallbacks()
    .then(() => undefined)
    .catch((error) => console.error('[external-callback] relay failed', error))
    .finally(() => {
      relayWork = undefined;
    });
}

export function startExternalCallbackRelay(): void {
  if (relayTimer) return;
  scheduleRelay();
  relayTimer = setInterval(scheduleRelay, RELAY_INTERVAL_MS);
  relayTimer.unref();
}

export async function stopExternalCallbackRelay(): Promise<void> {
  clearInterval(relayTimer);
  relayTimer = undefined;
  await relayWork;
}

/** 待投递积压数（健康检查 / 排障用） */
export async function countPendingExternalCallbacks(q: DbExecutor = getExecutor()): Promise<number> {
  const [row] = await q
    .select({ count: sql<number>`count(*)` })
    .from(externalCallbacks)
    .where(isNull(externalCallbacks.deliveredAt));
  return Number(row?.count ?? 0);
}
