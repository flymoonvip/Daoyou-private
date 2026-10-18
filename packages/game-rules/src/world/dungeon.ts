import { DUNGEON_DIFFICULTY_PRESETS, DUNGEON_ENEMY_DIFFICULTY_TABLE } from '@daoyou/game-content/world/dungeon';

import type { ResolvedDungeonMapConfig, MapNodeInfo } from '@daoyou/game-domain/world/map';

import type { DungeonDifficultyTier } from '@daoyou/game-domain/dungeon';

import type { BaseRealmStage, RealmStage } from '@daoyou/constants/realms';

import {
  QI_LAYER_VALUES,
  REALM_ORDER,
  isQiLayerStage,
  type RealmType,
} from '@daoyou/constants/realms';

const BASE_STAGE_ORDER: readonly BaseRealmStage[] = ['初期', '中期', '后期', '圆满'];

/**
 * 把任意阶段标签折算成大境界四等分档位。
 * 炼气十三层按其相对位置映射到同样的四档，保证秘境敌人档位选择不因炼气分层而错位。
 */
function stageQuartile(stage: RealmStage): number {
  if (isQiLayerStage(stage)) {
    const index = QI_LAYER_VALUES.indexOf(stage);
    return Math.min(
      BASE_STAGE_ORDER.length - 1,
      Math.floor((index * BASE_STAGE_ORDER.length) / QI_LAYER_VALUES.length),
    );
  }
  const index = BASE_STAGE_ORDER.indexOf(stage as BaseRealmStage);
  return index === -1 ? 0 : index;
}

export function resolveDungeonMapConfig(
  node: MapNodeInfo,
): ResolvedDungeonMapConfig {
  const configuredTier = node.dungeon_config?.difficulty;
  const difficultyTier =
    configuredTier && configuredTier in DUNGEON_DIFFICULTY_PRESETS
      ? configuredTier
      : 'normal';
  const preset = DUNGEON_DIFFICULTY_PRESETS[difficultyTier];

  return {
    realmRequirement: node.realm_requirement,
    difficultyTier,
    enemyDifficulty: resolveDungeonEnemyDifficulty(
      node.realm_requirement,
      difficultyTier,
    ),
    ...preset,
  };
}

export function resolveDungeonEnemyDifficulty(
  realm: RealmType,
  tier: DungeonDifficultyTier,
): number {
  return DUNGEON_ENEMY_DIFFICULTY_TABLE[realm]?.[tier] ?? 24;
}

export function canChallengeDungeonRealm(
  playerRealm: RealmType,
  dungeonRealm: RealmType,
): boolean {
  return REALM_ORDER[playerRealm] >= REALM_ORDER[dungeonRealm];
}

export function clampDungeonEnemyRealmStage(
  realmStage: RealmStage,
  config: ResolvedDungeonMapConfig,
): RealmStage {
  if (config.allowedEnemyRealmStages.includes(realmStage)) {
    return realmStage;
  }

  if (stageQuartile(realmStage) <= 1) {
    return config.allowedEnemyRealmStages[0] ?? '初期';
  }

  return (
    config.allowedEnemyRealmStages[config.allowedEnemyRealmStages.length - 1] ??
    '初期'
  );
}

export function getDungeonRewardBonus(
  tier: DungeonDifficultyTier | undefined,
): number {
  const difficultyTier =
    tier && tier in DUNGEON_DIFFICULTY_PRESETS ? tier : 'easy';
  return DUNGEON_DIFFICULTY_PRESETS[difficultyTier].rewardBonus;
}
