import { authUsers } from '@server/lib/auth/schema.js';
import { db } from '@server/lib/drizzle/db.js';
import { eq } from 'drizzle-orm';

/** 主站（原神市场）身份的最小子集：SSO 兑换与外部降世建号共用 */
export interface ExternalIdentity {
  /** 主站用户 ID，写入 better_auth.user.externalAuthId */
  userId: string;
  username?: string | null;
  email?: string | null;
  nickname?: string | null;
}

export function displayNameOf(identity: ExternalIdentity): string {
  return identity.nickname?.trim() || identity.username?.trim() || '道友';
}

/**
 * 原神市场账号可能没有邮箱（仅账号名注册），此时用稳定的占位邮箱；
 * 占位邮箱以外部身份 ID 派生，天然唯一且不会与真实邮箱冲突。
 */
export function emailOf(identity: ExternalIdentity): string {
  return identity.email?.trim() || `${identity.userId}@daoyou.invalid`;
}

/**
 * 按 externalAuthId 建档或同步昵称，返回本地用户 ID。
 *
 * 先 INSERT ... ON CONFLICT DO NOTHING 再查询：主站 SSO 首登与服务端建号可能并发到达同一账号，
 * 两条路径都要落到同一个本地用户，不能出现唯一键冲突抛错。
 */
export async function ensureExternalUser(identity: ExternalIdentity): Promise<string> {
  const externalAuthId = identity.userId.trim();
  if (!externalAuthId) throw new Error('外部用户标识为空');
  const hasProfile = Boolean(identity.nickname?.trim() || identity.username?.trim());

  const [existing] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.externalAuthId, externalAuthId))
    .limit(1);

  if (existing) {
    if (hasProfile) {
      await db
        .update(authUsers)
        .set({ name: displayNameOf(identity), updatedAt: new Date() })
        .where(eq(authUsers.id, existing.id));
    }
    return existing.id;
  }

  const inserted = await db
    .insert(authUsers)
    .values({
      name: displayNameOf(identity),
      email: emailOf(identity),
      emailVerified: true,
      externalAuthId,
    })
    .onConflictDoNothing({ target: authUsers.externalAuthId })
    .returning({ id: authUsers.id });

  if (inserted[0]) return inserted[0].id;

  const [raced] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.externalAuthId, externalAuthId))
    .limit(1);
  if (!raced) throw new Error('外部用户建档失败');
  return raced.id;
}

/** 已建档的本地用户 ID（不创建） */
export async function findExternalUserId(externalUserId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.externalAuthId, externalUserId.trim()))
    .limit(1);
  return row?.id ?? null;
}
