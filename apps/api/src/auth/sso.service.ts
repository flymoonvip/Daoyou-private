import { Injectable } from '@nestjs/common';
import {
  redeemGenshinMarketTicket,
  type GenshinMarketIdentity,
} from '@server/lib/auth/genshinMarketSso.js';
import { ensureExternalUser } from '@server/lib/auth/externalUser.js';
import { createSession } from '@server/lib/auth/sessionCookie.js';
import { findCultivatorOwnerStatusById } from '@server/lib/repositories/cultivatorRepository.js';
import { markJourneyEntered } from '@server/journey/application/JourneyLifecycle.js';

@Injectable()
export class SsoService {
  /**
   * 一次性票据换本地会话：
   *   1. 服务端凭内部密钥向原神市场兑换身份（票据一次性、60 秒有效）
   *   2. 按 externalAuthId 建档或同步昵称
   *   3. 签发与原神市场侧一致的 Daoyou 会话
   *   4. 票据带「万界道友」转世载荷时，只登录到已存在的角色并记录首次入世；绝不在此新建角色
   */
  async exchange(
    ticket: string,
    meta: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<{ userId: string; token: string; expiresAt: Date }> {
    const identity = await redeemGenshinMarketTicket(ticket);
    const userId = await ensureExternalUser(identity);
    await this.touchJourney(identity, userId);
    const session = await createSession(userId, meta);
    return { userId, ...session };
  }

  /**
   * 转世载荷校验：cultivatorId 必须存在且属于该用户。
   * 找不到角色时不创建，只记错误交由主站对账任务处理（主站会按 journey-status 释放占用）。
   */
  private async touchJourney(identity: GenshinMarketIdentity, userId: string): Promise<void> {
    const journey = identity.journey;
    if (!journey?.cultivatorId) return;
    try {
      const owner = await findCultivatorOwnerStatusById(journey.cultivatorId);
      if (!owner || owner.userId !== userId) {
        console.error('[sso] journey cultivator missing or not owned; skip (main site reconciles)', {
          journeyId: journey.journeyId,
          cultivatorId: journey.cultivatorId,
          userId,
        });
        return;
      }
      if (owner.status === 'active') {
        await markJourneyEntered(journey.cultivatorId);
      }
    } catch (error) {
      console.error('[sso] journey entry bookkeeping failed', { journeyId: journey.journeyId, error });
    }
  }
}
