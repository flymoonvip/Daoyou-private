import type { DbExecutor, DbTransaction } from '@server/lib/drizzle/db.js';
import { db, getExecutor } from '@server/lib/drizzle/db.js';
import { playerAchievements, playerCounters } from '@server/lib/drizzle/schema.js';
import { and, desc, eq, sql } from 'drizzle-orm';
import { findExternalJourneyByCultivatorId } from '@server/journey/application/ExternalJourneyRepository.js';
import { enqueueExternalCallback } from '@server/journey/application/ExternalCallbackOutbox.js';
import {
  ACHIEVEMENT_CATALOG,
  getAchievementDefinition,
  getAchievementsByCounter,
  type AchievementDefinition,
} from '../catalog.js';

/**
 * 成就引擎：服务端终态触发、一次解锁、计数与成就解耦。
 *
 *   - unlockAchievement：幂等插入完成账本；若角色来自「万界道友」转世（外部降世账本有记录），
 *     同一事务内把 achievement 回调入队（outbox），主站按奖励表发道缘。普通自建角色不上报。
 *   - incrementCounter / recordCounterMax：计数表 upsert 后评估同 key 下的所有阈值成就。
 *
 * 所有入口都接受可选事务；未传时各自开短事务，失败只记日志不影响玩法主流程。
 */

export interface AchievementUnlockResult {
  unlocked: boolean;
  definition?: AchievementDefinition;
}

async function reportToMainSite(cultivatorId: string, definition: AchievementDefinition, tx: DbTransaction | DbExecutor): Promise<void> {
  const journey = await findExternalJourneyByCultivatorId(cultivatorId, tx);
  if (!journey) return;
  await enqueueExternalCallback(
    {
      kind: 'achievement',
      externalUserId: journey.externalUserId,
      journeyId: journey.journeyId,
      cultivatorId,
      payload: {
        externalUserId: journey.externalUserId,
        journeyId: journey.journeyId,
        cultivatorId,
        achievementId: definition.id,
        occurredAt: Date.now(),
        evidence: { title: definition.title },
      },
      deduplicationKey: `${cultivatorId}:achievement:${definition.id}`,
    },
    tx,
  );
}

async function unlockWithin(cultivatorId: string, achievementId: string, tx: DbTransaction | DbExecutor): Promise<AchievementUnlockResult> {
  const definition = getAchievementDefinition(achievementId);
  if (!definition) {
    console.warn('[achievement] unknown achievement id', { cultivatorId, achievementId });
    return { unlocked: false };
  }
  const inserted = await tx
    .insert(playerAchievements)
    .values({ cultivatorId, achievementId })
    .onConflictDoNothing()
    .returning({ achievementId: playerAchievements.achievementId });
  if (inserted.length === 0) return { unlocked: false, definition };

  await reportToMainSite(cultivatorId, definition, tx);

  // 单世成就数（活动专属）：解锁任何成就都推进 journey.achievement.count
  if (definition.id !== 'journey.achievement.50') {
    const [row] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(playerAchievements)
      .where(eq(playerAchievements.cultivatorId, cultivatorId));
    await recordMaxWithin(cultivatorId, 'journey.achievement.count', Number(row?.count ?? 0), tx);
  }
  return { unlocked: true, definition };
}

/** 幂等解锁一个成就 */
export async function unlockAchievement(
  cultivatorId: string,
  achievementId: string,
  tx?: DbTransaction,
): Promise<AchievementUnlockResult> {
  if (tx) return unlockWithin(cultivatorId, achievementId, tx);
  return db.transaction((inner) => unlockWithin(cultivatorId, achievementId, inner));
}

/** 批量解锁（同一事务） */
export async function unlockAchievements(
  cultivatorId: string,
  achievementIds: string[],
  tx?: DbTransaction,
): Promise<string[]> {
  const run = async (inner: DbTransaction | DbExecutor) => {
    const unlocked: string[] = [];
    for (const id of achievementIds) {
      const result = await unlockWithin(cultivatorId, id, inner);
      if (result.unlocked) unlocked.push(id);
    }
    return unlocked;
  };
  if (tx) return run(tx);
  return db.transaction(run);
}

