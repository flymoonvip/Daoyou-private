import { Module } from '@nestjs/common';
import { DatabaseModule } from '@server/database/database.module.js';
import { InternalEntryGuard } from './internal-entry.guard.js';
import { InternalJourneyController } from './internal-journey.controller.js';
import { JourneyService } from './journey.service.js';

/** 「万界道友」活动：外部降世建号通道与账本 */
@Module({
  imports: [DatabaseModule],
  controllers: [InternalJourneyController],
  providers: [JourneyService, InternalEntryGuard],
})
export class JourneyModule {}
