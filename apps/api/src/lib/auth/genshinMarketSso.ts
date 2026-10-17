import { getRuntimeEnvironment } from '@server/lib/config/environment.js';

/** 原神市场兑换接口返回的身份快照 */
export type GenshinMarketIdentity = {
  userId: string;
  username: string;
  email: string;
  nickname: string | null;
  role: string;
};

export type SsoRedeemFailure =
  /** 未配置跨站 SSO（本环境关闭该入口） */
  | 'unconfigured'
  /** 票据无效、已过期或已被消费 */
  | 'invalid-ticket'
  /** 原神市场不可达或返回异常 */
  | 'upstream-error';

export class SsoRedeemError extends Error {
  constructor(readonly reason: SsoRedeemFailure) {
    super(`SSO ticket redeem failed: ${reason}`);
    this.name = 'SsoRedeemError';
  }
}

export function isSsoConfigured(): boolean {
  const env = getRuntimeEnvironment();
  return Boolean(env.GENSHIN_MARKET_SSO_BASE_URL && env.SSO_INTERNAL_SECRET);
}

/**
 * 用一次性票据在服务端兑换原神市场用户身份。
 *
 * 票据由原神市场在用户登录后签发（60 秒有效、一次性消费），
 * 这里是服务端到服务端的私网调用，凭内部密钥鉴权，浏览器全程接触不到密钥。
 */
export async function redeemGenshinMarketTicket(
  ticket: string,
): Promise<GenshinMarketIdentity> {
  const env = getRuntimeEnvironment();
  const baseUrl = env.GENSHIN_MARKET_SSO_BASE_URL?.trim();
  const secret = env.SSO_INTERNAL_SECRET?.trim();

  if (!baseUrl || !secret) {
    throw new SsoRedeemError('unconfigured');
  }

  let response: Response;
  try {
    response = await fetch(
      `${baseUrl.replace(/\/+$/, '')}/api/v1/auth/sso/redeem`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': secret,
        },
        body: JSON.stringify({ ticket }),
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch (error) {
    console.error('[sso] redeem request failed', { error });
    throw new SsoRedeemError('upstream-error');
  }

  if (response.status === 401 || response.status === 400) {
    throw new SsoRedeemError('invalid-ticket');
  }

  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; data?: GenshinMarketIdentity }
    | null;

  if (!response.ok || !payload?.success || !payload.data?.userId) {
    console.error('[sso] redeem rejected', {
      status: response.status,
      message: payload,
    });
    throw new SsoRedeemError('upstream-error');
  }

  return payload.data;
}
