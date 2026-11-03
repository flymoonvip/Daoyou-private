-- 回滚「炼气十三层」数据迁移（反向对齐 0068_qi_refining_thirteen_layers）
--
-- 背景：炼气十三层的代码与迁移已随仓库回退（保留官方四阶段：初期/中期/后期/圆满），
--       但线上库已被 0068 改过数据：realm_stage 变成「一层~十三层」、修为按新层上限重标。
--       本脚本把角色、闭关历史、世界频道历史消息的阶段与修为按原比例还原。
--
-- 反向规则：0068 正向为 new_exp = round(old_exp * new_cap / old_cap)，
--       这里取 old_exp = LEAST(old_cap, round(new_exp * old_cap / new_cap))，
--       层→阶段按正向锚点归并：一层/五层/九层/十三层 分别回到 初期/中期/后期/圆满，
--       其余层按所处区间归并（1-4 初期、5-8 中期、9-12 后期）。
--
-- 用法：npm run 无此入口，直接用 psql 或 node-postgres 执行整个文件；
--       脚本自带事务，可安全重复执行（幂等：第二次执行时已无 炼气 + 层名 记录）。
-- 前置：先执行本脚本再做代码部署，避免旧数据被官方四阶段逻辑读取。

BEGIN;

-- 0) 变更前留档（幂等：已存在则跳过）
CREATE TABLE IF NOT EXISTS backup_qi13_cultivators_20261027
  AS SELECT * FROM "wanjiedaoyou_cultivators";
CREATE TABLE IF NOT EXISTS backup_qi13_retreat_records_20261027
  AS SELECT * FROM "wanjiedaoyou_retreat_records";
CREATE TABLE IF NOT EXISTS backup_qi13_chat_messages_20261027
  AS SELECT * FROM "wanjiedaoyou_chat_messages";

-- 1) 角色：阶段归并 + 修为按原阶段上限等比还原
WITH layer_map(layer, new_cap, old_stage, old_cap) AS (
  VALUES
    ('一层', 64, '初期', 500),
    ('二层', 77, '初期', 500),
    ('三层', 92, '初期', 500),
    ('四层', 110, '初期', 500),
    ('五层', 132, '中期', 600),
    ('六层', 159, '中期', 600),
    ('七层', 191, '中期', 600),
    ('八层', 229, '中期', 600),
    ('九层', 275, '后期', 800),
    ('十层', 330, '后期', 800),
    ('十一层', 396, '后期', 800),
    ('十二层', 475, '后期', 800),
    ('十三层', 570, '圆满', 1200)
)
UPDATE "wanjiedaoyou_cultivators" AS c
SET
  realm_stage = m.old_stage,
  cultivation_progress = CASE
    WHEN jsonb_typeof(c.cultivation_progress -> 'cultivation_exp') = 'number' THEN
      jsonb_set(
        c.cultivation_progress,
        '{cultivation_exp}',
        to_jsonb(
          LEAST(
            m.old_cap::numeric,
            round(
              (c.cultivation_progress ->> 'cultivation_exp')::numeric
                * m.old_cap / m.new_cap
            )
          )
        )
      )
    ELSE c.cultivation_progress
  END
FROM layer_map AS m
WHERE c.realm = '炼气'
  AND c.realm_stage = m.layer;

-- 2) 闭关历史：阶段标签
UPDATE "wanjiedaoyou_retreat_records"
SET realm_stage = CASE realm_stage
    WHEN '一层' THEN '初期'
    WHEN '二层' THEN '初期'
    WHEN '三层' THEN '初期'
    WHEN '四层' THEN '初期'
    WHEN '五层' THEN '中期'
    WHEN '六层' THEN '中期'
    WHEN '七层' THEN '中期'
    WHEN '八层' THEN '中期'
    WHEN '九层' THEN '后期'
    WHEN '十层' THEN '后期'
    WHEN '十一层' THEN '后期'
    WHEN '十二层' THEN '后期'
    WHEN '十三层' THEN '圆满'
    ELSE realm_stage
  END
WHERE realm = '炼气'
  AND realm_stage IN (
    '一层', '二层', '三层', '四层', '五层', '六层', '七层',
    '八层', '九层', '十层', '十一层', '十二层', '十三层'
  );

-- 3) 世界频道历史消息：发送者阶段标签（系统消息为空/系统，不在范围内）
UPDATE "wanjiedaoyou_chat_messages"
SET sender_realm_stage = CASE sender_realm_stage
    WHEN '一层' THEN '初期'
    WHEN '二层' THEN '初期'
    WHEN '三层' THEN '初期'
    WHEN '四层' THEN '初期'
    WHEN '五层' THEN '中期'
    WHEN '六层' THEN '中期'
    WHEN '七层' THEN '中期'
    WHEN '八层' THEN '中期'
    WHEN '九层' THEN '后期'
    WHEN '十层' THEN '后期'
    WHEN '十一层' THEN '后期'
    WHEN '十二层' THEN '后期'
    WHEN '十三层' THEN '圆满'
    ELSE sender_realm_stage
  END
WHERE sender_realm = '炼气'
  AND sender_realm_stage IN (
    '一层', '二层', '三层', '四层', '五层', '六层', '七层',
    '八层', '九层', '十层', '十一层', '十二层', '十三层'
  );

COMMIT;

-- 校验 1：炼气角色阶段只应出现 初期/中期/后期/圆满
SELECT realm, realm_stage, count(*)
FROM "wanjiedaoyou_cultivators"
WHERE realm = '炼气'
GROUP BY 1, 2
ORDER BY 1, 2;

-- 校验 2：炼气修为不得超过对应阶段上限（初期500/中期600/后期800/圆满1200）
SELECT realm_stage, max((cultivation_progress ->> 'cultivation_exp')::numeric) AS max_exp
FROM "wanjiedaoyou_cultivators"
WHERE realm = '炼气'
  AND jsonb_typeof(cultivation_progress -> 'cultivation_exp') = 'number'
GROUP BY 1
ORDER BY 1;
