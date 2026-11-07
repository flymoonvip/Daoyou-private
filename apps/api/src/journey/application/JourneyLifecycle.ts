import type { DbExecutor, DbTransaction } from '@server/lib/drizzle/db.js';
import { db, getExecutor } from '@server/lib/drizzle/db.js';
import { cultivators, externalJourneys } from '@server/lib/drizzle/schema.js';
import { eq } from 'drizzle-orm';
import {
  AchievementHooks,
  countUnlockedAchievements,
  listRecentAchievementTitles,
  unlockAchievements,
} from '@server/achievements/application/AchievementService.js';
import { enqueueExternalCallback } from './ExternalCallbackOutbox.js';
import {
  findExternalJourneyByCultivatorId,
  markExternalJourneyDead,
  markExternalJourneyEntered,
  type ExternalJourneyRow,
} from './ExternalJourneyRepository.js';

/**
 * 外部降世角色的生命周期钩子（只对通过 journey 建号的角色生效，普通自建角色不上报）。
 *
 *   - 死亡：四条死亡路径（闭关寿元结算 / 资源结算 / 世界衰老 cron / 主动轮回）都在各自事务内
 *     调用 markJourneyCultivatorDead；账本置 dead、死亡回调入 outbox，与业务同提交。
 *   - 首次入世：SSO 兑换带 journey 登录时记录 enteredAt 并回调 entered。
 *   - 进度：境界变化时回调 progress 快照（主站每人每小时限次，只保留最新）。
 */

export interface JourneySnapshot {
  realm: string;
  realmStage: string;
  age: number;
  achievementCount: number;
  deeds: string[];
}

export async function buildJourneySnapshot(
  cultivatorId: string,
  q: DbExecutor | DbTransaction = getExecutor(),
): Promise<JourneySnapshot | undefined> {
  const [row] = await q
    .select({ realm: cultivators.realm, realmStage: cultivators.realm_stage, age: cultivators.age })
    .from(cultivators)
    .where(eq(cultivators.id, cultivatorId))
    .limit(1);
  if (!row) return undefined;
  const [achievementCount, deeds] = await Promise.all([
    countUnlockedAchievements(cultivatorId, q),
    listRecentAchievementTitles(cultivatorId, 8, q),
  ]);
  return { realm: row.realm, realmStage: row.realmStage, age: row.age, achievementCount, deeds };
}

function statusPayload(
  journey: ExternalJourneyRow,
  status: 'created' | 'entered' | 'progress' | 'dead',
  occurredAt: number,
  snapshot?: JourneySnapshot,
): Record<string, unknown> {
  return {
    externalUserId: journey.externalUserId,
    journeyId: journey.journeyId,
    cultivatorId: journey.cultivatorId,
    status,
    occurredAt,
    snapshot,
  };
}

/**
 * 角色死亡钩子：在把 cultivators.status 置为 dead 的同一事务内调用。
 *
 * 钩子体跑在 SAVEPOINT 里：成就/账本/outbox 任一失败只回滚钩子本身，绝不让核心死亡结算回滚；
 * 丢失的死亡回调由主站对账任务（journey-status）兜底释放。
 * @returns 是否命中外部降世账本
 */
export async function markJourneyCultivatorDead(
  cultivatorId: string,
  diedAt: Date,
  tx: DbTransaction,
): Promise<boolean> {
  try {
    return await tx.transaction(async (sp) => {
      const journey = await findExternalJourneyByCultivatorId(cultivatorId, sp);
      if (!journey) return false;
      if (journey.status !== 'dead') {
        await markExternalJourneyDead(cultivatorId, diedAt, sp);
      }
      await unlockAchievements(cultivatorId, ['death.first', 'journey.death.first'], sp);
      const snapshot = await buildJourneySnapshot(cultivatorId, sp);
      await enqueueExternalCallback(
        {
          kind: 'cultivator-status',
          externalUserId: journey.externalUserId,
          journeyId: journey.journeyId,
          cultivatorId,
          payload: statusPayload(journey, 'dead', diedAt.getTime(), snapshot),
          deduplicationKey: `${cultivatorId}:dead`,
        },
        sp,
      );
      return true;
    });
  } catch (error) {
    console.error('[journey] death hook failed; main site reconciles', { cultivatorId, error });
    return false;
  }
}

