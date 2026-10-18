import type {
  PlayerResourceEventsResponse,
  PlayerResourcesResponse,
} from '@daoyou/contracts/player';
import {
  requiresResourceEventReload,
  type ResourceScope,
} from '@daoyou/contracts/resources';
import { HttpException, Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.service.js';
import { authUsers } from '@server/lib/auth/schema.js';
import type { DbClient } from '@server/lib/drizzle/db.js';
import { cultivators, sectMemberships } from '@server/lib/drizzle/schema.js';
import { listPlayerJournal } from '@server/lib/repositories/playerJournalRepository.js';
import {
  readResourceEventWindow,
  RESOURCE_EVENT_PAGE_LIMIT,
} from '@server/lib/repositories/playerStateRepository.js';
import {
  parsePlayerResourceKeys,
  readPlayerResourcesSnapshot,
} from '@server/player/application/PlayerResourceReaderService.js';
import { and, eq } from 'drizzle-orm';

/** 供主站（原神市场）活动页展示的道友角色简介快照 */
export type ExternalCultivatorProfile = {
  name: string;
  title: string | null;
  gender: string | null;
  origin: string | null;
  personality: string | null;
  background: string | null;
  realm: string;
  realm_stage: string;
  age: number;
};

@Injectable()
export class PlayerService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly database: DbClient) {}

  /**
   * 按主站用户 ID 读取其当前道友角色的简介。
   * 主站用户经跨站 SSO 建档时以 externalAuthId 一一对应；尚未进入过道友
   * （无映射）或尚无活跃角色时返回 null，由调用方决定如何展示。
   */
  async externalProfileByExternalAuthId(
    externalUserId: string,
  ): Promise<ExternalCultivatorProfile | null> {
    const [user] = await this.database
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(eq(authUsers.externalAuthId, externalUserId))
      .limit(1);
    if (!user) return null;

    const [row] = await this.database
      .select({
        name: cultivators.name,
        title: cultivators.title,
        gender: cultivators.gender,
        origin: cultivators.origin,
        personality: cultivators.personality,
        background: cultivators.background,
        realm: cultivators.realm,
        realm_stage: cultivators.realm_stage,
        age: cultivators.age,
      })
      .from(cultivators)
      .where(
        and(
          eq(cultivators.userId, user.id),
          eq(cultivators.status, 'active'),
        ),
      )
      .limit(1);
    if (!row) return null;

    return {
      name: row.name,
      title: row.title ?? null,
      gender: row.gender ?? null,
      origin: row.origin ?? null,
      personality: row.personality ?? null,
      background: row.background ?? null,
      realm: row.realm,
      realm_stage: row.realm_stage,
      age: row.age,
    };
  }

  async journal(
    cultivatorId: string,
    query: Parameters<typeof listPlayerJournal>[1],
  ) {
    return {
      success: true,
      data: await listPlayerJournal(cultivatorId, query),
    };
  }

  async resources(
    userId: string,
    rawKeys: string,
  ): Promise<PlayerResourcesResponse> {
    let keys;
    try {
      keys = parsePlayerResourceKeys(rawKeys);
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : '玩家资源 keys 无效',
        },
        400,
      );
    }
    return {
      success: true,
      data: await readPlayerResourcesSnapshot({ userId, keys }),
    };
  }

  async events(
    userId: string,
    scope: ResourceScope,
    after: number,
  ): Promise<PlayerResourceEventsResponse> {
    const active = await this.database.query.cultivators.findFirst({
      columns: { id: true },
      where: and(
        eq(cultivators.userId, userId),
        eq(cultivators.status, 'active'),
      ),
    });
    if (
      !(await this.canReadScope(
        { userId, cultivatorId: active?.id ?? null },
        scope,
      ))
    ) {
      throw new HttpException(
        { success: false, error: '无权读取该资源作用域' },
        403,
      );
    }
    const window = await readResourceEventWindow(scope, after);
    return {
      success: true,
      data: {
        after,
        scope,
        currentScopeVersion: window.currentScopeVersion,
        earliestAvailableVersion: window.earliestAvailableVersion,
        changes: window.changes.slice(0, RESOURCE_EVENT_PAGE_LIMIT),
        requiresReload:
          window.hasIncompatibleEvents ||
          requiresResourceEventReload(window, after, RESOURCE_EVENT_PAGE_LIMIT),
      },
    };
  }

  private async canReadScope(
    ref: { userId: string; cultivatorId: string | null },
    scope: ResourceScope,
  ): Promise<boolean> {
    if (scope.kind === 'account') return scope.id === ref.userId;
    if (scope.kind === 'cultivator')
      return Boolean(ref.cultivatorId && scope.id === ref.cultivatorId);
    if (scope.kind === 'global') return scope.id === 'global';
    if (!ref.cultivatorId) return false;
    const membership = await this.database.query.sectMemberships.findFirst({
      columns: { id: true },
      where: and(
        eq(sectMemberships.cultivatorId, ref.cultivatorId),
        eq(sectMemberships.sectId, scope.id),
        eq(sectMemberships.status, 'active'),
      ),
    });
    return Boolean(membership);
  }
}
