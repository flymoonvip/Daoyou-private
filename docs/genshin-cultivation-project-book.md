# 《原神修仙传》项目书（v0.3）

> 状态：**需求细化中**。主题、方向与核心传入内容已确定；标注「待确认」的条目为基于现有代码的假设。
> 最后更新：2026-11-05
>
> v0.2 变更（需求方补充）：
> 1. 主站传入内容明确为 **角色姓名、性别、角色强度**；其中**角色强度由主站侧消耗道具确定**。
> 2. 道友侧**为每一个传入角色指定：初始加点、指定门派、自带技能或被动**。
> 3. 方案从 v0.1 的「三选一」收敛为：**主站传选择（角色标识 + 强度档），道友侧预置角色模板决定一切数值**。
>
> v0.2 补充（模板细化）：功法槽位/瓶颈、命格紧凑规格核实完毕，新增 5.6 模板数据包 JSON 规格与 5.7 首个角色三档完整示例。
>
> v0.3 变更（主站代码已入工作区，双侧设计打通）：
> - 新增 2.8「主站现状（代码事实）」：SSO 票据 Redis 结构、活动存档模式、道具消耗通道、角色查询命令。
> - 主站侧方案定稿（第 4A 章）：在「万界道友」活动内新增「本次修行」玩法，复用 1000008 流水无涯的「选角色 + 服务端权重抽奖 + ActivitySaveData」成熟模式。
> - 票据契约修订（6.1）：扩展 Redis 票据载荷携带 `journeyId`，redeem 响应附带 journey 快照，不新增第二套密钥。

---

## 1. 项目概述

### 1.1 一句话定位

《原神修仙传》：主站（原神市场）活动中产生的「本次修行角色」，通过已建成的服务端通道传入道友（万界道友），用户在道友中以该角色开启修仙人生——角色的姓名、性别、强度由主站决定，初始加点、门派、自带功法被动由道友侧按角色模板预置。

### 1.2 已确定的需求

- 角色来源：用户在主站侧「本次修行」活动/玩法中获得或选定的角色。
- 传入方向：**主站 → 道友**（与现有登录 SSO 同方向）。
- 主站传入（不可信输入，仅表达「选择」，不含任何数值）：
  - **角色姓名**
  - **性别**
  - **角色强度**：由主站侧**消耗道具**的结果确定（消耗什么道具、强度分几档由主站规则决定，待对齐）。
  - 隐含还需传入**角色标识**（哪位角色，对应道友侧模板）；v0.3 定为 `gi:{原神avatarId}`。
- 道友侧为每个角色配置（可信，道友仓库内的预置内容）：
  - **初始加点**（六维属性如何分配）
  - **指定门派**（八大派之一）
  - **自带技能或被动**（通过预置个人功法实现，详见 5.4）
- 传入时机（v0.3 定稿）：主站 1000009 活动页内完成「选角色 → 消耗道具抽签定档」，玩家选定 journey 后点「进入万界道友」，随 SSO 票据一次性带入（详见第 4A 章）。

### 1.3 本项目与既有功能的边界

| 能力 | 现状 | 本项目 |
| --- | --- | --- |
| 主站账号登录道友（SSO） | ✅ 已上线 | 复用，票据兑换响应扩展角色载荷 |
| 主站读取道友角色简介 | ✅ 已上线（活动页展示） | 可能扩展字段（本次修行绑定状态） |
| 道友内自建角色（AI 推演身世 + 命格三选） | ✅ 已上线 | 保留为降级/常规入口 |
| 主站角色传入道友（姓名/性别/强度 → 模板降世） | ❌ 不存在 | **本项目核心** |
| 修行进度回传主站 | ❌ 不存在 | 不在本期范围（远期方案 C） |

---

## 2. 现有基础（代码事实）

### 2.1 身份通道：主站 → 道友（已建成，本项目直接复用）

用户在主站登录后，持一次性票据回跳道友，道友服务端向主站兑换身份并建立本地会话。

```
浏览器          道友 API                         原神市场 API
  │ /sso/callback?ticket=xxx                       │
  │──────────────→│  POST /api/v1/auth/sso/redeem  │
  │               │  Header: X-Internal-Secret     │
  │               │───────────────────────────────→│
  │               │←── userId/username/email/      │
  │               │     nickname/role ─────────────│
  │               │ 按 externalAuthId 建档/同步     │
  │←── Set-Cookie（道友会话）────────│              │
```

关键实现：

- 兑换客户端：`apps/api/src/lib/auth/genshinMarketSso.ts`
  - `POST {GENSHIN_MARKET_SSO_BASE_URL}/api/v1/auth/sso/redeem`
  - 票据一次性、60 秒有效；10 秒超时；区分 `unconfigured / invalid-ticket / upstream-error`
  - 身份快照类型 `GenshinMarketIdentity = {userId, username, email, nickname, role}`
- 兑换服务：`apps/api/src/auth/sso.service.ts`
  - 本地用户表以 `auth_users.external_auth_id` 与主站 `userId` 一一映射
  - 主站账号可能无邮箱，本地以 `{userId}@daoyou.invalid` 占位
- 前端回跳：`apps/web/src/routes/sso/callback/route.tsx`（票据兑换成功后进 `/game`）
- 配置：`GENSHIN_MARKET_SSO_BASE_URL` + `SSO_INTERNAL_SECRET`（成对配置；未配置时通道默认关闭）

**结论：不重建鉴权。角色载荷随同一张一次性票据兑换获得，浏览器全程接触不到密钥与原始载荷。**

### 2.2 回读通道：道友 → 主站（已建成）

- `GET /internal/player/profile?externalUserId=...`（`apps/api/src/player/internal-profile.controller.ts`）
- `InternalIdentityGuard` 用 `X-Internal-Secret` 做常数时间校验；未配密钥返回 503，密钥错误返回 401
- 返回主站用户当前活跃角色简介：名号、道号、性别、出身、性格、背景、境界、阶段、年龄；无角色返回 null

### 2.3 道友建号现状（本项目的接入点）

现有自建角色流程（`apps/api/src/genesis/`）：

1. `GET /api/genesis/quota` 查询当日推演额度（按邮箱/IP 限 6 次）
2. `POST /api/genesis` 提交 2～200 字角色描述 → LLM 推演候选角色（tempId，Redis 临时数据）
3. `POST /api/genesis/fates` 推演命格三选项
4. `POST /api/genesis/create` / `save` 选定命格后落库为正式修士

**直接锚点**——`genesis.service.ts` 第 41～43 行：

```ts
// 主站尚未建设完成，建号提示暂用此初始模板兜底；后续由主站传入。
const INITIAL_CHARACTER_PROMPT =
  '一位出身没落丹道世家的废柴少主，天资平平却心志坚韧，渴望靠炼丹逆袭，证得长生。';
```

即：建号提示词「由主站传入」在代码注释中已被预留为既定方向，本项目兑现并超出它。

落库入口：`CultivatorCreationApplicationService.ts`

- `executeCultivatorCreationCommand(userId, cultivator, tx)`：在一个事务内建角色、同步初始任务、发 20000 灵石新手礼包邮件，并提交 `player.session / cultivator.created` 资源事件（事件里 `activeCultivator.sectId = null`）。
- `findCultivatorCreationBlock(userId)`：已有 `active` 角色或 `transfer_pending` 角色时阻止建号。**外部降世走同一闸口**，天然保证「一人一道身」。
- `createCultivatorFromTemp()`：Redis 锁 `cultivatorCreation` + 临时角色/命格读取 + 命格三选校验（必须恰好 3 个）。外部降世不复用临时数据读取，但应复用同一把锁与同一 command 执行器。

### 2.4 角色落库字段（传入字段的映射目标，已核实）

`createCultivator()`（`cultivator/application/readers/CultivatorProfileRepository.ts` L121-198）在同一事务写三张表：

| 存储 | 表 | 与本项目相关的字段 |
| --- | --- | --- |
| 角色主表 | `wanjiedaoyou_cultivators` | `name varchar(100) NOT NULL`；`gender varchar(10)`（注释枚举 男\|女\|无）；`origin/personality/background`；`prompt text NOT NULL`（用户原始输入，外部角色可写溯源串）；`realm='炼气'`、`realm_stage='初期'`、`age`、`lifespan`；六维 `vitality/strength/spirit/endurance/speed/willpower`（整型，NOT NULL）；`unallocated_attribute_points` |
| 灵根 | `wanjiedaoyou_spiritual_roots` | 每行一个 `element` + `strength` + `grade`（天灵根/真灵根/伪灵根/变异灵根） |
| 先天命格 | `wanjiedaoyou_pre_heaven_fates` | 命格内容 JSON（含 `effects` 效果数组） |