/** 首次通过 SSO 登录到转世角色 */
export async function markJourneyEntered(cultivatorId: string, at = new Date()): Promise<void> {
  const journey = await findExternalJourneyByCultivatorId(cultivatorId);
  if (!journey || journey.enteredAt) return;
  await db.transaction(async (tx) => {
    const first = await markExternalJourneyEntered(cultivatorId, at, tx);
    if (!first) return;
    await unlockAchievements(cultivatorId, ['journey.enter.first'], tx);
    const snapshot = await buildJourneySnapshot(cultivatorId, tx);
    await enqueueExternalCallback(
      {
        kind: 'cultivator-status',
        externalUserId: journey.externalUserId,
        journeyId: journey.journeyId,
        cultivatorId,
        payload: statusPayload(journey, 'entered', at.getTime(), snapshot),
        deduplicationKey: `${cultivatorId}:entered`,
      },
      tx,
    );
  });
}

/** 境界变化后的进度回调（同一境界阶段只上报一次）；失败只回滚自身，不影响成就投影 */
export async function emitJourneyProgress(
  cultivatorId: string,
  marker: string,
  tx: DbTransaction,
): Promise<void> {
  try {
    await tx.transaction(async (sp) => {
      const journey = await findExternalJourneyByCultivatorId(cultivatorId, sp);
      if (!journey || journey.status === 'dead') return;
      const snapshot = await buildJourneySnapshot(cultivatorId, sp);
      await enqueueExternalCallback(
        {
          kind: 'cultivator-status',
          externalUserId: journey.externalUserId,
          journeyId: journey.journeyId,
          cultivatorId,
          payload: statusPayload(journey, 'progress', Date.now(), snapshot),
          deduplicationKey: `${cultivatorId}:progress:${marker}`,
        },
        sp,
      );
    });
  } catch (error) {
    console.error('[journey] progress callback enqueue failed', { cultivatorId, marker, error });
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** 世界衰老结算后评估「入世三十日」：在世转世角色自立世起的存活天数 */
export async function markJourneySurvivalDays(nowMs: number): Promise<void> {
  const rows = await getExecutor()
    .select({ cultivatorId: externalJourneys.cultivatorId, createdAt: externalJourneys.createdAt })
    .from(externalJourneys)
    .where(eq(externalJourneys.status, 'active'));
  for (const row of rows) {
    const days = Math.floor((nowMs - row.createdAt.getTime()) / DAY_MS);
    if (days >= 30) {
      await AchievementHooks.recordMax(row.cultivatorId, 'journey.survive.days', days);
    }
  }
}

/** 供主站对账：按 journeyId 返回角色是否存在 / 生死 / 最新快照 */
export async function describeJourneyStatus(journey: ExternalJourneyRow | null): Promise<{
  exists: boolean;
  status?: 'active' | 'dead';
  cultivatorId?: string;
  snapshot?: JourneySnapshot;
  diedAt?: number;
  enteredAt?: number;
}> {
  if (!journey) return { exists: false };
  const [row] = await getExecutor()
    .select({ status: cultivators.status, diedAt: cultivators.diedAt })
    .from(cultivators)
    .where(eq(cultivators.id, journey.cultivatorId))
    .limit(1);
  if (!row) return { exists: false };
  const dead = row.status === 'dead' || journey.status === 'dead';
  const snapshot = await buildJourneySnapshot(journey.cultivatorId);
  return {
    exists: true,
    status: dead ? 'dead' : 'active',
    cultivatorId: journey.cultivatorId,
    snapshot,
    diedAt: (journey.diedAt ?? row.diedAt)?.getTime(),
    enteredAt: journey.enteredAt?.getTime(),
  };
}
