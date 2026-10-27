-- 应用 Daoyou 迁移 0071_aging_synced_at
--
-- 背景：人界纪年法上线后，现实时间（12 小时 = 游戏 1 年）会驱动角色自然衰老，
--       需要在角色表新增「年龄结算锚点」列 aging_synced_at。
--
-- 目标库：PostgreSQL（Drizzle，正文迁移目录 ./drizzle，表前缀 wanjiedaoyou_）
-- 用法：  psql "$DATABASE_URL" -f 0071_aging_synced_at.apply.sql
--        （或直接粘贴到数据库控制台执行）
--
-- 特性：可安全重复执行（幂等）；执行后会同步写入 Drizzle 迁移账本
--       （drizzle.__drizzle_migrations），使后续 `drizzle-kit migrate` 跳过 0071。
-- 前置：库中已应用 0001 ~ 0070，drizzle.__drizzle_migrations 账本已存在。

BEGIN;

ALTER TABLE "wanjiedaoyou_cultivators"
  ADD COLUMN IF NOT EXISTS "aging_synced_at" timestamp DEFAULT now() NOT NULL;

-- 与迁移文件一致，登记到 Drizzle 账本：
--   hash       = sha256(0071_aging_synced_at.sql)
--   created_at = 迁移日志 meta/_journal.json 中该条目的 when 值
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT
  '67563efe05be4623cdab9a8c49754ed4546e2876cdb885f68359da36a1bb4a3a',
  1793112475245
WHERE NOT EXISTS (
  SELECT 1
  FROM drizzle.__drizzle_migrations
  WHERE hash = '67563efe05be4623cdab9a8c49754ed4546e2876cdb885f68359da36a1bb4a3a'
);

COMMIT;

-- 校验：应返回 1 行，data_type = timestamp without time zone，is_nullable = NO
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'wanjiedaoyou_cultivators'
  AND column_name = 'aging_synced_at';
