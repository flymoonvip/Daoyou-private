import type { Attrs } from '@daoyou/combat-core/types';
import type { RealmType } from '@daoyou/constants/realms';

// Hunt-specific, frozen realm curve. Never scale stats from the actual party's gear.
// 讨伐难度平摊在筑基～化神：金丹中期（level 50）为调参锚点，向下按等级线性回落，
// 使筑基明显弱于金丹，化神仅比元婴强一档。
const HP_BASE = { boss: 6000, elite: 3500, normal: 1400 } as const;
const HP_PER_LEVEL = { boss: 150, elite: 55, normal: 20 } as const;

// 敌人炼体档位与参考构筑在每个境界的冻结炼体保持一致，避免低境界凭空获得高境界炼体。
const TRAINING_BY_REALM: Record<RealmType, number> = {
  炼气: 0,
  筑基: 0,
  金丹: 15,
  元婴: 20,
  化神: 30,
};

export function huntEnemyAttrs(
  realm: RealmType,
  level: number,
  role: 'boss' | 'elite' | 'normal',
  players: number,
): Attrs {
  const offset = level - 50;
  const hp = Math.round(
    (HP_BASE[role] + offset * HP_PER_LEVEL[role]) *
      (1 + (players - 2) * 0.4),
  );
  const output = 0.9 + (players - 2) * 0.12;
  // 低境界敌人同步压低输出，筑基明显弱于金丹，避免高境界技能/血线碾压低境界队伍。
  const realmScale = offset < 0 ? Math.max(0.55, 1 + offset * 0.015) : 1;
  const training = TRAINING_BY_REALM[realm];
  return {
    hp,
    maxHp: hp,
    mp: 99999,
    maxMp: 99999,
    physicalAtk: Math.round(
      (250 + level * (role === 'boss' ? 8.5 : role === 'elite' ? 7 : 5.5)) *
        output *
        realmScale,
    ),
    magicAtk: Math.round(
      (200 + level * (role === 'boss' ? 11 : role === 'elite' ? 10 : 8.5)) *
        output *
        realmScale,
    ),
    physicalDef: Math.round((80 + level * 3) * (role === 'normal' ? 0.7 : 1)),
    magicDef: Math.round((100 + level * 4) * (role === 'normal' ? 0.7 : 1)),
    speed: Math.round(level * (role === 'boss' ? 3.5 : 2.7)),
    hit: 100 + level * 2,
    dodge: level,
    healPower: 0,
    critRate: 0,
    spellCritRate: 0,
    physicalFuryRate: 0,
    sealHit: level,
    sealResist: level,
    attackCultivate: training,
    defenseCultivate: training,
    spellCultivate: training,
    resistSpellCultivate: training,
  };
}
