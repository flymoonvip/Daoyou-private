import { HttpException, Injectable } from '@nestjs/common';
import type { AuthUser } from '@server/lib/auth/types.js';
import {
  consumeCharacterGenerationQuota,
  getCharacterGenerationQuota,
} from '@server/lib/redis/characterGenerationLimiter.js';
import {
  checkAndIncrementReroll,
  getTempCharacter,
  getTempFates,
  saveTempCharacter,
  saveTempFates,
} from '@server/lib/repositories/redisCultivatorRepository.js';
import { createCultivatorFromTemp } from '@server/genesis/application/CultivatorCreationApplicationService.js';
import { FATE_REROLL_LIMIT, FATE_SLOT_COUNT } from '@server/reshape/application/FateConfig.js';
import { FateEngine } from '@server/reshape/application/FateEngine.js';
import { toPlayerStateMutationResponse } from '@server/player/application/state/ResourceMutationResponse.js';
import { CharacterGenerator } from '@server/lib/generation/CharacterGenerator.js';
import { normalizeFreeformLlmInput } from '@server/utils/llmPayload.js';
import {
  CHARACTER_GENERATION_LIMIT_REACHED_CODE,
  type CharacterGenerationQuota,
  type CharacterGenerationQuotaResponse,
  type GenerateCharacterResponse,
} from '@daoyou/contracts/character-generation';
import { z } from 'zod';

const GenerateCharacterSchema = z.object({ userInput: z.string() });
const GenerateFatesSchema = z.object({ tempId: z.string().min(1) });
const CreateCharacterSchema = z.object({ userInput: z.string().optional() });
export const SaveCharacterSchema = z.object({
  tempCultivatorId: z.string(),
  selectedFateIndices: z.array(z.number()).length(3),
});
const MIN_PROMPT_LENGTH = 2;
const MAX_PROMPT_LENGTH = 200;
// 主站尚未建设完成，建号提示暂用此初始模板兜底；后续由主站传入。
const INITIAL_CHARACTER_PROMPT =
  '一位出身没落丹道世家的废柴少主，天资平平却心志坚韧，渴望靠炼丹逆袭，证得长生。';
function quotaExceededMessage(quota: CharacterGenerationQuota): string {
  switch (quota.limitedBy) {
    case 'email':
      return '该邮箱今日角色推演次数已用尽（每日限 6 次），请明日再试。';
    case 'ip':
      return '当前网络今日角色推演次数已用尽（每日限 6 次），请明日再试。';
    case 'both':
      return '该邮箱与当前网络今日角色推演次数均已用尽，请明日再试。';
    default:
      return '今日角色推演次数已用尽，请明日再试。';
  }
}

@Injectable()
export class GenesisService {
  async quota(
    user: AuthUser,
    ip: string | undefined,
  ): Promise<CharacterGenerationQuotaResponse> {
    const quota = await getCharacterGenerationQuota({ email: user.email, ip });
    return { success: true, data: { quota } };
  }

  async generate(
    user: AuthUser,
    ip: string | undefined,
    input: unknown,
  ): Promise<GenerateCharacterResponse> {
    const parsed = GenerateCharacterSchema.safeParse(input);
    if (!parsed.success)
      throw new HttpException(
        { success: false, error: '请求参数格式错误，请重新输入角色描述。' },
        400,
      );
    const userInput = normalizeFreeformLlmInput(parsed.data.userInput);
    const promptLength = Array.from(userInput).length;
    if (promptLength < MIN_PROMPT_LENGTH)
      throw new HttpException(
        {
          success: false,
          error: `角色描述至少需要 ${MIN_PROMPT_LENGTH} 个字。`,
        },
        400,
      );
    if (promptLength > MAX_PROMPT_LENGTH)
      throw new HttpException(
        {
          success: false,
          error: `角色描述过长（当前 ${promptLength} 字，最多 ${MAX_PROMPT_LENGTH} 字）。`,
          code: 'PROMPT_TOO_LONG',
          details: {
            currentLength: promptLength,
            maxLength: MAX_PROMPT_LENGTH,
          },
        },
        422,
      );
    const quotaResult = await consumeCharacterGenerationQuota({
      email: user.email,
      ip,
    });
    if (!quotaResult.allowed)
      throw new HttpException(
        {
          success: false,
          code: CHARACTER_GENERATION_LIMIT_REACHED_CODE,
          error: quotaExceededMessage(quotaResult.quota),
          quota: quotaResult.quota,
        },
        429,
      );
    const { cultivator } = await CharacterGenerator.generate(userInput);
    const tempCultivatorId = await saveTempCharacter(cultivator);
    return {
      success: true,
      data: { cultivator, tempCultivatorId, quota: quotaResult.quota },
    };
  }

  async fates(input: unknown) {
    const parsed = GenerateFatesSchema.safeParse(input);
    if (!parsed.success)
      throw new HttpException(
        { success: false, error: '请求参数格式错误' },
        400,
      );
    const { tempId } = parsed.data;
    const cultivator = await getTempCharacter(tempId);
    if (!cultivator)
      throw new HttpException(
        { success: false, error: '角色推演已过期，请重新生成。' },
        404,
      );
    const previousFates = await getTempFates(tempId);
    let remainingRerolls = FATE_REROLL_LIMIT;
    if (previousFates && previousFates.length > 0) {
      const rerollCheck = await checkAndIncrementReroll(
        tempId,
        FATE_REROLL_LIMIT,
      );
      if (!rerollCheck.allowed)
        throw new HttpException(
          {
            success: false,
            error: `逆天改命次数已尽（最多 ${FATE_REROLL_LIMIT} 次）`,
          },
          400,
        );
      remainingRerolls = rerollCheck.remaining;
    }
    const fates = await FateEngine.generateCandidatePool();
    await saveTempFates(tempId, fates);
    return { success: true, data: { fates, remainingRerolls } };
  }

  async save(user: AuthUser, input: z.infer<typeof SaveCharacterSchema>) {
    return toPlayerStateMutationResponse(
      await createCultivatorFromTemp({ userId: user.id, ...input }),
    );
  }

  /**
   * 自动建号：提示改由主站传入（缺省用初始模板），先天气运由系统自动分配，
   * 玩家不再输入提示、择命或手动保存道身。
   */
  async create(user: AuthUser, ip: string | undefined, input: unknown) {
    const parsed = CreateCharacterSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new HttpException(
        { success: false, error: '请求参数格式错误' },
        400,
      );
    const userInput =
      normalizeFreeformLlmInput(parsed.data.userInput ?? '') ||
      INITIAL_CHARACTER_PROMPT;
    const generated = await this.generate(user, ip, { userInput });
    const { tempCultivatorId } = generated.data;
    const { data } = await this.fates({ tempId: tempCultivatorId });
    if (data.fates.length < FATE_SLOT_COUNT)
      throw new HttpException(
        { success: false, error: '气运推演失败，请重试。' },
        500,
      );
    const selectedFateIndices = Array.from(
      { length: FATE_SLOT_COUNT },
      (_, index) => index,
    );
    return this.save(user, { tempCultivatorId, selectedFateIndices });
  }
}
