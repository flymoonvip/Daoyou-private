import {
  Controller,
  Get,
  HttpException,
  Inject,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Access } from '../auth/access.js';
import { InternalIdentityGuard } from './internal-identity.guard.js';
import { PlayerService } from './player.service.js';

/**
 * 主站（原神市场）读取道友角色简介的内部通道。
 * 仅供主站服务端凭 X-Internal-Secret 调用，供其活动页展示"当前道友角色简介"。
 */
@Controller('internal/player')
@Access('public')
@UseGuards(InternalIdentityGuard)
export class InternalProfileController {
  constructor(@Inject(PlayerService) private readonly player: PlayerService) {}

  @Get('profile')
  async profile(@Query('externalUserId') externalUserId?: string) {
    const id = typeof externalUserId === 'string' ? externalUserId.trim() : '';
    if (!id) {
      throw new HttpException(
        { success: false, error: '缺少外部用户标识' },
        400,
      );
    }
    return {
      success: true,
      data: await this.player.externalProfileByExternalAuthId(id),
    };
  }
}
