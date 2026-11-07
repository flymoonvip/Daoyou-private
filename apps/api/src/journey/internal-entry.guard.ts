import {
  HttpException,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { AppConfigService } from '../config/app-config.service.js';

/**
 * 「万界道友」活动建号通道（主站 → 道友）的内部密钥守卫。
 * 使用独立的 DAOYOU_ENTRY_SECRET，不复用 SSO 兑换密钥（InternalIdentityGuard）：
 * 建号是写操作，密钥泄露面要与只读的身份简介通道隔离。
 */
const INTERNAL_SECRET_HEADER = 'x-internal-secret';

function matchesSecret(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

@Injectable()
export class InternalEntryGuard implements CanActivate {
  constructor(@Inject(AppConfigService) private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get('DAOYOU_ENTRY_SECRET')?.trim();
    if (!secret) {
      throw new HttpException({ success: false, error: '万界道友建号通道未启用' }, 503);
    }
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.get(INTERNAL_SECRET_HEADER) ?? '';
    if (!provided || !matchesSecret(provided, secret)) {
      throw new HttpException({ success: false, error: '内部凭证无效' }, 401);
    }
    return true;
  }
}
