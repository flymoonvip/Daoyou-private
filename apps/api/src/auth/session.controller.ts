import {
  Controller,
  Get,
  HttpCode,
  HttpException,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  SsoExchangeRequestSchema,
  type SsoExchangeRequest,
  type SsoExchangeResponse,
  type SessionResponse,
  type SessionLogoutResponse,
} from '@daoyou/contracts/account';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request, Response } from 'express';
import {
  isSsoConfigured,
  SsoRedeemError,
} from '@server/lib/auth/genshinMarketSso.js';
import { serializeSessionCookie } from '@server/lib/auth/sessionCookie.js';
import { getRequestIp } from '@server/lib/http/requestIp.js';
import { Access, CurrentUser } from './access.js';
import { JsonBody } from '../http/json-body.js';
import { ZodPipe } from '../http/zod.pipe.js';
import { SessionService } from './session.service.js';
import { SsoService } from './sso.service.js';
import type { AuthUser } from '@server/lib/auth/types.js';

@Controller('api/session')
export class SessionController {
  constructor(
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(SsoService) private readonly sso: SsoService,
  ) {}

  /** 当前会话；未登录时 data.user 为 null */
  @Get()
  @Access('public')
  async current(@Req() request: Request): Promise<SessionResponse> {
    const { response } = await this.sessions.getSession(
      fromNodeHeaders(request.headers),
    );
    const user = response?.user;

    return {
      success: true,
      data: {
        user: user
          ? {
              id: user.id,
              email: user.email,
              name: user.name,
              emailVerified: user.emailVerified,
              createdAt: user.createdAt.toISOString(),
            }
          : null,
      },
    };
  }

  @Post('logout')
  @Access('public')
  @HttpCode(200)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionLogoutResponse> {
    // 会话清除的 Cookie 头由 Better Auth 生成，确保名称与属性始终一致。
    const { headers } = await this.sessions.signOut(
      fromNodeHeaders(request.headers),
    );
    for (const cookie of headers.getSetCookie()) {
      response.append('Set-Cookie', cookie);
    }

    return { success: true, data: { loggedOut: true } };
  }

  /**
   * 一次性票据换会话：原神市场登录成功后（或在活动列表点入口时）由浏览器带着票据调用，
   * 服务端再凭内部密钥向原神市场兑换身份，浏览器全程不接触密钥。
   */
  @Post('exchange')
  @Access('public')
  @HttpCode(200)
  async exchange(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @JsonBody({ fallback: undefined }, new ZodPipe(SsoExchangeRequestSchema))
    body: SsoExchangeRequest,
  ): Promise<SsoExchangeResponse> {
    if (!isSsoConfigured()) {
      throw new HttpException(
        { success: false, error: '跨站单点登录未启用' },
        503,
      );
    }

    let session: Awaited<ReturnType<SsoService['exchange']>>;
    try {
      session = await this.sso.exchange(body.ticket, {
        ipAddress: getRequestIp(fromNodeHeaders(request.headers)),
        userAgent: request.get('user-agent') ?? null,
      });
    } catch (error) {
      if (error instanceof SsoRedeemError && error.reason === 'invalid-ticket') {
        throw new HttpException(
          { success: false, error: '登录凭证无效或已过期，请重新登录' },
          401,
        );
      }
      throw error;
    }

    response.setHeader(
      'Set-Cookie',
      await serializeSessionCookie(session.token, session.expiresAt),
    );

    return { success: true, data: { userId: session.userId } };
  }

  /** 注销账号（删除 Daoyou 侧账号数据，不影响原神市场账号） */
  @Post('account-deletion')
  @Access('user')
  @HttpCode(200)
  async deleteAccount(
    @Req() request: Request,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.sessions.deleteAccount(user);
    const { headers } = await this.sessions.signOut(
      fromNodeHeaders(request.headers),
    );
    for (const cookie of headers.getSetCookie()) {
      response.append('Set-Cookie', cookie);
    }

    return { success: true, data: { deleted: true } };
  }
}
