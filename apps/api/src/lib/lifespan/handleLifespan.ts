import { cultivators } from '@server/lib/drizzle/schema.js';
import type { DbTransaction } from '@server/lib/drizzle/db.js';
import { invalidateActiveCultivatorRef } from '@server/lib/auth/activeCultivator.js';
import { findActiveCultivatorOwnerId } from '@server/lib/repositories/cultivatorRepository.js';
import { updateCultivator } from '@server/cultivator/application/readers/CultivatorStateRepository.js';
import type { BreakthroughModifiers } from '@daoyou/game-domain/cultivation';
import type {
  LifespanExhaustedStoryPayload,
  RetreatStoryCultivator,
} from '@server/utils/prompts.js';
import type { RealmStage, RealmType } from '@daoyou/constants/realms';
import {
  getLevelRealmStage,
  getRealmStageRank,
} from '@daoyou/game-domain/progression';
import type {
  CultivatorCondition,
  ConditionStatusInstance,
  ConditionStatusKey,
} from '@daoyou/game-domain/condition';
import {
  consumeBagConsumable,
  findBagTalisman,
} from '@server/inventory/application/BagConsumables.js';
import { and, eq } from 'drizzle-orm';

export interface ConsumeLifespanResult {
  depleted: boolean;
  storyPayload?: LifespanExhaustedStoryPayload;
  afterCommit?: () => Promise<void>;
}

/**
 * 消耗寿元并集中处理寿元耗尽的副作用：
 * - 若寿元耗尽（age + years >= lifespan），则设置角色 status 为 'dead'
 * - 返回是否耗尽，以及用于后续流式生成故事的上下文
 */
export async function consumeLifespanAndHandleDepletion(
  cultivatorId: string,
  years: number,
  options: {
    tx: DbTransaction;
    /** 调用方已完成年龄结算时传入，避免在死亡判定中重复累加 years。 */
    ageAfterConsumption?: number;
    storyCultivator: RetreatStoryCultivator;
  },
): Promise<ConsumeLifespanResult> {
  if (years <= 0) {
    return { depleted: false };
  }

  const [cultivator] = await options.tx
    .select({
      age: cultivators.age,
      lifespan: cultivators.lifespan,
      realm: cultivators.realm,
      realmStage: cultivators.realm_stage,
    })
    .from(cultivators)
    .where(eq(cultivators.id, cultivatorId))
    .limit(1);
  if (!cultivator) {
    return { depleted: false };
  }

  const newAge = options.ageAfterConsumption ?? (cultivator.age || 0) + years;

  // 只在寿元耗尽时做自动更新与故事上下文准备；否则不在此处重复写入年龄（调用方已负责写入）
  if (newAge >= (cultivator.lifespan || 0)) {
    // 更新角色为已死，确保 age 被同步为新的年龄
    let afterCommit: (() => Promise<void>) | undefined;
    try {
      const ownerId = await findActiveCultivatorOwnerId(
        cultivatorId,
        options.tx,
      );
      await updateCultivator(
        cultivatorId,
        {
          age: newAge,
          status: 'dead',
        },
        options.tx,
      );
      if (ownerId) {
        afterCommit = () => invalidateActiveCultivatorRef(ownerId);
      }
    } catch (err) {
      console.error('更新角色为死时失败：', err);
    }

    const storyCultivator = {
      ...options.storyCultivator,
      age: newAge,
      status: 'dead' as const,
    };

    return {
      depleted: true,
      storyPayload: {
        // todo 修复
        cultivator: storyCultivator,
        summary: {
          success: false,
          isMajor: false,
          yearsSpent: years,
          chance: 0,
          roll: 0,
          fromRealm: cultivator.realm as RealmType,
          fromStage: cultivator.realmStage as RealmStage,
          lifespanGained: 0,
          attributeGrowth: {},
          attributePointReward: 0,
          lifespanDepleted: true,
          modifiers: {} as BreakthroughModifiers,
        },
      },
      afterCommit,
    };
  }

  return { depleted: false };
}

/**
 * 战斗死亡：PvE 战斗结算后角色气血归零，直接判定身死。
 * 复用寿元耗尽的死亡状态——角色仍留在名册中，只能转世重修。
 * 返回缓存失效回调，调用方应在数据库事务提交后执行。
 */
export async function markBattleDeath(
  cultivatorId: string,
  tx: DbTransaction,
  now: Date = new Date(),
): Promise<(() => Promise<void>) | undefined> {
  const ownerId = await findActiveCultivatorOwnerId(cultivatorId, tx);
  await tx
    .update(cultivators)
    .set({ status: 'dead', diedAt: now })
    .where(
      and(eq(cultivators.id, cultivatorId), eq(cultivators.status, 'active')),
    );
  return ownerId ? () => invalidateActiveCultivatorRef(ownerId) : undefined;
}