角色生成器 `buildGeneratedCharacter()`（`packages/game-rules/src/character/creation/CharacterGenerator.ts`）现状：炼气初期；age 14-20；寿元 `80+rand(20)+(资质>80?20:0)`；六维全部取自然值；未分配点数 25；灵根由资质分与元素倾向生成；命格留空走后续三选。

**外部降世角色就是绕过 LLM 与命格三选，直接构造一个合法的 `Cultivator` 领域对象交给同一落库入口**，再在同事务内追加门派与功法预置。

### 2.5 门派体系（「指定门派」落点，已核实）

- 共 **8 个门派**，注册表 `SECT_ORGANIZATION_DEFINITIONS`（`packages/game-content/src/sect-organization/definitions.ts`）：

| sectId | 门派名 | sectId | 门派名 |
| --- | --- | --- | --- |
| `lingxiao` | 红尘剑宗 | `jiujie` | 九劫天宫 |
| `wuxiang` | 无相禅宗 | `bailu` | 白鹿书院 |
| `tianyan` | 天衍圣地 | `wanqiao` | 万窍山 |
| `youdu` | 幽都 | `xiaoyue` | 百兽崖 |

- **准入条件只看种族**：`StandardSectModule.checkAdmission()` → `AllowedRaceAdmissionPolicy`，8 派定义均为 `raceIds: ['human']`；建号角色固定 `playerRace='human'`，因此**建号即入任意门派都能通过准入，没有境界/灵根门槛**。
- 归属表 `wanjiedaoyou_sect_memberships`（schema L328-363）：`cultivatorId + sectId` 唯一；**每个 cultivator 仅允许一条 `status='active'`**（partial unique index）；`status` 默认 `prospect`；`discipleRank` 默认 `registered`；另有 `joinedAt/contribution/office/configVersion`。
- 入宗服务 `SectAdmissionApplicationService.join/joinCommand`（`apps/api/src/sects/organization/SectAdmissionApplicationService.ts`）：
  1. `assertAdmission`（种族校验）；
  2. 已 active 则报「已经是 X 弟子」；
  3. `ensureMembershipCandidate`（无则建 prospect 行）→ `activateMembership` → `ensureFacilities`（按门派定义补齐全门派共享设施行）；
  4. `joinCommand` 追加 4 条资源变更：`player.sect-combat` invalidate、`player.session / sect.joined` merge（`activeCultivator.sectId`）、`sect.membership` replace、`sect.members` invalidate。
- **建号时没有任何门派绑定**（`sectId: null`）。外部降世需要在建号事务内复用该 repository 的 candidate/activate/facilities 三步，并补发 `sect.joined` 事件族。
- 门派心法/技能是**独立于个人功法的另一套体系**（门派定义内的 `methods` 与 `*.passive.*` / `*.skill.*`，如 `bailu.passive.righteousness`），入宗后由宗门战斗投影提供，不写入个人功法表。

### 2.6 功法与被动体系（「自带技能或被动」落点，已核实）

- **当前游戏里修士没有独立的「技能栏/天赋栏」**，战斗能力来自四条投影：个人功法、装备、宗门、经脉。对「建号自带」而言，唯一现成且合规的载体是**个人功法**：
  - 功法内容 `packages/game-content/src/manuals/data/manual-pack.json`；内容加载器 `content.ts` 为**每本功法自动生成一个 `SkillTag.Passive / TargetSide.Self` 的被动技能对象**——即「功法 = 可激活的被动」。
  - 个人功法状态：`CultivatorManualStateV1 = {version:1, revision, learned:[{manualId, level, unlockedLevel, slot?}], build:{slots:[{slot, manualId}]}}`。
  - 两张表：`wanjiedaoyou_cultivator_manual_states`（`learned` JSONB + `revision`，每角色一行）与 `wanjiedaoyou_cultivator_manual_slots`（`slot + manualId`）。
  - 6 个功法槽按境界开放（`MANUAL_SLOT_REALMS = ['炼气','筑基','金丹','元婴','化神','合体']`）：**炼气期只开放槽 1**；每槽最多学 6 本、只激活 1 本。
  - 现有炼气期功法 6 本：`character_manual.changchun` 长春功、`gengjin` 庚金诀、`qingmu` 青木养元诀、`qingquan` 清泉诀、`chiyan` 赤炎诀、`houtu_jue` 厚土诀；筑基 3 本（归元功/幻灵诀/青元剑诀）。**炼气角色预置筑基功法会被规则层拒绝**（境界校验）。
  - 变更规则 `changeManual()`（`packages/game-rules/src/manuals/state.ts`）是纯函数：校验功法存在、槽位适配、境界、每槽上限、revision，learn 时写 `level:1 / unlockedLevel=首个瓶颈或满级`。
  - API 侧写入先例：`CombatV6ManualService.mutateManuals()`（行 99 有 `insert ... onConflictDoNothing` 兜底建行）；转服导入 `transfer/transfer-import.ts` L39 也有直接插 `cultivatorManualStates` 的先例。
- **先天命格**是另一种被动载体，但效果域是**养成/经济全局修正**而非战斗技能：`PreHeavenFate.effects[].effectType` 目前 11 种（闭关经验/感悟倍率、突破加成、自然恢复、丹毒、炼丹/炼器/悟道/客栈/系统/市价的灵石倍率），由 `evaluateFateContext()`（`packages/game-rules/src/character/fates.ts`）聚合。命格由建号三选产出，外部模板可改为**直接指定 3 个命格**（跳过三选）。
- 灵兽的「出生技能池」（`birthSkills.core/candidates`）是灵兽专属机制，**不复用到修士**。

### 2.7 初始加点的硬约束（数值护栏，已核实）

- `packages/game-rules/src/progression/attributes.ts`：
  - 自然值 = `BASE_ATTRIBUTE_VALUE(10) + 境界等级×1`；炼气初期等级 5 → **每项自然值 15，六项合计 90**。
  - 炼气初期未分配预算 `getRealmStageUnallocatedAttributeBudget('炼气','初期') = 25`。
- 因此建号瞬间合法属性空间为：**每项 ≥ 15 的整数，六项之和 + `unallocated_attribute_points` = 115**。
- 模板的「初始加点」只能是这 25 点在六维上的一个分配方案（允许留余额），**不存在任何规则内通道提高总预算**——这正是防止主站载荷灌点的制度基础。
- 灵根强度同样有上限：单灵根 95 / 双 80 / 三 65 / 四 55，风雷冰变异 +10（`creation/utils.ts`）。模板只给资质分与元素倾向，灵根仍走 `generateSpiritualRoots()` 生成。

### 2.8 主站现状（代码事实，v0.3 新增，仓库已在工作区）

主站 = `GenshinMarket-v2-Server`（原生 TS + Express + Prisma，多 schema），前端 = `client`（Vue3 + Vite）。

**(1) 现有「万界道友」入口（仅跳转，无玩法）**

- 活动配置 `data/json/activity/Daoyou_1000009.jsonc`：activityId **1000009**、activityType `daoyou_entry`，纯元数据，无 rewards/handler；开启时间由 `ActivityScheduleData.jsonc` 调度，热更新。
- 前端落地页 `client/src/features/activity/components/activities/daoyou/index.vue`：挂载后直接 `redirectWithSsoTicket(DAOYOU_SSO_URL)` 整页跳走。
- 跳转服务 `client/src/shared/services/sso.ts`：`POST /api/v1/auth/sso/ticket`（带站内 JWT）取票 → URL 拼 `?ticket=` 跳转；目标 origin 必须在 `VITE_SSO_REDIRECT_ORIGINS` 白名单（防开放重定向）。

**(2) SSO 票据服务端（与道友侧完全对接的现状）**

