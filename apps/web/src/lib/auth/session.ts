import { apiFetch } from '@app/lib/api/fetch';

/**
 * 会话接口客户端。
 *
 * 登录入口收敛到原神市场账号后，本站不再暴露自有密码/验证码登录，
 * 所有会话能力都收敛到 `/api/session`：
 *   - GET  /api/session                 读取当前会话
 *   - POST /api/session/exchange        一次性票据换会话
 *   - POST /api/session/logout          退出登录
 *   - POST /api/session/account-deletion 注销账号
 */

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: string;
};

export type SessionSnapshot = {
  user: SessionUser | null;
};

export type SessionError = {
  message: string;
  status?: number;
};

type ApiPayload<TData> = {
  success?: boolean;
  data?: TData;
  error?: string;
};

async function readPayload<TData>(response: Response): Promise<ApiPayload<TData>> {
  return (await response.json().catch(() => ({
    success: false,
    error: '服务器返回了无法解析的响应',
  }))) as ApiPayload<TData>;
}

function toSessionError(
  response: Response,
  error: string | undefined,
  fallback: string,
): SessionError {
  return error
    ? { message: error, status: response.status }
    : { message: fallback, status: response.status };
}

export async function getSession(options: {
  signal?: AbortSignal;
  cache?: RequestCache;
} = {}): Promise<{ data: SessionSnapshot | null; error: SessionError | null }> {
  try {
    const response = await apiFetch('/api/session', {
      cache: options.cache ?? 'no-store',
      credentials: 'include',
      signal: options.signal,
    });
    const payload = await readPayload<SessionSnapshot>(response);

    if (!response.ok || !payload.success || !payload.data) {
      return {
        data: null,
        error: toSessionError(response, payload.error, '会话校验失败'),
      };
    }

    return { data: payload.data, error: null };
  } catch (error) {
    if (options.signal?.aborted) {
      throw error;
    }

    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : '会话校验失败',
      },
    };
  }
}

async function postSession<TData extends object>(
  path: string,
  body: object | undefined,
  fallback: string,
): Promise<TData> {
  const response = await apiFetch(path, {
    method: 'POST',
    credentials: 'include',
    ...(body
      ? {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const payload = await readPayload<TData>(response);

  if (!response.ok || !payload.success || !payload.data) {
    throw toSessionError(response, payload.error, fallback);
  }

  return payload.data;
}

/** 用一次性票据换取本站会话；票据由原神市场签发且只能用一次。 */
export function exchangeSsoTicket(ticket: string): Promise<{ userId: string }> {
  return postSession<{ userId: string }>(
    '/api/session/exchange',
    { ticket },
    '登录失败，请稍后重试',
  );
}

export function signOutSession(): Promise<{ loggedOut: true }> {
  return postSession<{ loggedOut: true }>(
    '/api/session/logout',
    undefined,
    '退出登录失败，请稍后重试',
  );
}

export function deleteAccount(): Promise<{ deleted: true }> {
  return postSession<{ deleted: true }>(
    '/api/session/account-deletion',
    undefined,
    '账号注销失败，请稍后重试',
  );
}
