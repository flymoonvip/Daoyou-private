import { REALM_VALUES, getRealmStages } from '@daoyou/constants/realms';
import { describe, expect, it } from 'vitest';
import { getRealmStageRank, getRealmStageLevel, getLevelRealmStage, getRealmEntryLevel, getRealmLastLevel } from '@daoyou/game-domain/progression';
import { getBreakthroughAttributeGrowthReward, getRealmDamagePressureMultiplier, getRealmEffectChanceMultiplier, getRealmStageAttributeBudget, getRealmStageNaturalAttributeValue, getRealmStageUnallocatedAttributeBudget } from './attributes.js';

describe('realmProgression', () => {
  it('calculates fixed attribute budgets by realm and stage', () => {
    expect(getRealmStageAttributeBudget('炼气', '一层')).toBe(115);
    expect(getRealmStageAttributeBudget('筑基', '初期')).toBe(335);
    expect(getRealmStageAttributeBudget('金丹', '初期')).toBe(555);
    expect(getRealmStageAttributeBudget('化神', '初期')).toBe(995);
    expect(getRealmStageAttributeBudget('化神', '圆满')).toBe(1160);
  });

  it('splits attribute budget into natural values and allocatable points', () => {
    expect(getRealmStageNaturalAttributeValue('炼气', '一层')).toBe(15);
    expect(getRealmStageUnallocatedAttributeBudget('炼气', '一层')).toBe(25);

    expect(getRealmStageNaturalAttributeValue('筑基', '初期')).toBe(35);
    expect(getRealmStageUnallocatedAttributeBudget('筑基', '初期')).toBe(125);

    expect(getRealmStageNaturalAttributeValue('化神', '圆满')).toBe(110);
    expect(getRealmStageUnallocatedAttributeBudget('化神', '圆满')).toBe(500);
  });

  it('calculates realm stage rank and breakthrough rewards', () => {
    expect(getRealmStageRank('炼气', '一层')).toBe(0);
    expect(getRealmStageRank('炼气', '十三层')).toBe(12);
    expect(getRealmStageRank('筑基', '初期')).toBe(13);
    expect(getBreakthroughAttributeGrowthReward(
      { realm: '炼气', stage: '一层' },
      { realm: '炼气', stage: '五层' },
    )).toEqual({ naturalPerAttribute: 5, attributePointReward: 25 });
    expect(getBreakthroughAttributeGrowthReward(
      { realm: '炼气', stage: '十三层' },
      { realm: '筑基', stage: '初期' },
    )).toEqual({ naturalPerAttribute: 5, attributePointReward: 25 });
  });

  it('总属性数值守恒：旧二十阶段拆分为炼气十三层后仍收敛到 110 / 500', () => {
    const stages = REALM_VALUES.flatMap((realm) =>
      getRealmStages(realm).map((stage) => ({ realm, stage })),
    );
    const first = stages[0];
    let natural = getRealmStageNaturalAttributeValue(first.realm, first.stage);
    let free = getRealmStageUnallocatedAttributeBudget(first.realm, first.stage);
    stages.slice(1).forEach((current, index) => {
      const reward = getBreakthroughAttributeGrowthReward(stages[index], current);
      natural += reward.naturalPerAttribute;
      free += reward.attributePointReward;
    });
    expect({ natural, free }).toEqual({ natural: 110, free: 500 });
    expect(getRealmEntryLevel('炼气')).toBe(5);
    expect(getRealmLastLevel('化神')).toBe(100);
  });

  it('applies realm damage pressure with caps', () => {
    expect(getRealmDamagePressureMultiplier(0)).toBe(1);
    expect(getRealmDamagePressureMultiplier(1)).toBe(1.08);
    expect(getRealmDamagePressureMultiplier(-1)).toBe(0.94);
    expect(getRealmDamagePressureMultiplier(4)).toBe(1.4);
    expect(getRealmDamagePressureMultiplier(-4)).toBe(0.68);
    expect(getRealmDamagePressureMultiplier(12)).toBe(2.15);
    expect(getRealmDamagePressureMultiplier(20)).toBe(2.2);
    expect(getRealmDamagePressureMultiplier(-12)).toBe(0.26);
    expect(getRealmDamagePressureMultiplier(-20)).toBe(0.25);
  });

  it('applies realm effect chance pressure with caps', () => {
    expect(getRealmEffectChanceMultiplier(0)).toBe(1);
    expect(getRealmEffectChanceMultiplier(4)).toBe(1.16);
    expect(getRealmEffectChanceMultiplier(20)).toBe(1.35);
    expect(getRealmEffectChanceMultiplier(-4)).toBe(0.8);
    expect(getRealmEffectChanceMultiplier(-20)).toBe(0.55);
  });
});

describe('等级境界展示', () => {
  it('全部人物小境界可往返映射', () => {
    for (const realm of REALM_VALUES) {
      for (const stage of getRealmStages(realm)) {
        expect(getLevelRealmStage(getRealmStageLevel(realm, stage))).toEqual({
          realm,
          stage,
          label: `${realm}${stage}`,
        });
      }
    }
  });

  it.each([
    [0, '炼气一层'],
    [5, '炼气一层'],
    [6, '炼气二层'],
    [10, '炼气五层'],
    [20, '炼气十三层'],
    [21, '筑基初期'],
    [50, '金丹中期'],
    [90, '化神中期'],
    [130, '化神圆满'],
    [180, '化神圆满'],
  ])('将 %s 映射为 %s，并向上取到可满足门槛的境界', (level, label) => {
    expect(getLevelRealmStage(level).label).toBe(label);
  });
});