- 路由：`src/domains/user/routes/auth.ts` L115-127：`POST /api/v1/auth/sso/ticket`（需登录，独立 `sso` 限流）、`POST /api/v1/auth/sso/redeem`（无 JWT，靠 `X-Internal-Secret`）。
- 控制器：`src/domains/user/controllers/authController.ts` L203-259；密钥常数时间比较，未配置 `SSO_INTERNAL_SECRET` 返回 503。
- 票据服务：`src/domains/user/services/auth/ssoTicketService.ts`
  - 票据 = 32 字节随机 hex；Redis key `sso_ticket:{ticket}`（`redisKeys.ts` L130），TTL **60 秒**；
  - **载荷结构 `{ userId, sessionId }`**——这是本项目要扩展的点（加 `journeyId?`）；
  - 消费用 Lua `GET`+`DEL` 原子一次性；兑换时 `resolveSsoIdentity()` 实时查 user 表（过滤封禁/删除）返回 `{userId, username, email, nickname, role}`。

**(3) 玩家角色（原神 avatar）查询**

- `GameServerService.getPlayerGameData(uid)` 走游戏服 **cmd 1004**（`gameServerService.ts` L507-514），响应含 `avatar_bin.avatar_list[]`：`avatar_id / avatar_type / level / guid / skill_depot_id` 等（样例 `data/cmd_1004.json` L6713+）——**玩家已拥有角色列表的唯一权威来源，要求游戏在线**。
- cmd 1009 可查每角色战斗力（流水无涯活动已在用）。
- 角色 ID→中文名/元素/星级映射：`client/public/data/genshin/avatar_mapping.json`（70 个角色，键为 avatar_id 字符串，如 `10000002 → 神里绫华`），**无性别字段**——性别表需本项目新增（静态、约 70 条，维护成本低）。

**(4) 道具消耗通道（强度档抽签的扣费基础）**

- 游戏服权威扣减：`deductUserItem` → cmd 1116 `item sub`（`gameServerService.ts` L183-202），**要求玩家在线**；
- 批量事务扣减：`itemTransactionService.ts` `deductItemsWithTransaction(userId, items, scene)`——在线校验、背包余额预检（inventoryService）、按序扣、失败自动回滚；摩拉(202)/原石(201)/创世结晶(203)走 currencies，其余查 materials；
- 活动商店的**跨通道扣减**（站内背包批次 + 游戏侧）在 `activityShopService.ts` L207-250，一侧失败回滚另一侧；
- 站内背包是 Batch/Lot FIFO 模型（`backpackService.ts`）；审计流水 `ItemLedger`（`prisma/schema/ledger.prisma`，OBTAIN/CONSUME/TRANSFER_IN…，含 delta/balanceAfter/source/sourceId/reason）。

**(5) 活动玩法的成熟范本：1000008「流水无涯论坛」**

`src/domains/activity/endlessStream/endlessStreamService.ts` 已实现本项目需要的几乎全部模式：

1. **从已拥有角色中选角色**（cmd 1009 战斗力）；
2. **服务端权重抽奖**：`drawPool` 权重不下发，服务端裁定结果；
3. 活动状态持久化在 `ActivitySaveData.custom['1000008']`，经 `saveDataManager` + `userSerialExecutor`（按用户串行化）读写；
4. 辅助状态用 Redis（邀请码 Hash、播报 List、计数器）；
5. 奖励发放走统一 `rewardGrantService`；
6. 活动域结构：每个活动一个子目录 `xxx/xxxConfig.ts + xxxService.ts`（goldenWheel/specialAgenda/soundlessSprings 同构）。

**结论：主站侧不需要发明任何新基础设施**——活动子域、选角色、在线背包扣减、服务端权重抽奖、活动存档、SSO 票据扩展点全部现成。

---

## 3. 项目目标

1. 用户从主站「本次修行」入口进入道友时，主站指定的角色（姓名、性别、强度档）能够被道友识别，并按道友侧预置模板（加点、门派、自带功法被动）一次性建成角色。
2. 传入过程对用户无感：不重复登录、不写角色描述、不跑 LLM 推演；命格三选可跳过（模板指定）或保留（见待确认 6）。
3. **信任边界清晰**：主站载荷只表达「身份 + 选择」（哪位角色、哪一强度档、姓名、性别），**一切数值由道友仓库内的模板与规则层派生**；载荷经 Zod 校验、枚举约束与服务端查表。
4. 通道在未配置/主站异常/载荷非法时降级到现有自建角色流程，不阻断用户。
5. 幂等：同一用户同一次「修行」（journey）的任意重试/重放只产生同一个角色。
6. 模板本身是**可校验的内容资产**：注册期/构建期通过既有纯规则（属性预算、`changeManual`、门派注册表、命格效果枚举）验证，非法模板无法发布。

---

## 4. 总体方案：票据携带选择 + 道友模板降世

### 4.1 方案形态（v0.1 方案 B 的定稿细化）

```
主站（活动侧）                     道友 API                         道友内容仓库
  消耗道具 → 确定强度档              │                              （game-content）
  签发一次性票据（含角色载荷）         │                              角色模板注册表：
       │                            │                              characterCode × strengthTier
 浏览器 /sso/callback?ticket         │                              → {加点, 门派, 功法, 命格, 资质}
       │──────────→│ redeem ───────────────────────→ 主站校验票据
       │           │←─ identity + journey payload ─│
       │           │ 建会话；journey 存 Redis(短期)
       │           │ GET /api/genesis/external-journey（前端拉取）
       │ 降世确认页（展示姓名/性别/门派/自带功法/强度档）
       │ POST /api/genesis/external-create（确认）
       │           │ ① journey 一次性消费 + 幂等账本
       │           │ ② 查模板 → 纯规则编译（属性/功法/命格/灵根）
       │           │ ③ 一个事务：建角色 + 入宗 + 预置功法 + 邮件
       │←─ 进入游戏 ─│
```

要点：

- **主站不碰任何数值**。即使载荷被篡改（`strengthTier` 改成非法值），Zod 枚举与模板查表会拒绝；即使传合法高档，得到的也只是道友模板中该档预先配平的内容，无法突破属性预算/功法境界/灵根上限。
- 角色强度档的「付费/消耗」真相与扣减发生在**主站道具账本**，道友不重复扣费、不做道具兑换，只认票据。
- v0.1 的方案 A（只传提示词）保留为**降级路径**：载荷缺失或非法时，前端仍可进入现有 LLM 建号流程。方案 C（进度回传/轮回）不在本期。

### 4.2 角色模板的二维结构

- 第一维 `characterCode`：角色标识（哪位角色），决定**门派固定归属、自带功法/被动组合、命格倾向、背景文本**等角色特色。
- 第二维 `strengthTier`：强度档（主站消耗道具的结果），决定**资质/灵根档、加点方案档位、功法起始层数、命格强度、启动资源**等强度差异。
- 模板键建议 `templateKey = `${characterCode}:${strengthTier}``；也可一个角色定义内含 `tiers` 分档（实现期二选一，推荐后者，便于看到同一角色的档位曲线）。
- 模板全部放在道友仓库（建议位置见 7.2），**主站侧不需要也不能下发模板内容**。

### 4.3 强度档可使用的合法杠杆（按现有规则盘点）

| 杠杆 | 低档 → 高档差异 | 是否规则内零改动 | 备注 |
| --- | --- | --- | --- |
| 灵根资质（`aptitude_score` → 灵根数量/强度，寿元加成） | 四灵根伪灵根 → 单灵根天灵根 | ✅ 走 `generateSpiritualRoots` | 强度差异的**主战场**；建议用 `journeyId` 做确定性 RNG 种子保证幂等 |
| 初始加点方案 | 平均 15 → 25 点全集中主属性 | ✅ 预算恒为 25 | 强化特色而非总量 |
| 自带功法 | 无 / 1 本炼气 1 层 → 多本炼气 1-3 层 | ✅ 预置 `learned` | 起始层 ≤3 无瓶颈；>3 需同包发同名玉简，本期禁 |
| 先天命格 | 普通 3 命格 → 强力 3 命格 | ✅ 固定 `pre_heaven_fates` | effectType 限既有 11 种枚举，value 有界 |
| 启动资源（灵石/丹药/玉简） | 复用新手礼包邮件机制增发 | ✅ `MailService.sendNewRewardMail` | 奖励需走既有资源/邮件校验 |
| 门派 | 角色固定，不分档 | ✅ 一键入宗 | 见 2.5 |
| 初始寿元 | 80-100 → 上限 120 | ✅ 落库字段 | 小杠杆 |
| 起始境界（炼气→筑基） | —— | ❌ 禁止（本期） | 牵涉功法槽、修为进度、战斗投影与整套新手曲线；列为远期专项 |
| 直接灌生命/攻击/灵石等原始数值 | —— | ❌ 禁止 | 领域铁律：六维之外不得写派生值，外部载荷不参与任何数值求和 |

