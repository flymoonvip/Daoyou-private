import { describe, expect, it } from 'vitest';
import { MaterialGenerator } from '../materials/generator.js';
import { QUALITY_VALUES } from '@daoyou/constants/qualities';
import { REALM_VALUES } from '@daoyou/constants/realms';
import { DUNGEON_MATERIAL_QUALITY_CHANCE_BY_REALM } from '@daoyou/game-content/rewards/dungeon';

describe('副本材料品质概率', () => {
  it('每个境界的概率之和为 1，低于品质下限的材料不会产出', () => {
    const minimumQualityIndex = [0, 0, 0, 1, 1, 2, 2, 3, 3];
    for (const [index, realm] of REALM_VALUES.entries()) {
      const chances = DUNGEON_MATERIAL_QUALITY_CHANCE_BY_REALM[realm];
      expect(
        Object.values(chances).reduce((sum, chance) => sum + chance, 0),
      ).toBeCloseTo(1);
      for (const quality of QUALITY_VALUES.slice(
        0,
        minimumQualityIndex[index],
      )) {
        expect(chances[quality]).toBe(0);
      }
    }
  });

  it('高境界的仙品及神品合计概率逐级上升', () => {
    const highQualityChances = REALM_VALUES.map((realm) => {
      const chances = DUNGEON_MATERIAL_QUALITY_CHANCE_BY_REALM[realm];
      return chances.仙品 + chances.神品;
    });
    [0, 0, 0, 0, 0.05].forEach((expected, index) => {
      expect(highQualityChances[index]).toBeCloseTo(expected);
    });
  });

  it('化神材料最低灵品，仙品率为 5%', () => {
    const chances = DUNGEON_MATERIAL_QUALITY_CHANCE_BY_REALM.化神;
    expect(chances).toMatchObject({
      凡品: 0,
      灵品: 0.05,
      玄品: 0.2,
      真品: 0.25,
      地品: 0.25,
      天品: 0.2,
      仙品: 0.05,
      神品: 0,
    });
    const rankAt = (roll: number) => {
      const values = [roll, 0.5, 0.5];
      return MaterialGenerator.generateRandomSkeletons(
        1,
        { qualityChanceMap: chances },
        () => values.shift() ?? 0.5,
      )[0].rank;
    };
    expect(rankAt(0)).toBe('灵品');
    expect(rankAt(0.1)).toBe('玄品');
    expect(rankAt(0.5)).toBe('地品');
    expect(rankAt(0.9)).toBe('天品');
  });
});
