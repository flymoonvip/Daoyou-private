import type {
  BeastAllocateRequest,
  BeastFusionRequest,
  BeastLineupRequestSchema,
  BeastLockSchema,
  BeastPickerQuerySchema,
  BeastPlaceSchema,
  BeastRenameSchema,
  BeastRestSchema,
} from '@daoyou/contracts/beasts';
import { Inject, Injectable } from '@nestjs/common';
import {
  allocateBeastPoints,
  claimStarterBeast,
  fuseOwnedBeasts,
  placeBeast,
  readBeastFusion,
  releaseBeast,
  renameBeast,
  restBeast,
  setBeastLocked,
  updateBeastLineup,
} from '@server/combat/application/CombatV6BeastService.js';
import { DRIZZLE_DATABASE } from '@server/database/database.service.js';
import { AchievementHooks } from '@server/achievements/application/AchievementService.js';
import type { DbClient } from '@server/lib/drizzle/db.js';
import {
  readBeastPickerPage,
  readBeastRoster,
} from '@server/lib/repositories/combatV6BeastRepository.js';
import type { z } from 'zod';

@Injectable()
export class BeastsService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly database: DbClient) {}

  async read(owner: string) {
    return { success: true, data: await readBeastRoster(owner, this.database) };
  }
  async picker(owner: string, query: z.infer<typeof BeastPickerQuerySchema>) {
    return {
      success: true,
      data: await readBeastPickerPage(owner, query, this.database),
    };
  }
  async fusion(owner: string, requestId: string) {
    return { success: true, data: await readBeastFusion(owner, requestId) };
  }
  async fuse(owner: string, input: BeastFusionRequest) {
    const data = await fuseOwnedBeasts(owner, input);
    void AchievementHooks.increment(owner, 'beast.fusion', 1);
    return { success: true, data };
  }
  async claim(owner: string, speciesId: string) {
    return { success: true, data: await claimStarterBeast(owner, speciesId) };
  }
  async lineup(owner: string, input: z.infer<typeof BeastLineupRequestSchema>) {
    const data = await updateBeastLineup(owner, input);
    void AchievementHooks.increment(owner, 'beast.lineup', 1);
    return { success: true, data };
  }
  async rest(owner: string, input: z.infer<typeof BeastRestSchema>) {
    const data = await restBeast(owner, input.beastId, input.expectedRevision);
    void AchievementHooks.increment(owner, 'beast.rest', 1);
    return { success: true, data };
  }
  async allocate(owner: string, input: BeastAllocateRequest) {
    const data = await allocateBeastPoints(
      owner,
      input.beastId,
      input.expectedRevision,
      input.points,
    );
    void AchievementHooks.increment(owner, 'beast.allocate', 1);
    return { success: true, data };
  }
  async rename(owner: string, input: z.infer<typeof BeastRenameSchema>) {
    const data = await renameBeast(
      owner,
      input.beastId,
      input.expectedRevision,
      input.name,
    );
    void AchievementHooks.increment(owner, 'beast.rename', 1);
    return { success: true, data };
  }
  async lock(owner: string, input: z.infer<typeof BeastLockSchema>) {
    const data = await setBeastLocked(
      owner,
      input.beastId,
      input.expectedRevision,
      input.isLocked,
    );
    if (input.isLocked) void AchievementHooks.increment(owner, 'beast.lock', 1);
    return { success: true, data };
  }
  async release(owner: string, input: z.infer<typeof BeastRestSchema>) {
    const data = await releaseBeast(owner, input.beastId, input.expectedRevision);
    void AchievementHooks.increment(owner, 'beast.release', 1);
    return { success: true, data };
  }
  async place(owner: string, input: z.infer<typeof BeastPlaceSchema>) {
    return {
      success: true,
      data: await placeBeast(
        owner,
        input.beastId,
        input.expectedRevision,
        input.location,
      ),
    };
  }
}
