import type { RealmStage, RealmType } from '@daoyou/constants/realms';
import { getRealmStageRank } from '@daoyou/game-domain/progression';

// 原「炼气后期」门槛在新十三层体系下对应「九层」（同为旧四阶段 3/4 处）。
const LATE_QI_REFINING = { realm: '炼气', stage: '九层' } as const;

/** 炼气九层及以上。兑换码、拍卖行与好友传音赠物共用这一门槛。 */
export function hasReachedLateQiRefining(
  realm: RealmType,
  stage: RealmStage,
): boolean {
  return (
    getRealmStageRank(realm, stage) >=
    getRealmStageRank(LATE_QI_REFINING.realm, LATE_QI_REFINING.stage)
  );
}

export const LATE_QI_REDEEM_DENIED = '达到炼气九层后方可兑换';
export const LATE_QI_AUCTION_DENIED = '达到炼气九层后方可使用拍卖行';
export const LATE_QI_FRIEND_GIFT_DENIED = '达到炼气九层后方可向好友赠送物品';
