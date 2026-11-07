/**
 * 外部降世（「万界道友」活动，主站 activityId=1000009）建号规则 —— 纯函数。
 *
 * 主站封印确认后服务端直连道友建号，传入的是「档位与战力均值」而不是原始属性或奖励清单：
 *   - combatPower（原神角色活动期平均战力）→ 有上限的初始资质档（影响灵根强度）
 *   - starterTier（1-5 献祭档位）→ 开局资源包；越界按 1 处理，tier 5 为资源上限
 *   - gender / element 用主站映射值；角色名直接使用主站传入的「角色·第N世」
 *   - 初始境界固定炼气初期；初始年龄比普通建号略低（14-17），寿元 80-99（高资质 +20）
 *
 * 随机量全部由 journeyId 派生的确定性随机数驱动：主站重试建号时结果一致，便于幂等与排查。
 */

import { ELEMENT_VALUES, type ElementType } from '@daoyou/constants/elements';
import type { Cultivator, GenderType } from '@daoyou/game-domain/character';
import { getRealmStageUnallocatedAttributeBudget } from '../../progression/attributes.js';
import { generateAttributes, generateSpiritualRoots } from './utils.js';

export const EXTERNAL_JOURNEY_MIN_TIER = 1;
export const EXTERNAL_JOURNEY_MAX_TIER = 5;

export type ExternalStarterTier = 1 | 2 | 3 | 4 | 5;

export interface ExternalStarterPack {
  tier: ExternalStarterTier;
  /** 开局灵石（邮件附件发放） */
  spiritStones: number;
  /** 邮件标题里展示的机缘档名 */
  label: string;
}

/** 档位 → 开局资源包；tier 5 是上限，不随献祭数量继续增长 */
export const EXTERNAL_STARTER_PACKS: Record<ExternalStarterTier, ExternalStarterPack> = {
  1: { tier: 1, spiritStones: 500, label: '薄缘' },
  2: { tier: 2, spiritStones: 1500, label: '小缘' },
  3: { tier: 3, spiritStones: 4000, label: '中缘' },
  4: { tier: 4, spiritStones: 10000, label: '大缘' },
  5: { tier: 5, spiritStones: 25000, label: '天缘' },
};

export type ExternalAptitudeGrade = '凡骨' | '良才' | '上品' | '天骄' | '绝世';

/** 平均战力 → 资质档与资质分（0-100，决定灵根强度上限附近的落点） */
export function resolveExternalAptitude(combatPower: number): {
  grade: ExternalAptitudeGrade;
  score: number;
} {
  const power = Number.isFinite(combatPower) ? Math.max(0, combatPower) : 0;
  if (power >= 100_000) return { grade: '绝世', score: 95 };
  if (power >= 70_000) return { grade: '天骄', score: 85 };
  if (power >= 40_000) return { grade: '上品', score: 70 };
  if (power >= 20_000) return { grade: '良才', score: 55 };
  return { grade: '凡骨', score: 40 };
}

/** 档位范围校验：越界、非整数一律按 1 处理 */
export function clampExternalStarterTier(tier: number): ExternalStarterTier {
  if (!Number.isInteger(tier) || tier < EXTERNAL_JOURNEY_MIN_TIER || tier > EXTERNAL_JOURNEY_MAX_TIER) {
    return 1;
  }
  return tier as ExternalStarterTier;
}

export function resolveExternalStarterPack(tier: number): ExternalStarterPack {
  return EXTERNAL_STARTER_PACKS[clampExternalStarterTier(tier)];
}

/** 主站性别（male/female/unknown）→ 道友性别（男/女）；unknown 按 journeyId 确定性选取 */
export function mapExternalGender(gender: string | undefined, rng: () => number): GenderType {
  const normalized = (gender ?? '').trim().toLowerCase();
  if (normalized === 'male' || normalized === '男') return '男';
  if (normalized === 'female' || normalized === '女') return '女';
  return rng() < 0.5 ? '男' : '女';
}

/** 原神元素 → 道友灵根元素；无法映射返回 undefined（灵根改为按资质随机） */
export function mapExternalElement(element: string | undefined): ElementType | undefined {
  const normalized = (element ?? '').trim().toLowerCase();
  const table: Record<string, ElementType> = {
    pyro: '火',
    hydro: '水',
    anemo: '风',
    electro: '雷',
    dendro: '木',
    cryo: '冰',
    geo: '土',
  };
  if (table[normalized]) return table[normalized];
  return (ELEMENT_VALUES as readonly string[]).includes(element ?? '') ? (element as ElementType) : undefined;
}

/** 32 位 FNV-1a 字符串哈希 */
function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** mulberry32：由字符串种子派生的确定性随机数，[0, 1) */
export function createSeededRng(seed: string): () => number {
  let state = hashSeed(seed) || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ExternalJourneyInput {
  journeyId: string;
  characterName: string;
  gender?: string;
  element?: string;
  combatPower: number;
  starterTier: number;
}

export interface ExternalJourneyBuild {
  cultivator: Cultivator;
  aptitude: ExternalAptitudeGrade;
  starterPack: ExternalStarterPack;
}

/**
 * 构造外部降世角色：炼气初期、确定性年龄/寿元/灵根，名字与性别来自主站。
 * 不含先天命格（外部降世不走择命流程），由调用方按需补齐。
 */
export function buildExternalJourneyCultivator(input: ExternalJourneyInput): ExternalJourneyBuild {
  const rng = createSeededRng(`daoyou-journey:${input.journeyId}`);
  const { grade, score } = resolveExternalAptitude(input.combatPower);
  const starterPack = resolveExternalStarterPack(input.starterTier);
  const gender = mapExternalGender(input.gender, rng);
  const element = mapExternalElement(input.element);

  const age = 14 + Math.floor(rng() * 4); // 14-17：外部降世初始年龄略低，延长未登录状态下的占用寿命
  const lifespan = 80 + Math.floor(rng() * 20) + (score > 80 ? 20 : 0);

  const name = input.characterName.trim().slice(0, 100) || '无名道友';

  const cultivator: Cultivator = {
    id: '',
    name,
    gender,
    origin: '万界之外',
    personality: '尚未显露',
    background: `自万界之外转世而来，道号「${name}」。此身资质${grade}，机缘${starterPack.label}。`,
    playerRace: 'human',
    raceNarrative: '人身近道，百法皆可参悟。',

    realm: '炼气',
    realm_stage: '初期',
    age,
    lifespan,

    attributes: generateAttributes(),
    unallocated_attribute_points: getRealmStageUnallocatedAttributeBudget('炼气', '初期'),
    spiritual_roots: generateSpiritualRoots(score, element ? [element] : [], rng),
    status: 'active',
    spirit_stones: 0,
    pre_heaven_fates: [],
    inventory: { artifacts: [], consumables: [], materials: [] },
    equipped: { weapon: null, armor: null, accessory: null },
    prompt: `external-journey:${input.journeyId}`,
    balance_notes: `外部降世：资质${grade}（战力 ${Math.round(input.combatPower)}），开局 tier ${starterPack.tier}`,
  };

  return { cultivator, aptitude: grade, starterPack };
}
