ALTER TABLE "better_auth"."user" ADD COLUMN "externalAuthId" text;--> statement-breakpoint
ALTER TABLE "better_auth"."user" ADD CONSTRAINT "user_externalAuthId_key" UNIQUE("externalAuthId");
