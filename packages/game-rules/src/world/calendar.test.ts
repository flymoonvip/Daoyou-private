import { describe, expect, it } from 'vitest';
import {
  formatHumanRealmDate,
  GAME_CALENDAR_EPOCH_MS,
  getGameCalendar,
  REAL_MS_PER_GAME_DAY,
  REAL_MS_PER_GAME_MONTH,
  REAL_MS_PER_GAME_YEAR,
} from './calendar.js';

describe('人界纪年法换算', () => {
  it('起点当刻为 人界0年1月1日', () => {
    expect(getGameCalendar(GAME_CALENDAR_EPOCH_MS)).toEqual({
      year: 0,
      month: 1,
      day: 1,
    });
    expect(formatHumanRealmDate(GAME_CALENDAR_EPOCH_MS)).toBe(
      '人界0年1月1日',
    );
  });

  it('现实 12 小时 = 游戏 1 年', () => {
    expect(REAL_MS_PER_GAME_YEAR).toBe(12 * 60 * 60 * 1000);
    expect(getGameCalendar(GAME_CALENDAR_EPOCH_MS + REAL_MS_PER_GAME_YEAR)).toEqual(
      { year: 1, month: 1, day: 1 },
    );
    expect(
      getGameCalendar(GAME_CALENDAR_EPOCH_MS + 11 * REAL_MS_PER_GAME_YEAR),
    ).toEqual({ year: 11, month: 1, day: 1 });
  });

  it('现实 60 分钟 = 游戏 1 月', () => {
    expect(REAL_MS_PER_GAME_MONTH).toBe(60 * 60 * 1000);
    expect(
      getGameCalendar(GAME_CALENDAR_EPOCH_MS + REAL_MS_PER_GAME_MONTH),
    ).toEqual({ year: 0, month: 2, day: 1 });
  });

  it('现实 2 分钟 = 游戏 1 日', () => {
    expect(REAL_MS_PER_GAME_DAY).toBe(2 * 60 * 1000);
    expect(getGameCalendar(GAME_CALENDAR_EPOCH_MS + REAL_MS_PER_GAME_DAY)).toEqual(
      { year: 0, month: 1, day: 2 },
    );
    // 月内第 30 日收尾，下一分钟即翻月
    expect(
      getGameCalendar(GAME_CALENDAR_EPOCH_MS + 29 * REAL_MS_PER_GAME_DAY),
    ).toEqual({ year: 0, month: 1, day: 30 });
  });

  it('早于起点的时刻按起点处理', () => {
    expect(getGameCalendar(GAME_CALENDAR_EPOCH_MS - 1000)).toEqual({
      year: 0,
      month: 1,
      day: 1,
    });
  });

  it('接受 Date 与毫秒两种入参', () => {
    const ms = GAME_CALENDAR_EPOCH_MS + REAL_MS_PER_GAME_YEAR;
    expect(getGameCalendar(new Date(ms))).toEqual(getGameCalendar(ms));
  });
});
