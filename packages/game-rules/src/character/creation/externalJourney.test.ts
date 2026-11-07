import { describe, expect, it } from 'vitest';
import {
  buildExternalJourneyCultivator,
  clampExternalStarterTier,
  createSeededRng,
  mapExternalElement,
  mapExternalGender,
  resolveExternalAptitude,
  resolveExternalStarterPack,
} from './externalJourney.js';

describe('外部降世建号规则', () => {
  it('档位越界按 1 处理，tier 5 为资源上限', () => {
    expect(clampExternalStarterTier(0)).toBe(1);
    expect(clampExternalStarterTier(6)).toBe(1);
    expect(clampExternalStarterTier(2.5)).toBe(1);
    expect(clampExternalStarterTier(3)).toBe(3);
    expect(resolveExternalStarterPack(5).spiritStones).toBe(25000);
    expect(resolveExternalStarterPack(99).spiritStones).toBe(500);
  });

  it('平均战力映射为有上限的资质档', () => {
    expect(resolveExternalAptitude(0).grade).toBe('凡骨');
    expect(resolveExternalAptitude(19_999).grade).toBe('凡骨');
    expect(resolveExternalAptitude(20_000).grade).toBe('良才');
    expect(resolveExternalAptitude(48_210).grade).toBe('上品');
    expect(resolveExternalAptitude(70_000).grade).toBe('天骄');
    expect(resolveExternalAptitude(10_000_000).grade).toBe('绝世');
    expect(resolveExternalAptitude(Number.NaN).grade).toBe('凡骨');
  });

  it('性别与元素按主站口径映射', () => {
    const rng = createSeededRng('x');
    expect(mapExternalGender('male', rng)).toBe('男');
    expect(mapExternalGender('female', rng)).toBe('女');
    expect(['男', '女']).toContain(mapExternalGender('unknown', rng));
    expect(mapExternalElement('electro')).toBe('雷');
    expect(mapExternalElement('cryo')).toBe('冰');
    expect(mapExternalElement('geo')).toBe('土');
    expect(mapExternalElement('火')).toBe('火');
    expect(mapExternalElement('quantum')).toBeUndefined();
  });

  it('同一 journeyId 重复构造结果一致；不同 journeyId 随机量不同', () => {
    const input = {
      journeyId: 'ckxxxx', characterName: '刻晴·第3世', gender: 'female', element: 'electro',
      combatPower: 48210, starterTier: 4,
    };
    const a = buildExternalJourneyCultivator(input);
    const b = buildExternalJourneyCultivator(input);
    expect(a.cultivator).toEqual(b.cultivator);
    expect(a.cultivator.name).toBe('刻晴·第3世');
    expect(a.cultivator.gender).toBe('女');
    expect(a.cultivator.realm).toBe('炼气');
    expect(a.cultivator.realm_stage).toBe('初期');
    expect(a.cultivator.age).toBeGreaterThanOrEqual(14);
    expect(a.cultivator.age).toBeLessThanOrEqual(17);
    expect(a.cultivator.lifespan).toBeGreaterThanOrEqual(80);
    expect(a.cultivator.lifespan).toBeLessThanOrEqual(99);
    expect(a.cultivator.spiritual_roots.map((r) => r.element)).toEqual(['雷']);
    expect(a.aptitude).toBe('上品');
    expect(a.starterPack.tier).toBe(4);
    expect(a.cultivator.status).toBe('active');

    const other = buildExternalJourneyCultivator({ ...input, journeyId: 'ckyyyy' });
    const differs = other.cultivator.age !== a.cultivator.age
      || other.cultivator.lifespan !== a.cultivator.lifespan
      || other.cultivator.spiritual_roots[0].strength !== a.cultivator.spiritual_roots[0].strength;
    expect(differs).toBe(true);
  });

  it('高资质寿元加成、空名兜底', () => {
    const top = buildExternalJourneyCultivator({
      journeyId: 'z', characterName: '   ', combatPower: 120000, starterTier: 5,
    });
    expect(top.cultivator.lifespan).toBeGreaterThanOrEqual(100);
    expect(top.cultivator.name).toBe('无名道友');
    expect(top.cultivator.spiritual_roots.length).toBeGreaterThan(0);
  });
});
