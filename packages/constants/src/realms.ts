// 境界
// 当前内容封顶到「化神」，化神以上的大境界暂不开放（保留在此处备查）。
export const REALM_VALUES = [
  '炼气',
  '筑基',
  '金丹',
  '元婴',
  '化神',
  // '炼虚',
  // '合体',
  // '大乘',
  // '渡劫',
] as const;

export type RealmType = (typeof REALM_VALUES)[number];


// 炼气细分十三层（一层~十三层），取代原「初期/中期/后期/圆满」四阶段。
export const QI_LAYER_VALUES = [
  '一层',
  '二层',
  '三层',
  '四层',
  '五层',
  '六层',
  '七层',
  '八层',
  '九层',
  '十层',
  '十一层',
  '十二层',
  '十三层',
] as const;

export type QiLayerStage = (typeof QI_LAYER_VALUES)[number];


// 筑基及以上大境界仍沿用四阶段。
export const REALM_STAGE_VALUES = ['初期', '中期', '后期', '圆满'] as const;

export type BaseRealmStage = (typeof REALM_STAGE_VALUES)[number];

// realm_stage 字段可容纳的全部取值：炼气十三层 + 其余大境界四阶段。
export type RealmStage = QiLayerStage | BaseRealmStage;


/** 各境界的阶段序列。炼气为十三层，其余大境界为四阶段。 */
export const REALM_STAGES: Record<RealmType, readonly RealmStage[]> = {
  炼气: QI_LAYER_VALUES,
  筑基: REALM_STAGE_VALUES,
  金丹: REALM_STAGE_VALUES,
  元婴: REALM_STAGE_VALUES,
  化神: REALM_STAGE_VALUES,
};

/** 全部合法阶段取值，供 zod 枚举校验使用。 */
export const ALL_REALM_STAGE_VALUES = [
  ...REALM_STAGE_VALUES,
  ...QI_LAYER_VALUES,
] as const;

export function getRealmStages(realm: RealmType): readonly RealmStage[] {
  return REALM_STAGES[realm];
}

export function getRealmStageCount(realm: RealmType): number {
  return REALM_STAGES[realm].length;
}

export function isQiLayerStage(stage: RealmStage): stage is QiLayerStage {
  return (QI_LAYER_VALUES as readonly string[]).includes(stage);
}


// 境界等级映射（用于缩放计算）
export const REALM_ORDER: Record<RealmType, number> = {
  炼气: 0,
  筑基: 1,
  金丹: 2,
  元婴: 3,
  化神: 4,
  // 炼虚: 5,
  // 合体: 6,
  // 大乘: 7,
  // 渡劫: 8,
};
