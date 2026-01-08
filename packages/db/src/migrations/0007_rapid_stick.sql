CREATE TYPE "public"."briefing_generation_status" AS ENUM('idle', 'generating', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."prd_generation_status" AS ENUM('idle', 'generating', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."sm_generation_status" AS ENUM('idle', 'generating', 'completed', 'failed');--> statement-breakpoint
ALTER TABLE "briefing_sessions" ADD COLUMN "generation_status" "briefing_generation_status" DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE "briefing_sessions" ADD COLUMN "generation_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "briefing_sessions" ADD COLUMN "generation_error" text;--> statement-breakpoint
ALTER TABLE "prd_sessions" ADD COLUMN "generation_status" "prd_generation_status" DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE "prd_sessions" ADD COLUMN "generation_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "prd_sessions" ADD COLUMN "generation_error" text;--> statement-breakpoint
ALTER TABLE "sm_sessions" ADD COLUMN "generation_status" "sm_generation_status" DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE "sm_sessions" ADD COLUMN "generation_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sm_sessions" ADD COLUMN "generation_error" text;