/** 战斗气血归零后的结局：重伤撤退 / 濒死 / 直接死亡。 */
export type BattleFatalOutcome = 'major_wound' | 'near_death' | 'dead';

export interface ResolveBattleDeathResult {
  /** 更新后的 condition：非死亡结局会附带伤势状态并将气血置为 1。 */
  condition: CultivatorCondition;
  /** 仅在结局为死亡时返回缓存失效回调，事务提交后执行。 */
  invalidateDeath?: () => Promise<void>;
  outcome: BattleFatalOutcome;
  /** 是否消耗了保命符箓将死亡降格为濒死。 */
  lifeSaveConsumed: boolean;
}

const DEATH_SAVE_TALISMAN_SCENARIO = 'death_save';

/**
 * 战斗气血归零时结算结局，不再直接判死。
 *
 * 概率规则：
 * - 同阶：重伤撤退 33% / 濒死 33% / 死亡 33%。
 * - 非同阶：每差 1 阶，死亡概率 +30%（上限 100%），其余两种结局平分剩余概率。
 * - 若判死且背包中有「保命符」（death_save 符箓），自动消耗一枚，将结局降格为濒死。
 *
 * 非死亡结局会在 condition 上叠加对应伤势（major_wound / near_death），
 * 并把气血拉回 1 点，角色保留 active 状态。
 */
export async function resolveBattleDeath(
  cultivatorId: string,
  tx: DbTransaction,
  args: {
    playerRealm: RealmType;
    playerRealmStage: RealmStage;
    /** 敌方主单位的等级，用于换算敌方境界阶位。 */
    enemyLevel: number;
    /** 已应用战斗资源（hp=0）后的 condition。 */
    condition: CultivatorCondition;
    now?: Date;
  },
): Promise<ResolveBattleDeathResult> {
  const now = args.now ?? new Date();
  const playerRank = getRealmStageRank(
    args.playerRealm,
    args.playerRealmStage,
  );
  const enemy = getLevelRealmStage(args.enemyLevel);
  const enemyRank = getRealmStageRank(enemy.realm, enemy.stage);
  const tierDiff = Math.abs(playerRank - enemyRank);

  const baseDeath = 1 / 3;
  const deathProb = Math.min(1, baseDeath + 0.3 * tierDiff);
  const remaining = 1 - deathProb;
  const majorWoundProb = remaining / 2;
  // nearDeathProb = remaining / 2（兜底用）

  const roll = Math.random();
  let outcome: BattleFatalOutcome;
  if (roll < deathProb) outcome = 'dead';
  else if (roll < deathProb + majorWoundProb) outcome = 'major_wound';
  else outcome = 'near_death';

  let lifeSaveConsumed = false;
  if (outcome === 'dead') {
    // 背包中若有保命符，自动消耗一枚，将死亡降格为濒死。
    const [talisman] = await findBagTalisman(
      cultivatorId,
      DEATH_SAVE_TALISMAN_SCENARIO,
      tx,
    );
    if (talisman) {
      await consumeBagConsumable(cultivatorId, talisman.id, 1, tx, {
        requireIdle: false,
      });
      outcome = 'near_death';
      lifeSaveConsumed = true;
    }
  }

  let condition = args.condition;
  let invalidateDeath: (() => Promise<void>) | undefined;

  if (outcome === 'dead') {
    invalidateDeath = await markBattleDeath(cultivatorId, tx, now);
  } else {
    const statusKey: ConditionStatusKey =
      outcome === 'major_wound' ? 'major_wound' : 'near_death';
    condition = addOrReplaceStatus(condition, statusKey, now);
    // 重伤/濒死者留 1 点气血，保留 active 状态。
    condition = {
      ...condition,
      resources: {
        ...condition.resources,
        hp: { ...condition.resources.hp, current: 1 },
      },
    };
  }

  return { condition, invalidateDeath, outcome, lifeSaveConsumed };
}

function addOrReplaceStatus(
  condition: CultivatorCondition,
  key: ConditionStatusKey,
  now: Date,
): CultivatorCondition {
  const existing = condition.statuses.find((s) => s.key === key);
  const next: ConditionStatusInstance = {
    key,
    stacks: Math.max(1, (existing?.stacks ?? 0) + 1),
    source: 'battle',
    duration: existing?.duration ?? { kind: 'until_removed' },
    usesRemaining: existing?.usesRemaining,
    payload: existing?.payload,
    createdAt: existing?.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const statuses = [
    ...condition.statuses.filter((s) => s.key !== key),
    next,
  ];
  return { ...condition, statuses };
}
