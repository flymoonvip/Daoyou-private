import {
  Controller,
  Get,
  HttpCode,
  HttpException,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { Access } from '../auth/access.js';
import { FirstQuery } from '../http/first-query.js';
import { JsonBody } from '../http/json-body.js';
import { ZodPipe } from '../http/zod.pipe.js';
import { ExternalJourneyError } from './application/ExternalJourneyCreation.js';
import { InternalEntryGuard } from './internal-entry.guard.js';
import { JourneyService } from './journey.service.js';

/**
 * 「万界道友」活动建号通道：主站服务端凭 X-Internal-Secret（DAOYOU_ENTRY_SECRET）调用。
 *
 *   GET  /internal/daoyou/entry-eligibility?externalUserId=   封印前预检（必须在主站扣武器之前）
 *   POST /internal/daoyou/create                              幂等建号（幂等键 journeyId）
 *   GET  /internal/daoyou/journey-status?journeyId=           对账：角色是否存在 / 是否死亡 / 最新快照
 *   GET  /internal/daoyou/achievements?externalUserId=        成就墙定义与进度
 *
 * 不接受前端提交；SSO 兑换只用于登录，不触发建号。
 */

const CreateJourneySchema = z
  .object({
    journeyId: z.string().trim().min(1).max(64),
    externalUserId: z.string().trim().min(1).max(64),
    avatarId: z.number().int().positive(),
    characterName: z.string().trim().min(1).max(100),
    gender: z.enum(['male', 'female', 'unknown']).optional(),
    element: z.string().trim().max(16).optional(),
    combatPower: z.number().nonnegative().max(1_000_000_000),
    combatSampleDays: z.number().int().min(1).max(3650).default(1),
    starterTier: z.number().int().min(1).max(5),
    generation: z.number().int().positive().optional(),
  })
  .strict();

type CreateJourneyBody = z.infer<typeof CreateJourneySchema>;

@Controller('internal/daoyou')
@Access('public')
@UseGuards(InternalEntryGuard)
export class InternalJourneyController {
  constructor(@Inject(JourneyService) private readonly journeys: JourneyService) {}

  @Get('entry-eligibility')
  async eligibility(@FirstQuery('externalUserId') externalUserId?: string) {
    const id = requireParam(externalUserId, '缺少外部用户标识');
    return { success: true, data: await this.journeys.eligibility(id) };
  }

  @Post('create')
  @HttpCode(200)
  async create(@JsonBody(new ZodPipe(CreateJourneySchema)) body: CreateJourneyBody) {
    try {
      return { success: true, data: await this.journeys.create(body) };
    } catch (error) {
      if (error instanceof ExternalJourneyError) {
        throw new HttpException({ success: false, error: error.message, code: error.code }, error.status);
      }
      throw error;
    }
  }

  @Get('journey-status')
  async status(@FirstQuery('journeyId') journeyId?: string) {
    const id = requireParam(journeyId, '缺少 journeyId');
    return { success: true, data: await this.journeys.status(id) };
  }

  @Get('achievements')
  async achievements(@FirstQuery('externalUserId') externalUserId?: string) {
    const id = requireParam(externalUserId, '缺少外部用户标识');
    return { success: true, data: await this.journeys.achievements(id) };
  }
}

function requireParam(value: string | undefined, message: string): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) throw new HttpException({ success: false, error: message }, 400);
  return trimmed;
}