async function evaluateCounter(cultivatorId: string, counterKey: string, value: number, tx: DbTransaction | DbExecutor): Promise<string[]> {
  const unlocked: string[] = [];
  for (const def of getAchievementsByCounter(counterKey)) {
    if (!def.counter || value < def.counter.threshold) continue;
    const result = await unlockWithin(cultivatorId, def.id, tx);
    if (result.unlocked) unlocked.push(def.id);
  }
  return unlocked;
}

async function incrementWithin(cultivatorId: string, counterKey: string, delta: number, tx: DbTransaction | DbExecutor): Promise<number> {
  const [row] = await tx
    .insert(playerCounters)
    .values({ cultivatorId, counterKey, value: delta })
    .onConflictDoUpdate({
      target: [playerCounters.cultivatorId, playerCounters.counterKey],
      set: { value: sql`${playerCounters.value} + ${delta}`, updatedAt: new Date() },
    })
    .returning({ value: playerCounters.value });
  const value = Number(row?.value ?? delta);
  await evaluateCounter(cultivatorId, counterKey, value, tx);
  return value;
}

async function recordMaxWithin(cultivatorId: string, counterKey: string, value: number, tx: DbTransaction | DbExecutor): Promise<number> {
  const [row] = await tx
    .insert(playerCounters)
    .values({ cultivatorId, counterKey, value })
    .onConflictDoUpdate({
      target: [playerCounters.cultivatorId, playerCounters.counterKey],
      set: { value: sql`GREATEST(${playerCounters.value}, ${value})`, updatedAt: new Date() },
    })
    .returning({ value: playerCounters.value });
  const current = Number(row?.value ?? value);
  await evaluateCounter(cultivatorId, counterKey, current, tx);
  return current;
}

/** 累加计数并评估阈值成就；返回累加后的值 */
export async function incrementCounter(
  cultivatorId: string,
  counterKey: string,
  delta = 1,
  tx?: DbTransaction,
): Promise<number> {
  if (!Number.isFinite(delta) || delta <= 0) return 0;
  if (tx) return incrementWithin(cultivatorId, counterKey, Math.floor(delta), tx);
  return db.transaction((inner) => incrementWithin(cultivatorId, counterKey, Math.floor(delta), inner));
}

/** 记录「达到过的最大值」并评估阈值成就 */
export async function recordCounterMax(
  cultivatorId: string,
  counterKey: string,
  value: number,
  tx?: DbTransaction,
): Promise<number> {
  if (!Number.isFinite(value)) return 0;
  const normalized = Math.max(0, Math.floor(value));
  if (tx) return recordMaxWithin(cultivatorId, counterKey, normalized, tx);
  return db.transaction((inner) => recordMaxWithin(cultivatorId, counterKey, normalized, inner));
}

/** 连胜类：胜利 +1 并记录最大连胜；失败归零 */
export async function bumpStreak(
  cultivatorId: string,
  currentKey: string,
  bestKey: string,
  won: boolean,
  tx?: DbTransaction,
): Promise<void> {
  const run = async (inner: DbTransaction | DbExecutor) => {
    if (!won) {
      await inner
        .insert(playerCounters)
        .values({ cultivatorId, counterKey: currentKey, value: 0 })
        .onConflictDoUpdate({
          target: [playerCounters.cultivatorId, playerCounters.counterKey],
          set: { value: 0, updatedAt: new Date() },
        });
      return;
    }
    const [row] = await inner
      .insert(playerCounters)
      .values({ cultivatorId, counterKey: currentKey, value: 1 })
      .onConflictDoUpdate({
        target: [playerCounters.cultivatorId, playerCounters.counterKey],
        set: { value: sql`${playerCounters.value} + 1`, updatedAt: new Date() },
      })
      .returning({ value: playerCounters.value });
    await recordMaxWithin(cultivatorId, bestKey, Number(row?.value ?? 1), inner);
  };
  if (tx) return run(tx);
  return db.transaction(run);
}

export interface AchievementProgressSnapshot {
  unlocked: Array<{ achievementId: string; unlockedAt: number }>;
  counters: Record<string, number>;
}