强度档具体分几档（建议 3 档：如「凡胎 / 灵种 / 天姿」）、与主站道具的对应关系，**待需求方确认**（见第 10 节）。

---

## 4A. 主站侧方案（v0.3 新增）

### 4A.1 玩法形态

把 1000009「万界道友」活动入口从「点进来立即跳转」升级为活动落地页，页内新增「本次修行」玩法（沿用现有 activityId 与调度，不新增活动；落地页由自动跳转改为先渲染玩法页，页内再放「进入万界道友」按钮）：

```
主站活动页（client，改造 daoyou/index.vue）
 ① 拉取玩家已拥有角色（服务端 cmd 1004 avatar_list，要求游戏在线）
 ② 玩家选定一个角色（展示头像/名称/星级，复用 avatar_mapping）
 ③ 消耗「修行签」道具 ×1 → 服务端按权重裁定强度档 t1/t2/t3（权重不下发）
    · 每次消耗产生一条 journey（含角色、档位、时间、消耗流水号）
    · 可多次抽签；玩家在多条 journey 中选定一条「本次修行」
 ④ 点击「进入万界道友」→ POST /sso/ticket（带 journeyId）→ 整页跳转道友
```

抽签与选档完全发生在主站；道友侧不感知道具、不做概率。

### 4A.2 主站新增组件（全部对齐既有模式）

| 组件 | 位置（建议） | 复用/参照 |
| --- | --- | --- |
| 玩法服务 | `src/domains/activity/cultivationJourney/cultivationJourneyService.ts` | 照搬 `endlessStreamService`：`saveDataManager` + `userSerialExecutor` + Redis |
| 玩法配置（道具 itemId、档位权重、性别表、开关） | 同目录 `cultivationJourneyConfig.ts`；可调部分（权重/道具/时间）走 `data/json` 热更新配置 | `endlessStreamConfig.ts` + 活动 jsonc |
| 角色列表/抽签/选定 journey 的请求处理 | 跟随活动域现有接入方式（1000008 走 WebSocket handler；实现期确认 1000009 用 WS 还是 REST，倾向与同页其他活动一致） | endlessStream WS handlers |
| 票据扩展 | `authController.issueSsoTicket` 接受可选 `journeyId`；`generateSsoTicket(userId, sessionId, journeyId?)` 写入 Redis 载荷 | 现有票据服务，仅加可选字段 |
| redeem 返回 journey | `validateAndConsumeSsoTicket` 返回 journeyId 后，校验该 journey 归属当前用户且状态有效，随身份快照返回 | `resolveSsoIdentity` 同模式查活动存档 |
| 前端页面 | 改造 `daoyou/index.vue`（或拆出玩法子组件）；角色头像用 `avatar_mapping` 既有素材 | 流水无涯选角 UI |

### 4A.3 journey 的存储与状态

存活动存档 `ActivitySaveData.custom['1000009'].journeys[]`（不新建 Prisma 表，与 1000008 一致）：

```ts
interface CultivationJourneyRecord {
  journeyId: string;          // 服务端生成（crypto.randomUUID），幂等键
  avatarId: number;           // 原神角色 ID（如 10000002）
  avatarName: string;         // 抽签时从 avatar_mapping 固化中文名
  gender: 'male' | 'female' | 'none';  // 新增静态性别表裁定（avatar_mapping 无此字段）
  strengthTier: 't1' | 't2' | 't3';    // 服务端权重抽奖结果
  consumedItemId: number;     // 消耗的道具
  ledgerId?: string;          // ItemLedger 流水号（审计对账）
  status: 'drawn' | 'selected' | 'used'; // drawn=已抽签；selected=玩家选定；used=道友侧已建号（需回写，见 4A.5）
  createdAt: number;
  selectedAt?: number;
  usedAt?: number;
}
```

规则（待确认项在第 10 节）：

- 抽签接口幂等：前端按钮防重 + 服务端串行执行器；每次调用**确实扣道具并产出新 journey**（不做请求级幂等，避免连点白嫖；防重用点击锁）。
- 同一时刻至多一条 `selected`：选定新 journey 时旧的回到 `drawn`。
- journey 不过期（活动期内）；活动结束后历史可查、不可再选定。
- 抽签权重、消耗道具 itemId、每日/总次数上限放配置，服务端裁定，**权重绝不下发**。

### 4A.4 票据扩展（对现有 SSO 的最小改动）

```
现状：Redis  sso_ticket:{ticket} = { userId, sessionId }
改后：Redis  sso_ticket:{ticket} = { userId, sessionId, journeyId? }
```

- `POST /api/v1/auth/sso/ticket` 请求体增加可选 `journeyId`；服务端校验：journey 存在、属于该用户、status ∈ {drawn, selected}（选定动作可在此隐式完成：取票即把该条置 selected）。
- `redeem` 成功响应在身份快照旁附 `journey`（见 6.1 契约）。
- 票据仍是 60 秒一次性；**journey 不随票据消失**——票据过期重新取票即可，玩家无需重新抽签。
- 不携带 journeyId 取票时行为与今天完全一致（道友侧走普通建号），保证旧入口与其他外部项目零影响。

### 4A.5 「used」状态与跨站回写（可选，建议一期不做）

道友建号成功后，主站如何知道 journey 已用？两个选择：

- **一期（推荐）：不回写。** 主站只保证「取票时选中」；道友侧以 `externalUserId + journeyId` 账本保证一 journey 一道身。玩家重复取票跳转会被道友的建号闸口与幂等账本接住（已有角色直接进游戏）。主站 journey 停在 `selected`。
- 二期：道友在建号成功后回调主站内部接口（新 `X-Internal-Secret` 端点）置 `used`，主站据此做「已修行」标记/图鉴/二次活动门槛。该回调需要主站新增内部路由，列入远期。

### 4A.6 在线依赖与降级

cmd 1004 选角与 cmd 1116 扣道具**均要求游戏在线**（itemTransaction 预检 status===1）：

- 游戏不在线时：活动页提示并禁用抽签（与流水无涯活动的处理一致）；
- 不因此阻塞纯跳转：「直接进入万界道友」（不携带 journey）入口始终保留。

### 4A.7 characterCode 对齐

- 道友模板键建议直接采用 `gi:{avatarId}`（如 `gi:10000002` = 神里绫华），主站载荷 `characterCode` 用同值，双方零映射表；
- 道友侧首期**不必做满 70 个角色模板**：主站选角列表可由配置限定为「已开放降世的角色子集」（白名单配置，道友模板就绪一个开通一个）；玩家选到未开放角色时不允许抽签或提示「尚未下凡」。子集清单见待确认 1。

---

## 5. 道友侧角色模板规格（草案）

### 5.1 模板内容结构（示意，最终以 contracts 定义为准）

