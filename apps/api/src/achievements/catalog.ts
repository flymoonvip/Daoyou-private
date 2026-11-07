/**
 * 成就目录：「万界道友」活动（主站 1000009）全部 107 个成就的定义。
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

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  realm: '境界与修炼',
  breakthrough: '突破、寿元与转世',
  sect: '宗门',
  combat: '战斗、竞技、爬塔、猎杀',
  explore: '探索、剧情与碑文',
  craft: '炼丹、炼器、锻造',
  beast: '灵兽',
  dao: '功法、悟道、占卜、重塑',
  trade: '交易、拍卖、黑市、声望、赞助',
  social: '社交、社区与排行',
  journey: '活动专属',
};

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
  // ---------- A. 境界与修炼（13） ----------
  { id: 'realm.zhuji', title: '初入筑基', desc: '首次到达筑基', category: 'realm' },
  { id: 'realm.jindan', title: '金丹大道', desc: '首次到达金丹', category: 'realm' },
  { id: 'realm.yuanying', title: '元婴出窍', desc: '首次到达元婴', category: 'realm' },
  { id: 'realm.huashan', title: '化神之境', desc: '首次到达化神', category: 'realm' },
  { id: 'realm.lianxu', title: '炼虚合道', desc: '首次到达炼虚', category: 'realm' },
  { id: 'realm.heti', title: '天人合体', desc: '首次到达合体', category: 'realm' },
  { id: 'realm.dacheng', title: '大乘圆满', desc: '首次到达大乘', category: 'realm' },
  { id: 'realm.dujie', title: '渡劫飞升', desc: '首次到达渡劫', category: 'realm' },
  { id: 'realm.stage.full.first', title: '初次圆满', desc: '首次到达任一境界圆满', category: 'realm', counter: sum('realm.stage.full', 1) },
  { id: 'realm.stage.full.10', title: '十次圆满', desc: '累计 10 次境界圆满', category: 'realm', counter: sum('realm.stage.full', 10) },
  { id: 'realm.stage.full.50', title: '五十次圆满', desc: '累计 50 次境界圆满', category: 'realm', counter: sum('realm.stage.full', 50) },
  { id: 'cultivate.retreat.first', title: '初次闭关', desc: '首次闭关', category: 'realm', counter: sum('cultivate.retreat', 1) },
  { id: 'cultivate.retreat.100', title: '百年苦修', desc: '累计闭关 100 次', category: 'realm', counter: sum('cultivate.retreat', 100) },

  // ---------- B. 突破、寿元与转世（11） ----------
  { id: 'breakthrough.first', title: '破境', desc: '首次突破成功', category: 'breakthrough', counter: sum('breakthrough.count', 1) },
  { id: 'breakthrough.fail.first', title: '道途有阻', desc: '首次突破失败', category: 'breakthrough' },
  { id: 'breakthrough.streak.3', title: '一气呵成', desc: '连续 3 次突破成功', category: 'breakthrough', counter: max('breakthrough.streak', 3) },
  { id: 'breakthrough.count.50', title: '百炼成钢', desc: '累计突破成功 50 次', category: 'breakthrough', counter: sum('breakthrough.count', 50) },
  { id: 'lifespan.age.100', title: '百岁春秋', desc: '角色年龄达到 100', category: 'breakthrough', counter: max('lifespan.age', 100) },
  { id: 'lifespan.age.500', title: '五百岁', desc: '角色年龄达到 500', category: 'breakthrough', counter: max('lifespan.age', 500) },
  { id: 'lifespan.age.1000', title: '千岁老怪', desc: '角色年龄达到 1000', category: 'breakthrough', counter: max('lifespan.age', 1000) },
  { id: 'death.first', title: '身死道消', desc: '首次陨落', category: 'breakthrough' },
  { id: 'rebirth.first', title: '再入轮回', desc: '同一道友账号完成第二次建号', category: 'breakthrough', counter: max('rebirth.count', 2) },
  { id: 'rebirth.count.5', title: '五世轮回', desc: '累计完成 5 次建号', category: 'breakthrough', counter: max('rebirth.count', 5) },
  { id: 'journey.survive.30', title: '入世三十日', desc: '转世角色存活满 30 天', category: 'breakthrough', counter: max('journey.survive.days', 30) },

  // ---------- C. 宗门（9） ----------
  { id: 'sect.join.first', title: '拜入宗门', desc: '首次加入宗门', category: 'sect' },
  { id: 'sect.position.inner', title: '内门弟子', desc: '晋升内门', category: 'sect' },
  { id: 'sect.position.core', title: '真传弟子', desc: '晋升真传', category: 'sect' },
  { id: 'sect.position.elder', title: '宗门长老', desc: '晋升长老', category: 'sect' },
  { id: 'sect.contribution.1000', title: '千点贡献', desc: '累计宗门贡献 1000', category: 'sect', counter: sum('sect.contribution', 1000) },
  { id: 'sect.contribution.10000', title: '万点贡献', desc: '累计宗门贡献 10000', category: 'sect', counter: sum('sect.contribution', 10000) },
  { id: 'sect.task.10', title: '初担宗门事', desc: '完成 10 次宗门任务', category: 'sect', counter: sum('sect.task', 10) },
  { id: 'sect.task.100', title: '宗门栋梁', desc: '完成 100 次宗门任务', category: 'sect', counter: sum('sect.task', 100) },
  { id: 'sect.war.first', title: '初战宗门', desc: '首次参加宗门战', category: 'sect' },

  // ---------- D. 战斗、竞技、爬塔、猎杀（13） ----------
  { id: 'combat.win.first', title: '初战告捷', desc: '首次战斗胜利', category: 'combat', counter: sum('combat.win', 1) },
  { id: 'combat.win.10', title: '小有名气', desc: '累计胜利 10 场', category: 'combat', counter: sum('combat.win', 10) },
  { id: 'combat.win.100', title: '百战之身', desc: '累计胜利 100 场', category: 'combat', counter: sum('combat.win', 100) },
  { id: 'combat.win.1000', title: '千战不败', desc: '累计胜利 1000 场', category: 'combat', counter: sum('combat.win', 1000) },
  { id: 'combat.lose.10', title: '屡败屡战', desc: '累计失败 10 场', category: 'combat', counter: sum('combat.lose', 10) },
  { id: 'combat.streak.10', title: '十连胜', desc: '取得 10 连胜', category: 'combat', counter: max('combat.streak', 10) },
  { id: 'arena.rank.top100', title: '初登擂台', desc: '竞技场进入前 100', category: 'combat', counter: max('arena.rank.best', 1) },
  { id: 'arena.rank.top10', title: '擂台十强', desc: '竞技场进入前 10', category: 'combat', counter: max('arena.rank.best', 91) },
  { id: 'arena.rank.top1', title: '天下第一', desc: '竞技场登顶', category: 'combat', counter: max('arena.rank.best', 100) },
  { id: 'tower.floor.10', title: '初探高塔', desc: '爬塔到达第 10 层', category: 'combat', counter: max('tower.floor', 10) },
  { id: 'tower.floor.50', title: '半塔之志', desc: '爬塔到达第 50 层', category: 'combat', counter: max('tower.floor', 50) },
  { id: 'tower.floor.100', title: '塔顶问道', desc: '爬塔到达第 100 层', category: 'combat', counter: max('tower.floor', 100) },
  { id: 'hunts.kill.100', title: '百妖斩', desc: '累计猎杀 100 只', category: 'combat', counter: sum('hunts.kill', 100) },

  // ---------- E. 探索、剧情与碑文（10） ----------
  { id: 'dungeon.clear.first', title: '初探秘境', desc: '首次通关秘境', category: 'explore', counter: sum('dungeon.clear', 1) },
  { id: 'dungeon.clear.10', title: '秘境常客', desc: '累计通关 10 次', category: 'explore', counter: sum('dungeon.clear', 10) },
  { id: 'dungeon.clear.50', title: '秘境行者', desc: '累计通关 50 次', category: 'explore', counter: sum('dungeon.clear', 50) },
  { id: 'wanderer.first', title: '云游四方', desc: '首次云游探秘', category: 'explore', counter: sum('wanderer.count', 1) },
  { id: 'wanderer.count.10', title: '十方云游', desc: '累计完成 10 次云游', category: 'explore', counter: sum('wanderer.count', 10) },
  { id: 'spirit_field.first', title: '初入灵田', desc: '首次经营灵田', category: 'explore' },
  { id: 'story.chapter.1', title: '初入江湖', desc: '完成第一章剧情', category: 'explore', counter: max('story.chapter', 1) },
  { id: 'story.chapter.5', title: '故事中段', desc: '完成第五章剧情', category: 'explore', counter: max('story.chapter', 5) },
  { id: 'inscriptions.first', title: '初见碑文', desc: '首次解读碑文', category: 'explore', counter: sum('inscriptions.count', 1) },
  { id: 'inscriptions.count.20', title: '博古通今', desc: '累计解读 20 处碑文', category: 'explore', counter: sum('inscriptions.count', 20) },

  // ---------- F. 炼丹、炼器、锻造（10） ----------
  { id: 'alchemy.first', title: '初开丹炉', desc: '首次炼丹', category: 'craft', counter: sum('alchemy.count', 1) },
  { id: 'alchemy.success.10', title: '小有丹成', desc: '累计成功 10 次', category: 'craft', counter: sum('alchemy.success', 10) },
  { id: 'alchemy.success.100', title: '丹道大家', desc: '累计成功 100 次', category: 'craft', counter: sum('alchemy.success', 100) },
  { id: 'alchemy.fail.10', title: '炸炉十次', desc: '累计失败 10 次', category: 'craft', counter: sum('alchemy.fail', 10) },
  { id: 'alchemy.grade.high', title: '上品灵丹', desc: '首次炼出高阶丹药', category: 'craft' },
  { id: 'forging.first', title: '初握铁锤', desc: '首次炼器/锻造', category: 'craft', counter: sum('forging.count', 1) },
  { id: 'forging.count.50', title: '百炼成器', desc: '累计锻造 50 次', category: 'craft', counter: sum('forging.count', 50) },
  { id: 'forging.quality.5star', title: '神兵出世', desc: '首次锻造出五星装备', category: 'craft' },
  { id: 'forging.perfect.first', title: '完美之作', desc: '首次出现满词条/极品', category: 'craft' },
  { id: 'forging.count.200', title: '器道宗师', desc: '累计锻造 200 次', category: 'craft', counter: sum('forging.count', 200) },

  // ---------- G. 灵兽（7） ----------
  { id: 'beast.capture.first', title: '初收灵兽', desc: '首次捕获灵兽', category: 'beast' },
  { id: 'beast.species.5', title: '五灵在册', desc: '图鉴收录 5 个物种', category: 'beast', counter: max('beast.species', 5) },
  { id: 'beast.species.20', title: '万灵图鉴', desc: '图鉴收录 20 个物种', category: 'beast', counter: max('beast.species', 20) },
  { id: 'beast.talent.high', title: '天资卓绝', desc: '首次获得高资质灵兽', category: 'beast' },
  { id: 'beast.skill.first', title: '天生神通', desc: '首次灵兽拥有出生技能', category: 'beast' },
  { id: 'beast.realm.first', title: '兽亦有道', desc: '首次灵兽境界提升', category: 'beast' },
  { id: 'beast.evolve.first', title: '蜕变', desc: '首次灵兽进化/蜕变', category: 'beast' },

  // ---------- H. 功法、悟道、占卜、重塑（10） ----------
  { id: 'manual.learn.first', title: '初习功法', desc: '首次学习功法', category: 'dao', counter: max('manual.count', 1) },
  { id: 'manual.count.5', title: '五法同修', desc: '掌握 5 门功法', category: 'dao', counter: max('manual.count', 5) },
  { id: 'manual.count.20', title: '藏经满阁', desc: '掌握 20 门功法', category: 'dao', counter: max('manual.count', 20) },
  { id: 'manual.max.first', title: '功法大成', desc: '首次功法满层', category: 'dao' },
  { id: 'enlightenment.first', title: '顿悟', desc: '首次悟道', category: 'dao', counter: sum('enlightenment.count', 1) },
  { id: 'enlightenment.count.10', title: '十次顿悟', desc: '累计悟道 10 次', category: 'dao', counter: sum('enlightenment.count', 10) },
  { id: 'divination.first', title: '初窥天机', desc: '首次占卜', category: 'dao' },
  { id: 'reshape.first', title: '重塑道基', desc: '首次重塑', category: 'dao', counter: sum('reshape.count', 1) },
  { id: 'reshape.count.5', title: '五次重塑', desc: '累计重塑 5 次', category: 'dao', counter: sum('reshape.count', 5) },
  { id: 'transfer.first', title: '衣钵相传', desc: '首次完成传承', category: 'dao' },

  // ---------- I. 交易、拍卖、黑市、声望、赞助（9） ----------
  { id: 'market.sell.first', title: '初开铺面', desc: '首次上架成交', category: 'trade', counter: sum('market.trade', 1) },
  { id: 'market.trade.100', title: '百笔生意', desc: '累计成交 100 笔', category: 'trade', counter: sum('market.trade', 100) },
  { id: 'market.volume.1m', title: '百万流水', desc: '累计成交额达到 100 万灵石', category: 'trade', counter: sum('market.volume', 1_000_000) },
  { id: 'auction.bid.first', title: '初次竞拍', desc: '首次参与拍卖', category: 'trade' },
  { id: 'auction.win.first', title: '拍得所爱', desc: '首次拍卖中标', category: 'trade' },
  { id: 'black_market.buy.first', title: '暗市初探', desc: '首次黑市交易', category: 'trade' },
  { id: 'reputation.exchange.first', title: '声望兑换', desc: '首次在声望商店兑换', category: 'trade' },
  { id: 'sponsorship.first', title: '结缘赞助', desc: '首次完成赞助', category: 'trade' },
  { id: 'reputation.level.high', title: '名望一方', desc: '声望等级达到高段', category: 'trade' },

  // ---------- J. 社交、社区与排行（8） ----------
  { id: 'social.friend.first', title: '初见道友', desc: '首次添加好友', category: 'social', counter: max('social.friend', 1) },
  { id: 'social.chat.first', title: '传音入密', desc: '首次发送聊天', category: 'social' },
  { id: 'social.friend.20', title: '高朋满座', desc: '好友达到 20 人', category: 'social', counter: max('social.friend', 20) },
  { id: 'community.post.first', title: '初发帖子', desc: '首次在社区发帖', category: 'social' },
  { id: 'rankings.top100', title: '榜上有名', desc: '任一排行榜进入前 100', category: 'social', counter: max('rankings.best', 1) },
  { id: 'rankings.top10', title: '名列前茅', desc: '任一排行榜进入前 10', category: 'social', counter: max('rankings.best', 91) },
  { id: 'rankings.top1', title: '独占鳌头', desc: '任一排行榜登顶', category: 'social', counter: max('rankings.best', 100) },
  { id: 'tasks.daily.30', title: '勤修不辍', desc: '累计完成 30 天日常', category: 'social', counter: sum('tasks.daily.days', 30) },

  // ---------- K. 活动专属（7） ----------
  { id: 'journey.enter.first', title: '初入万界', desc: '首次通过转世进入道友', category: 'journey' },
  { id: 'journey.generation.3', title: '三世为人', desc: '同一角色进入第 3 世', category: 'journey' },
  { id: 'journey.realm.jindan', title: '转世金丹', desc: '转世角色首次到达金丹', category: 'journey' },
  { id: 'journey.death.first', title: '首世终章', desc: '首次转世角色陨落', category: 'journey' },
  { id: 'journey.legacy.first', title: '薪火相传', desc: '首次由他人接续你的角色世系', category: 'journey' },
  { id: 'journey.achievement.50', title: '道心通明', desc: '单世解锁 50 个成就', category: 'journey', counter: max('journey.achievement.count', 50) },
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
