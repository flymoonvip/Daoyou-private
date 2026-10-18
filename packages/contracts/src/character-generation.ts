import type { ApiSuccess } from './http.js';
import type { Cultivator } from '@daoyou/game-domain/character';

export const CHARACTER_GENERATION_DAILY_LIMIT = 6;
export const CHARACTER_GENERATION_LIMIT_REACHED_CODE =
  'CHARACTER_GENERATION_LIMIT_REACHED';
/** 账号已有道身（或原角色转服未完成）时拒绝推演：不消耗每日建号额度 */
export const CHARACTER_CREATION_BLOCKED_CODE = 'CHARACTER_CREATION_BLOCKED';

export type CharacterGenerationLimitedBy = 'none' | 'email' | 'ip' | 'both';

export type CharacterGenerationQuota = {
  dailyLimit: number;
  remaining: number;
  remainingByEmail: number;
  remainingByIp: number;
  limitedBy: CharacterGenerationLimitedBy;
  ipTracked: boolean;
};

export type CharacterGenerationQuotaResponse = ApiSuccess<{
  quota: CharacterGenerationQuota;
}>;

export type GenerateCharacterResponse = ApiSuccess<{
  cultivator: Cultivator;
  tempCultivatorId: string;
  quota: CharacterGenerationQuota;
}>;
