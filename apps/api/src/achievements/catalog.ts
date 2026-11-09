/**
 * 成就目录：「万界道友」活动（主站 1000009）全部 263 个成就的定义。
 *
 * 规范（与主站 DaoyouAchievementData.jsonc 的 ID 一一对应）：
 *   - ID 形如 <module>.<action>[.<threshold>]，小写点分隔，稳定不变；
 *   - 计数类成就拆成固定阈值 ID（combat.win.10 / combat.win.100），计数表只累加，规则读计数判阈值；
 *   - 奖励金额不在这里：道友只上报 achievementId（触发事实），代币由主站奖励表裁定。
 *
 * counter.key 是 wanjiedaoyou_player_counters 的 counter_key；mode:
 *   - 'sum'  累加（次数 / 累计额）
 *   - 'max'  取最大值（年龄 / 层数 / 名次等「达到过」语义）
 */

export type AchievementCategory =
  | 'realm'
  | 'breakthrough'
  | 'sect'
  | 'combat'
  | 'explore'
  | 'craft'
  | 'beast'
  | 'dao'
  | 'trade'
  | 'social'
  | 'journey';

export type CounterMode = 'sum' | 'max';

export interface AchievementDefinition {
  id: string;
  title: string;
  desc: string;
  category: AchievementCategory;
  /** 计数类成就；一次性成就不填 */
  counter?: { key: string; threshold: number; mode: CounterMode };
}

const sum = (key: string, threshold: number) => ({ key, threshold, mode: 'sum' as const });
const max = (key: string, threshold: number) => ({ key, threshold, mode: 'max' as const });

