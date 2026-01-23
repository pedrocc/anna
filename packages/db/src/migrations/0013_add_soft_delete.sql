-- Add soft delete (deletedAt) column to session and critical entity tables
-- This enables audit trail by preserving deleted records instead of hard-deleting them

-- ============================================
-- BRAINSTORM SESSIONS
-- ============================================

ALTER TABLE "brainstorm_sessions" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX "brainstorm_sessions_deleted_at_idx" ON "brainstorm_sessions" USING btree ("deleted_at");
--> statement-breakpoint

-- ============================================
-- BRIEFING SESSIONS
-- ============================================

ALTER TABLE "briefing_sessions" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX "briefing_sessions_deleted_at_idx" ON "briefing_sessions" USING btree ("deleted_at");
--> statement-breakpoint

-- ============================================
-- PRD SESSIONS
-- ============================================

ALTER TABLE "prd_sessions" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX "prd_sessions_deleted_at_idx" ON "prd_sessions" USING btree ("deleted_at");
--> statement-breakpoint

-- ============================================
-- SM SESSIONS
-- ============================================

ALTER TABLE "sm_sessions" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX "sm_sessions_deleted_at_idx" ON "sm_sessions" USING btree ("deleted_at");
--> statement-breakpoint

-- ============================================
-- SM EPICS
-- ============================================

ALTER TABLE "sm_epics" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX "sm_epics_deleted_at_idx" ON "sm_epics" USING btree ("deleted_at");
--> statement-breakpoint

-- ============================================
-- SM STORIES
-- ============================================

ALTER TABLE "sm_stories" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX "sm_stories_deleted_at_idx" ON "sm_stories" USING btree ("deleted_at");
