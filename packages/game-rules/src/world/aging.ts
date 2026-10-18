/**
 * 现实时间驱动的自然衰老。
 *
 * 每个角色记录一个「上次自然衰老结算锚点」：
 * 存储的 age 视为锚点时刻的年龄快照，实际年龄 = age + 自锚点以来流逝的整游戏年数。
 * 锚点按已消耗的整年前移（而非直接置为 now），以保留不足一年的零头，避免逐次丢失。
 */
import { REAL_MS_PER_GAME_YEAR } from './calendar.js';

export interface NaturalAgingInput {
  /** 锚点时刻的年龄快照 */
  age: number;
  /** 上次自然衰老结算的现实时刻（毫秒） */
  anchorMs: number;
  /** 当前现实时刻（毫秒） */
  nowMs: number;
}

export interface NaturalAgingResult {
  /** 推进后的年龄 */
  age: number;
  /** 推进后的锚点（保留了不足一年的余量） */
  anchorMs: number;
  /** 本次推进消耗的整游戏年数 */
  yearsGained: number;
}

export function advanceNaturalAging({
  age,
  anchorMs,
  nowMs,
}: NaturalAgingInput): NaturalAgingResult {
  if (!Number.isFinite(anchorMs) || nowMs <= anchorMs) {
    return { age, anchorMs, yearsGained: 0 };
  }

  const yearsGained = Math.floor((nowMs - anchorMs) / REAL_MS_PER_GAME_YEAR);
  if (yearsGained <= 0) {
    return { age, anchorMs, yearsGained: 0 };
  }

  return {
    age: age + yearsGained,
    anchorMs: anchorMs + yearsGained * REAL_MS_PER_GAME_YEAR,
    yearsGained,
  };
}
