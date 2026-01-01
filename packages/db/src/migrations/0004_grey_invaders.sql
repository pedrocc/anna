CREATE TYPE "public"."briefing_document_type" AS ENUM('product_brief', 'executive_summary', 'vision_statement', 'user_personas', 'metrics_dashboard', 'mvp_scope', 'custom');--> statement-breakpoint
CREATE TABLE "briefing_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"type" "briefing_document_type" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "briefing_documents" ADD CONSTRAINT "briefing_documents_session_id_briefing_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."briefing_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "briefing_documents_session_id_idx" ON "briefing_documents" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "briefing_documents_type_idx" ON "briefing_documents" USING btree ("type");--> statement-breakpoint
CREATE INDEX "briefing_documents_created_at_idx" ON "briefing_documents" USING btree ("created_at");