```ts
// packages/game-content/src/external-characters/（新增目录，位置见 7.2）
interface ExternalCharacterTemplate {
  characterCode: string;          // 与主站约定的角色标识，如 'xiao_xxx'
  name: string;                   // 模板展示名（主站仍会传角色姓名，此为默认/兜底）
  gender: '男' | '女' | '无';     // 角色固定性别？还是仅校验主站传入 —— 待确认 4
  origin: string;                 // 出身（写入 cultivators.origin）
  personality: string;            // 性格
  background: string;             // 背景故事（长度上限同自建角色）
  tiers: Record<StrengthTier, TierProfile>;
}

interface TierProfile {
  // ① 初始加点：炼气初期自然值 15/项 + 对 25 点预算的分配（允许留余额）
  attributePlan: Partial<Record<AttributeKey, number>>; // 分配值之和 ≤ 25
  // ② 指定门派：必须命中八大派 sectId
  sectId: SectId;
  // ③ 自带功法/被动（炼气期全部归属槽 1：最多学 6 本、激活 1 本）
  manuals: Array<{
    manualId: string;      // 必须是 realm='炼气' 的既有功法
    startLevel?: number;   // 默认 1；本期合法范围 1-3（首个瓶颈在 3 层），>3 需同包发玉简
  }>;
  activeManualId?: string; // 激活的那一本；缺省取 manuals[0]
  // ④ 固定命格：恰好 3 个紧凑规格，编译器补全为完整 FateEffectEntry
  fates: CompactFateSpec[];
  // ⑤ 资质：灵根由既有生成器派生
  aptitudeScore: number;          // 0-100，决定灵根数量/强度/寿元
  elementPreferences: ElementType[]; // 建议 1-4 个；单灵根需高分
  // ⑥ 可选启动资源（走邮件）
  starterMail?: { title: string; body: string; items: RewardItem[] };
}

/** 命格紧凑规格：模板作者只写效果，元数据由编译器规范生成 */
interface CompactFateSpec {
  name: string;
  description?: string;
  quality?: Quality;              // 取 constants/qualities 既有枚举
  effects: Array<{
    effectType: FateEffectType;   // 限既有 11 种
    value: number;                // 倍率或加成，受模板校验器上下限约束
    label: string;
    description?: string;
  }>;
}

type StrengthTier = 't1' | 't2' | 't3'; // 枚举与主站对齐，名称待定
```

### 5.2 姓名与性别

- 姓名：取自主站载荷，写入 `cultivators.name`（≤100 字符，NOT NULL）；服务端做 trim、长度、敏感词与重名策略（重名是否允许待确认 5；现有表只有普通索引无唯一约束，**允许重名**，倾向沿用）。
- 性别：主站传枚举（建议线上枚举 `male | female | none`），映射为库内 `男 | 女 | 无`；空值按现有自建角色允许 null，但模板角色建议必填。
- 待确认：姓名到道友后**是否允许用户在确认页修改**（见第 10 节）。

### 5.3 初始加点

- 模板提供分配方案而非最终数值；服务端构造角色时：`最终六维 = 15 + plan 分配值`，`unallocated = 25 - 分配总和`。
- 校验纯函数（新增于 `packages/game-rules`，可单测）：整数、每项分配 ≥0、总和 ≤25；编译后角色必须通过既有的属性预算检查。
- 不接受载荷中的任何属性字段——契约层直接不出现这些字段。

### 5.4 指定门派与自带技能/被动

- **门派**：模板 `sectId` 必须命中 `SECT_ORGANIZATION_DEFINITIONS`；建号事务内复用 `SectAdmissionApplicationService` 的 repository 三步（candidate → activate → facilities），并补发 `sect.joined` 事件族；建号主事件 `cultivator.created` 中的 `activeCultivator.sectId` 直接写该门派，避免先 null 再 merge 的闪烁。
- **自带技能/被动 = 预置个人功法**：
  - 模板 `manuals[].manualId` 必须存在于 `CHARACTER_MANUALS_V1` 且 `realm='炼气'`；炼气功法全部归属槽 1（`manualSlot() = 境界序号`），槽 1 最多学 6 本，恰好对应现有 6 本炼气功法。
  - **起始层数**：standard 进度 `maxLevel=9`、瓶颈 `[3,6]`；新学功法为 1 层、`unlockedLevel=3`。模板 `startLevel` 合法区间 1-3；若要 4-6 层必须在 `starterMail` 中同包发放对应同名玉简（否则 `validateManualStateV1` 会因「level ≤ unlockedLevel」报错），7-9 层还需第二枚玉简。**本期建议所有模板 startLevel ≤ 3**，把玉简组合留作后续活动杠杆。
  - 模板编译方式：**从空的 `CultivatorManualStateV1` 开始，在 `realm='炼气'` 下按列表对每本功法调用既有纯函数 `changeManual('learn')`，再按需以直接构造（经 `validateManualStateV1` 复核）设定起始层**；激活本由 `activeManualId` 指定（缺省第一本），与学习顺序解耦。任何不合法（跨境界、重复、槽位满）在模板注册期即报错。
  - 落库时写 `cultivator_manual_states`（learned/revision/build）与 `cultivator_manual_slots`，与角色插入同一事务（写入方式参考 `transfer-import.ts` 与 `CombatV6ManualService` L99）。
- **门派功法/技能不进个人表**：入宗后由宗门投影自动提供门派 methods/passive，模板不得重复发放。
- 若后续需要「功法之外的纯被动」（如专属天赋），本期不新建系统；优先用命格（养成向）或新增一本炼气功法承载（战斗被动向），走既有内容审校。

### 5.5 命格与灵根

- 模板命格：固定 3 个，跳过 `/fates` 推演与三选。**命格没有静态目录**（现网命格均为建号时 LLM 生成），且完整 `FateEffectEntry` 带 `id/effectId/scope/polarity/rollMeta/generationModel` 等大量推演元数据，模板作者无法也不应手写；因此模板只写**紧凑规格** `{name, quality?, effects:[{effectType, value, label}]}`，由模板编译器：
  - 校验 `effectType` ∈ `game-domain/cultivator.ts` 既有 11 种枚举、value 在该类型的有界区间内（倍率类限定 [0.5, 1.5]、加成类限定 [0, 0.25] 等，具体数值在编译器常量表中评审确定）；
  - 按 effectType 推导 `scope='daily'` 与 `polarity`（损耗/价格类 value<1 为 boon，增益类 value>1 / bonus>0 为 boon）；
  - 生成确定性 `id/effectId`（由 `characterCode + tier + 序号` 哈希）与规范化 `rollMeta`（`qualityAnchor` 取命格 quality，`min/maxValue = value`、`roundingStep` 按类型给默认），`generationModel` 留空、`namingMetadata.status='success'`，与 LLM 命格在落库与投影上完全同构。
- 灵根：模板只给资质分与元素倾向，调用 `generateSpiritualRoots(score, prefs, rng)`；**rng 用 `journeyId` 派生的确定性种子**，保证票据重放、重试与客服核单时灵根完全一致。
- `prompt` 列（NOT NULL，原意「用户原始输入」）写溯源串，如 `external:{characterCode}:{journeyId}`，便于排查且不进任何 LLM。

### 5.6 模板数据包规格

目录与结构与 `manuals/`、`sects/` 内容包同构：

```
packages/game-content/src/external-characters/
  data/external-character-pack.json   # 全部角色模板（一个包）
  data/external-character-pack.schema.json
  content.ts                          # 加载 + Ajv 结构校验，导出 EXTERNAL_CHARACTER_PACK
  index.ts                            # 注册表：getExternalCharacter(code) / listExternalCharacters()
```

数据包 JSON 形状：

```jsonc
{
  "version": 1,
  "tiers": [
    { "id": "t1", "name": "凡胎" },
    { "id": "t2", "name": "灵种" },
    { "id": "t3", "name": "天姿" }
  ],
  "characters": [
    {
      "characterCode": "sample.xuanlei",   // 与主站约定的唯一标识
      "defaultName": "玄雷剑客",            // 展示默认名；落库名以主站载荷为准
      "gender": "男",                       // 模板默认；载荷性别冲突时以载荷为准（待确认 3）
      "origin": "雷泽遗脉",
      "personality": "锐烈果决",
      "background": "……（≤ 与自建角色相同长度上限）",
      "tiers": { "t1": { /* TierProfile */ }, "t2": {}, "t3": {} }
    }
  ]
}
```

结构校验（schema.json）之外的**规则校验**全部放 `packages/game-rules/src/external-characters/` 的纯函数，任何一条不过则整个包拒绝加载（fail-fast）：

1. `characterCode` 包内唯一、命名空间格式（建议 `{域}.{标识}`）；
2. 每角色 `tiers` 必须完整覆盖包声明的全部档位；
3. `attributePlan`：值为非负整数、key ∈ 六维、分配总和 ≤ 25；
4. `sectId` 命中 `SECT_ORGANIZATION_DEFINITIONS`；
5. `manuals`：id 命中功法包且 `realm='炼气'`、无重复、数量 ≤ 6、`activeManualId` ∈ 列表、`startLevel` ∈ [1,3]（本期上限；>3 需同包发放同名玉简，暂不开放）；
6. 从空 `CultivatorManualStateV1` 编译功法并过 `validateManualStateV1('炼气')` 零诊断；
7. `fates` 恰好 3 个；每个 `effectType` 合法、value 在该类型有界区间；编译后的命格过 `normalizeFates` 与 `evaluateFateContext`；
8. `aptitudeScore ∈ [0,100]`、元素 ∈ `ELEMENT_VALUES` 且 1-4 个；高分单灵根/低分多灵根的建议组合由内容审校把关（如 score<75 不允许单元素）；
9. `starterMail.items` 必须过既有奖励/邮件 schema，不允许直接发任意资源字段。

