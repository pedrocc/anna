CREATE TYPE "public"."brainstorm_approach" AS ENUM('ai_recommended', 'user_selected', 'quick_session', 'comprehensive');--> statement-breakpoint
CREATE TYPE "public"."brainstorm_message_role" AS ENUM('system', 'user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."brainstorm_status" AS ENUM('active', 'paused', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."brainstorm_step" AS ENUM('setup', 'technique', 'execution', 'document');--> statement-breakpoint
CREATE TYPE "public"."brainstorm_technique" AS ENUM('scamper', 'what_if', 'six_hats', 'five_whys', 'mind_mapping', 'analogical', 'first_principles', 'yes_and', 'future_self', 'reversal');--> statement-breakpoint
CREATE TABLE "brainstorm_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" "brainstorm_message_role" NOT NULL,
	"content" text NOT NULL,
	"step" "brainstorm_step" NOT NULL,
	"technique" "brainstorm_technique",
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brainstorm_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_name" text NOT NULL,
	"project_description" text,
	"goals" jsonb,
	"approach" "brainstorm_approach" DEFAULT 'ai_recommended' NOT NULL,
	"current_step" "brainstorm_step" DEFAULT 'setup' NOT NULL,
	"status" "brainstorm_status" DEFAULT 'active' NOT NULL,
	"selected_techniques" jsonb DEFAULT '[]'::jsonb,
	"current_technique_index" integer DEFAULT 0,
	"ideas" jsonb DEFAULT '[]'::jsonb,
	"document_content" text,
	"document_title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "brainstorm_messages" ADD CONSTRAINT "brainstorm_messages_session_id_brainstorm_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."brainstorm_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brainstorm_sessions" ADD CONSTRAINT "brainstorm_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brainstorm_messages_session_id_idx" ON "brainstorm_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "brainstorm_messages_step_idx" ON "brainstorm_messages" USING btree ("step");--> statement-breakpoint
CREATE INDEX "brainstorm_messages_created_at_idx" ON "brainstorm_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "brainstorm_sessions_user_id_idx" ON "brainstorm_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "brainstorm_sessions_status_idx" ON "brainstorm_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "brainstorm_sessions_current_step_idx" ON "brainstorm_sessions" USING btree ("current_step");--> statement-breakpoint
CREATE INDEX "brainstorm_sessions_created_at_idx" ON "brainstorm_sessions" USING btree ("created_at");