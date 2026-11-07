import { getRuntimeEnvironment } from '@server/lib/config/environment.js';

/**
 * 道友 → 主站（原神市场）活动回调客户端。
 *
 * 只负责一次 HTTP 投递；重试与退避由 ExternalCallbackOutbox 的 DB 队列驱动。
 * 鉴权头 X-Internal-Secret 使用独立的 DAOYOU_CALLBACK_SECRET，与 SSO 兑换密钥分离。
 */

const CALLBACK_TIMEOUT_MS = 10_000;

export type GenshinMarketCallbackKind = 'achievement' | 'cultivator-status';

const CALLBACK_PATHS: Record<GenshinMarketCallbackKind, string> = {
  achievement: '/api/v1/internal/daoyou/achievement',
  'cultivator-status': '/api/v1/internal/daoyou/cultivator-status',
};

export type CallbackDeliveryResult =
  /** 2xx 且主站 success=true */
  | { ok: true; status: number }
  /** 主站明确拒绝（4xx）：业务错误，不应无限重试 */
  | { ok: false; retryable: false; status: number; error: string }
  /** 网络错误 / 超时 / 5xx：可重试 */
  | { ok: false; retryable: true; status?: number; error: string };

export function isGenshinMarketCallbackConfigured(): boolean {
  const env = getRuntimeEnvironment();
  return Boolean(env.GENSHIN_MARKET_SSO_BASE_URL && env.DAOYOU_CALLBACK_SECRET);
}

export async function deliverGenshinMarketCallback(
  kind: GenshinMarketCallbackKind,
  payload: Record<string, unknown>,
): Promise<CallbackDeliveryResult> {
  const env = getRuntimeEnvironment();
  const baseUrl = env.GENSHIN_MARKET_SSO_BASE_URL?.trim().replace(/\/+$/, '');
  const secret = env.DAOYOU_CALLBACK_SECRET?.trim();
  if (!baseUrl || !secret) {
    return { ok: false, retryable: true, error: 'callback channel not configured' };
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${CALLBACK_PATHS[kind]}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': secret,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(CALLBACK_TIMEOUT_MS),
    });
  } catch (error) {
    return {
      ok: false,
      retryable: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const body = (await response.json().catch(() => null)) as
    | { success?: boolean; message?: string; error?: string }
    | null;

  if (response.ok && body?.success) {
    return { ok: true, status: response.status };
  }
  const error = body?.error || body?.message || `HTTP ${response.status}`;
  // 429（限流）与 5xx 可重试；其余 4xx 是业务拒绝（记录不存在 / 用户不匹配），重试也不会成功
  if (response.status >= 500 || response.status === 429) {
    return { ok: false, retryable: true, status: response.status, error };
  }
  return { ok: false, retryable: false, status: response.status, error };
}
