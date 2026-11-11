import type { ResourceChangeDescriptor } from '@daoyou/contracts/resources';
import { buildExternalJourneyCultivator } from '@daoyou/game-rules/character/external-journey';
import { createCultivator } from '@server/cultivator/application/readers/CultivatorProfileRepository.js';
import { findCultivatorCreationBlock } from '@server/genesis/application/CultivatorCreationApplicationService.js';
import { invalidateActiveCultivatorRef } from '@server/lib/auth/activeCultivator.js';
import { ensureExternalUser, findExternalUserId } from '@server/lib/auth/externalUser.js';
import { findActiveCultivatorIdByUserId } from '@server/lib/repositories/cultivatorRepository.js';
import { redisLockKeys, withRedisLock } from '@server/lib/redis/lock.js';
import { MailService } from '@server/mail/application/MailService.js';
import { playerCommandExecutor } from '@server/player/application/state/CommandExecutors.js';
import { FateEngine } from '@server/reshape/application/FateEngine.js';
import { TaskService } from '@server/tasks/application/TaskService.js';
import { createSeededRng } from '@daoyou/game-rules/character/external-journey';
import { unlockAchievements, recordCounterMax } from '@server/achievements/application/AchievementService.js';
import { externalJourneys } from '@server/lib/drizzle/schema.js';
import { eq, sql } from 'drizzle-orm';
import { enqueueExternalCallback } from './ExternalCallbackOutbox.js';
import { findExternalJourneyByJourneyId, insertExternalJourney } from './ExternalJourneyRepository.js';
import { buildJourneySnapshot } from './JourneyLifecycle.js';

/**
 * 外部降世建号（主站 → 道友，服务端到服务端）。
 *
 * 幂等键 journeyId：重复调用返回同一个 cultivatorId（created=false）。
 * 「一个用户一个活跃角色」闸口与普通建号一致；主站会在扣武器前先调 entry-eligibility 预检。
 * 建号、任务同步、开局邮件、账本、建号确认回调在同一事务内提交；不需要玩家登录或本地会话。
 */

export class ExternalJourneyError extends Error {
  constructor(
    readonly code: 'ACTIVE_CULTIVATOR_EXISTS' | 'TRANSFER_PENDING' | 'INVALID_PAYLOAD',
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ExternalJourneyError';
  }
}

export interface ExternalJourneyCreateInput {
  journeyId: string;
  externalUserId: string;
  avatarId: number;
  characterName: string;
  gender?: string;
  element?: string;
  combatPower: number;
  combatSampleDays: number;
  starterTier: number;
  generation?: number;
}

export interface ExternalEntryEligibility {
  eligible: boolean;
  reason?: 'ACTIVE_CULTIVATOR_EXISTS' | 'TRANSFER_PENDING';
  activeCultivatorId?: string;
}

/** 封印前预检：该主站用户在道友是否已有在世角色 / 转服中角色 */
export async function checkExternalEntryEligibility(externalUserId: string): Promise<ExternalEntryEligibility> {
  const userId = await findExternalUserId(externalUserId);
  if (!userId) return { eligible: true };
  const block = await findCultivatorCreationBlock(userId);
  if (block === 'active_cultivator') {
    const activeCultivatorId = await findActiveCultivatorIdByUserId(userId);
    return { eligible: false, reason: 'ACTIVE_CULTIVATOR_EXISTS', activeCultivatorId: activeCultivatorId ?? undefined };
  }
  if (block === 'transfer_pending') return { eligible: false, reason: 'TRANSFER_PENDING' };
  return { eligible: true };
}

