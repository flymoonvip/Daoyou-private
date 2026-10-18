/**
 * 人界纪年法：把现实时间换算为游戏内历法。
 *
 * 换算率（与现实时间的联系）：
 *   现实 60 分钟 = 游戏 1 月
 *   现实 12 小时 = 游戏 1 年（即 12 月为一年）
 *   现实 2 分钟  = 游戏 1 日（即 30 日为 1 月）
 *
 * 纪年起点为「人界 0 年」的上线时刻，所有端共用本常量，保证纪年一致。
 */

/** 人界 0 年起点：2026-10-18 00:00 (UTC+8) = 2026-10-17T16:00:00Z */
export const GAME_CALENDAR_EPOCH_MS = Date.UTC(2026, 9, 17, 16, 0, 0, 0);

/** 现实毫秒 → 游戏月 */
export const REAL_MS_PER_GAME_MONTH = 60 * 60 * 1000;

/** 每月 30 日、每年 12 月 */
export const GAME_DAYS_PER_MONTH = 30;
export const GAME_MONTHS_PER_YEAR = 12;

/** 现实毫秒 → 游戏日（1 游戏月 / 30） */
export const REAL_MS_PER_GAME_DAY =
  REAL_MS_PER_GAME_MONTH / GAME_DAYS_PER_MONTH;

/** 现实毫秒 → 游戏年（1 游戏月 × 12） */
export const REAL_MS_PER_GAME_YEAR =
  REAL_MS_PER_GAME_MONTH * GAME_MONTHS_PER_YEAR;

export interface GameCalendarDate {
  /** 从 0 起纪年，人界 0 年为第一年 */
  year: number;
  /** 1 ~ 12 */
  month: number;
  /** 1 ~ 30 */
  day: number;
}

function toMs(now: number | Date): number {
  return typeof now === 'number' ? now : now.getTime();
}

/**
 * 以人界 0 年为起点，换算指定现实时刻对应的游戏历法。
 * 早于起点的时刻一律按起点（0 年 1 月 1 日）处理。
 */
export function getGameCalendar(now: number | Date): GameCalendarDate {
  const elapsedMs = Math.max(0, toMs(now) - GAME_CALENDAR_EPOCH_MS);
  const totalMonths = Math.floor(elapsedMs / REAL_MS_PER_GAME_MONTH);
  const totalDays = Math.floor(elapsedMs / REAL_MS_PER_GAME_DAY);

  return {
    year: Math.floor(totalMonths / GAME_MONTHS_PER_YEAR),
    month: (totalMonths % GAME_MONTHS_PER_YEAR) + 1,
    day: (totalDays % GAME_DAYS_PER_MONTH) + 1,
  };
}

/** 格式化为「人界X年X月X日」展示文案。 */
export function formatHumanRealmDate(now: number | Date): string {
  const { year, month, day } = getGameCalendar(now);
  return `人界${year}年${month}月${day}日`;
}
