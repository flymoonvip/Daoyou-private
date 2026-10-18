-- 炼气由「初期/中期/后期/圆满」四阶段细分为「一层~十三层」十三层。
-- 旧四阶段上限 500/600/800/1200（合计 3100）在新体系下由十三层非线性分摊，合计仍为 3100。
-- 旧阶段边界对应新层：初期=一层(64)、中期=五层(132)、后期=九层(275)、圆满=十三层(570)。
-- 迁移策略：按「阶段内进度百分比守恒」把旧阶段的 cultivation_exp 等比重标到新层上限，
-- 保证玩家突破进度不因分层而倒退或提前。

-- 1) 重标阶段内修为（先做，映射依赖旧阶段名；须在阶段改名之前执行）
UPDATE "wanjiedaoyou_cultivators" AS c
SET "cultivation_progress" = jsonb_set(
      c."cultivation_progress",
      '{cultivation_exp}',
      to_jsonb(
        LEAST(
          map.new_cap::numeric,
          round(
            (c."cultivation_progress" ->> 'cultivation_exp')::numeric
              * map.new_cap / map.old_cap
          )
        )
      )
    )
FROM (VALUES
  ('初期', 500, 64),
  ('中期', 600, 132),
  ('后期', 800, 275),
  ('圆满', 1200, 570)
) AS map(old_stage, old_cap, new_cap)
WHERE c.realm = '炼气'
  AND c.realm_stage = map.old_stage
  AND jsonb_typeof(c."cultivation_progress" -> 'cultivation_exp') = 'number';
--> statement-breakpoint
-- 2) 改写角色境界阶段
UPDATE "wanjiedaoyou_cultivators"
SET realm_stage = CASE realm_stage
    WHEN '初期' THEN '一层'
    WHEN '中期' THEN '五层'
    WHEN '后期' THEN '九层'
    WHEN '圆满' THEN '十三层'
    ELSE realm_stage
  END
WHERE realm = '炼气'
  AND realm_stage IN ('初期', '中期', '后期', '圆满');
--> statement-breakpoint
-- 3) 闭关历史记录里的阶段标签（展示一致性）
UPDATE "wanjiedaoyou_retreat_records"
SET realm_stage = CASE realm_stage
    WHEN '初期' THEN '一层'
    WHEN '中期' THEN '五层'
    WHEN '后期' THEN '九层'
    WHEN '圆满' THEN '十三层'
    ELSE realm_stage
  END
WHERE realm = '炼气'
  AND realm_stage IN ('初期', '中期', '后期', '圆满');
--> statement-breakpoint
-- 4) 世界频道历史消息里发送者的阶段标签（展示一致性）
UPDATE "wanjiedaoyou_chat_messages"
SET sender_realm_stage = CASE sender_realm_stage
    WHEN '初期' THEN '一层'
    WHEN '中期' THEN '五层'
    WHEN '后期' THEN '九层'
    WHEN '圆满' THEN '十三层'
    ELSE sender_realm_stage
  END
WHERE sender_realm = '炼气'
  AND sender_realm_stage IN ('初期', '中期', '后期', '圆满');
