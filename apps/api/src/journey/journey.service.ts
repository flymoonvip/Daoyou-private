import { Injectable } from '@nestjs/common';
import { listAchievementDefinitions, listAchievementProgress } from '@server/achievements/application/AchievementService.js';
import { findExternalUserId } from '@server/lib/auth/externalUser.js';
import { findActiveCultivatorIdByUserId } from '@server/lib/repositories/cultivatorRepository.js';
import {
  checkExternalEntryEligibility,
  createExternalJourney,
  type ExternalJourneyCreateInput,
} from './application/ExternalJourneyCreation.js';
import { findExternalJourneyByJourneyId } from './application/ExternalJourneyRepository.js';
import { describeJourneyStatus } from './application/JourneyLifecycle.js';

@Injectable()
export class JourneyService {
  eligibility(externalUserId: string) {
    return checkExternalEntryEligibility(externalUserId);
  }

  create(input: ExternalJourneyCreateInput) {
    return createExternalJourney(input);
  }

  async status(journeyId: string) {
    const journey = await findExternalJourneyByJourneyId(journeyId);
    return describeJourneyStatus(journey);
  }

  /** 成就墙：定义 + 该主站用户当前在世角色（或最近一条转世角色）的进度 */
  async achievements(externalUserId: string) {
    const definitions = listAchievementDefinitions();
    const userId = await findExternalUserId(externalUserId);
    if (!userId) return { definitions, unlocked: [], counters: {} };
    const cultivatorId = await findActiveCultivatorIdByUserId(userId);
    if (!cultivatorId) return { definitions, unlocked: [], counters: {} };
    const progress = await listAchievementProgress(cultivatorId);
    return { definitions, unlocked: progress.unlocked, counters: progress.counters };
  }
}
