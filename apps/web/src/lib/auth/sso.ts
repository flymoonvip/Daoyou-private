import { clientEnv } from '@app/lib/env';

/**
 * 跨站单点登录（原神市场 → 万界道友）。
 *
 * 本站登录页只提供「使用原神市场账号登录」按钮：整页跳到原神市场登录页，
 * 登录成功后由原神市场带着一次性票据回跳到本站 `/sso/callback`。
 * 密码只在原神市场输入，本站永远接触不到。
 */

/** 原神市场登录成功后的回跳地址。 */
export function buildSsoCallbackUrl(): string {
  if (typeof window === 'undefined') {
    return '/sso/callback';
  }

  return new URL('/sso/callback', window.location.origin).toString();
}

export function isSsoConfigured(): boolean {
  return Boolean(clientEnv.genshinMarketLoginUrl);
}

/** 原神市场登录页地址（附带回跳参数）；未配置时返回 null。 */
export function buildGenshinMarketLoginUrl(): string | null {
  const base = clientEnv.genshinMarketLoginUrl;
  if (!base) {
    return null;
  }

  const url = new URL(base);
  url.searchParams.set('redirect', buildSsoCallbackUrl());
  return url.toString();
}
