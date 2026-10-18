import { describe, expect, it } from 'vitest';
import { REAL_MS_PER_GAME_YEAR } from './calendar.js';
import { advanceNaturalAging } from './aging.js';

describe('现实时间驱动的自然衰老', () => {
  it('不足一整年不增长且锚点不动', () => {
    const anchorMs = 1_000_000;
    const result = advanceNaturalAging({
      age: 20,
      anchorMs,
      nowMs: anchorMs + 60 * 60 * 1000,
    });
    expect(result).toEqual({ age: 20, anchorMs, yearsGained: 0 });
  });

  it('恰好 12 小时结算 1 年', () => {
    const anchorMs = 1_000_000;
    const result = advanceNaturalAging({
      age: 20,
      anchorMs,
      nowMs: anchorMs + REAL_MS_PER_GAME_YEAR,
    });
    expect(result.age).toBe(21);
    expect(result.yearsGained).toBe(1);
    expect(result.anchorMs).toBe(anchorMs + REAL_MS_PER_GAME_YEAR);
  });

  it('保留不足一年的余量，累计后不丢失', () => {
    const anchorMs = 0;
    const first = advanceNaturalAging({
      age: 20,
      anchorMs,
      nowMs: 25 * 60 * 60 * 1000, // 25 小时 → 2 年
    });
    expect(first.yearsGained).toBe(2);
    expect(first.age).toBe(22);
    expect(first.anchorMs).toBe(24 * 60 * 60 * 1000); // 余 1 小时

    const second = advanceNaturalAging({
      age: first.age,
      anchorMs: first.anchorMs,
      nowMs: 36 * 60 * 60 * 1000, // 距新锚点 12 小时 → 再 +1 年
    });
    expect(second.yearsGained).toBe(1);
    expect(second.age).toBe(23);
  });

  it('锚点不前进（now <= anchor）时不增长', () => {
    const anchorMs = 5_000_000;
    expect(
      advanceNaturalAging({ age: 30, anchorMs, nowMs: anchorMs }),
    ).toEqual({ age: 30, anchorMs, yearsGained: 0 });
    expect(
      advanceNaturalAging({ age: 30, anchorMs, nowMs: anchorMs - 1 }),
    ).toEqual({ age: 30, anchorMs, yearsGained: 0 });
  });
});
