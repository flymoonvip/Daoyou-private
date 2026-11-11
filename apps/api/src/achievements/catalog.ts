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
  /** 解锁时展示的提示文案（简练纪事语气） */
  unlockText: string;
  category: AchievementCategory;
  /** 计数类成就；一次性成就不填 */
  counter?: { key: string; threshold: number; mode: CounterMode };
}

const sum = (key: string, threshold: number) => ({ key, threshold, mode: 'sum' as const });
const max = (key: string, threshold: number) => ({ key, threshold, mode: 'max' as const });

export const ACHIEVEMENT_CATALOG: readonly AchievementDefinition[] = [
  // ---------- A. 境界与修炼（23） ----------
  { id: 'realm.zhuji', title: '初入筑基', desc: '首次到达筑基', category: 'realm', unlockText: '筑基既成，你已真正踏上修仙长路。' },
  { id: 'realm.jindan', title: '金丹大道', desc: '首次到达金丹', category: 'realm', unlockText: '金丹凝于丹田，从此寿元可期。' },
  { id: 'realm.yuanying', title: '元婴出窍', desc: '首次到达元婴', category: 'realm', unlockText: '元婴初啼，神魂自此有了第二副躯壳。' },
  { id: 'realm.huashan', title: '化神之境', desc: '首次到达化神', category: 'realm', unlockText: '化神既成，一念可达千里之外。' },
  { id: 'realm.lianxu', title: '炼虚合道', desc: '首次到达炼虚', category: 'realm', unlockText: '炼虚合道，你开始以天地的尺度呼吸。' },
  { id: 'realm.heti', title: '天人合体', desc: '首次到达合体', category: 'realm', unlockText: '天人合体，风雨雷霆皆可入你掌中。' },
  { id: 'realm.dacheng', title: '大乘圆满', desc: '首次到达大乘', category: 'realm', unlockText: '大乘圆满，人间已无你参不透的经。' },
  { id: 'realm.dujie', title: '渡劫飞升', desc: '首次到达渡劫', category: 'realm', unlockText: '雷云散尽，你踏上了渡劫飞升之路。' },
  { id: 'realm.stage.mid.first', title: '中庭信步', desc: '首次进入境界中期', category: 'realm', unlockText: '初入境界中期，前路忽然宽了三分。' },
  { id: 'realm.stage.mid.10', title: '十度中期', desc: '累计进入境界中期 10 次', category: 'realm', counter: sum('realm.stage.mid', 10), unlockText: '十次踏入境界中期，你已熟悉这段路。' },
  { id: 'realm.stage.late.first', title: '登堂入室', desc: '首次进入境界后期', category: 'realm', unlockText: '第一次走到境界后期，门内风景果然不同。' },
  { id: 'realm.stage.late.10', title: '十度后期', desc: '累计进入境界后期 10 次', category: 'realm', counter: sum('realm.stage.late', 10), unlockText: '十度抵达境界后期，步履已不再发虚。' },
  { id: 'realm.stage.full.first', title: '初次圆满', desc: '首次到达任一境界圆满', category: 'realm', counter: sum('realm.stage.full', 1), unlockText: '第一次圆满，你尝到了无缺的滋味。' },
  { id: 'realm.stage.full.10', title: '十次圆满', desc: '累计 10 次境界圆满', category: 'realm', counter: sum('realm.stage.full', 10), unlockText: '十次圆满，境界于你已成掌纹。' },
  { id: 'realm.stage.full.50', title: '五十次圆满', desc: '累计 50 次境界圆满', category: 'realm', counter: sum('realm.stage.full', 50), unlockText: '五十次圆满，圆满也成了习惯。' },
  { id: 'realm.stage.full.100', title: '百炼圆满', desc: '累计 100 次境界圆满', category: 'realm', counter: sum('realm.stage.full', 100), unlockText: '百次圆满，一身修为再无一丝毛刺。' },
  { id: 'realm.major.3', title: '三境飞渡', desc: '累计完成 3 次大境界突破', category: 'realm', counter: sum('realm.major', 3), unlockText: '三越大境，你的道已不是原地打转。' },
  { id: 'realm.major.5', title: '五境通玄', desc: '累计完成 5 次大境界突破', category: 'realm', counter: sum('realm.major', 5), unlockText: '五境通玄，天地开始主动为你让路。' },
  { id: 'cultivate.retreat.first', title: '初次闭关', desc: '首次闭关', category: 'realm', counter: sum('cultivate.retreat', 1), unlockText: '第一次闭关，世界安静得只剩呼吸。' },
  { id: 'cultivate.retreat.10', title: '静坐常思', desc: '累计闭关 10 次', category: 'realm', counter: sum('cultivate.retreat', 10), unlockText: '十次闭关，你在静坐里读懂了自己。' },
  { id: 'cultivate.retreat.50', title: '半世清修', desc: '累计闭关 50 次', category: 'realm', counter: sum('cultivate.retreat', 50), unlockText: '五十次闭关，半世光阴都坐成了定。' },
  { id: 'cultivate.retreat.100', title: '百年苦修', desc: '累计闭关 100 次', category: 'realm', counter: sum('cultivate.retreat', 100), unlockText: '百次闭关，苦修已是你最熟的功课。' },
  { id: 'cultivate.retreat.500', title: '五百次入定', desc: '累计闭关 500 次', category: 'realm', counter: sum('cultivate.retreat', 500), unlockText: '五百次入定，闭眼即是洞天。' },

  // ---------- B. 突破、寿元与转世（23） ----------
  { id: 'breakthrough.first', title: '破境', desc: '首次突破成功', category: 'breakthrough', counter: sum('breakthrough.count', 1), unlockText: '一声脆响，你破开了修行路上的第一道关。' },
  { id: 'breakthrough.fail.first', title: '道途有阻', desc: '首次突破失败', category: 'breakthrough', unlockText: '第一次失败，道途原来不总是顺的。' },
  { id: 'breakthrough.fail.10', title: '十败不馁', desc: '累计突破失败 10 次', category: 'breakthrough', counter: sum('breakthrough.fail', 10), unlockText: '十次失败，你仍站在丹炉前。' },
  { id: 'breakthrough.fail.50', title: '百折不回', desc: '累计突破失败 50 次', category: 'breakthrough', counter: sum('breakthrough.fail', 50), unlockText: '五十次失败，只让你把腰挺得更直。' },
  { id: 'breakthrough.streak.3', title: '一气呵成', desc: '连续 3 次突破成功', category: 'breakthrough', counter: max('breakthrough.streak', 3), unlockText: '三破皆成，气机顺得像一条河。' },
  { id: 'breakthrough.streak.5', title: '五运亨通', desc: '连续 5 次突破成功', category: 'breakthrough', counter: max('breakthrough.streak', 5), unlockText: '五连破关，连你自己都信了几分运气。' },
  { id: 'breakthrough.streak.10', title: '十转皆成', desc: '连续 10 次突破成功', category: 'breakthrough', counter: max('breakthrough.streak', 10), unlockText: '十转皆成，天道这次没拦你。' },
  { id: 'breakthrough.count.50', title: '百炼成钢', desc: '累计突破成功 50 次', category: 'breakthrough', counter: sum('breakthrough.count', 50), unlockText: '五十次破境，你被岁月锻成了钢。' },
  { id: 'breakthrough.count.100', title: '百尺竿头', desc: '累计突破成功 100 次', category: 'breakthrough', counter: sum('breakthrough.count', 100), unlockText: '百次破境，你还在往上走。' },
  { id: 'breakthrough.count.200', title: '两百破境', desc: '累计突破成功 200 次', category: 'breakthrough', counter: sum('breakthrough.count', 200), unlockText: '两百次破境，重复本身就是一种道行。' },
  { id: 'lifespan.age.100', title: '百岁春秋', desc: '角色年龄达到 100', category: 'breakthrough', counter: max('lifespan.age', 100), unlockText: '百岁春秋过眼，你仍记得少年的剑。' },
  { id: 'lifespan.age.200', title: '松鹤延年', desc: '角色年龄达到 200', category: 'breakthrough', counter: max('lifespan.age', 200), unlockText: '两百岁，松鹤都成了你的旧识。' },
  { id: 'lifespan.age.500', title: '五百岁', desc: '角色年龄达到 500', category: 'breakthrough', counter: max('lifespan.age', 500), unlockText: '五百岁，人间换了几朝，你还在。' },
  { id: 'lifespan.age.800', title: '八百彭祖', desc: '角色年龄达到 800', category: 'breakthrough', counter: max('lifespan.age', 800), unlockText: '八百岁，传说里才有的寿数落在你身上。' },
  { id: 'lifespan.age.1000', title: '千岁老怪', desc: '角色年龄达到 1000', category: 'breakthrough', counter: max('lifespan.age', 1000), unlockText: '千岁老怪，你笑说这称呼听着也不错。' },
  { id: 'death.first', title: '身死道消', desc: '首次陨落', category: 'breakthrough', unlockText: '身死道消，这一世的道在此收笔。' },
  { id: 'rebirth.first', title: '再入轮回', desc: '同一道友账号完成第二次建号', category: 'breakthrough', counter: max('rebirth.count', 2), unlockText: '再入轮回，你带着前世的记忆重新睁眼。' },
  { id: 'rebirth.count.3', title: '三世为人', desc: '累计完成 3 次建号', category: 'breakthrough', counter: max('rebirth.count', 3), unlockText: '三世为人，你已认得轮回的模样。' },
  { id: 'rebirth.count.5', title: '五世轮回', desc: '累计完成 5 次建号', category: 'breakthrough', counter: max('rebirth.count', 5), unlockText: '五世轮回，缘法在你手心里打了结。' },
  { id: 'rebirth.count.10', title: '十世修行', desc: '累计完成 10 次建号', category: 'breakthrough', counter: max('rebirth.count', 10), unlockText: '十世修行，前尘叠成一卷厚经。' },
  { id: 'journey.survive.7', title: '入世七日', desc: '转世角色存活满 7 天', category: 'breakthrough', counter: max('journey.survive.days', 7), unlockText: '入世七日，你在这方天地站稳了脚。' },
  { id: 'journey.survive.30', title: '入世三十日', desc: '转世角色存活满 30 天', category: 'breakthrough', counter: max('journey.survive.days', 30), unlockText: '入世三十日，这里已是你的江湖。' },
  { id: 'journey.survive.100', title: '百岁转世', desc: '转世角色存活满 100 天', category: 'breakthrough', counter: max('journey.survive.days', 100), unlockText: '百岁转世，你在尘世里活成了根。' },

  // ---------- C. 宗门（21） ----------
  { id: 'sect.join.first', title: '拜入宗门', desc: '首次加入宗门', category: 'sect', unlockText: '拜入宗门，你终于有了师门与同道。' },
  { id: 'sect.position.inner', title: '内门弟子', desc: '晋升内门', category: 'sect', unlockText: '跻身内门，藏经阁的门为你开了。' },
  { id: 'sect.position.core', title: '真传弟子', desc: '晋升真传', category: 'sect', unlockText: '位列真传，师长的目光落在你身上。' },
  { id: 'sect.position.elder', title: '宗门长老', desc: '晋升长老', category: 'sect', unlockText: '登上长老之位，后辈开始称你一声师叔。' },
  { id: 'sect.contribution.100', title: '初积贡献', desc: '累计宗门贡献 100', category: 'sect', counter: sum('sect.contribution', 100), unlockText: '贡献满百，你在宗门簿上留下了名字。' },
  { id: 'sect.contribution.500', title: '小有贡献', desc: '累计宗门贡献 500', category: 'sect', counter: sum('sect.contribution', 500), unlockText: '贡献五百，宗门大事开始问你的意见。' },
  { id: 'sect.contribution.1000', title: '千点贡献', desc: '累计宗门贡献 1000', category: 'sect', counter: sum('sect.contribution', 1000), unlockText: '千点贡献，宗门因你而厚了三分。' },
  { id: 'sect.contribution.10000', title: '万点贡献', desc: '累计宗门贡献 10000', category: 'sect', counter: sum('sect.contribution', 10000), unlockText: '万点贡献，你的名字刻进了宗门碑。' },
  { id: 'sect.contribution.50000', title: '五万贡献', desc: '累计宗门贡献 50000', category: 'sect', counter: sum('sect.contribution', 50000), unlockText: '五万贡献，宗门史册为你单开一页。' },
  { id: 'sect.task.1', title: '初担宗门事', desc: '首次完成宗门任务', category: 'sect', counter: sum('sect.task', 1), unlockText: '第一次接过宗门令牌，任务虽小也是事。' },
  { id: 'sect.task.10', title: '十次奔走', desc: '完成 10 次宗门任务', category: 'sect', counter: sum('sect.task', 10), unlockText: '十次奔走，宗门里处处有你的脚印。' },
  { id: 'sect.task.50', title: '任劳任怨', desc: '完成 50 次宗门任务', category: 'sect', counter: sum('sect.task', 50), unlockText: '五十次差事，你从不挑轻重。' },
  { id: 'sect.task.100', title: '宗门栋梁', desc: '完成 100 次宗门任务', category: 'sect', counter: sum('sect.task', 100), unlockText: '百次任务，你成了宗门离不开的梁柱。' },
  { id: 'sect.task.500', title: '劳苦功高', desc: '完成 500 次宗门任务', category: 'sect', counter: sum('sect.task', 500), unlockText: '五百次奔走，功劳簿已厚得翻不动。' },
  { id: 'sect.war.first', title: '初战宗门', desc: '首次参加宗门战', category: 'sect', unlockText: '首次宗门战，你为同门挡下了第一击。' },
  { id: 'sect.war.10', title: '十战宗门', desc: '参加 10 次宗门战', category: 'sect', counter: sum('sect.war', 10), unlockText: '十战宗门，你已习惯在鼓声中拔剑。' },
  { id: 'sect.war.50', title: '宗门悍将', desc: '参加 50 次宗门战', category: 'sect', counter: sum('sect.war', 50), unlockText: '五十战宗门，敌阵里都认得你的旗。' },
  { id: 'sect.shop.first', title: '初入宝阁', desc: '首次在宗门商店兑换', category: 'sect', counter: sum('sect.shop.purchase', 1), unlockText: '初入宝阁，贡献终于换成了实物。' },
  { id: 'sect.shop.10', title: '常客', desc: '在宗门商店兑换 10 次', category: 'sect', counter: sum('sect.shop.purchase', 10), unlockText: '十次兑换，宝阁执事已不必问你要什么。' },
  { id: 'sect.shop.50', title: '宝阁贵宾', desc: '在宗门商店兑换 50 次', category: 'sect', counter: sum('sect.shop.purchase', 50), unlockText: '五十次兑换，宝阁为你留了雅座。' },
  { id: 'sect.construction.10', title: '添砖加瓦', desc: '为宗门建设捐献 10 次', category: 'sect', counter: sum('sect.construction', 10), unlockText: '十次捐献，宗门的砖瓦里有你的手温。' },

  // ---------- D. 战斗、竞技、爬塔、猎杀（48） ----------
  { id: 'combat.win.first', title: '初战告捷', desc: '首次战斗胜利', category: 'combat', counter: sum('combat.win', 1), unlockText: '首次得胜，你的剑终于见了血。' },
  { id: 'combat.win.10', title: '小有名气', desc: '累计胜利 10 场', category: 'combat', counter: sum('combat.win', 10), unlockText: '十场胜绩，山野间开始有人传你的名。' },
  { id: 'combat.win.100', title: '百战之身', desc: '累计胜利 100 场', category: 'combat', counter: sum('combat.win', 100), unlockText: '百战之身，伤疤比勋章更多。' },
  { id: 'combat.win.500', title: '五百胜绩', desc: '累计胜利 500 场', category: 'combat', counter: sum('combat.win', 500), unlockText: '五百胜绩，你已把战斗当作呼吸。' },
  { id: 'combat.win.1000', title: '千战不败', desc: '累计胜利 1000 场', category: 'combat', counter: sum('combat.win', 1000), unlockText: '千场胜利，剑名先于你传遍四方。' },
  { id: 'combat.win.5000', title: '万战封神', desc: '累计胜利 5000 场', category: 'combat', counter: sum('combat.win', 5000), unlockText: '五千胜，人间再无敌手可试你的锋。' },
  { id: 'combat.lose.1', title: '胜败乃兵家常事', desc: '首次战斗失败', category: 'combat', counter: sum('combat.lose', 1), unlockText: '第一场败仗，你把它写进了自己的道。' },
  { id: 'combat.lose.10', title: '屡败屡战', desc: '累计失败 10 场', category: 'combat', counter: sum('combat.lose', 10), unlockText: '十败之后又提剑，你比从前更稳。' },
  { id: 'combat.lose.100', title: '百败不折', desc: '累计失败 100 场', category: 'combat', counter: sum('combat.lose', 100), unlockText: '百败不折，你学会了在败局里读对手。' },
  { id: 'combat.streak.3', title: '三连胜', desc: '取得 3 连胜', category: 'combat', counter: max('combat.streak', 3), unlockText: '三连胜，出手的节奏终于连成线。' },
  { id: 'combat.streak.10', title: '十连胜', desc: '取得 10 连胜', category: 'combat', counter: max('combat.streak', 10), unlockText: '十连胜，你站在场上便已赢了半局。' },
  { id: 'combat.streak.30', title: '三十连胜', desc: '取得 30 连胜', category: 'combat', counter: max('combat.streak', 30), unlockText: '三十连胜，对手开始互相打听你的破绽。' },
  { id: 'combat.streak.100', title: '百战百胜', desc: '取得 100 连胜', category: 'combat', counter: max('combat.streak', 100), unlockText: '百战百胜，你的名字成了一种天气。' },
  { id: 'combat.win.training.1', title: '木人桩', desc: '首次在训练场获胜', category: 'combat', counter: sum('combat.win.training', 1), unlockText: '第一次打倒木人桩，招式第一次有了准头。' },
  { id: 'combat.win.training.50', title: '勤学苦练', desc: '在训练场获胜 50 次', category: 'combat', counter: sum('combat.win.training', 50), unlockText: '五十场训练胜，汗水比天赋更可靠。' },
  { id: 'combat.win.training.200', title: '十年磨剑', desc: '在训练场获胜 200 次', category: 'combat', counter: sum('combat.win.training', 200), unlockText: '两百场训练，你把一招磨成了本能。' },
  { id: 'combat.win.wild.1', title: '初入荒野', desc: '首次在野外战斗获胜', category: 'combat', counter: sum('combat.win.wild', 1), unlockText: '荒野初胜，风里第一次有你的气息。' },
  { id: 'combat.win.wild.200', title: '荒野行者', desc: '在野外获胜 200 次', category: 'combat', counter: sum('combat.win.wild', 200), unlockText: '荒野两百胜，山兽见了你便绕道。' },
  { id: 'combat.win.sect_task.1', title: '奉命出征', desc: '首次完成宗门战斗任务', category: 'combat', counter: sum('combat.win.sect_task', 1), unlockText: '奉命出征，第一次为宗门挥剑。' },
  { id: 'combat.win.sect_task.50', title: '宗门利刃', desc: '完成宗门战斗任务 50 次', category: 'combat', counter: sum('combat.win.sect_task', 50), unlockText: '五十次宗门战功，你是师门最利的刃。' },
  { id: 'combat.win.dungeon.1', title: '秘境破敌', desc: '首次在秘境战斗获胜', category: 'combat', counter: sum('combat.win.dungeon', 1), unlockText: '秘境首胜，古阵的回声记下了你。' },
  { id: 'combat.win.dungeon.50', title: '秘境常胜', desc: '在秘境获胜 50 次', category: 'combat', counter: sum('combat.win.dungeon', 50), unlockText: '秘境五十胜，你已能听出机关的呼吸。' },
  { id: 'combat.win.tower.1', title: '塔中初胜', desc: '首次在镇妖塔获胜', category: 'combat', counter: sum('combat.win.tower', 1), unlockText: '塔中初胜，妖气第一次为你让路。' },
  { id: 'combat.win.tower.50', title: '镇塔之勇', desc: '在镇妖塔获胜 50 次', category: 'combat', counter: sum('combat.win.tower', 50), unlockText: '五十层内皆胜绩，塔灵开始记住你。' },
  { id: 'combat.win.ranking.1', title: '擂台初胜', desc: '首次在排行挑战获胜', category: 'combat', counter: sum('combat.win.ranking', 1), unlockText: '擂台初胜，众人第一次看清你的路数。' },
  { id: 'combat.win.ranking.50', title: '擂台常客', desc: '在排行挑战获胜 50 次', category: 'combat', counter: sum('combat.win.ranking', 50), unlockText: '五十场擂台胜，你的名字常挂榜上。' },
  { id: 'combat.win.arena.1', title: '斗法初胜', desc: '首次在竞技场获胜', category: 'combat', counter: sum('combat.win.arena', 1), unlockText: '斗法首胜，你在众目之下赢了一局。' },
  { id: 'combat.win.arena.50', title: '斗法名家', desc: '在竞技场获胜 50 次', category: 'combat', counter: sum('combat.win.arena', 50), unlockText: '五十场斗法胜，观战者开始为你押注。' },
  { id: 'combat.win.hunt.1', title: '初猎成功', desc: '首次在协同狩猎中获胜', category: 'combat', counter: sum('combat.win.hunt', 1), unlockText: '首次协同狩猎，你与同门一战成名。' },
  { id: 'combat.win.hunt.50', title: '猎场老手', desc: '在协同狩猎中获胜 50 次', category: 'combat', counter: sum('combat.win.hunt', 50), unlockText: '五十场狩猎，你已能在兽群里布阵。' },
  { id: 'combat.win.breakthrough.1', title: '雷劫淬体', desc: '首次在突破战中获胜', category: 'combat', counter: sum('combat.win.breakthrough', 1), unlockText: '突破战首胜，你以雷劫淬了一遍骨。' },
  { id: 'arena.rank.top100', title: '初登擂台', desc: '竞技场进入前 100', category: 'combat', counter: max('arena.rank.best', 1), unlockText: '首次挤进前百，榜上终于有了你的名字。' },
  { id: 'arena.rank.top50', title: '擂台五十强', desc: '竞技场进入前 50', category: 'combat', counter: max('arena.rank.best', 51), unlockText: '五十强之列，围观的人开始多起来。' },
  { id: 'arena.rank.top10', title: '擂台十强', desc: '竞技场进入前 10', category: 'combat', counter: max('arena.rank.best', 91), unlockText: '踏入十强，你的对手只剩高手。' },
  { id: 'arena.rank.top3', title: '擂台三甲', desc: '竞技场进入前三', category: 'combat', counter: max('arena.rank.best', 98), unlockText: '三甲之位，你的名字被念得格外响。' },
  { id: 'arena.rank.top1', title: '天下第一', desc: '竞技场登顶', category: 'combat', counter: max('arena.rank.best', 100), unlockText: '登顶那一刻，天下第一有了具体的脸。' },
  { id: 'tower.floor.1', title: '初入镇妖塔', desc: '爬塔到达第 1 层', category: 'combat', counter: max('tower.floor', 1), unlockText: '推开塔门，第一层的风便带着妖气。' },
  { id: 'tower.floor.10', title: '初探高塔', desc: '爬塔到达第 10 层', category: 'combat', counter: max('tower.floor', 10), unlockText: '十层之上，你第一次看见塔下的云。' },
  { id: 'tower.floor.20', title: '二十层楼', desc: '爬塔到达第 20 层', category: 'combat', counter: max('tower.floor', 20), unlockText: '二十层，回望来路已细如丝线。' },
  { id: 'tower.floor.50', title: '半塔之志', desc: '爬塔到达第 50 层', category: 'combat', counter: max('tower.floor', 50), unlockText: '半塔之上，你已把恐惧留在下面。' },
  { id: 'tower.floor.75', title: '高处不胜寒', desc: '爬塔到达第 75 层', category: 'combat', counter: max('tower.floor', 75), unlockText: '七十五层，风声大得盖过心跳。' },
  { id: 'tower.floor.100', title: '塔顶问道', desc: '爬塔到达第 100 层', category: 'combat', counter: max('tower.floor', 100), unlockText: '塔顶见天，你终于问出了那一句。' },
  { id: 'hunts.kill.1', title: '初试猎刀', desc: '累计猎杀 1 只', category: 'combat', counter: sum('hunts.kill', 1), unlockText: '第一只猎物倒地，刀锋记住了重量。' },
  { id: 'hunts.kill.10', title: '小有斩获', desc: '累计猎杀 10 只', category: 'combat', counter: sum('hunts.kill', 10), unlockText: '十只猎获，你的刀不再犹豫。' },
  { id: 'hunts.kill.100', title: '百妖斩', desc: '累计猎杀 100 只', category: 'combat', counter: sum('hunts.kill', 100), unlockText: '百妖伏诛，荒野为你让出一条路。' },
  { id: 'hunts.kill.1000', title: '千妖伏诛', desc: '累计猎杀 1000 只', category: 'combat', counter: sum('hunts.kill', 1000), unlockText: '千妖伏诛，妖物开始以你之名吓唬小兽。' },
  { id: 'replay.share.1', title: '与人论道', desc: '首次分享战斗回放', category: 'combat', counter: sum('replay.share', 1), unlockText: '首次分享回放，你的招式第一次被旁观。' },
  { id: 'replay.share.10', title: '传阅战帖', desc: '分享战斗回放 10 次', category: 'combat', counter: sum('replay.share', 10), unlockText: '十次传阅，你的战帖成了谈资。' },

  // ---------- E. 探索、剧情与碑文（30） ----------
  { id: 'dungeon.clear.first', title: '初探秘境', desc: '首次通关秘境', category: 'explore', counter: sum('dungeon.clear', 1), unlockText: '首通秘境，机关尽处是另一片天地。' },
  { id: 'dungeon.clear.10', title: '秘境常客', desc: '累计通关 10 次', category: 'explore', counter: sum('dungeon.clear', 10), unlockText: '十次通关，秘境的岔路已在心中。' },
  { id: 'dungeon.clear.50', title: '秘境行者', desc: '累计通关 50 次', category: 'explore', counter: sum('dungeon.clear', 50), unlockText: '五十次通关，你走遍了每一处暗门。' },
  { id: 'dungeon.clear.100', title: '秘境宗师', desc: '累计通关 100 次', category: 'explore', counter: sum('dungeon.clear', 100), unlockText: '百次通关，秘境开始按你的习惯布阵。' },
  { id: 'dungeon.clear.200', title: '秘境传说', desc: '累计通关 200 次', category: 'explore', counter: sum('dungeon.clear', 200), unlockText: '两百次通关，秘境本身成了你的传说。' },
  { id: 'wanderer.trade.1', title: '游方生意', desc: '首次与游方商人交易', category: 'explore', counter: sum('wanderer.trade', 1), unlockText: '与游商做成第一笔买卖，路上多了个熟人。' },
  { id: 'wanderer.trade.10', title: '熟客', desc: '与游方商人交易 10 次', category: 'explore', counter: sum('wanderer.trade', 10), unlockText: '十次交易，游商老远便朝你招手。' },
  { id: 'wanderer.trade.50', title: '游方大主顾', desc: '与游方商人交易 50 次', category: 'explore', counter: sum('wanderer.trade', 50), unlockText: '五十次交易，游商为你留了最好的货。' },
  { id: 'spirit_field.first', title: '初入灵田', desc: '首次经营灵田', category: 'explore', unlockText: '第一次踏进灵田，泥里有灵气的味道。' },
  { id: 'spirit_field.sow.1', title: '播下灵种', desc: '首次播种', category: 'explore', counter: sum('spirit_field.sow', 1), unlockText: '播下第一粒灵种，你开始等一场春雨。' },
  { id: 'spirit_field.sow.10', title: '十亩灵田', desc: '累计播种 10 次', category: 'explore', counter: sum('spirit_field.sow', 10), unlockText: '十次播种，掌心已认得每一寸土。' },
  { id: 'spirit_field.sow.100', title: '灵田老农', desc: '累计播种 100 次', category: 'explore', counter: sum('spirit_field.sow', 100), unlockText: '百次播种，你比谁都懂灵植的脾气。' },
  { id: 'spirit_field.care.10', title: '悉心照料', desc: '累计照料灵田 10 次', category: 'explore', counter: sum('spirit_field.care', 10), unlockText: '十次照料，灵植开始记得你的脚步。' },
  { id: 'spirit_field.care.100', title: '灵田守护', desc: '累计照料灵田 100 次', category: 'explore', counter: sum('spirit_field.care', 100), unlockText: '百次照料，这片田被你养出了灵气。' },
  { id: 'spirit_field.harvest.1', title: '初获灵植', desc: '首次收获灵田', category: 'explore', counter: sum('spirit_field.harvest', 1), unlockText: '第一次收获，锄头落下的声音格外清脆。' },
  { id: 'spirit_field.harvest.10', title: '十次丰收', desc: '累计收获 10 次', category: 'explore', counter: sum('spirit_field.harvest', 10), unlockText: '十次丰收，仓里堆起了小小的山。' },
  { id: 'spirit_field.harvest.100', title: '岁岁丰登', desc: '累计收获 100 次', category: 'explore', counter: sum('spirit_field.harvest', 100), unlockText: '百次丰收，岁岁丰登成了你的年号。' },
  { id: 'spirit_field.fruit.1', title: '灵果初结', desc: '首次收获灵果', category: 'explore', counter: sum('spirit_field.fruit', 1), unlockText: '第一枚灵果坠枝，甜得有几分仙意。' },
  { id: 'spirit_field.fruit.10', title: '十枚灵果', desc: '累计收获 10 枚灵果', category: 'explore', counter: sum('spirit_field.fruit', 10), unlockText: '十枚灵果入篮，运气也结成了实。' },
  { id: 'spirit_field.level.3', title: '灵田三级', desc: '灵田升至 3 级', category: 'explore', counter: max('spirit_field.level', 3), unlockText: '灵田升到三级，垄间能听见低低的灵鸣。' },
  { id: 'spirit_field.level.6', title: '灵田满级', desc: '灵田升至 6 级', category: 'explore', counter: max('spirit_field.level', 6), unlockText: '灵田满级，这片土终于认你为主。' },
  { id: 'story.chapter.1', title: '初入江湖', desc: '完成第一章剧情', category: 'explore', counter: max('story.chapter', 1), unlockText: '第一章翻过，你的江湖正式开场。' },
  { id: 'story.guide.1', title: '初学引路', desc: '完成首次剧情指引', category: 'explore', counter: sum('story.guide', 1), unlockText: '第一次跟随指引，前路不再全然陌生。' },
  { id: 'story.guide.5', title: '按图索骥', desc: '完成 5 次剧情指引', category: 'explore', counter: sum('story.guide', 5), unlockText: '五次指引，你已能自己辨认方向。' },
  { id: 'story.guide.10', title: '循循善诱', desc: '完成 10 次剧情指引', category: 'explore', counter: sum('story.guide', 10), unlockText: '十次指引读完，你开始给别人指路。' },
  { id: 'inscriptions.first', title: '初见碑文', desc: '首次解读碑文', category: 'explore', counter: sum('inscriptions.count', 1), unlockText: '第一次读碑，石头里有人留下的叹息。' },
  { id: 'inscriptions.count.5', title: '略通古意', desc: '累计解读 5 处碑文', category: 'explore', counter: sum('inscriptions.count', 5), unlockText: '五处碑文，你听懂了古人的几句牢骚。' },
  { id: 'inscriptions.count.20', title: '博古通今', desc: '累计解读 20 处碑文', category: 'explore', counter: sum('inscriptions.count', 20), unlockText: '二十处碑文，往事在你心里连成了线。' },
  { id: 'inscriptions.count.50', title: '碑林通鉴', desc: '累计解读 50 处碑文', category: 'explore', counter: sum('inscriptions.count', 50), unlockText: '五十处碑文，你已能替古人作注。' },
  { id: 'inscriptions.count.100', title: '万碑皆识', desc: '累计解读 100 处碑文', category: 'explore', counter: sum('inscriptions.count', 100), unlockText: '百碑皆识，风化的字在你眼中重新清晰。' },

  // ---------- F. 炼丹、炼器、锻造（21） ----------
  { id: 'alchemy.first', title: '初开丹炉', desc: '首次炼丹', category: 'craft', counter: sum('alchemy.count', 1), unlockText: '第一次开炉，火光映红了半张脸。' },
  { id: 'alchemy.count.10', title: '十炉丹火', desc: '累计炼丹 10 次', category: 'craft', counter: sum('alchemy.count', 10), unlockText: '十炉丹火，你已能凭气味判断火候。' },
  { id: 'alchemy.count.100', title: '百炉不熄', desc: '累计炼丹 100 次', category: 'craft', counter: sum('alchemy.count', 100), unlockText: '百炉不熄，丹房成了你最久的住处。' },
  { id: 'alchemy.count.500', title: '丹炉常青', desc: '累计炼丹 500 次', category: 'craft', counter: sum('alchemy.count', 500), unlockText: '五百炉丹火，炉底都炼出了灵性。' },
  { id: 'alchemy.success.10', title: '小有丹成', desc: '累计成功 10 次', category: 'craft', counter: sum('alchemy.success', 10), unlockText: '十炉丹成，药香第一次盖过了焦味。' },
  { id: 'alchemy.success.100', title: '丹道大家', desc: '累计成功 100 次', category: 'craft', counter: sum('alchemy.success', 100), unlockText: '百炉丹成，同行开始向你讨教方子。' },
  { id: 'alchemy.success.500', title: '丹圣之心', desc: '累计成功 500 次', category: 'craft', counter: sum('alchemy.success', 500), unlockText: '五百炉丹成，你已近乎丹圣。' },
  { id: 'alchemy.grade.high', title: '上品灵丹', desc: '首次炼出高阶丹药', category: 'craft', unlockText: '上品灵丹出炉，丹纹细得像一笔工笔。' },
  { id: 'alchemy.improvised.1', title: '随手成丹', desc: '首次尝试即兴炼丹', category: 'craft', counter: sum('alchemy.improvised', 1), unlockText: '第一次即兴炼丹，居然也成了。' },
  { id: 'alchemy.formula.1', title: '照方抓药', desc: '首次按丹方炼丹', category: 'craft', counter: sum('alchemy.formula', 1), unlockText: '第一次依方炼丹，古人的经验没有骗你。' },
  { id: 'alchemy.formula.50', title: '丹方烂熟', desc: '按丹方炼丹 50 次', category: 'craft', counter: sum('alchemy.formula', 50), unlockText: '五十次依方炼丹，方子已刻进心里。' },
  { id: 'forging.first', title: '初握铁锤', desc: '首次炼器/锻造', category: 'craft', counter: sum('forging.count', 1), unlockText: '第一次握锤，火星在眼前炸开。' },
  { id: 'forging.count.10', title: '十件器物', desc: '累计锻造 10 次', category: 'craft', counter: sum('forging.count', 10), unlockText: '十件器物成坯，手掌磨出了厚茧。' },
  { id: 'forging.count.50', title: '百炼成器', desc: '累计锻造 50 次', category: 'craft', counter: sum('forging.count', 50), unlockText: '五十件器物，锤声成了你的节拍。' },
  { id: 'forging.count.200', title: '器道宗师', desc: '累计锻造 200 次', category: 'craft', counter: sum('forging.count', 200), unlockText: '两百件器物，器道已认你为宗师。' },
  { id: 'forging.count.500', title: '炉火纯青', desc: '累计锻造 500 次', category: 'craft', counter: sum('forging.count', 500), unlockText: '五百次锻造，炉火终于纯青。' },
  { id: 'forging.count.1000', title: '千锤百炼', desc: '累计锻造 1000 次', category: 'craft', counter: sum('forging.count', 1000), unlockText: '千次锤落，你把光阴锻成了器物。' },
  { id: 'forging.quality.4star', title: '良器初成', desc: '首次锻造出高品质装备', category: 'craft', unlockText: '第一件高品质装备出坯，锋芒初显。' },
  { id: 'forging.quality.5star', title: '神兵出世', desc: '首次锻造出五星装备', category: 'craft', unlockText: '五星装备出世，炉中隐有龙吟。' },
  { id: 'forging.perfect.first', title: '完美之作', desc: '首次出现满词条/极品', category: 'craft', unlockText: '第一次满词条，你反复看了三遍。' },
  { id: 'forging.perfect.10', title: '极品十件', desc: '累计锻造出 10 件满词条极品', category: 'craft', counter: sum('forging.perfect', 10), unlockText: '十件极品在手，你的锤有了名号。' },

  // ---------- G. 灵兽（24） ----------
  { id: 'beast.capture.first', title: '初收灵兽', desc: '首次捕获灵兽', category: 'beast', unlockText: '第一次捕获灵兽，你与它对视了很久。' },
  { id: 'beast.capture.10', title: '十兽入囊', desc: '累计捕获 10 只灵兽', category: 'beast', counter: sum('beast.capture', 10), unlockText: '十只灵兽入栏，兽栏开始热闹。' },
  { id: 'beast.capture.50', title: '兽栏渐满', desc: '累计捕获 50 只灵兽', category: 'beast', counter: sum('beast.capture', 50), unlockText: '五十只灵兽，兽栏得再扩一圈。' },
  { id: 'beast.capture.200', title: '万兽归心', desc: '累计捕获 200 只灵兽', category: 'beast', counter: sum('beast.capture', 200), unlockText: '两百只灵兽，山野尽入你栏中。' },
  { id: 'beast.species.1', title: '初识生灵', desc: '图鉴收录 1 个物种', category: 'beast', counter: max('beast.species', 1), unlockText: '图鉴写下第一个物种，笔尖有点抖。' },
  { id: 'beast.species.5', title: '五灵在册', desc: '图鉴收录 5 个物种', category: 'beast', counter: max('beast.species', 5), unlockText: '五种灵兽在册，你开始整理它们的习性。' },
  { id: 'beast.species.10', title: '十灵图鉴', desc: '图鉴收录 10 个物种', category: 'beast', counter: max('beast.species', 10), unlockText: '十种灵兽在手，图鉴已能装订成册。' },
  { id: 'beast.species.20', title: '万灵图鉴', desc: '图鉴收录 20 个物种', category: 'beast', counter: max('beast.species', 20), unlockText: '二十种灵兽，你已能背出它们的血脉。' },
  { id: 'beast.species.30', title: '三十异兽', desc: '图鉴收录 30 个物种', category: 'beast', counter: max('beast.species', 30), unlockText: '三十种异兽归册，这册书可传后世。' },
  { id: 'beast.talent.high', title: '天资卓绝', desc: '首次获得高资质灵兽', category: 'beast', unlockText: '第一只高资质灵兽入栏，你笑了一整夜。' },
  { id: 'beast.skill.first', title: '天生神通', desc: '首次灵兽拥有出生技能', category: 'beast', unlockText: '第一只灵兽觉醒出生技能，栏里亮了一瞬。' },
  { id: 'beast.realm.first', title: '兽亦有道', desc: '首次灵兽境界提升', category: 'beast', unlockText: '灵兽首次破境，你替它守了一夜。' },
  { id: 'beast.realm.3', title: '兽道三阶', desc: '灵兽境界提升 3 次', category: 'beast', counter: sum('beast.realm', 3), unlockText: '三次兽境提升，它开始听你的呼吸。' },
  { id: 'beast.realm.10', title: '兽道十阶', desc: '灵兽境界提升 10 次', category: 'beast', counter: sum('beast.realm', 10), unlockText: '十次兽境提升，你们已同进同退。' },
  { id: 'beast.fusion.1', title: '初试融灵', desc: '首次融合灵兽', category: 'beast', counter: sum('beast.fusion', 1), unlockText: '第一次融合灵兽，两道灵息合成一线。' },
  { id: 'beast.fusion.10', title: '融灵十次', desc: '累计融合灵兽 10 次', category: 'beast', counter: sum('beast.fusion', 10), unlockText: '十次融灵，你摸清了血脉的纹理。' },
  { id: 'beast.fusion.50', title: '融会贯通', desc: '累计融合灵兽 50 次', category: 'beast', counter: sum('beast.fusion', 50), unlockText: '五十次融灵，灵兽在你手中互通有无。' },
  { id: 'beast.evolve.first', title: '蜕变', desc: '首次灵兽进化/蜕变', category: 'beast', unlockText: '第一次见证灵兽蜕变，旧壳裂开，新生。' },
  { id: 'beast.lineup.first', title: '布阵迎敌', desc: '首次设置灵兽阵容', category: 'beast', counter: sum('beast.lineup', 1), unlockText: '第一次布阵，四兽各归其位。' },
  { id: 'beast.rename.first', title: '赐名', desc: '首次为灵兽改名', category: 'beast', counter: sum('beast.rename', 1), unlockText: '第一次为灵兽赐名，它似乎听懂了。' },
  { id: 'beast.allocate.first', title: '点化灵性', desc: '首次为灵兽分配属性点', category: 'beast', counter: sum('beast.allocate', 1), unlockText: '第一次分配属性点，它的气息变了。' },
  { id: 'beast.rest.first', title: '休养生息', desc: '首次让灵兽休息', category: 'beast', counter: sum('beast.rest', 1), unlockText: '第一次让它休息，你知道何时该收。' },
  { id: 'beast.lock.first', title: '珍而重之', desc: '首次锁定灵兽', category: 'beast', counter: sum('beast.lock', 1), unlockText: '第一次锁定灵兽，你把它的位置钉牢。' },
  { id: 'beast.release.first', title: '放归山林', desc: '首次放生灵兽', category: 'beast', counter: sum('beast.release', 1), unlockText: '第一次放生灵兽，你站在山口很久。' },

  // ---------- H. 功法、悟道、占卜、重塑（25） ----------
  { id: 'manual.learn.first', title: '初习功法', desc: '首次学习功法', category: 'dao', counter: max('manual.count', 1), unlockText: '第一门功法入体，气机有了方向。' },
  { id: 'manual.count.5', title: '五法同修', desc: '掌握 5 门功法', category: 'dao', counter: max('manual.count', 5), unlockText: '五法同修，经脉开始互相借力。' },
  { id: 'manual.count.10', title: '十法在身', desc: '掌握 10 门功法', category: 'dao', counter: max('manual.count', 10), unlockText: '十法在身，你对敌时多了十种选择。' },
  { id: 'manual.count.20', title: '藏经满阁', desc: '掌握 20 门功法', category: 'dao', counter: max('manual.count', 20), unlockText: '二十门功法，你已能自开讲席。' },
  { id: 'manual.count.40', title: '万法归宗', desc: '掌握 40 门功法', category: 'dao', counter: max('manual.count', 40), unlockText: '四十门功法，万法在你身上归一。' },
  { id: 'manual.max.first', title: '功法大成', desc: '首次功法满层', category: 'dao', unlockText: '第一门功法满层，气机圆转如意。' },
  { id: 'manual.max.3', title: '三法圆满', desc: '3 门功法满层', category: 'dao', counter: max('manual.max', 3), unlockText: '三门功法圆满，招式再无生涩。' },
  { id: 'manual.max.10', title: '十法圆满', desc: '10 门功法满层', category: 'dao', counter: max('manual.max', 10), unlockText: '十法圆满，举手皆是道理。' },
  { id: 'enlightenment.first', title: '顿悟', desc: '首次悟道', category: 'dao', counter: sum('enlightenment.count', 1), unlockText: '第一次顿悟，天地忽然安静。' },
  { id: 'enlightenment.count.3', title: '三花聚顶', desc: '累计悟道 3 次', category: 'dao', counter: sum('enlightenment.count', 3), unlockText: '三次顿悟，顶上隐隐有华光。' },
  { id: 'enlightenment.count.10', title: '十次顿悟', desc: '累计悟道 10 次', category: 'dao', counter: sum('enlightenment.count', 10), unlockText: '十次顿悟，你的道心被磨得透亮。' },
  { id: 'enlightenment.count.50', title: '五十悟道', desc: '累计悟道 50 次', category: 'dao', counter: sum('enlightenment.count', 50), unlockText: '五十次悟道，你已能从落叶里读出经文。' },
  { id: 'enlightenment.count.100', title: '百悟成真', desc: '累计悟道 100 次', category: 'dao', counter: sum('enlightenment.count', 100), unlockText: '百悟成真，悟道于你如同呼吸。' },
  { id: 'divination.first', title: '初窥天机', desc: '首次占卜', category: 'dao', unlockText: '第一次占卜，卦象模糊，却让你心慌。' },
  { id: 'divination.count.1', title: '一卦知命', desc: '累计占卜 1 次', category: 'dao', counter: sum('divination.count', 1), unlockText: '一卦落地，你第一次触到天机的边。' },
  { id: 'divination.count.10', title: '十卦问天', desc: '累计占卜 10 次', category: 'dao', counter: sum('divination.count', 10), unlockText: '十卦问天，你学会了不把答案说满。' },
  { id: 'divination.count.100', title: '百卦通玄', desc: '累计占卜 100 次', category: 'dao', counter: sum('divination.count', 100), unlockText: '百卦通玄，你已能与天机讨价还价。' },
  { id: 'reshape.first', title: '重塑道基', desc: '首次重塑', category: 'dao', counter: sum('reshape.count', 1), unlockText: '第一次重塑道基，旧骨碎得清脆。' },
  { id: 'reshape.count.5', title: '五次重塑', desc: '累计重塑 5 次', category: 'dao', counter: sum('reshape.count', 5), unlockText: '五次重塑，根骨换了一副又一副。' },
  { id: 'reshape.count.10', title: '十洗凡骨', desc: '累计重塑 10 次', category: 'dao', counter: sum('reshape.count', 10), unlockText: '十次重塑，凡骨洗尽，仙姿初成。' },
  { id: 'reshape.count.50', title: '五十易筋', desc: '累计重塑 50 次', category: 'dao', counter: sum('reshape.count', 50), unlockText: '五十次易筋，你的身体成了可改的稿。' },
  { id: 'transfer.first', title: '衣钵相传', desc: '首次完成传承', category: 'dao', unlockText: '第一次传承，你把一段道交给了后人。' },
  { id: 'transfer.count.3', title: '三度传功', desc: '累计完成 3 次传承', category: 'dao', counter: sum('transfer.count', 3), unlockText: '三次传功，你的道已不止一条路。' },
  { id: 'transfer.receive.first', title: '他乡故人', desc: '首次接收他处传来的角色', category: 'dao', unlockText: '第一次接收他处传来的角色，像接回一个旧梦。' },
  { id: 'transfer.receive.3', title: '三度接引', desc: '累计接收角色 3 次', category: 'dao', counter: sum('transfer.receive.count', 3), unlockText: '三次接引，你已认得这份托付的重量。' },

  // ---------- I. 交易、拍卖、黑市、声望、赞助（23） ----------
  { id: 'market.trade.first', title: '初开铺面', desc: '首次在市场完成交易', category: 'trade', counter: sum('market.trade', 1), unlockText: '第一次开铺，吆喝声还有点生。' },
  { id: 'market.trade.10', title: '十笔生意', desc: '累计成交 10 笔', category: 'trade', counter: sum('market.trade', 10), unlockText: '十笔生意，你已能算清每分利。' },
  { id: 'market.trade.100', title: '百笔生意', desc: '累计成交 100 笔', category: 'trade', counter: sum('market.trade', 100), unlockText: '百笔成交，坊市里都认得你的招牌。' },
  { id: 'market.trade.500', title: '五百成交', desc: '累计成交 500 笔', category: 'trade', counter: sum('market.trade', 500), unlockText: '五百笔生意，账本厚过功法册。' },
  { id: 'market.trade.1000', title: '千笔交易', desc: '累计成交 1000 笔', category: 'trade', counter: sum('market.trade', 1000), unlockText: '千笔交易，你已是一门之市。' },
  { id: 'market.volume.10k', title: '万石流水', desc: '累计成交额达到 1 万灵石', category: 'trade', counter: sum('market.volume', 10_000), unlockText: '流水破万，你第一次觉得灵石有了重量。' },
  { id: 'market.volume.100k', title: '十万流水', desc: '累计成交额达到 10 万灵石', category: 'trade', counter: sum('market.volume', 100_000), unlockText: '十万流水过手，你都懒得数了。' },
  { id: 'market.volume.1m', title: '百万流水', desc: '累计成交额达到 100 万灵石', category: 'trade', counter: sum('market.volume', 1_000_000), unlockText: '百万流水，你已改写了坊市的行情。' },
  { id: 'market.volume.10m', title: '千万流水', desc: '累计成交额达到 1000 万灵石', category: 'trade', counter: sum('market.volume', 10_000_000), unlockText: '千万流水，坊市的价皆随你而变。' },
  { id: 'auction.list.1', title: '寄售之物', desc: '首次上架拍卖', category: 'trade', counter: sum('auction.list', 1), unlockText: '第一次寄售，你把舍不得的东西交了出去。' },
  { id: 'auction.list.10', title: '拍卖常客', desc: '累计上架拍卖 10 次', category: 'trade', counter: sum('auction.list', 10), unlockText: '十次上架，拍卖行的椅子有了你的温度。' },
  { id: 'auction.win.first', title: '拍得所爱', desc: '首次拍卖中标', category: 'trade', unlockText: '第一次中标，落槌声在耳边久久不散。' },
  { id: 'auction.win.10', title: '十拍十中', desc: '累计拍卖中标 10 次', category: 'trade', counter: sum('auction.win', 10), unlockText: '十拍十中，你的举牌成了别人的压力。' },
  { id: 'auction.win.50', title: '拍卖行家', desc: '累计拍卖中标 50 次', category: 'trade', counter: sum('auction.win', 50), unlockText: '五十次中标，你已能看穿每次抬价。' },
  { id: 'black_market.buy.first', title: '暗市初探', desc: '首次黑市交易', category: 'trade', unlockText: '第一次走进暗市，灯影里都是压低的声音。' },
  { id: 'black_market.buy.10', title: '暗市常客', desc: '累计黑市交易 10 次', category: 'trade', counter: sum('black_market.buy', 10), unlockText: '十次暗市交易，摊主见你便掀开布。' },
  { id: 'black_market.buy.50', title: '暗市巨贾', desc: '累计黑市交易 50 次', category: 'trade', counter: sum('black_market.buy', 50), unlockText: '五十次暗市交易，暗巷因你而暖。' },
  { id: 'reputation.exchange.first', title: '声望兑换', desc: '首次在声望商店兑换', category: 'trade', unlockText: '第一次声望兑换，名望换成了实物。' },
  { id: 'reputation.exchange.10', title: '声望常客', desc: '累计声望兑换 10 次', category: 'trade', counter: sum('reputation.exchange', 10), unlockText: '十次兑换，声望铺子为你留了门。' },
  { id: 'reputation.exchange.50', title: '名望一方', desc: '累计声望兑换 50 次', category: 'trade', counter: sum('reputation.exchange', 50), unlockText: '五十次兑换，一方水土都念你的好。' },
  { id: 'sponsorship.first', title: '结缘赞助', desc: '首次完成赞助', category: 'trade', unlockText: '第一次赞助，你把善意结成了缘。' },
  { id: 'sponsorship.count.3', title: '三度结缘', desc: '累计完成 3 次赞助', category: 'trade', counter: sum('sponsorship.count', 3), unlockText: '三次赞助，缘分在你手上结了串。' },
  { id: 'sponsorship.count.10', title: '功德无量', desc: '累计完成 10 次赞助', category: 'trade', counter: sum('sponsorship.count', 10), unlockText: '十次赞助，功德簿上记了长长一行。' },

  // ---------- J. 社交、排行与任务（12） ----------
  { id: 'social.friend.first', title: '初见道友', desc: '首次添加好友', category: 'social', counter: max('social.friend', 1), unlockText: '第一次加好友，通讯玉简里多了个名字。' },
  { id: 'social.friend.5', title: '三五知己', desc: '好友达到 5 人', category: 'social', counter: max('social.friend', 5), unlockText: '五位知己，足够在长夜里论道。' },
  { id: 'social.friend.20', title: '高朋满座', desc: '好友达到 20 人', category: 'social', counter: max('social.friend', 20), unlockText: '二十好友，你的洞府常有人来。' },
  { id: 'social.friend.50', title: '友遍天下', desc: '好友达到 50 人', category: 'social', counter: max('social.friend', 50), unlockText: '五十好友，走到哪里都有人递茶。' },
  { id: 'social.chat.first', title: '传音入密', desc: '首次发送聊天', category: 'social', unlockText: '第一次传音，句子打了三遍才发出去。' },
  { id: 'social.chat.10', title: '畅所欲言', desc: '累计发送聊天 10 条', category: 'social', counter: sum('social.chat', 10), unlockText: '十句闲聊，你已不再斟酌措辞。' },
  { id: 'social.chat.100', title: '健谈者', desc: '累计发送聊天 100 条', category: 'social', counter: sum('social.chat', 100), unlockText: '百句传音，你的玉简热得发烫。' },
  { id: 'social.chat.1000', title: '话痨道友', desc: '累计发送聊天 1000 条', category: 'social', counter: sum('social.chat', 1000), unlockText: '千句传音，同门都笑你嘴上不设关。' },
  { id: 'tasks.completed.1', title: '初成任务', desc: '累计完成 1 个任务', category: 'social', counter: sum('tasks.completed', 1), unlockText: '第一个任务完成，回禀时腰杆很直。' },
  { id: 'tasks.completed.3', title: '勤恳做事', desc: '累计完成 3 个任务', category: 'social', counter: sum('tasks.completed', 3), unlockText: '三个任务做完，你开始被点名差遣。' },
  { id: 'tasks.completed.6', title: '事事躬亲', desc: '累计完成 6 个任务', category: 'social', counter: sum('tasks.completed', 6), unlockText: '六个任务，你在宗门里越走越熟。' },
  { id: 'tasks.completed.8', title: '八关尽渡', desc: '完成全部 8 个主线突破任务', category: 'social', counter: sum('tasks.completed', 8), unlockText: '八道主线走完，你已渡尽这一程关卡。' },

  // ---------- K. 活动专属（13） ----------
  { id: 'journey.enter.first', title: '初入万界', desc: '首次通过转世进入道友', category: 'journey', unlockText: '第一次踏入万界，风里全是陌生的道。' },
  { id: 'journey.generation.3', title: '三世为人', desc: '同一角色进入第 3 世', category: 'journey', counter: max('journey.generation', 3), unlockText: '这一脉走到第三世，前尘已成家训。' },
  { id: 'journey.generation.5', title: '五世其昌', desc: '同一角色进入第 5 世', category: 'journey', counter: max('journey.generation', 5), unlockText: '五世其昌，你的名字在世系谱上连成线。' },
  { id: 'journey.generation.10', title: '十世轮回', desc: '同一角色进入第 10 世', category: 'journey', counter: max('journey.generation', 10), unlockText: '十世轮回不断，你成了自己的祖宗。' },
  { id: 'journey.realm.jindan', title: '转世金丹', desc: '转世角色首次到达金丹', category: 'journey', unlockText: '转世之身凝出金丹，前世的路没有白走。' },
  { id: 'journey.realm.huashan', title: '转世化神', desc: '转世角色首次到达化神', category: 'journey', unlockText: '转世化神，你终于越过前世的自己。' },
  { id: 'journey.death.first', title: '首世终章', desc: '首次转世角色陨落', category: 'journey', unlockText: '首世落幕，你合上眼时并无不甘。' },
  { id: 'journey.legacy.first', title: '薪火相传', desc: '角色世系首次延续到第二世', category: 'journey', unlockText: '世系延到第二世，火种没有熄。' },
  { id: 'journey.achievement.10', title: '道心初明', desc: '单世解锁 10 个成就', category: 'journey', counter: max('journey.achievement.count', 10), unlockText: '单世十件成就，道心终于有了形状。' },
  { id: 'journey.achievement.25', title: '道心澄澈', desc: '单世解锁 25 个成就', category: 'journey', counter: max('journey.achievement.count', 25), unlockText: '单世二十五件成就，道心如镜。' },
  { id: 'journey.achievement.50', title: '道心通明', desc: '单世解锁 50 个成就', category: 'journey', counter: max('journey.achievement.count', 50), unlockText: '单世五十件成就，道心照见天地。' },
  { id: 'journey.achievement.100', title: '道心圆满', desc: '单世解锁 100 个成就', category: 'journey', counter: max('journey.achievement.count', 100), unlockText: '单世百件成就，道心圆满无缺。' },
  { id: 'journey.archive.top', title: '名留世系', desc: '单世进入世系谱最高境界前列', category: 'journey', unlockText: '世系谱前列刻下你的境界，后人会读到。' },
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
