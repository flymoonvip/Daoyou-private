import { authSessions } from '@server/lib/auth/schema.js';
import { getRuntimeEnvironment } from '@server/lib/config/environment.js';
import { db } from '@server/lib/drizzle/db.js';
import { serializeSignedCookie } from 'better-call';
import { randomBytes } from 'node:crypto';
import {
  getCookieDomainConfig,
  getCrossSiteCookieConfig,
} from './cookieDomain.js';

/**
 * 会话签发与 Cookie 序列化。
 *
 * 登录入口收敛到原神市场账号后，Daoyou 不再对外暴露任何自有密码/验证码登录接口，
 * 会话仅在跨站换票成功后签发。Cookie 名称与签名格式完全沿用 Better Auth
 * （`<token>.<HMAC-SHA256(token, secret)>`），因此管理端的 `auth.api.*`
 * （封禁、改邮箱、强制下线）与实时连接鉴权逻辑不需要任何改动。
 */

/** 会话有效期 30 天 */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function isSecureCookie(): boolean {
  return new URL(getRuntimeEnvironment().BETTER_AUTH_URL).protocol === 'https:';
}

/** 与 Better Auth `createCookieGetter` 的名称规则一致（本项目未覆盖 cookiePrefix）。 */
function sessionCookieName(): string {
  return `${isSecureCookie() ? '__Secure-' : ''}better-auth.session_token`;
}

/**
 * 写入会话行。令牌随即用于 Cookie 签名，Better Auth 按 `token` 列反查会话，
 * 故此处只需保证取值唯一且不可预测。
 */
export async function createSession(
  userId: string,
  meta: { ipAddress?: string | null; userAgent?: string | null } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const token = randomBytes(32).toString('hex');

  await db.insert(authSessions).values({
    token,
    userId,
    expiresAt,
    createdAt: now,
    updatedAt: now,
    ipAddress: meta.ipAddress ?? null,
    userAgent: meta.userAgent ?? null,
  });

  return { token, expiresAt };
}

export async function serializeSessionCookie(
  token: string,
  expiresAt: Date,
): Promise<string> {
  const crossSite = getCrossSiteCookieConfig();
  const domainConfig = getCookieDomainConfig();
  const maxAge = Math.max(
    Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    0,
  );

  return serializeSignedCookie(
    sessionCookieName(),
    token,
    getRuntimeEnvironment().BETTER_AUTH_SECRET,
    {
      path: '/',
      httpOnly: true,
      sameSite: crossSite ? 'none' : 'lax',
      maxAge,
      ...(crossSite ? { secure: true } : {}),
      ...(domainConfig ? { domain: domainConfig.domain } : {}),
    },
  );
}
