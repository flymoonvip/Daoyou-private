import type { DomainEventEnvelope } from '@daoyou/contracts/events';
import type { RealmType } from '@daoyou/constants/realms';
import { QUALITY_ORDER } from '@daoyou/constants/qualities';
import type { FeatureCommandResult } from '@server/player/application/state/CommandExecutors.js';
import type { DbTransaction } from '@server/lib/drizzle/db.js';
import { CombatV6RuntimeStore } from '@server/combat/application/CombatV6RuntimeStore.js';
import { findExternalJourneyByCultivatorId } from '@server/journey/application/ExternalJourneyRepository.js';
import { emitJourneyProgress } from '@server/journey/application/JourneyLifecycle.js';
import { rankToScore } from '../catalog.js';
import {
  bumpStreak,
  incrementCounter,
  recordCounterMax,
  unlockAchievements,
} from './AchievementService.js';

/**
 * 领域事件 → 成就判定投影（durable consumer `achievement-projector-v1`，订阅全部领域事件）。
 *
 * 只消费「终态」事件：境界变化、炼丹/炼器产出、秘境结算、排行变动、灵兽捕获、灵田、宗门捐献、
 * 战斗终局。判定在 executeDomainEvent 的事务内完成，消费账本保证幂等。
 */

const REALM_ACHIEVEMENT: Partial<Record<RealmType, string>> = {
  筑基: 'realm.zhuji',
  金丹: 'realm.jindan',
  元婴: 'realm.yuanying',
  化神: 'realm.huashan',
  炼虚: 'realm.lianxu',
  合体: 'realm.heti',
  大乘: 'realm.dacheng',
  渡劫: 'realm.dujie',
};

/** 「高阶丹药」门槛：地品及以上 */
const HIGH_GRADE_QUALITY_ORDER = QUALITY_ORDER['地品'];

/** 战斗来源 → 分项胜场计数 key（终局记录的 metadata.sourceType） */
const BATTLE_SOURCE_COUNTER: Record<string, string> = {
  'training-room': 'combat.win.training',
  'wild-encounter': 'combat.win.wild',
  'sect-task': 'combat.win.sect_task',
  ranking: 'combat.win.ranking',
  tower: 'combat.win.tower',
  dungeon: 'combat.win.dungeon',
  breakthrough: 'combat.win.breakthrough',
  hunt: 'combat.win.hunt',
  'arena-sparring': 'combat.win.arena',
};

const runtimeStore = new CombatV6RuntimeStore();

const DONE: FeatureCommandResult<null> = { result: null, resourceChanges: [] };

