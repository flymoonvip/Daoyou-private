import { Injectable } from '@nestjs/common';
import { resolveActiveCultivatorRef } from '@server/lib/auth/activeCultivator.js';
import { auth } from '@server/lib/auth/auth.js';
import { authUsers } from '@server/lib/auth/schema.js';
import type { AuthUser } from '@server/lib/auth/types.js';
import { db } from '@server/lib/drizzle/db.js';
import {
  markAccountDeletionCompleted,
  recordPendingAccountDeletion,
} from '@server/lib/repositories/accountDeletionRepository.js';
import { eq } from 'drizzle-orm';

@Injectable()
export class SessionService {
  /**
   * 读取当前会话。登录入口虽已收敛到原神市场账号，但会话仍由 Better Auth 机制承载
   * （Cookie 名称与签名格式不变），所以这里继续委托 `auth.api.getSession`：
   * 管理端的封禁 / 改邮箱 / 强制下线与实时连接鉴权均无需改动。
   */
  getSession(headers: Headers) {
    return auth.api.getSession({ headers, returnHeaders: true });
  }

  getActiveCultivator(user: AuthUser) {
    return resolveActiveCultivatorRef(user);
  }

  /** 退出登录：删除会话行，并返回携带清除 Cookie 的响应头 */
  signOut(headers: Headers) {
    return auth.api.signOut({ headers, returnHeaders: true });
  }

  /**
   * 注销账号：先登记待注销记录（保留角色 ID 便于追溯），再删除账号行
   * （外键级联清理会话与第三方绑定），最后标记记录为已完成。
   */
  async deleteAccount(user: AuthUser): Promise<void> {
    await recordPendingAccountDeletion(user.id);
    await db.delete(authUsers).where(eq(authUsers.id, user.id));
    await markAccountDeletionCompleted(user.id);
  }
}
