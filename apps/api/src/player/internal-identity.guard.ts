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
 * 原神市场（主站）服务端携带内部密钥的请求头。
 * 与主站 /api/v1/auth/sso/redeem 使用同一枚 SSO_INTERNAL_SECRET，
 * 构成"道友 → 主站"（兑换身份）与"主站 → 道友"（读取角色简介）双向私网通道。
 */
const INTERNAL_SECRET_HEADER = 'x-internal-secret';

/** 常数时间比较，避免通过响应耗时逐字节试探密钥 */
function matchesInternalSecret(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

@Injectable()
export class InternalIdentityGuard implements CanActivate {
  constructor(
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get('SSO_INTERNAL_SECRET')?.trim();
    if (!secret) {
      // 未配置内部密钥时关闭通道，避免出现"无密钥即可读取身份"的不安全默认值
      throw new HttpException(
        { success: false, error: '内部通道未启用' },
        503,
      );
    }
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.get(INTERNAL_SECRET_HEADER) ?? '';
    if (!provided || !matchesInternalSecret(provided, secret)) {
      throw new HttpException({ success: false, error: '内部凭证无效' }, 401);
    }
    return true;
  }
}
