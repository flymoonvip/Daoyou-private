import type { ApiSuccess } from './http.js';
import { z } from 'zod';

/** 会话用户快照。身份来源收敛到原神市场账号后，Daoyou 不再保留自有密码。 */
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: string;
};

/** 当前会话：未登录时 user 为 null（前端据此决定跳转登录页） */
export type SessionResponse = ApiSuccess<{ user: SessionUser | null }>;

export const SsoExchangeRequestSchema = z.object({
  ticket: z.string().min(1, '缺少票据'),
});

export type SsoExchangeRequest = z.infer<typeof SsoExchangeRequestSchema>;

export type SsoExchangeResponse = ApiSuccess<{ userId: string }>;

export type SessionLogoutResponse = ApiSuccess<{ loggedOut: true }>;

export type AccountDeleteResponse = ApiSuccess<{ deleted: true }>;