编译 API（纯逻辑，可单测，签名为建议稿）：

```ts
// packages/game-rules/src/external-characters/compiler.ts
validateExternalCharacterPack(pack): Diagnostic[];
compileExternalCharacter(input: {
  template: ExternalCharacterTemplate;
  tier: StrengthTier;
  name: string; gender: Gender;            // 来自主站载荷
  seed: string;                            // journeyId 派生
}): {
  cultivator: Cultivator;                  // 交既有 createCultivator 落库
  manualState: CultivatorManualStateV1;    // 交功法两表落库
  sectId: SectId;
  starterMail?: StarterMailSpec;
};
```

### 5.7 完整示例：`sample.xuanlei`（占位角色，三档）

> 用于走通规格；正式 characterCode 与门派/功法搭配以主站角色清单和内容审校为准。
> 角色：雷脉剑修，门派固定红尘剑宗 `lingxiao`；六维基线 15，只列分配值（合计 ≤25）。

| 项 | t1 凡胎（score 45） | t2 灵种（score 72） | t3 天姿（score 95） |
| --- | --- | --- | --- |
| 元素倾向 | 雷/金/水/火（四灵根；雷为变异、其余伪灵根，强度上限 65/55） | 雷/金（双灵根；雷变异上限 90、金真灵根 80） | 雷（单灵根·变异，上限 100） |
| 属性分配 | 体8/力7/速5/意5 | 力15/速7/体3 | 力20/速5 |
| 最终六维（体/力/神/抗/速/意） | 23/22/15/15/20/20 | 18/30/15/15/22/15 | 15/35/15/15/20/15 |
| 未分配点 | 0 | 0 | 0 |
| 自带功法 | 庚金诀 1 层（激活） | 庚金诀 2 层（激活）+ 长春功 1 层 | 庚金诀 3 层（激活）+ 长春功 2 层 |
| 命格（各 3） | 勤勉（突破+3%）、乐天（自然恢复 ×1.05）、俭用（系统消耗 ×0.95） | 向道（突破+6%）、顿悟（闭关经验 ×1.10）、善贾（系统消耗 ×0.90） | 天眷（突破+10%）、通明（闭关经验 ×1.15）、生生（自然恢复 ×1.15） |
| 寿元 | 80-100 随机 | 80-100 随机 | 100-120（score>80 +20） |
| 启动邮件 | 仅既有新手礼包 20000 灵石 | 新手礼包 + 10000 灵石 | 新手礼包 + 30000 灵石（玉简类本期不发） |

t3 的 JSON 片段（完整数据包的一项）：

```jsonc
{
  "characterCode": "sample.xuanlei",
  "defaultName": "玄雷剑客",
  "gender": "男",
  "origin": "雷泽遗脉",
  "personality": "锐烈果决，剑出无悔。",
  "background": "幼时雷泽夜渡，残剑裹雷而生；入门红尘剑宗，誓以一剑破开尘障。",
  "tiers": {
    "t3": {
      "attributePlan": { "strength": 20, "speed": 5 },
      "sectId": "lingxiao",
      "manuals": [
        { "manualId": "character_manual.gengjin", "startLevel": 3 },
        { "manualId": "character_manual.changchun", "startLevel": 2 }
      ],
      "activeManualId": "character_manual.gengjin",
      "fates": [
        { "name": "天眷", "quality": "天品",
          "effects": [{ "effectType": "breakthrough_bonus", "value": 0.10, "label": "突破成功率+10%" }] },
        { "name": "通明", "quality": "天品",
          "effects": [{ "effectType": "retreat_exp_multiplier", "value": 1.15, "label": "闭关经验+15%" }] },
        { "name": "生生不息", "quality": "天品",
          "effects": [{ "effectType": "natural_recovery_multiplier", "value": 1.15, "label": "自然恢复+15%" }] }
      ],
      "aptitudeScore": 95,
      "elementPreferences": ["雷"],
      "starterMail": {
        "title": "天姿降世礼",
        "body": "主站活动所赠，助你早日筑基。",
        "items": [{ "kind": "spirit_stones", "quantity": 30000 }]
      }
    }
  }
}
```

落库后核验事实（t3 示例）：`cultivators` 六维 = 15/35/15/15/20/15、未分配 0、炼气初期；`spiritual_roots` 一行雷灵根（grade=变异灵根，强度由 journeyId 种子确定）；`pre_heaven_fates` 上述 3 命格（编译器补全 id/rollMeta）；`sect_memberships` 一行 lingxiao/active；`cultivator_manual_states.learned` = 庚金诀{lv3, unlocked3} + 长春功{lv2, unlocked3}，`build.slots` 槽 1 激活庚金诀，`cultivator_manual_slots` 对应一行；灵石进邮件而非直接改余额。

---

## 6. 数据契约 v0.2（草案，待双方确认）

### 6.1 主站票据兑换响应扩展（v0.3 定稿：扩展现有票据，不新增端点/密钥）

主站改动（详见 4A）：

1. `POST /api/v1/auth/sso/ticket` 请求体增加可选 `journeyId`；票据 Redis 值由 `{userId, sessionId}` 扩展为 `{userId, sessionId, journeyId?}`，TTL/一次性/Lua 消费全部不变。
2. `POST /api/v1/auth/sso/redeem` 消费票据后，若载荷含 journeyId，则从活动存档 `custom['1000009'].journeys` 读取该条（校验归属与状态），随身份快照返回：

```jsonc
{
  "success": true,
  "data": {
    "userId": "主站用户ID",
    "username": "...",
    "email": "...",
    "nickname": "...",
    "role": "user",
    "journey": {
      "journeyId": "主站活动存档内的 journey 实例ID（幂等键）",
      "characterCode": "gi:10000002",
      "avatarId": 10000002,
      "name": "神里绫华",
      "gender": "female",
      "strengthTier": "t3",
      "itemConsumption": {
        "itemId": 500001,
        "quantity": 1,
        "ledgerId": "ItemLedger 流水ID（审计用，道友侧只记录不依赖）"
      },
      "issuedAt": 1793000000000
    }
  }
}
```

约定：

- `characterCode` = `gi:{avatarId}`，与道友模板键一一对应（4A.7）；`avatarId` 冗余下发便于展示与排查。
- 不传 journeyId 取票、journey 不存在/不属于该用户/已过活动期 → **redeem 仍成功**，只是不返回 journey 字段（降级为普通建号）；只有票据/密钥本身失败才 401/503。
- journey 快照是「选择事实」：道友侧不得信任其中任何数值含义，只用作模板查表键与展示名。

### 6.2 道友对外新增的前端接口（登录后，会话鉴权）

| 接口 | 说明 |
| --- | --- |
| `GET /api/genesis/external-journey` | 读取当前用户暂存的降世载荷（Redis 短期存储，兑换后写入，建议 TTL 24h）；无则 204/空 |
| `POST /api/genesis/external-create` | 确认降世：一次性消费 journey，按模板建号。请求体只允许 `{ journeyId, name? }`（name 仅在「允许改名」时出现） |

### 6.3 错误与降级语义

- 票据层：沿用 `unconfigured / invalid-ticket / upstream-error` 三态；journey 缺失或非法时**身份兑换仍然成功**，只是不写降世暂存，前端回落到自建入口。
- 建号层错误码（新增）：`JOURNEY_NOT_FOUND / JOURNEY_EXPIRED / JOURNEY_CONSUMED / UNKNOWN_CHARACTER / UNKNOWN_TIER / ALREADY_HAS_CULTIVATOR / TEMPLATE_INVALID`。
- 已拥有 active 角色的用户：`findCultivatorCreationBlock` 拦截，直接进入游戏（载荷不再生效），前端提示「本次修行将在来世开启」或忽略（文案待定）。

### 6.4 幂等与防重放