export async function listAchievementProgress(
  cultivatorId: string,
  q: DbExecutor = getExecutor(),
): Promise<AchievementProgressSnapshot> {
  const [unlockedRows, counterRows] = await Promise.all([
    q
      .select({ achievementId: playerAchievements.achievementId, unlockedAt: playerAchievements.unlockedAt })
      .from(playerAchievements)
      .where(eq(playerAchievements.cultivatorId, cultivatorId))
      .orderBy(desc(playerAchievements.unlockedAt)),
    q
      .select({ counterKey: playerCounters.counterKey, value: playerCounters.value })
      .from(playerCounters)
      .where(eq(playerCounters.cultivatorId, cultivatorId)),
  ]);
  const counters: Record<string, number> = {};
  for (const row of counterRows) counters[row.counterKey] = Number(row.value);
  return {
    unlocked: unlockedRows.map((row) => ({ achievementId: row.achievementId, unlockedAt: row.unlockedAt.getTime() })),
    counters,
  };
}

/** 最近解锁的成就标题（世系谱「代表事迹」用） */
export async function listRecentAchievementTitles(
  cultivatorId: string,
  limit = 8,
  q: DbExecutor = getExecutor(),
): Promise<string[]> {
  const rows = await q
    .select({ achievementId: playerAchievements.achievementId })
    .from(playerAchievements)
    .where(eq(playerAchievements.cultivatorId, cultivatorId))
    .orderBy(desc(playerAchievements.unlockedAt))
    .limit(limit);
  return rows
    .map((row) => getAchievementDefinition(row.achievementId)?.title)
    .filter((title): title is string => Boolean(title));
}

export async function countUnlockedAchievements(cultivatorId: string, q: DbExecutor = getExecutor()): Promise<number> {
  const [row] = await q
    .select({ count: sql<number>`count(*)` })
    .from(playerAchievements)
    .where(eq(playerAchievements.cultivatorId, cultivatorId));
  return Number(row?.count ?? 0);
}

export async function hasAchievement(cultivatorId: string, achievementId: string, q: DbExecutor = getExecutor()): Promise<boolean> {
  const [row] = await q
    .select({ achievementId: playerAchievements.achievementId })
    .from(playerAchievements)
    .where(and(eq(playerAchievements.cultivatorId, cultivatorId), eq(playerAchievements.achievementId, achievementId)))
    .limit(1);
  return Boolean(row);
}

/** 目录导出（供主站成就墙） */
export function listAchievementDefinitions() {
  return ACHIEVEMENT_CATALOG.map((def) => ({
    achievementId: def.id,
    title: def.title,
    desc: def.desc,
    unlockText: def.unlockText,
    category: def.category,
    target: def.counter?.threshold ?? 1,
    counterKey: def.counter?.key,
  }));
}

/**
 * 玩法终态钩子：失败只记日志，绝不把成就系统的异常传回玩法主流程。
 * 调用方用 `void AchievementHooks.xxx(...)` 在提交后触发。
 */
export const AchievementHooks = {
  async unlock(cultivatorId: string, achievementId: string): Promise<void> {
    try {
      await unlockAchievement(cultivatorId, achievementId);
    } catch (error) {
      console.error('[achievement] unlock failed', { cultivatorId, achievementId, error });
    }
  },
  async increment(cultivatorId: string, counterKey: string, delta = 1): Promise<void> {
    try {
      await incrementCounter(cultivatorId, counterKey, delta);
    } catch (error) {
      console.error('[achievement] increment failed', { cultivatorId, counterKey, error });
    }
  },
  async recordMax(cultivatorId: string, counterKey: string, value: number): Promise<void> {
    try {
      await recordCounterMax(cultivatorId, counterKey, value);
    } catch (error) {
      console.error('[achievement] record max failed', { cultivatorId, counterKey, error });
    }
  },
  async streak(cultivatorId: string, currentKey: string, bestKey: string, won: boolean): Promise<void> {
    try {
      await bumpStreak(cultivatorId, currentKey, bestKey, won);
    } catch (error) {
      console.error('[achievement] streak failed', { cultivatorId, currentKey, error });
    }
  },
};
