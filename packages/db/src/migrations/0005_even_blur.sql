CREATE TYPE "public"."prd_document_type" AS ENUM('prd_full', 'executive_summary', 'functional_requirements', 'nonfunctional_requirements', 'user_journeys', 'mvp_scope', 'custom');--> statement-breakpoint
CREATE TYPE "public"."prd_domain_complexity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."prd_message_role" AS ENUM('system', 'user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."prd_project_type" AS ENUM('api_backend', 'mobile_app', 'saas_b2b', 'developer_tool', 'cli_tool', 'web_app', 'game', 'desktop_app', 'iot_embedded', 'blockchain_web3', 'custom');--> statement-breakpoint
CREATE TYPE "public"."prd_status" AS ENUM('active', 'paused', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."prd_step" AS ENUM('init', 'discovery', 'success', 'journeys', 'domain', 'innovation', 'project_type', 'scoping', 'functional', 'nonfunctional', 'complete');--> statement-breakpoint
CREATE TABLE "prd_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"type" "prd_document_type" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prd_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" "prd_message_role" NOT NULL,
	"content" text NOT NULL,
	"step" "prd_step" NOT NULL,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prd_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_name" text NOT NULL,
	"project_description" text,
	"input_documents" jsonb DEFAULT '[]'::jsonb,
	"project_type" "prd_project_type",
	"domain" text,
	"domain_complexity" "prd_domain_complexity",
	"executive_summary" text,
	"differentiators" jsonb DEFAULT '[]'::jsonb,
	"success_criteria" jsonb DEFAULT '[]'::jsonb,
	"personas" jsonb DEFAULT '[]'::jsonb,
	"user_journeys" jsonb DEFAULT '[]'::jsonb,
	"domain_concerns" jsonb DEFAULT '[]'::jsonb,
	"regulatory_requirements" jsonb DEFAULT '[]'::jsonb,
	"domain_expertise" jsonb DEFAULT '[]'::jsonb,
	"skip_domain_step" text DEFAULT 'false',
	"innovations" jsonb DEFAULT '[]'::jsonb,
	"skip_innovation_step" text DEFAULT 'false',
	"project_type_details" jsonb DEFAULT '{}'::jsonb,
	"project_type_questions" jsonb DEFAULT '{}'::jsonb,
	"features" jsonb DEFAULT '[]'::jsonb,
	"out_of_scope" jsonb DEFAULT '[]'::jsonb,
	"mvp_success_criteria" jsonb DEFAULT '[]'::jsonb,
	"functional_requirements" jsonb DEFAULT '[]'::jsonb,
	"non_functional_requirements" jsonb DEFAULT '[]'::jsonb,
	"current_step" "prd_step" DEFAULT 'init' NOT NULL,
	"status" "prd_status" DEFAULT 'active' NOT NULL,
	"steps_completed" jsonb DEFAULT '[]'::jsonb,
	"document_content" text,
	"document_title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "prd_documents" ADD CONSTRAINT "prd_documents_session_id_prd_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."prd_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prd_messages" ADD CONSTRAINT "prd_messages_session_id_prd_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."prd_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prd_sessions" ADD CONSTRAINT "prd_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prd_documents_session_id_idx" ON "prd_documents" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "prd_documents_type_idx" ON "prd_documents" USING btree ("type");--> statement-breakpoint
CREATE INDEX "prd_documents_created_at_idx" ON "prd_documents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "prd_messages_session_id_idx" ON "prd_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "prd_messages_step_idx" ON "prd_messages" USING btree ("step");--> statement-breakpoint
CREATE INDEX "prd_messages_created_at_idx" ON "prd_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "prd_sessions_user_id_idx" ON "prd_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "prd_sessions_status_idx" ON "prd_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "prd_sessions_current_step_idx" ON "prd_sessions" USING btree ("current_step");--> statement-breakpoint
CREATE INDEX "prd_sessions_project_type_idx" ON "prd_sessions" USING btree ("project_type");--> statement-breakpoint
CREATE INDEX "prd_sessions_created_at_idx" ON "prd_sessions" USING btree ("created_at");