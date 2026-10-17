import { Injectable } from '@nestjs/common';
import {
  redeemGenshinMarketTicket,
  type GenshinMarketIdentity,
} from '@server/lib/auth/genshinMarketSso.js';
import { authUsers } from '@server/lib/auth/schema.js';
import { createSession } from '@server/lib/auth/sessionCookie.js';
import { db } from '@server/lib/drizzle/db.js';
import { eq } from 'drizzle-orm';

@Injectable()
export class SsoService {
  /**
   * 一次性票据换本地会话：
   *   1. 服务端凭内部密钥向原神市场兑换身份（票据一次性、60 秒有效）
   *   2. 按 externalAuthId 建档或同步昵称
   *   3. 签发与原神市场侧一致的 Daoyou 会话
   */
  async exchange(
    ticket: string,
    meta: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<{ userId: string; token: string; expiresAt: Date }> {
    const identity = await redeemGenshinMarketTicket(ticket);
    const userId = await ensureLocalUser(identity);
    const session = await createSession(userId, meta);
    return { userId, ...session };
  }
}

function displayNameOf(identity: GenshinMarketIdentity): string {
  return (
    identity.nickname?.trim() || identity.username?.trim() || '道友'
  );
}

/**
 * 原神市场账号可能没有邮箱（仅账号名注册），此时用稳定的占位邮箱；
 * 占位邮箱以外部身份 ID 派生，天然唯一且不会与真实邮箱冲突。
 */
function emailOf(identity: GenshinMarketIdentity): string {
  return identity.email?.trim() || `${identity.userId}@daoyou.invalid`;
}

async function ensureLocalUser(identity: GenshinMarketIdentity): Promise<string> {
  const trimmedExternalAuthId = identity.userId.trim();

  const [existing] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.externalAuthId, trimmedExternalAuthId))
    .limit(1);

  if (existing) {
    await db
      .update(authUsers)
      .set({ name: displayNameOf(identity), updatedAt: new Date() })
      .where(eq(authUsers.id, existing.id));
    return existing.id;
  }

  const [created] = await db
    .insert(authUsers)
    .values({
      name: displayNameOf(identity),
      email: emailOf(identity),
      emailVerified: true,
      externalAuthId: trimmedExternalAuthId,
    })
    .returning({ id: authUsers.id });

  return created.id;
}
