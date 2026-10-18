import {
  REALM_STAGE_VALUES,
  REALM_STAGES,
  REALM_VALUES,
  type RealmStage,
  type RealmType,
} from '@daoyou/constants/realms';

export const LEVELS_PER_REALM_STAGE = 5;

/** 非炼气大境界每境 4 个阶段，固定占用 20 级，保证跨境界等级端点不变。 */
export const LEVELS_PER_REALM = REALM_STAGE_VALUES.length * LEVELS_PER_REALM_STAGE;

/**
 * 炼气十三层对应的人物等级。
 *
 * 保持与旧四阶段体系端点一致：一层 = 旧初期（5 级）、十三层 = 旧圆满（20 级），
 * 每个旧阶段区间再细分为 4 层，层间增量非均匀（1/1/1/2），体现非线性成长。
 * 由此旧阶段边界仍落在 一层/五层/九层/十三层 = 5/10/15/20 级。
 */
export const QI_LAYER_LEVELS: readonly number[] = [
  5, 6, 7, 8, 10, 11, 12, 13, 15, 16, 17, 18, 20,
];


/** 阶段在该境界内的序号（0 起）。非法阶段按 0 处理。 */
export function getRealmStageIndex(realm: RealmType, stage: RealmStage): number {
  const stageIndex = REALM_STAGES[realm].indexOf(stage as RealmStage);
  return Math.max(0, stageIndex);
}

/** 阶段在该境界内的相对位置（0~1），用于跨境界阶段对齐。 */
export function getRealmStageRatio(realm: RealmType, stage: RealmStage): number {
  const stages = REALM_STAGES[realm];
  const index = getRealmStageIndex(realm, stage);
  return stages.length <= 1 ? 0 : index / (stages.length - 1);
}

/** 按序号取某境界的阶段，越界自动夹取到首/末阶段。 */
export function getRealmStageByIndex(realm: RealmType, index: number): RealmStage {
  const stages = REALM_STAGES[realm];
  const clamped = Math.min(stages.length - 1, Math.max(0, index));
  return stages[clamped] as RealmStage;
}

export function getRealmEntryStage(realm: RealmType): RealmStage {
  return REALM_STAGES[realm][0] as RealmStage;
}

export function getRealmLastStage(realm: RealmType): RealmStage {
  const stages = REALM_STAGES[realm];
  return stages[stages.length - 1] as RealmStage;
}

/** 境界中段的阶段（用于以「中期」为基准的战斗/收益缩放）。 */
export function getRealmMidStage(realm: RealmType): RealmStage {
  const stages = REALM_STAGES[realm];
  return getRealmStageByIndex(realm, Math.floor((stages.length - 1) / 2));
}


export function getRealmStageLevel(realm: RealmType, stage: RealmStage): number {
  if (realm === '炼气') {
    return QI_LAYER_LEVELS[getRealmStageIndex(realm, stage)] ?? LEVELS_PER_REALM_STAGE;
  }
  return (REALM_VALUES.indexOf(realm) * LEVELS_PER_REALM) +
    (getRealmStageIndex(realm, stage) + 1) * LEVELS_PER_REALM_STAGE;
}

export function getRealmEntryLevel(realm: RealmType): number {
  return getRealmStageLevel(realm, getRealmEntryStage(realm));
}

export function getRealmLastLevel(realm: RealmType): number {
  return getRealmStageLevel(realm, getRealmLastStage(realm));
}

export function getRealmMidLevel(realm: RealmType): number {
  return getRealmStageLevel(realm, getRealmMidStage(realm));
}


/** 展示数值门槛所需的最低人物境界，与正向映射保持一致（未达则向上取，超过上限则取满境）。 */
export function getLevelRealmStage(level: number) {
  const entries = REALM_VALUES.flatMap((realm) =>
    REALM_STAGES[realm].map((stage) => ({
      realm,
      stage,
      level: getRealmStageLevel(realm, stage),
    })),
  );
  const found =
    entries.find((entry) => level <= entry.level) ??
    entries[entries.length - 1]!;
  return {
    realm: found.realm,
    stage: found.stage,
    label: `${found.realm}${found.stage}`,
  };
}


/** 跨境界累计阶段序号，仅用于相对比较（越靠后数值越大）。 */
export function getRealmStageRank(
  realm: RealmType,
  stage: RealmStage,
): number {
  const realmIndex = Math.max(0, REALM_VALUES.indexOf(realm));
  let rank = 0;
  for (let i = 0; i < realmIndex; i += 1) {
    rank += REALM_STAGES[REALM_VALUES[i]].length;
  }
  return rank + getRealmStageIndex(realm, stage);
}
