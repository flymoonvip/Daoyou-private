CREATE TABLE "wanjiedaoyou_external_callbacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(32) NOT NULL,
	"journey_id" varchar(64),
	"cultivator_id" uuid,
	"external_user_id" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"deduplication_key" varchar(160) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp DEFAULT now() NOT NULL,
	"delivered_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wanjiedaoyou_external_journeys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journey_id" varchar(64) NOT NULL,
	"external_user_id" varchar(64) NOT NULL,
	"user_id" uuid NOT NULL,
	"cultivator_id" uuid NOT NULL,
	"avatar_id" integer NOT NULL,
	"character_name" varchar(100) NOT NULL,
	"gender" varchar(10),
	"combat_power" integer DEFAULT 0 NOT NULL,
	"combat_sample_days" integer DEFAULT 1 NOT NULL,
	"starter_tier" integer DEFAULT 1 NOT NULL,
	"aptitude" varchar(10),
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"entered_at" timestamp,
	"died_at" timestamp,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wanjiedaoyou_player_achievements" (
	"cultivator_id" uuid NOT NULL,
	"achievement_id" varchar(96) NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wanjiedaoyou_player_achievements_cultivator_id_achievement_id_pk" PRIMARY KEY("cultivator_id","achievement_id")
);
--> statement-breakpoint
CREATE TABLE "wanjiedaoyou_player_counters" (
	"cultivator_id" uuid NOT NULL,
	"counter_key" varchar(64) NOT NULL,
	"value" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wanjiedaoyou_player_counters_cultivator_id_counter_key_pk" PRIMARY KEY("cultivator_id","counter_key")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "external_callbacks_dedupe_unique" ON "wanjiedaoyou_external_callbacks" USING btree ("deduplication_key");--> statement-breakpoint
CREATE INDEX "external_callbacks_pending_idx" ON "wanjiedaoyou_external_callbacks" USING btree ("next_attempt_at") WHERE "wanjiedaoyou_external_callbacks"."delivered_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "external_journeys_journey_unique" ON "wanjiedaoyou_external_journeys" USING btree ("journey_id");--> statement-breakpoint
CREATE UNIQUE INDEX "external_journeys_cultivator_unique" ON "wanjiedaoyou_external_journeys" USING btree ("cultivator_id");--> statement-breakpoint
CREATE INDEX "external_journeys_user_idx" ON "wanjiedaoyou_external_journeys" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "external_journeys_external_user_idx" ON "wanjiedaoyou_external_journeys" USING btree ("external_user_id");--> statement-breakpoint
CREATE INDEX "player_achievements_unlocked_idx" ON "wanjiedaoyou_player_achievements" USING btree ("cultivator_id","unlocked_at");