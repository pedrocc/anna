CREATE TYPE "public"."sm_document_type" AS ENUM('sprint_backlog', 'epic_document', 'story_document', 'sprint_planning', 'full_planning', 'custom');--> statement-breakpoint
CREATE TYPE "public"."sm_epic_status" AS ENUM('backlog', 'in_progress', 'done');--> statement-breakpoint
CREATE TYPE "public"."sm_message_role" AS ENUM('system', 'user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."sm_status" AS ENUM('active', 'paused', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."sm_step" AS ENUM('init', 'epics', 'stories', 'details', 'planning', 'review', 'complete');--> statement-breakpoint
CREATE TYPE "public"."sm_story_priority" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."sm_story_status" AS ENUM('backlog', 'ready_for_dev', 'in_progress', 'review', 'done');--> statement-breakpoint
CREATE TABLE "sm_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"type" "sm_document_type" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sm_epics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"business_value" text,
	"feature_ids" jsonb DEFAULT '[]'::jsonb,
	"functional_requirement_codes" jsonb DEFAULT '[]'::jsonb,
	"status" "sm_epic_status" DEFAULT 'backlog' NOT NULL,
	"priority" "sm_story_priority" DEFAULT 'medium' NOT NULL,
	"target_sprint" integer,
	"estimated_story_points" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sm_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" "sm_message_role" NOT NULL,
	"content" text NOT NULL,
	"step" "sm_step" NOT NULL,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sm_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"prd_session_id" uuid,
	"project_name" text NOT NULL,
	"project_description" text,
	"prd_context" jsonb DEFAULT '{}'::jsonb,
	"sprint_config" jsonb DEFAULT '{"sprintDuration":14}'::jsonb,
	"current_step" "sm_step" DEFAULT 'init' NOT NULL,
	"status" "sm_status" DEFAULT 'active' NOT NULL,
	"steps_completed" jsonb DEFAULT '[]'::jsonb,
	"total_epics" integer DEFAULT 0,
	"total_stories" integer DEFAULT 0,
	"total_story_points" integer DEFAULT 0,
	"document_content" text,
	"document_title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sm_stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"epic_id" uuid NOT NULL,
	"epic_number" integer NOT NULL,
	"story_number" integer NOT NULL,
	"story_key" text NOT NULL,
	"title" text NOT NULL,
	"as_a" text NOT NULL,
	"i_want" text NOT NULL,
	"so_that" text NOT NULL,
	"description" text,
	"acceptance_criteria" jsonb DEFAULT '[]'::jsonb,
	"tasks" jsonb DEFAULT '[]'::jsonb,
	"dev_notes" jsonb DEFAULT '{}'::jsonb,
	"status" "sm_story_status" DEFAULT 'backlog' NOT NULL,
	"priority" "sm_story_priority" DEFAULT 'medium' NOT NULL,
	"story_points" integer,
	"target_sprint" integer,
	"functional_requirement_codes" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sm_documents" ADD CONSTRAINT "sm_documents_session_id_sm_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sm_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sm_epics" ADD CONSTRAINT "sm_epics_session_id_sm_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sm_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sm_messages" ADD CONSTRAINT "sm_messages_session_id_sm_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sm_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sm_sessions" ADD CONSTRAINT "sm_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sm_sessions" ADD CONSTRAINT "sm_sessions_prd_session_id_prd_sessions_id_fk" FOREIGN KEY ("prd_session_id") REFERENCES "public"."prd_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sm_stories" ADD CONSTRAINT "sm_stories_session_id_sm_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sm_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sm_stories" ADD CONSTRAINT "sm_stories_epic_id_sm_epics_id_fk" FOREIGN KEY ("epic_id") REFERENCES "public"."sm_epics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sm_documents_session_id_idx" ON "sm_documents" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "sm_documents_type_idx" ON "sm_documents" USING btree ("type");--> statement-breakpoint
CREATE INDEX "sm_documents_created_at_idx" ON "sm_documents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sm_epics_session_id_idx" ON "sm_epics" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "sm_epics_status_idx" ON "sm_epics" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sm_epics_number_idx" ON "sm_epics" USING btree ("number");--> statement-breakpoint
CREATE INDEX "sm_messages_session_id_idx" ON "sm_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "sm_messages_step_idx" ON "sm_messages" USING btree ("step");--> statement-breakpoint
CREATE INDEX "sm_messages_created_at_idx" ON "sm_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sm_sessions_user_id_idx" ON "sm_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sm_sessions_prd_session_id_idx" ON "sm_sessions" USING btree ("prd_session_id");--> statement-breakpoint
CREATE INDEX "sm_sessions_status_idx" ON "sm_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sm_sessions_current_step_idx" ON "sm_sessions" USING btree ("current_step");--> statement-breakpoint
CREATE INDEX "sm_sessions_created_at_idx" ON "sm_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sm_stories_session_id_idx" ON "sm_stories" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "sm_stories_epic_id_idx" ON "sm_stories" USING btree ("epic_id");--> statement-breakpoint
CREATE INDEX "sm_stories_status_idx" ON "sm_stories" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sm_stories_story_key_idx" ON "sm_stories" USING btree ("story_key");