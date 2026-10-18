import type { RealmStage, RealmType } from '@daoyou/constants/realms';
import { getRealmStageLevel } from '@daoyou/game-domain/progression';


export const BASE_ATTRIBUTE_VALUE = 10;

export const ATTRIBUTE_KEY_COUNT = 6;

export const BASE_ATTRIBUTE_TOTAL =
  BASE_ATTRIBUTE_VALUE * ATTRIBUTE_KEY_COUNT;

export const NATURAL_ATTRIBUTE_GAIN_PER_LEVEL = 1;

export const FREE_ATTRIBUTE_POINTS_PER_LEVEL = 5;


export function getRealmStageAttributeBudget(
  realm: RealmType,
  stage: RealmStage,
): number {
  return (
    getRealmStageNaturalAttributeValue(realm, stage) * ATTRIBUTE_KEY_COUNT +
    getRealmStageUnallocatedAttributeBudget(realm, stage)
  );
}


export function getRealmStageNaturalAttributeValue(
  realm: RealmType,
  stage: RealmStage,
): number {
  return BASE_ATTRIBUTE_VALUE +
    getRealmStageLevel(realm, stage) * NATURAL_ATTRIBUTE_GAIN_PER_LEVEL;
}


export function getRealmStageUnallocatedAttributeBudget(
  realm: RealmType,
  stage: RealmStage,
): number {
  return getRealmStageLevel(realm, stage) * FREE_ATTRIBUTE_POINTS_PER_LEVEL;
}


export function getBreakthroughAttributeGrowthReward(
  from: { realm: RealmType; stage: RealmStage },
  to: { realm: RealmType; stage: RealmStage },
): { naturalPerAttribute: number; attributePointReward: number } {
  return {
    naturalPerAttribute:
      getRealmStageNaturalAttributeValue(to.realm, to.stage) -
      getRealmStageNaturalAttributeValue(from.realm, from.stage),
    attributePointReward:
      getRealmStageUnallocatedAttributeBudget(to.realm, to.stage) -
      getRealmStageUnallocatedAttributeBudget(from.realm, from.stage),
  };
}


/**
 * 境界压制：跨大境界的伤害压制系数。
 * 攻击方每高出一个大境界，伤害 ×2；每低出一个大境界，伤害 ×0.5。
 * 双向对称，等效战力约 4:1（伤害 2×、承伤 0.5×），使跨境界成为天堑：
 * 筑基打炼气大圆满、金丹打筑基大圆满均可一敌四，元婴以下于化神前皆为蝼蚁。
 * delta = 攻击方大境界序号 − 防守方大境界序号（炼气 0 … 化神 4）。
 * 同境界 delta 为 0，系数为 1，原有同境界平衡与节奏窗口不受影响。
 */
export function getRealmDamagePressureMultiplier(delta: number): number {
  return 2 ** delta;
}


export function getRealmEffectChanceMultiplier(delta: number): number {
  if (delta > 0) return 1 + Math.min(0.35, delta * 0.04);
  if (delta < 0) return Math.max(0.55, 1 - Math.abs(delta) * 0.05);
  return 1;
}