- 幂等键：`externalUserId + journeyId`。
- 新建**降世账本表**（推荐，而非污染 cultivators）：`wanjiedaoyou_external_journeys`
  - `external_user_id varchar NOT NULL`、`journey_id varchar NOT NULL`、`status varchar NOT NULL`（`issued / consumed / rejected`）、`character_code`、`strength_tier`、`cultivator_id uuid NULL`、`raw_payload jsonb`、时间戳；
  - 唯一索引 `(external_user_id, journey_id)`；建号成功后回填 `cultivator_id` 与 `consumed`。
  - 作用：同 journey 的重复请求返回**同一个** cultivatorId；不同 journey 对同一用户在已有 active 角色后一律被建号闸口拦截。
- 该表走业务迁移流 `drizzle/`，**新迁移编号从 0074 起**（0073 为人界纪年 aging_synced_at）；不涉及 better_auth 流。

---

## 7. 技术影响面

| 区域 | 影响 |
| --- | --- |
| 鉴权 | 零新增密钥；继续 SSO 票据 + `X-Internal-Secret` |
| 契约（packages/contracts） | 新增 `external-journey` 子路径：journey 载荷 schema、strengthTier/性别枚举、两个前端接口的请求/响应；服务端绑定 Zod **完整校验**（非结构-only） |
| 内容（packages/game-content） | 新增角色模板目录（建议 `src/external-characters/`，JSON 数据包 + schema + 注册表，模式参照 manuals/manual-pack 与 beasts species）；公开导出走业务子路径，不加 wildcard barrel |
| 规则（packages/game-rules） | 新增纯逻辑：① 属性加点方案校验；② 模板编译器（属性/灵根/命格 + 对空功法状态逐次 `changeManual` + 门派 id 校验）；确定性 RNG 种子工具。**可写纯逻辑单测**（packages 内允许） |
| API - SSO | `genshinMarketSso.ts` 类型扩展 `journey?`；`sso.service` 兑换成功后把 journey 写入 Redis（复用 `lib/redis`，不得自建客户端） |
| API - genesis | 新增 external-journey 查询与 external-create：复用 `cultivatorCreation` Redis 锁与 `playerCommandExecutor.executeInitial`；在建号事务中追加：journey 账本upsert、`createCultivator`、入宗三步、功法两表写入、（可选）新手邮件；资源事件合并 `cultivator.created`（带 sectId）与 `sect.joined` 族、`player.manuals` invalidate（如现有手册资源主题不同则沿用实际主题） |
| API - 数据 | 迁移 0074：`external_journeys` 账本表；无需改 cultivators 结构（溯源串放 prompt；如需高效查询再加列，待实现期评估） |
| 前端（apps/web） | SSO 回调后拉取 external-journey；新增「降世确认页」（展示姓名/性别/门派/自带功法/命格/强度档说明）；确认 → external-create → /game；缺失/过期/拒绝 → 现有建号入口；遵守 game-ui 身份/任务/导航三层规范 |
| LLM | 外部降世**完全不调 LLM**；固定文案来自模板；不引入新的 LLM 不可信面 |
| 安全 | 浏览器不接触密钥与原始载荷；载荷按不可信输入处理（显式取字段，禁止把整个请求对象并入领域对象/数值求和）；内部端点默认随 SSO 开关关闭；按 `daoyou-backend-api-security` 接入 |
| 降级 | 未配置 SSO / 主站超时 / journey 非法或过期 / 模板缺失 → 静默回落自建流程并记录日志 |
| **主站服务端（GenshinMarket-v2-Server）** | 新增 `domains/activity/cultivationJourney/`（config+service，仿 endlessStream）；选角查 cmd 1004、扣道具走 itemTransaction/cmd 1116、权重抽奖服务端裁定、journeys 写 `ActivitySaveData.custom['1000009']`；扩展 `ssoTicketService` 载荷与 `redeem` 响应；活动配置（道具/权重/角色白名单/性别表）入 `data/json` 热更 |
| **主站前端（client）** | 改造 `daoyou/index.vue`：选角列表、抽签动画与结果、journey 选择、进入按钮（取票时带 journeyId，扩展 `shared/services/sso.ts`）；复用 avatar_mapping 素材；游戏离线禁用抽签 |

### 7.1 建号事务步骤（external-create 服务端伪流程）

1. 会话鉴权取 userId → 映射 externalAuthId；Redis `cultivatorCreation` 锁。
2. `findCultivatorCreationBlock` 闸口。
3. 读 Redis 暂存 journey + 查 `external_journeys` 账本：已 consumed → 幂等返回原 cultivatorId；状态/过期校验。
4. Zod 校验载荷；查模板注册表 `characterCode × strengthTier`，未命中 → `UNKNOWN_*`（账本记 rejected）。
5. 模板编译（纯函数）：属性方案、灵根（确定性 rng）、命格、功法状态（从空状态 apply `changeManual`）、门派 id。
6. 一个 DB 事务：
   - upsert journey 账本（issued → consumed）；
   - `createCultivator(userId, cultivator, tx)`（三表：cultivators/spiritual_roots/pre_heaven_fates）；
   - membership candidate/activate + facilities（复用 sect repository）；
   - 写 `cultivator_manual_states` + `cultivator_manual_slots`；
   - `TaskService.syncCultivatorTasks`、新手邮件、模板 starterMail；
   - 资源事件：`cultivator.created`（sectId 为目标门派）+ `sect.joined` 族 + 功法相关 invalidate；
   - 回填账本 `cultivator_id`。
7. `invalidateActiveCultivatorRef`；删除 Redis 暂存。

### 7.2 模板放置与发布校验

- 位置建议：`packages/game-content/src/external-characters/data/*.json` + `schema.json` + `index.ts` 注册表（与 `manuals/`、`sects/` 内容包同构）。
- 模板编译/校验函数放 `packages/game-rules/src/external-characters/`（依赖 content + 规则，方向合法：rules 依赖 content）。
- 应用启动或首次查表时编译并缓存；非法模板直接抛错（fail-fast），对应强度档拒绝降世并落日志。
- 新增角色/调档 = 改数据包 + 补纯逻辑测试 + 走内容审校，不发版改服务端代码（数据随包发布）。

---

## 8. 工作包与里程碑

0. **WP0 主站活动玩法（GenshinMarket + client）**：
   - 配置：「修行签」消耗道具 itemId 确定与发放途径、t1/t2/t3 权重、每日/总次数上限、开放角色白名单、avatar 性别表（约 70 条静态映射）；
   - 服务端：cultivationJourney 子域（cmd 1004 选角、itemTransaction 扣道具、服务端权重抽奖、journey 存档、selected 规则）；
   - SSO 扩展：ticket 携带可选 journeyId、redeem 返回 journey 快照；
   - 前端：活动页改造（选角/抽签/选定/跳转带参）、离线/未开放角色的禁用提示。
1. **WP1 需求与契约对齐**：主站角色清单（characterCode=gi:{avatarId} 白名单）、道具与强度档枚举与权重、票据扩展（已定：扩展现有票据）、姓名可否修改、命格是否三选、上线窗口与联调环境。
2. **WP2 契约与模板（道友侧）**：contracts schema；模板数据包首批角色（按白名单）；game-rules 模板编译器 + 纯逻辑单测（属性预算、功法编译失败用例、枚举校验、确定性灵根）。
3. **WP3 道友服务端**：SSO 响应扩展解析与 Redis 暂存；external-journey/external-create 接口；账本表迁移 0074；建号事务串接入宗与功法；错误码与降级。
4. **WP4 道友前端**：回调衔接、降世确认页、与现有 genesis 入口的互斥/回落、导航与埋点。
5. **WP5 联调验收**：用主站票据完整链路（抽签→跳转→降世）；幂等/重放/过期/篡改；数值合规审计；主站游戏离线降级演练。

## 9. 验收标准

**主站侧**

- [ ] 活动页只列出玩家已拥有（cmd 1004）且在开放白名单内的角色；游戏离线时抽签禁用、纯跳转可用
- [ ] 每次抽签原子扣 1 个道具并恰好产生一条 journey；道具不足/连点不产生免费 journey；扣减有 ItemLedger 流水
- [ ] 抽签档位由服务端权重裁定，权重与结果裁定逻辑不出现在任何前端响应中
- [ ] 取票携带 journeyId 后 redeem 返回 journey 快照；不带 journeyId 时行为与现状完全一致；旧 journey/他人 journeyId 不返回
- [ ] 票据仍为 60 秒一次性；票据过期后重新取票无需重新抽签

