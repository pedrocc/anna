CREATE TYPE "public"."briefing_message_role" AS ENUM('system', 'user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."briefing_status" AS ENUM('active', 'paused', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."briefing_step" AS ENUM('init', 'vision', 'users', 'metrics', 'scope', 'complete');--> statement-breakpoint
CREATE TABLE "briefing_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" "briefing_message_role" NOT NULL,
	"content" text NOT NULL,
	"step" "briefing_step" NOT NULL,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "briefing_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_name" text NOT NULL,
	"project_description" text,
	"input_documents" jsonb DEFAULT '[]'::jsonb,
	"problem_statement" text,
	"problem_impact" text,
	"existing_solutions_gaps" text,
	"proposed_solution" text,
	"key_differentiators" jsonb DEFAULT '[]'::jsonb,
	"primary_users" jsonb DEFAULT '[]'::jsonb,
	"secondary_users" jsonb DEFAULT '[]'::jsonb,
	"user_journeys" jsonb DEFAULT '[]'::jsonb,
	"success_metrics" jsonb DEFAULT '[]'::jsonb,
	"business_objectives" jsonb DEFAULT '[]'::jsonb,
	"kpis" jsonb DEFAULT '[]'::jsonb,
	"mvp_features" jsonb DEFAULT '[]'::jsonb,
	"out_of_scope" jsonb DEFAULT '[]'::jsonb,
	"mvp_success_criteria" jsonb DEFAULT '[]'::jsonb,
	"future_vision" text,
	"current_step" "briefing_step" DEFAULT 'init' NOT NULL,
	"status" "briefing_status" DEFAULT 'active' NOT NULL,
	"steps_completed" jsonb DEFAULT '[]'::jsonb,
	"document_content" text,
	"document_title" text,
	"executive_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "briefing_messages" ADD CONSTRAINT "briefing_messages_session_id_briefing_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."briefing_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "briefing_sessions" ADD CONSTRAINT "briefing_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "briefing_messages_session_id_idx" ON "briefing_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "briefing_messages_step_idx" ON "briefing_messages" USING btree ("step");--> statement-breakpoint
CREATE INDEX "briefing_messages_created_at_idx" ON "briefing_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "briefing_sessions_user_id_idx" ON "briefing_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "briefing_sessions_status_idx" ON "briefing_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "briefing_sessions_current_step_idx" ON "briefing_sessions" USING btree ("current_step");--> statement-breakpoint
CREATE INDEX "briefing_sessions_created_at_idx" ON "briefing_sessions" USING btree ("created_at");