export const ACHIEVEMENT_CATALOG: readonly AchievementDefinition[] = [
  // ---------- A. 境界与修炼（23） ----------
  { id: 'realm.zhuji', title: '初入筑基', desc: '首次到达筑基', category: 'realm' },
  { id: 'realm.jindan', title: '金丹大道', desc: '首次到达金丹', category: 'realm' },
  { id: 'realm.yuanying', title: '元婴出窍', desc: '首次到达元婴', category: 'realm' },
  { id: 'realm.huashan', title: '化神之境', desc: '首次到达化神', category: 'realm' },
  { id: 'realm.lianxu', title: '炼虚合道', desc: '首次到达炼虚', category: 'realm' },
  { id: 'realm.heti', title: '天人合体', desc: '首次到达合体', category: 'realm' },
  { id: 'realm.dacheng', title: '大乘圆满', desc: '首次到达大乘', category: 'realm' },
  { id: 'realm.dujie', title: '渡劫飞升', desc: '首次到达渡劫', category: 'realm' },
  { id: 'realm.stage.mid.first', title: '中庭信步', desc: '首次进入境界中期', category: 'realm' },
  { id: 'realm.stage.mid.10', title: '十度中期', desc: '累计进入境界中期 10 次', category: 'realm', counter: sum('realm.stage.mid', 10) },
  { id: 'realm.stage.late.first', title: '登堂入室', desc: '首次进入境界后期', category: 'realm' },
  { id: 'realm.stage.late.10', title: '十度后期', desc: '累计进入境界后期 10 次', category: 'realm', counter: sum('realm.stage.late', 10) },
  { id: 'realm.stage.full.first', title: '初次圆满', desc: '首次到达任一境界圆满', category: 'realm', counter: sum('realm.stage.full', 1) },
  { id: 'realm.stage.full.10', title: '十次圆满', desc: '累计 10 次境界圆满', category: 'realm', counter: sum('realm.stage.full', 10) },
  { id: 'realm.stage.full.50', title: '五十次圆满', desc: '累计 50 次境界圆满', category: 'realm', counter: sum('realm.stage.full', 50) },
  { id: 'realm.stage.full.100', title: '百炼圆满', desc: '累计 100 次境界圆满', category: 'realm', counter: sum('realm.stage.full', 100) },
  { id: 'realm.major.3', title: '三境飞渡', desc: '累计完成 3 次大境界突破', category: 'realm', counter: sum('realm.major', 3) },
  { id: 'realm.major.5', title: '五境通玄', desc: '累计完成 5 次大境界突破', category: 'realm', counter: sum('realm.major', 5) },
  { id: 'cultivate.retreat.first', title: '初次闭关', desc: '首次闭关', category: 'realm', counter: sum('cultivate.retreat', 1) },
  { id: 'cultivate.retreat.10', title: '静坐常思', desc: '累计闭关 10 次', category: 'realm', counter: sum('cultivate.retreat', 10) },
  { id: 'cultivate.retreat.50', title: '半世清修', desc: '累计闭关 50 次', category: 'realm', counter: sum('cultivate.retreat', 50) },
  { id: 'cultivate.retreat.100', title: '百年苦修', desc: '累计闭关 100 次', category: 'realm', counter: sum('cultivate.retreat', 100) },
  { id: 'cultivate.retreat.500', title: '五百次入定', desc: '累计闭关 500 次', category: 'realm', counter: sum('cultivate.retreat', 500) },

  // ---------- B. 突破、寿元与转世（23） ----------
  { id: 'breakthrough.first', title: '破境', desc: '首次突破成功', category: 'breakthrough', counter: sum('breakthrough.count', 1) },
  { id: 'breakthrough.fail.first', title: '道途有阻', desc: '首次突破失败', category: 'breakthrough' },
  { id: 'breakthrough.fail.10', title: '十败不馁', desc: '累计突破失败 10 次', category: 'breakthrough', counter: sum('breakthrough.fail', 10) },
  { id: 'breakthrough.fail.50', title: '百折不回', desc: '累计突破失败 50 次', category: 'breakthrough', counter: sum('breakthrough.fail', 50) },
  { id: 'breakthrough.streak.3', title: '一气呵成', desc: '连续 3 次突破成功', category: 'breakthrough', counter: max('breakthrough.streak', 3) },
  { id: 'breakthrough.streak.5', title: '五运亨通', desc: '连续 5 次突破成功', category: 'breakthrough', counter: max('breakthrough.streak', 5) },
  { id: 'breakthrough.streak.10', title: '十转皆成', desc: '连续 10 次突破成功', category: 'breakthrough', counter: max('breakthrough.streak', 10) },
  { id: 'breakthrough.count.50', title: '百炼成钢', desc: '累计突破成功 50 次', category: 'breakthrough', counter: sum('breakthrough.count', 50) },
  { id: 'breakthrough.count.100', title: '百尺竿头', desc: '累计突破成功 100 次', category: 'breakthrough', counter: sum('breakthrough.count', 100) },
  { id: 'breakthrough.count.200', title: '两百破境', desc: '累计突破成功 200 次', category: 'breakthrough', counter: sum('breakthrough.count', 200) },
  { id: 'lifespan.age.100', title: '百岁春秋', desc: '角色年龄达到 100', category: 'breakthrough', counter: max('lifespan.age', 100) },
  { id: 'lifespan.age.200', title: '松鹤延年', desc: '角色年龄达到 200', category: 'breakthrough', counter: max('lifespan.age', 200) },
  { id: 'lifespan.age.500', title: '五百岁', desc: '角色年龄达到 500', category: 'breakthrough', counter: max('lifespan.age', 500) },
  { id: 'lifespan.age.800', title: '八百彭祖', desc: '角色年龄达到 800', category: 'breakthrough', counter: max('lifespan.age', 800) },
  { id: 'lifespan.age.1000', title: '千岁老怪', desc: '角色年龄达到 1000', category: 'breakthrough', counter: max('lifespan.age', 1000) },
  { id: 'death.first', title: '身死道消', desc: '首次陨落', category: 'breakthrough' },
  { id: 'rebirth.first', title: '再入轮回', desc: '同一道友账号完成第二次建号', category: 'breakthrough', counter: max('rebirth.count', 2) },
  { id: 'rebirth.count.3', title: '三世为人', desc: '累计完成 3 次建号', category: 'breakthrough', counter: max('rebirth.count', 3) },
  { id: 'rebirth.count.5', title: '五世轮回', desc: '累计完成 5 次建号', category: 'breakthrough', counter: max('rebirth.count', 5) },
  { id: 'rebirth.count.10', title: '十世修行', desc: '累计完成 10 次建号', category: 'breakthrough', counter: max('rebirth.count', 10) },
  { id: 'journey.survive.7', title: '入世七日', desc: '转世角色存活满 7 天', category: 'breakthrough', counter: max('journey.survive.days', 7) },
  { id: 'journey.survive.30', title: '入世三十日', desc: '转世角色存活满 30 天', category: 'breakthrough', counter: max('journey.survive.days', 30) },
  { id: 'journey.survive.100', title: '百岁转世', desc: '转世角色存活满 100 天', category: 'breakthrough', counter: max('journey.survive.days', 100) },

  // ---------- C. 宗门（21） ----------
  { id: 'sect.join.first', title: '拜入宗门', desc: '首次加入宗门', category: 'sect' },
  { id: 'sect.position.inner', title: '内门弟子', desc: '晋升内门', category: 'sect' },
  { id: 'sect.position.core', title: '真传弟子', desc: '晋升真传', category: 'sect' },
  { id: 'sect.position.elder', title: '宗门长老', desc: '晋升长老', category: 'sect' },
  { id: 'sect.contribution.100', title: '初积贡献', desc: '累计宗门贡献 100', category: 'sect', counter: sum('sect.contribution', 100) },
  { id: 'sect.contribution.500', title: '小有贡献', desc: '累计宗门贡献 500', category: 'sect', counter: sum('sect.contribution', 500) },
  { id: 'sect.contribution.1000', title: '千点贡献', desc: '累计宗门贡献 1000', category: 'sect', counter: sum('sect.contribution', 1000) },
  { id: 'sect.contribution.10000', title: '万点贡献', desc: '累计宗门贡献 10000', category: 'sect', counter: sum('sect.contribution', 10000) },
  { id: 'sect.contribution.50000', title: '五万贡献', desc: '累计宗门贡献 50000', category: 'sect', counter: sum('sect.contribution', 50000) },
  { id: 'sect.task.1', title: '初担宗门事', desc: '首次完成宗门任务', category: 'sect', counter: sum('sect.task', 1) },
  { id: 'sect.task.10', title: '十次奔走', desc: '完成 10 次宗门任务', category: 'sect', counter: sum('sect.task', 10) },
  { id: 'sect.task.50', title: '任劳任怨', desc: '完成 50 次宗门任务', category: 'sect', counter: sum('sect.task', 50) },
  { id: 'sect.task.100', title: '宗门栋梁', desc: '完成 100 次宗门任务', category: 'sect', counter: sum('sect.task', 100) },
  { id: 'sect.task.500', title: '劳苦功高', desc: '完成 500 次宗门任务', category: 'sect', counter: sum('sect.task', 500) },
  { id: 'sect.war.first', title: '初战宗门', desc: '首次参加宗门战', category: 'sect' },
  { id: 'sect.war.10', title: '十战宗门', desc: '参加 10 次宗门战', category: 'sect', counter: sum('sect.war', 10) },
  { id: 'sect.war.50', title: '宗门悍将', desc: '参加 50 次宗门战', category: 'sect', counter: sum('sect.war', 50) },
  { id: 'sect.shop.first', title: '初入宝阁', desc: '首次在宗门商店兑换', category: 'sect', counter: sum('sect.shop.purchase', 1) },
  { id: 'sect.shop.10', title: '常客', desc: '在宗门商店兑换 10 次', category: 'sect', counter: sum('sect.shop.purchase', 10) },
  { id: 'sect.shop.50', title: '宝阁贵宾', desc: '在宗门商店兑换 50 次', category: 'sect', counter: sum('sect.shop.purchase', 50) },
  { id: 'sect.construction.10', title: '添砖加瓦', desc: '为宗门建设捐献 10 次', category: 'sect', counter: sum('sect.construction', 10) },

  // ---------- D. 战斗、竞技、爬塔、猎杀（48） ----------
  { id: 'combat.win.first', title: '初战告捷', desc: '首次战斗胜利', category: 'combat', counter: sum('combat.win', 1) },
  { id: 'combat.win.10', title: '小有名气', desc: '累计胜利 10 场', category: 'combat', counter: sum('combat.win', 10) },
  { id: 'combat.win.100', title: '百战之身', desc: '累计胜利 100 场', category: 'combat', counter: sum('combat.win', 100) },
  { id: 'combat.win.500', title: '五百胜绩', desc: '累计胜利 500 场', category: 'combat', counter: sum('combat.win', 500) },
  { id: 'combat.win.1000', title: '千战不败', desc: '累计胜利 1000 场', category: 'combat', counter: sum('combat.win', 1000) },
  { id: 'combat.win.5000', title: '万战封神', desc: '累计胜利 5000 场', category: 'combat', counter: sum('combat.win', 5000) },
  { id: 'combat.lose.1', title: '胜败乃兵家常事', desc: '首次战斗失败', category: 'combat', counter: sum('combat.lose', 1) },
  { id: 'combat.lose.10', title: '屡败屡战', desc: '累计失败 10 场', category: 'combat', counter: sum('combat.lose', 10) },
  { id: 'combat.lose.100', title: '百败不折', desc: '累计失败 100 场', category: 'combat', counter: sum('combat.lose', 100) },
  { id: 'combat.streak.3', title: '三连胜', desc: '取得 3 连胜', category: 'combat', counter: max('combat.streak', 3) },
  { id: 'combat.streak.10', title: '十连胜', desc: '取得 10 连胜', category: 'combat', counter: max('combat.streak', 10) },
  { id: 'combat.streak.30', title: '三十连胜', desc: '取得 30 连胜', category: 'combat', counter: max('combat.streak', 30) },
  { id: 'combat.streak.100', title: '百战百胜', desc: '取得 100 连胜', category: 'combat', counter: max('combat.streak', 100) },
  { id: 'combat.win.training.1', title: '木人桩', desc: '首次在训练场获胜', category: 'combat', counter: sum('combat.win.training', 1) },
  { id: 'combat.win.training.50', title: '勤学苦练', desc: '在训练场获胜 50 次', category: 'combat', counter: sum('combat.win.training', 50) },
  { id: 'combat.win.training.200', title: '十年磨剑', desc: '在训练场获胜 200 次', category: 'combat', counter: sum('combat.win.training', 200) },
  { id: 'combat.win.wild.1', title: '初入荒野', desc: '首次在野外战斗获胜', category: 'combat', counter: sum('combat.win.wild', 1) },
  { id: 'combat.win.wild.200', title: '荒野行者', desc: '在野外获胜 200 次', category: 'combat', counter: sum('combat.win.wild', 200) },
  { id: 'combat.win.sect_task.1', title: '奉命出征', desc: '首次完成宗门战斗任务', category: 'combat', counter: sum('combat.win.sect_task', 1) },
  { id: 'combat.win.sect_task.50', title: '宗门利刃', desc: '完成宗门战斗任务 50 次', category: 'combat', counter: sum('combat.win.sect_task', 50) },
  { id: 'combat.win.dungeon.1', title: '秘境破敌', desc: '首次在秘境战斗获胜', category: 'combat', counter: sum('combat.win.dungeon', 1) },
  { id: 'combat.win.dungeon.50', title: '秘境常胜', desc: '在秘境获胜 50 次', category: 'combat', counter: sum('combat.win.dungeon', 50) },
  { id: 'combat.win.tower.1', title: '塔中初胜', desc: '首次在镇妖塔获胜', category: 'combat', counter: sum('combat.win.tower', 1) },
  { id: 'combat.win.tower.50', title: '镇塔之勇', desc: '在镇妖塔获胜 50 次', category: 'combat', counter: sum('combat.win.tower', 50) },
  { id: 'combat.win.ranking.1', title: '擂台初胜', desc: '首次在排行挑战获胜', category: 'combat', counter: sum('combat.win.ranking', 1) },
  { id: 'combat.win.ranking.50', title: '擂台常客', desc: '在排行挑战获胜 50 次', category: 'combat', counter: sum('combat.win.ranking', 50) },
  { id: 'combat.win.arena.1', title: '斗法初胜', desc: '首次在竞技场获胜', category: 'combat', counter: sum('combat.win.arena', 1) },
  { id: 'combat.win.arena.50', title: '斗法名家', desc: '在竞技场获胜 50 次', category: 'combat', counter: sum('combat.win.arena', 50) },
  { id: 'combat.win.hunt.1', title: '初猎成功', desc: '首次在协同狩猎中获胜', category: 'combat', counter: sum('combat.win.hunt', 1) },
  { id: 'combat.win.hunt.50', title: '猎场老手', desc: '在协同狩猎中获胜 50 次', category: 'combat', counter: sum('combat.win.hunt', 50) },
  { id: 'combat.win.breakthrough.1', title: '雷劫淬体', desc: '首次在突破战中获胜', category: 'combat', counter: sum('combat.win.breakthrough', 1) },
  { id: 'arena.rank.top100', title: '初登擂台', desc: '竞技场进入前 100', category: 'combat', counter: max('arena.rank.best', 1) },
  { id: 'arena.rank.top50', title: '擂台五十强', desc: '竞技场进入前 50', category: 'combat', counter: max('arena.rank.best', 51) },
  { id: 'arena.rank.top10', title: '擂台十强', desc: '竞技场进入前 10', category: 'combat', counter: max('arena.rank.best', 91) },
  { id: 'arena.rank.top3', title: '擂台三甲', desc: '竞技场进入前三', category: 'combat', counter: max('arena.rank.best', 98) },
  { id: 'arena.rank.top1', title: '天下第一', desc: '竞技场登顶', category: 'combat', counter: max('arena.rank.best', 100) },
  { id: 'tower.floor.1', title: '初入镇妖塔', desc: '爬塔到达第 1 层', category: 'combat', counter: max('tower.floor', 1) },
  { id: 'tower.floor.10', title: '初探高塔', desc: '爬塔到达第 10 层', category: 'combat', counter: max('tower.floor', 10) },
  { id: 'tower.floor.20', title: '二十层楼', desc: '爬塔到达第 20 层', category: 'combat', counter: max('tower.floor', 20) },
  { id: 'tower.floor.50', title: '半塔之志', desc: '爬塔到达第 50 层', category: 'combat', counter: max('tower.floor', 50) },
  { id: 'tower.floor.75', title: '高处不胜寒', desc: '爬塔到达第 75 层', category: 'combat', counter: max('tower.floor', 75) },
  { id: 'tower.floor.100', title: '塔顶问道', desc: '爬塔到达第 100 层', category: 'combat', counter: max('tower.floor', 100) },
  { id: 'hunts.kill.1', title: '初试猎刀', desc: '累计猎杀 1 只', category: 'combat', counter: sum('hunts.kill', 1) },
  { id: 'hunts.kill.10', title: '小有斩获', desc: '累计猎杀 10 只', category: 'combat', counter: sum('hunts.kill', 10) },
  { id: 'hunts.kill.100', title: '百妖斩', desc: '累计猎杀 100 只', category: 'combat', counter: sum('hunts.kill', 100) },
  { id: 'hunts.kill.1000', title: '千妖伏诛', desc: '累计猎杀 1000 只', category: 'combat', counter: sum('hunts.kill', 1000) },
  { id: 'replay.share.1', title: '与人论道', desc: '首次分享战斗回放', category: 'combat', counter: sum('replay.share', 1) },
  { id: 'replay.share.10', title: '传阅战帖', desc: '分享战斗回放 10 次', category: 'combat', counter: sum('replay.share', 10) },

  // ---------- E. 探索、剧情与碑文（30） ----------
  { id: 'dungeon.clear.first', title: '初探秘境', desc: '首次通关秘境', category: 'explore', counter: sum('dungeon.clear', 1) },
  { id: 'dungeon.clear.10', title: '秘境常客', desc: '累计通关 10 次', category: 'explore', counter: sum('dungeon.clear', 10) },
  { id: 'dungeon.clear.50', title: '秘境行者', desc: '累计通关 50 次', category: 'explore', counter: sum('dungeon.clear', 50) },
  { id: 'dungeon.clear.100', title: '秘境宗师', desc: '累计通关 100 次', category: 'explore', counter: sum('dungeon.clear', 100) },
  { id: 'dungeon.clear.200', title: '秘境传说', desc: '累计通关 200 次', category: 'explore', counter: sum('dungeon.clear', 200) },
  { id: 'wanderer.trade.1', title: '游方生意', desc: '首次与游方商人交易', category: 'explore', counter: sum('wanderer.trade', 1) },
  { id: 'wanderer.trade.10', title: '熟客', desc: '与游方商人交易 10 次', category: 'explore', counter: sum('wanderer.trade', 10) },
  { id: 'wanderer.trade.50', title: '游方大主顾', desc: '与游方商人交易 50 次', category: 'explore', counter: sum('wanderer.trade', 50) },
  { id: 'spirit_field.first', title: '初入灵田', desc: '首次经营灵田', category: 'explore' },
  { id: 'spirit_field.sow.1', title: '播下灵种', desc: '首次播种', category: 'explore', counter: sum('spirit_field.sow', 1) },
  { id: 'spirit_field.sow.10', title: '十亩灵田', desc: '累计播种 10 次', category: 'explore', counter: sum('spirit_field.sow', 10) },
  { id: 'spirit_field.sow.100', title: '灵田老农', desc: '累计播种 100 次', category: 'explore', counter: sum('spirit_field.sow', 100) },
  { id: 'spirit_field.care.10', title: '悉心照料', desc: '累计照料灵田 10 次', category: 'explore', counter: sum('spirit_field.care', 10) },
  { id: 'spirit_field.care.100', title: '灵田守护', desc: '累计照料灵田 100 次', category: 'explore', counter: sum('spirit_field.care', 100) },
  { id: 'spirit_field.harvest.1', title: '初获灵植', desc: '首次收获灵田', category: 'explore', counter: sum('spirit_field.harvest', 1) },
  { id: 'spirit_field.harvest.10', title: '十次丰收', desc: '累计收获 10 次', category: 'explore', counter: sum('spirit_field.harvest', 10) },
  { id: 'spirit_field.harvest.100', title: '岁岁丰登', desc: '累计收获 100 次', category: 'explore', counter: sum('spirit_field.harvest', 100) },
  { id: 'spirit_field.fruit.1', title: '灵果初结', desc: '首次收获灵果', category: 'explore', counter: sum('spirit_field.fruit', 1) },
  { id: 'spirit_field.fruit.10', title: '十枚灵果', desc: '累计收获 10 枚灵果', category: 'explore', counter: sum('spirit_field.fruit', 10) },
  { id: 'spirit_field.level.3', title: '灵田三级', desc: '灵田升至 3 级', category: 'explore', counter: max('spirit_field.level', 3) },
  { id: 'spirit_field.level.6', title: '灵田满级', desc: '灵田升至 6 级', category: 'explore', counter: max('spirit_field.level', 6) },
  { id: 'story.chapter.1', title: '初入江湖', desc: '完成第一章剧情', category: 'explore', counter: max('story.chapter', 1) },
  { id: 'story.guide.1', title: '初学引路', desc: '完成首次剧情指引', category: 'explore', counter: sum('story.guide', 1) },
  { id: 'story.guide.5', title: '按图索骥', desc: '完成 5 次剧情指引', category: 'explore', counter: sum('story.guide', 5) },
  { id: 'story.guide.10', title: '循循善诱', desc: '完成 10 次剧情指引', category: 'explore', counter: sum('story.guide', 10) },
  { id: 'inscriptions.first', title: '初见碑文', desc: '首次解读碑文', category: 'explore', counter: sum('inscriptions.count', 1) },
  { id: 'inscriptions.count.5', title: '略通古意', desc: '累计解读 5 处碑文', category: 'explore', counter: sum('inscriptions.count', 5) },
  { id: 'inscriptions.count.20', title: '博古通今', desc: '累计解读 20 处碑文', category: 'explore', counter: sum('inscriptions.count', 20) },
  { id: 'inscriptions.count.50', title: '碑林通鉴', desc: '累计解读 50 处碑文', category: 'explore', counter: sum('inscriptions.count', 50) },
  { id: 'inscriptions.count.100', title: '万碑皆识', desc: '累计解读 100 处碑文', category: 'explore', counter: sum('inscriptions.count', 100) },

  // ---------- F. 炼丹、炼器、锻造（21） ----------
  { id: 'alchemy.first', title: '初开丹炉', desc: '首次炼丹', category: 'craft', counter: sum('alchemy.count', 1) },
  { id: 'alchemy.count.10', title: '十炉丹火', desc: '累计炼丹 10 次', category: 'craft', counter: sum('alchemy.count', 10) },
  { id: 'alchemy.count.100', title: '百炉不熄', desc: '累计炼丹 100 次', category: 'craft', counter: sum('alchemy.count', 100) },
  { id: 'alchemy.count.500', title: '丹炉常青', desc: '累计炼丹 500 次', category: 'craft', counter: sum('alchemy.count', 500) },
  { id: 'alchemy.success.10', title: '小有丹成', desc: '累计成功 10 次', category: 'craft', counter: sum('alchemy.success', 10) },
  { id: 'alchemy.success.100', title: '丹道大家', desc: '累计成功 100 次', category: 'craft', counter: sum('alchemy.success', 100) },
  { id: 'alchemy.success.500', title: '丹圣之心', desc: '累计成功 500 次', category: 'craft', counter: sum('alchemy.success', 500) },
  { id: 'alchemy.grade.high', title: '上品灵丹', desc: '首次炼出高阶丹药', category: 'craft' },
  { id: 'alchemy.improvised.1', title: '随手成丹', desc: '首次尝试即兴炼丹', category: 'craft', counter: sum('alchemy.improvised', 1) },
  { id: 'alchemy.formula.1', title: '照方抓药', desc: '首次按丹方炼丹', category: 'craft', counter: sum('alchemy.formula', 1) },
  { id: 'alchemy.formula.50', title: '丹方烂熟', desc: '按丹方炼丹 50 次', category: 'craft', counter: sum('alchemy.formula', 50) },
  { id: 'forging.first', title: '初握铁锤', desc: '首次炼器/锻造', category: 'craft', counter: sum('forging.count', 1) },
  { id: 'forging.count.10', title: '十件器物', desc: '累计锻造 10 次', category: 'craft', counter: sum('forging.count', 10) },
  { id: 'forging.count.50', title: '百炼成器', desc: '累计锻造 50 次', category: 'craft', counter: sum('forging.count', 50) },
  { id: 'forging.count.200', title: '器道宗师', desc: '累计锻造 200 次', category: 'craft', counter: sum('forging.count', 200) },
  { id: 'forging.count.500', title: '炉火纯青', desc: '累计锻造 500 次', category: 'craft', counter: sum('forging.count', 500) },
  { id: 'forging.count.1000', title: '千锤百炼', desc: '累计锻造 1000 次', category: 'craft', counter: sum('forging.count', 1000) },
  { id: 'forging.quality.4star', title: '良器初成', desc: '首次锻造出高品质装备', category: 'craft' },
  { id: 'forging.quality.5star', title: '神兵出世', desc: '首次锻造出五星装备', category: 'craft' },
  { id: 'forging.perfect.first', title: '完美之作', desc: '首次出现满词条/极品', category: 'craft' },
  { id: 'forging.perfect.10', title: '极品十件', desc: '累计锻造出 10 件满词条极品', category: 'craft', counter: sum('forging.perfect', 10) },

  // ---------- G. 灵兽（24） ----------
  { id: 'beast.capture.first', title: '初收灵兽', desc: '首次捕获灵兽', category: 'beast' },
  { id: 'beast.capture.10', title: '十兽入囊', desc: '累计捕获 10 只灵兽', category: 'beast', counter: sum('beast.capture', 10) },
  { id: 'beast.capture.50', title: '兽栏渐满', desc: '累计捕获 50 只灵兽', category: 'beast', counter: sum('beast.capture', 50) },
  { id: 'beast.capture.200', title: '万兽归心', desc: '累计捕获 200 只灵兽', category: 'beast', counter: sum('beast.capture', 200) },
  { id: 'beast.species.1', title: '初识生灵', desc: '图鉴收录 1 个物种', category: 'beast', counter: max('beast.species', 1) },
  { id: 'beast.species.5', title: '五灵在册', desc: '图鉴收录 5 个物种', category: 'beast', counter: max('beast.species', 5) },
  { id: 'beast.species.10', title: '十灵图鉴', desc: '图鉴收录 10 个物种', category: 'beast', counter: max('beast.species', 10) },
  { id: 'beast.species.20', title: '万灵图鉴', desc: '图鉴收录 20 个物种', category: 'beast', counter: max('beast.species', 20) },
  { id: 'beast.species.30', title: '三十异兽', desc: '图鉴收录 30 个物种', category: 'beast', counter: max('beast.species', 30) },
  { id: 'beast.talent.high', title: '天资卓绝', desc: '首次获得高资质灵兽', category: 'beast' },
  { id: 'beast.skill.first', title: '天生神通', desc: '首次灵兽拥有出生技能', category: 'beast' },
  { id: 'beast.realm.first', title: '兽亦有道', desc: '首次灵兽境界提升', category: 'beast' },
  { id: 'beast.realm.3', title: '兽道三阶', desc: '灵兽境界提升 3 次', category: 'beast', counter: sum('beast.realm', 3) },
  { id: 'beast.realm.10', title: '兽道十阶', desc: '灵兽境界提升 10 次', category: 'beast', counter: sum('beast.realm', 10) },
  { id: 'beast.fusion.1', title: '初试融灵', desc: '首次融合灵兽', category: 'beast', counter: sum('beast.fusion', 1) },
  { id: 'beast.fusion.10', title: '融灵十次', desc: '累计融合灵兽 10 次', category: 'beast', counter: sum('beast.fusion', 10) },
  { id: 'beast.fusion.50', title: '融会贯通', desc: '累计融合灵兽 50 次', category: 'beast', counter: sum('beast.fusion', 50) },
  { id: 'beast.evolve.first', title: '蜕变', desc: '首次灵兽进化/蜕变', category: 'beast' },
  { id: 'beast.lineup.first', title: '布阵迎敌', desc: '首次设置灵兽阵容', category: 'beast', counter: sum('beast.lineup', 1) },
  { id: 'beast.rename.first', title: '赐名', desc: '首次为灵兽改名', category: 'beast', counter: sum('beast.rename', 1) },
  { id: 'beast.allocate.first', title: '点化灵性', desc: '首次为灵兽分配属性点', category: 'beast', counter: sum('beast.allocate', 1) },
  { id: 'beast.rest.first', title: '休养生息', desc: '首次让灵兽休息', category: 'beast', counter: sum('beast.rest', 1) },
  { id: 'beast.lock.first', title: '珍而重之', desc: '首次锁定灵兽', category: 'beast', counter: sum('beast.lock', 1) },
  { id: 'beast.release.first', title: '放归山林', desc: '首次放生灵兽', category: 'beast', counter: sum('beast.release', 1) },

  // ---------- H. 功法、悟道、占卜、重塑（25） ----------
  { id: 'manual.learn.first', title: '初习功法', desc: '首次学习功法', category: 'dao', counter: max('manual.count', 1) },
  { id: 'manual.count.5', title: '五法同修', desc: '掌握 5 门功法', category: 'dao', counter: max('manual.count', 5) },
  { id: 'manual.count.10', title: '十法在身', desc: '掌握 10 门功法', category: 'dao', counter: max('manual.count', 10) },
  { id: 'manual.count.20', title: '藏经满阁', desc: '掌握 20 门功法', category: 'dao', counter: max('manual.count', 20) },
  { id: 'manual.count.40', title: '万法归宗', desc: '掌握 40 门功法', category: 'dao', counter: max('manual.count', 40) },
  { id: 'manual.max.first', title: '功法大成', desc: '首次功法满层', category: 'dao' },
  { id: 'manual.max.3', title: '三法圆满', desc: '3 门功法满层', category: 'dao', counter: max('manual.max', 3) },
  { id: 'manual.max.10', title: '十法圆满', desc: '10 门功法满层', category: 'dao', counter: max('manual.max', 10) },
  { id: 'enlightenment.first', title: '顿悟', desc: '首次悟道', category: 'dao', counter: sum('enlightenment.count', 1) },
  { id: 'enlightenment.count.3', title: '三花聚顶', desc: '累计悟道 3 次', category: 'dao', counter: sum('enlightenment.count', 3) },
  { id: 'enlightenment.count.10', title: '十次顿悟', desc: '累计悟道 10 次', category: 'dao', counter: sum('enlightenment.count', 10) },
  { id: 'enlightenment.count.50', title: '五十悟道', desc: '累计悟道 50 次', category: 'dao', counter: sum('enlightenment.count', 50) },
  { id: 'enlightenment.count.100', title: '百悟成真', desc: '累计悟道 100 次', category: 'dao', counter: sum('enlightenment.count', 100) },
  { id: 'divination.first', title: '初窥天机', desc: '首次占卜', category: 'dao' },
  { id: 'divination.count.1', title: '一卦知命', desc: '累计占卜 1 次', category: 'dao', counter: sum('divination.count', 1) },
  { id: 'divination.count.10', title: '十卦问天', desc: '累计占卜 10 次', category: 'dao', counter: sum('divination.count', 10) },
  { id: 'divination.count.100', title: '百卦通玄', desc: '累计占卜 100 次', category: 'dao', counter: sum('divination.count', 100) },
  { id: 'reshape.first', title: '重塑道基', desc: '首次重塑', category: 'dao', counter: sum('reshape.count', 1) },
  { id: 'reshape.count.5', title: '五次重塑', desc: '累计重塑 5 次', category: 'dao', counter: sum('reshape.count', 5) },
  { id: 'reshape.count.10', title: '十洗凡骨', desc: '累计重塑 10 次', category: 'dao', counter: sum('reshape.count', 10) },
  { id: 'reshape.count.50', title: '五十易筋', desc: '累计重塑 50 次', category: 'dao', counter: sum('reshape.count', 50) },
  { id: 'transfer.first', title: '衣钵相传', desc: '首次完成传承', category: 'dao' },
  { id: 'transfer.count.3', title: '三度传功', desc: '累计完成 3 次传承', category: 'dao', counter: sum('transfer.count', 3) },
  { id: 'transfer.receive.first', title: '他乡故人', desc: '首次接收他处传来的角色', category: 'dao' },
  { id: 'transfer.receive.3', title: '三度接引', desc: '累计接收角色 3 次', category: 'dao', counter: sum('transfer.receive.count', 3) },

  // ---------- I. 交易、拍卖、黑市、声望、赞助（23） ----------
  { id: 'market.trade.first', title: '初开铺面', desc: '首次在市场完成交易', category: 'trade', counter: sum('market.trade', 1) },
  { id: 'market.trade.10', title: '十笔生意', desc: '累计成交 10 笔', category: 'trade', counter: sum('market.trade', 10) },
  { id: 'market.trade.100', title: '百笔生意', desc: '累计成交 100 笔', category: 'trade', counter: sum('market.trade', 100) },
  { id: 'market.trade.500', title: '五百成交', desc: '累计成交 500 笔', category: 'trade', counter: sum('market.trade', 500) },
  { id: 'market.trade.1000', title: '千笔交易', desc: '累计成交 1000 笔', category: 'trade', counter: sum('market.trade', 1000) },
  { id: 'market.volume.10k', title: '万石流水', desc: '累计成交额达到 1 万灵石', category: 'trade', counter: sum('market.volume', 10_000) },
  { id: 'market.volume.100k', title: '十万流水', desc: '累计成交额达到 10 万灵石', category: 'trade', counter: sum('market.volume', 100_000) },
  { id: 'market.volume.1m', title: '百万流水', desc: '累计成交额达到 100 万灵石', category: 'trade', counter: sum('market.volume', 1_000_000) },
  { id: 'market.volume.10m', title: '千万流水', desc: '累计成交额达到 1000 万灵石', category: 'trade', counter: sum('market.volume', 10_000_000) },
  { id: 'auction.list.1', title: '寄售之物', desc: '首次上架拍卖', category: 'trade', counter: sum('auction.list', 1) },
  { id: 'auction.list.10', title: '拍卖常客', desc: '累计上架拍卖 10 次', category: 'trade', counter: sum('auction.list', 10) },
  { id: 'auction.win.first', title: '拍得所爱', desc: '首次拍卖中标', category: 'trade' },
  { id: 'auction.win.10', title: '十拍十中', desc: '累计拍卖中标 10 次', category: 'trade', counter: sum('auction.win', 10) },
  { id: 'auction.win.50', title: '拍卖行家', desc: '累计拍卖中标 50 次', category: 'trade', counter: sum('auction.win', 50) },
  { id: 'black_market.buy.first', title: '暗市初探', desc: '首次黑市交易', category: 'trade' },
  { id: 'black_market.buy.10', title: '暗市常客', desc: '累计黑市交易 10 次', category: 'trade', counter: sum('black_market.buy', 10) },
  { id: 'black_market.buy.50', title: '暗市巨贾', desc: '累计黑市交易 50 次', category: 'trade', counter: sum('black_market.buy', 50) },
  { id: 'reputation.exchange.first', title: '声望兑换', desc: '首次在声望商店兑换', category: 'trade' },
  { id: 'reputation.exchange.10', title: '声望常客', desc: '累计声望兑换 10 次', category: 'trade', counter: sum('reputation.exchange', 10) },
  { id: 'reputation.exchange.50', title: '名望一方', desc: '累计声望兑换 50 次', category: 'trade', counter: sum('reputation.exchange', 50) },
  { id: 'sponsorship.first', title: '结缘赞助', desc: '首次完成赞助', category: 'trade' },
  { id: 'sponsorship.count.3', title: '三度结缘', desc: '累计完成 3 次赞助', category: 'trade', counter: sum('sponsorship.count', 3) },
  { id: 'sponsorship.count.10', title: '功德无量', desc: '累计完成 10 次赞助', category: 'trade', counter: sum('sponsorship.count', 10) },

  // ---------- J. 社交、排行与任务（12） ----------
  { id: 'social.friend.first', title: '初见道友', desc: '首次添加好友', category: 'social', counter: max('social.friend', 1) },
  { id: 'social.friend.5', title: '三五知己', desc: '好友达到 5 人', category: 'social', counter: max('social.friend', 5) },
  { id: 'social.friend.20', title: '高朋满座', desc: '好友达到 20 人', category: 'social', counter: max('social.friend', 20) },
  { id: 'social.friend.50', title: '友遍天下', desc: '好友达到 50 人', category: 'social', counter: max('social.friend', 50) },
  { id: 'social.chat.first', title: '传音入密', desc: '首次发送聊天', category: 'social' },
  { id: 'social.chat.10', title: '畅所欲言', desc: '累计发送聊天 10 条', category: 'social', counter: sum('social.chat', 10) },
  { id: 'social.chat.100', title: '健谈者', desc: '累计发送聊天 100 条', category: 'social', counter: sum('social.chat', 100) },
  { id: 'social.chat.1000', title: '话痨道友', desc: '累计发送聊天 1000 条', category: 'social', counter: sum('social.chat', 1000) },
  { id: 'tasks.completed.1', title: '初成任务', desc: '累计完成 1 个任务', category: 'social', counter: sum('tasks.completed', 1) },
  { id: 'tasks.completed.3', title: '勤恳做事', desc: '累计完成 3 个任务', category: 'social', counter: sum('tasks.completed', 3) },
  { id: 'tasks.completed.6', title: '事事躬亲', desc: '累计完成 6 个任务', category: 'social', counter: sum('tasks.completed', 6) },
  { id: 'tasks.completed.8', title: '八关尽渡', desc: '完成全部 8 个主线突破任务', category: 'social', counter: sum('tasks.completed', 8) },

  // ---------- K. 活动专属（13） ----------
  { id: 'journey.enter.first', title: '初入万界', desc: '首次通过转世进入道友', category: 'journey' },
  { id: 'journey.generation.3', title: '三世为人', desc: '同一角色进入第 3 世', category: 'journey', counter: max('journey.generation', 3) },
  { id: 'journey.generation.5', title: '五世其昌', desc: '同一角色进入第 5 世', category: 'journey', counter: max('journey.generation', 5) },
  { id: 'journey.generation.10', title: '十世轮回', desc: '同一角色进入第 10 世', category: 'journey', counter: max('journey.generation', 10) },
  { id: 'journey.realm.jindan', title: '转世金丹', desc: '转世角色首次到达金丹', category: 'journey' },
  { id: 'journey.realm.huashan', title: '转世化神', desc: '转世角色首次到达化神', category: 'journey' },
  { id: 'journey.death.first', title: '首世终章', desc: '首次转世角色陨落', category: 'journey' },
  { id: 'journey.legacy.first', title: '薪火相传', desc: '角色世系首次延续到第二世', category: 'journey' },
  { id: 'journey.achievement.10', title: '道心初明', desc: '单世解锁 10 个成就', category: 'journey', counter: max('journey.achievement.count', 10) },
  { id: 'journey.achievement.25', title: '道心澄澈', desc: '单世解锁 25 个成就', category: 'journey', counter: max('journey.achievement.count', 25) },
  { id: 'journey.achievement.50', title: '道心通明', desc: '单世解锁 50 个成就', category: 'journey', counter: max('journey.achievement.count', 50) },
  { id: 'journey.achievement.100', title: '道心圆满', desc: '单世解锁 100 个成就', category: 'journey', counter: max('journey.achievement.count', 100) },
  { id: 'journey.archive.top', title: '名留世系', desc: '单世进入世系谱最高境界前列', category: 'journey' },
];

/**
 * 名次类计数用「反向分值」存储以复用 max 语义：score = 101 - rank（rank 1 → 100，rank 100 → 1）。
 * 进入前 100 即 score ≥ 1，前 10 即 score ≥ 91，登顶即 score = 100。
 */
export function rankToScore(rank: number): number {
  if (!Number.isFinite(rank) || rank < 1) return 0;
  return Math.max(0, 101 - Math.floor(rank));
}

const BY_ID = new Map(ACHIEVEMENT_CATALOG.map((def) => [def.id, def]));
const BY_COUNTER = new Map<string, AchievementDefinition[]>();
for (const def of ACHIEVEMENT_CATALOG) {
  if (!def.counter) continue;
  const list = BY_COUNTER.get(def.counter.key) ?? [];
  list.push(def);
  BY_COUNTER.set(def.counter.key, list);
}

export function getAchievementDefinition(id: string): AchievementDefinition | undefined {
  return BY_ID.get(id);
}

export function getAchievementsByCounter(counterKey: string): AchievementDefinition[] {
  return BY_COUNTER.get(counterKey) ?? [];
}

export const ACHIEVEMENT_TOTAL = ACHIEVEMENT_CATALOG.length;