**道友侧**

- [ ] 持主站票据登录后，降世确认页正确展示角色姓名、性别、强度档对应内容、指定门派、自带功法被动
- [ ] 建号后落库事实正确：六维 = 15 + 模板分配、未分配 = 25 − 分配总和；灵根/寿元符合生成器；membership 为目标门派 active；功法表与槽位内容等于模板编译结果；命格 = 模板 3 命格
- [ ] 同一 `externalUserId + journeyId` 的重复请求（票据重放、接口重试、刷新）只返回/产生同一角色
- [ ] 篡改载荷（非法 tier / 越界名字 / 注入属性字段 / 未知 characterCode）全部被拒绝或安全降级，无任何数值溢出
- [ ] 模板编译器对「跨境界功法、槽位溢出、属性超预算、未知门派、非法命格效果」全部报错并有单测
- [ ] 未配置 SSO、主站故障、journey 缺失/过期时，用户可正常走原有自建角色流程
- [ ] 已有 active 角色的账号不会产生第二个道身
- [ ] `pnpm lint / typecheck / build` 通过；packages 新增纯逻辑测试通过；前端页面人工检查布局与导航
- [ ] 迁移 0074 仅涉及业务流；本地按 `docs/testing.md` 用测试账号完成真实端到端验证并清理/恢复准备数据

---

## 10. 待需求方补充的关键问题（v0.3 更新）

**主站玩法**

1. **消耗道具**：「修行签」用新物品还是复用现有物品？itemId 与发放途径（活动任务/商店/邮件）？每次抽签收 1 个还是支持多倍？每日/总抽签次数上限？
2. **档位与权重**：确认 3 档（t1/t2/t3）与名称；各档服务端权重？权重是否随抽签次数保底（参考抽卡软保底），还是纯独立概率？
3. **抽签与选定规则**：允许多次抽签、多条 drawn journey 并存，再由玩家选一条？还是一锤定音？journey 之间是否有成本差异（不同角色可分别抽签）？活动结束后未使用 journey 如何处理？
4. **在线限制接受度**：选角与扣道具依赖游戏服在线（cmd 1004/1116），玩家游戏离线时无法抽签——是否需要为此做离线扣档（主站已有 offline-item-deduct 设计文档），还是一期接受「在线才能抽」？
5. **开放角色白名单**：首期开放哪些原神角色（70 个全量工作量过大，建议先 8-12 个高人气角色，与道友模板一一对应）？白名单配置放主站还是双方各维护一份（建议主站白名单为准，道友模板缺失时拒绝降世兜底）？
6. **性别表**：avatar_mapping 无性别字段，需新增一份 avatarId→{male,female} 静态表（主角/特殊形态如 Aino 等需逐一裁定）。谁来维护、放主站配置还是道友模板内（建议主站持有并随 journey 下发，道友模板只兜底）？

**道友侧体验**

7. **姓名**：道友降世确认页是否允许改名（主站角色名是固定的）？是否做主站侧+道友侧双重敏感词过滤？
8. **重名策略**：道友现表允许重名，沿用即可？
9. **命格三选是否保留**：完全模板指定（零交互，推荐）还是仍让用户三选（模板只圈定候选池）？
10. **门派能否更换**：进入游戏后用户可否判师/改投？这影响「指定门派」是强绑定还是出身推荐（现有规则：已有 active membership 不能再 join 其他派）。
11. **降世确认页可否取消**：取消后是放弃本次 journey、还是回落自建角色？journey 主站侧不过期，道友侧是否也长期有效（建议 Redis 暂存 24h，过期可用同 journeyId 重新取票触发）？
12. **一个主站账号多次「修行」**：已有角色后新 journey 仅展示不生效，还是接入转世/兵解后开启下一世（方案 C，远期）？
13. **used 回写**：一期不回写主站（4A.5）是否认可？二期是否需要「已修行」标记/图鉴？
14. **立绘/形象**：是否把原神立绘 URL 传入道友（版权与道友墨像风格冲突），还是暂用道友既有墨像生成？
15. **回读扩展**：主站活动页是否需要展示门派/功法/强度档等新增字段（`/internal/player/profile` 扩展）？
16. 上线环境与时间窗口；双侧联调环境（主站本地 + 道友本地 + 游戏服在线依赖）如何安排？

---

## 附：相关代码索引

**通道与建号**

- SSO 兑换客户端：`apps/api/src/lib/auth/genshinMarketSso.ts`
- SSO 兑换与本地建档：`apps/api/src/auth/sso.service.ts`、`apps/api/src/auth/session.controller.ts`
- 内部鉴权与回读：`apps/api/src/player/internal-identity.guard.ts`、`internal-profile.controller.ts`
- 建号流程：`apps/api/src/genesis/genesis.service.ts`（「后续由主站传入」注释 L41-43）、`genesis/application/CultivatorCreationApplicationService.ts`
- 角色落库三表：`apps/api/src/cultivator/application/readers/CultivatorProfileRepository.ts`（`createCultivator` L121-198）
- 前端回调：`apps/web/src/routes/sso/callback/route.tsx`
- 环境配置：`apps/api/src/lib/config/environment.ts`（`GENSHIN_MARKET_SSO_BASE_URL`、`SSO_INTERNAL_SECRET`）

**门派**

- 注册表：`packages/game-content/src/sect-organization/definitions.ts`（八派）、各派 `*/definition.ts`（raceIds/methods）
- 准入规则：`packages/game-rules/src/sect-organization/core/plugin/StandardSectModule.ts`（仅种族）
- 归属表：`apps/api/src/lib/drizzle/schema.ts` L328-363（`sectMemberships`）
- 入宗服务：`apps/api/src/sects/organization/SectAdmissionApplicationService.ts`、REST 入口 `apps/api/src/sects/sects.controller.ts`（`POST :sectId/join`）

**功法 / 被动 / 命格 / 数值**

- 功法内容：`packages/game-content/src/manuals/content.ts`（每功法生成 Passive 技能）、`data/manual-pack.json`
- 功法领域模型：`packages/game-domain/src/manuals/types.ts`（`CultivatorManualStateV1`）
- 功法纯规则：`packages/game-rules/src/manuals/state.ts`（`changeManual`）、`compiler.ts`（槽位/境界校验）
- 功法表：schema L690-727（`cultivatorManualStates`、`cultivatorManualSlots`）
- 功法 API 写入：`apps/api/src/combat/application/CombatV6ManualService.ts`、`apps/api/src/transfer/transfer-import.ts`
- 命格效果：`packages/game-rules/src/character/fates.ts`、枚举 `packages/game-domain/src/cultivator.ts`
- 角色生成：`packages/game-rules/src/character/creation/CharacterGenerator.ts`、`creation/utils.ts`（灵根上限）
- 属性预算：`packages/game-rules/src/progression/attributes.ts`（自然值 15、未分配 25）

**主站（GenshinMarket-v2-Server / client，v0.3 新增）**

- 活动元数据：`GenshinMarket-v2-Server/data/json/activity/Daoyou_1000009.jsonc`（activityId 1000009，`daoyou_entry`）
- 活动玩法范本：`src/domains/activity/endlessStream/endlessStreamService.ts`（1000008：选角色/服务端权重抽奖/ActivitySaveData/串行执行器）
- SSO 票据：`src/domains/user/services/auth/ssoTicketService.ts`（Redis 载荷 `{userId, sessionId}`、60s、Lua 一次性消费）、`controllers/authController.ts` L203-259（issue/redeem）、`routes/auth.ts` L115-127
- 扣道具：`src/domains/game/services/gameServer/gameServerService.ts`（deductUserItem cmd 1116、cmd 1004 选角、cmd 1009 战力）、`itemTransactionService.ts`（在线校验+余额预检+回滚）
- 站内背包/流水：`src/domains/user/services/userData/backpackService.ts`、`prisma/schema/ledger.prisma`（ItemLedger）
- 活动存档：`saveDataManager`、`ActivitySaveData.custom['100000x']`、`src/domains/activity/types.ts`
- 前端：`client/src/features/activity/components/activities/daoyou/index.vue`、`client/src/shared/services/sso.ts`（取票跳转+origin 白名单）、`client/public/data/genshin/avatar_mapping.json`（70 角色 ID→名称/元素/星级，无性别字段）