export async function createExternalJourney(
  input: ExternalJourneyCreateInput,
): Promise<{ cultivatorId: string; created: boolean }> {
  const existing = await findExternalJourneyByJourneyId(input.journeyId);
  if (existing) return { cultivatorId: existing.cultivatorId, created: false };

  const userId = await ensureExternalUser({ userId: input.externalUserId });

  return withRedisLock(
    {
      key: redisLockKeys.cultivatorCreation(userId),
      context: 'external-journey-create',
      timeoutMs: 30_000,
      retries: 2,
      delayMs: 300,
    },
    async () => {
      // 锁内二次幂等检查：主站超时重试可能与首个请求并发
      const raced = await findExternalJourneyByJourneyId(input.journeyId);
      if (raced) return { cultivatorId: raced.cultivatorId, created: false };

      const block = await findCultivatorCreationBlock(userId);
      if (block === 'active_cultivator') {
        throw new ExternalJourneyError('ACTIVE_CULTIVATOR_EXISTS', '该账号在万界道友已有在世角色', 409);
      }
      if (block === 'transfer_pending') {
        throw new ExternalJourneyError('TRANSFER_PENDING', '该账号有角色正在转服，暂不可建号', 409);
      }

      const build = buildExternalJourneyCultivator({
        journeyId: input.journeyId,
        characterName: input.characterName,
        gender: input.gender,
        element: input.element,
        combatPower: input.combatPower,
        starterTier: input.starterTier,
      });
      // 先天命格：确定性随机，取候选池前三（与普通建号的三选一流程等价，但无需玩家参与）
      const fateRng = createSeededRng(`daoyou-journey-fates:${input.journeyId}`);
      build.cultivator.pre_heaven_fates = FateEngine.getSelectedFates(
        await FateEngine.generateCandidatePool(fateRng),
      );

      const committed = await playerCommandExecutor.executeInitial({
        userId,
        source: 'external_journey_created',
        command: async (tx) => {
          const created = await createCultivator(userId, build.cultivator, tx);
          if (!created.id) throw new Error('创建角色后缺少角色标识');

          await TaskService.syncCultivatorTasks(created.id, tx);
          await MailService.sendNewRewardMail(
            created.id,
            `万界机缘·${build.starterPack.label}`,
            `道友自万界之外转世而来，献祭所得机缘化作此身开局资粮。此身资质${build.aptitude}，愿道友仙路顺遂。`,
            [{ type: 'spirit_stones', name: '灵石', quantity: build.starterPack.spiritStones }],
            'reward',
            tx,
          );

          const journey = await insertExternalJourney(
            {
              journeyId: input.journeyId,
              externalUserId: input.externalUserId,
              userId,
              cultivatorId: created.id,
              avatarId: input.avatarId,
              characterName: build.cultivator.name,
              gender: build.cultivator.gender,
              combatPower: Math.round(input.combatPower),
              combatSampleDays: Math.max(1, Math.floor(input.combatSampleDays || 1)),
              starterTier: build.starterPack.tier,
              aptitude: build.aptitude,
              payload: {
                generation: input.generation ?? null,
                element: input.element ?? null,
                starterPack: build.starterPack,
              },
            },
            tx,
          );

          // 活动专属成就：同一账号第 N 次建号 / 同一角色第 3 世
          const [countRow] = await tx
            .select({ count: sql<number>`count(*)` })
            .from(externalJourneys)
            .where(eq(externalJourneys.externalUserId, input.externalUserId));
          await recordCounterMax(created.id, 'rebirth.count', Number(countRow?.count ?? 1), tx);
          const generation = input.generation ?? 0;
          if (generation > 0) {
            await recordCounterMax(created.id, 'journey.generation', generation, tx);
          }
          if (generation >= 2) {
            await unlockAchievements(created.id, ['journey.legacy.first'], tx);
          }

          const snapshot = await buildJourneySnapshot(created.id, tx);
          await enqueueExternalCallback(
            {
              kind: 'cultivator-status',
              externalUserId: input.externalUserId,
              journeyId: input.journeyId,
              cultivatorId: created.id,
              payload: {
                externalUserId: input.externalUserId,
                journeyId: input.journeyId,
                cultivatorId: created.id,
                status: 'created',
                occurredAt: Date.now(),
                snapshot,
              },
              deduplicationKey: `${created.id}:created`,
            },
            tx,
          );

          const resourceChanges: ResourceChangeDescriptor[] = [
            {
              resourceTopic: 'player.session',
              eventType: 'cultivator.created',
              operation: 'replace',
              payload: {
                activeCultivator: { id: created.id, status: 'active', sectId: null },
              },
            },
          ];
          return { cultivatorId: created.id, result: { cultivatorId: journey.cultivatorId }, resourceChanges };
        },
      });

      await invalidateActiveCultivatorRef(userId);
      return { cultivatorId: committed.result.cultivatorId, created: true };
    },
  );
}