export async function projectAchievementDomainEvent(
  event: DomainEventEnvelope,
  tx: DbTransaction,
): Promise<FeatureCommandResult<null>> {
  switch (event.type) {
    case 'cultivator.realm.changed': {
      const data = (event as DomainEventEnvelope<'cultivator.realm.changed'>).data;
      const cultivatorId = data.cultivatorId;
      await incrementCounter(cultivatorId, 'breakthrough.count', 1, tx);
      if (data.toStage === '中期') {
        await incrementCounter(cultivatorId, 'realm.stage.mid', 1, tx);
        await unlockAchievements(cultivatorId, ['realm.stage.mid.first'], tx);
      }
      if (data.toStage === '后期') {
        await incrementCounter(cultivatorId, 'realm.stage.late', 1, tx);
        await unlockAchievements(cultivatorId, ['realm.stage.late.first'], tx);
      }
      if (data.toStage === '圆满') {
        await incrementCounter(cultivatorId, 'realm.stage.full', 1, tx);
      }
      if (data.major) {
        await incrementCounter(cultivatorId, 'realm.major', 1, tx);
        const id = REALM_ACHIEVEMENT[data.toRealm];
        if (id) await unlockAchievements(cultivatorId, [id], tx);
        if (await findExternalJourneyByCultivatorId(cultivatorId, tx)) {
          if (data.toRealm === '金丹') {
            await unlockAchievements(cultivatorId, ['journey.realm.jindan'], tx);
          }
          if (data.toRealm === '化神') {
            await unlockAchievements(cultivatorId, ['journey.realm.huashan'], tx);
          }
          if (data.toRealm === '炼虚') {
            await unlockAchievements(cultivatorId, ['journey.archive.top'], tx);
          }
        }
      }
      await emitJourneyProgress(cultivatorId, `${data.toRealm}:${data.toStage}`, tx);
      return DONE;
    }
    case 'alchemy.craft.completed': {
      const data = (event as DomainEventEnvelope<'alchemy.craft.completed'>).data;
      await incrementCounter(data.cultivatorId, 'alchemy.count', 1, tx);
      await incrementCounter(data.cultivatorId, 'alchemy.success', 1, tx);
      await incrementCounter(data.cultivatorId, `alchemy.${data.mode}`, 1, tx);
      return DONE;
    }
    case 'craft.item.created': {
      const data = (event as DomainEventEnvelope<'craft.item.created'>).data;
      if (data.itemType === 'consumable' && QUALITY_ORDER[data.quality] >= HIGH_GRADE_QUALITY_ORDER) {
        await unlockAchievements(data.cultivatorId, ['alchemy.grade.high'], tx);
      }
      if (data.itemType === 'artifact') {
        await incrementCounter(data.cultivatorId, 'forging.count', 1, tx);
      }
      return DONE;
    }
    case 'equipment.forged': {
      const data = (event as DomainEventEnvelope<'equipment.forged'>).data;
      await incrementCounter(data.cultivatorId, 'forging.count', 1, tx);
      // baseQuality ∈ [0,1]：≥0.9 视为五星级品质，=1 视为满词条极品
      const quality = Number(data.equipment.baseQuality ?? 0);
      if (quality >= 0.75) await unlockAchievements(data.cultivatorId, ['forging.quality.4star'], tx);
      if (quality >= 0.9) await unlockAchievements(data.cultivatorId, ['forging.quality.5star'], tx);
      if (quality >= 0.999) {
        await unlockAchievements(data.cultivatorId, ['forging.perfect.first'], tx);
        await incrementCounter(data.cultivatorId, 'forging.perfect', 1, tx);
      }
      return DONE;
    }
    case 'dungeon.run.settled': {
      const data = (event as DomainEventEnvelope<'dungeon.run.settled'>).data;
      if (data.outcome === 'completed') {
        await incrementCounter(data.cultivatorId, 'dungeon.clear', 1, tx);
      }
      return DONE;
    }
    case 'ranking.position.changed': {
      const data = (event as DomainEventEnvelope<'ranking.position.changed'>).data;
      const score = rankToScore(data.rank);
      await recordCounterMax(data.cultivatorId, 'arena.rank.best', score, tx);
      return DONE;
    }
    case 'beast.exceptional.acquired': {
      const data = (event as DomainEventEnvelope<'beast.exceptional.acquired'>).data;
      const ids = ['beast.talent.high'];
      if (data.source === 'capture') ids.push('beast.capture.first');
      if (data.source === 'fusion') ids.push('beast.evolve.first');
      await unlockAchievements(data.cultivatorId, ids, tx);
      return DONE;
    }
    case 'spirit-field.sown': {
      const data = (event as DomainEventEnvelope<'spirit-field.sown'>).data;
      await unlockAchievements(data.cultivatorId, ['spirit_field.first'], tx);
      await incrementCounter(data.cultivatorId, 'spirit_field.sow', 1, tx);
      return DONE;
    }
    case 'spirit-field.care.performed': {
      const data = (event as DomainEventEnvelope<'spirit-field.care.performed'>).data;
      await unlockAchievements(data.cultivatorId, ['spirit_field.first'], tx);
      await incrementCounter(data.cultivatorId, 'spirit_field.care', 1, tx);
      return DONE;
    }
    case 'spirit-field.harvest.completed': {
      const data = (event as DomainEventEnvelope<'spirit-field.harvest.completed'>).data;
      await unlockAchievements(data.cultivatorId, ['spirit_field.first'], tx);
      await incrementCounter(data.cultivatorId, 'spirit_field.harvest', 1, tx);
      if (data.outcomeKind === 'spirit_fruit') {
        await incrementCounter(data.cultivatorId, 'spirit_field.fruit', 1, tx);
      }
      return DONE;
    }
    case 'spirit-field.upgraded': {
      const data = (event as DomainEventEnvelope<'spirit-field.upgraded'>).data;
      await unlockAchievements(data.cultivatorId, ['spirit_field.first'], tx);
      await recordCounterMax(data.cultivatorId, 'spirit_field.level', data.toLevel, tx);
      return DONE;
    }
    case 'sect.construction.donated': {
      const data = (event as DomainEventEnvelope<'sect.construction.donated'>).data;
      await incrementCounter(data.cultivatorId, 'sect.contribution', data.contribution, tx);
      await incrementCounter(data.cultivatorId, 'sect.construction', 1, tx);
      return DONE;
    }
    case 'combat.v6.battle.finished': {
      const data = (event as DomainEventEnvelope<'combat.v6.battle.finished'>).data;
      // 事件只带指针；终局记录在 Redis，过期即跳过（成就不阻塞结算）
      const record = await runtimeStore.terminalRecord(data.battleId).catch(() => null);
      if (!record) return DONE;
      const cultivatorId = record.cultivatorId;
      if (record.outcome === 'victory') {
        await incrementCounter(cultivatorId, 'combat.win', 1, tx);
        await bumpStreak(cultivatorId, 'combat.streak.current', 'combat.streak', true, tx);
        const source = data.sourceType ?? record.metadata.sourceType;
        const sourceCounter = BATTLE_SOURCE_COUNTER[source];
        if (sourceCounter) await incrementCounter(cultivatorId, sourceCounter, 1, tx);
        if (source === 'hunt') await incrementCounter(cultivatorId, 'hunts.kill', 1, tx);
      } else if (record.outcome === 'defeat') {
        await incrementCounter(cultivatorId, 'combat.lose', 1, tx);
        await bumpStreak(cultivatorId, 'combat.streak.current', 'combat.streak', false, tx);
      }
      return DONE;
    }
    default:
      return DONE;
  }
}
