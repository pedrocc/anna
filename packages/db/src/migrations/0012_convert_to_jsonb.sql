-- Convert text columns storing JSON data to native JSONB type
-- This enables PostgreSQL JSON operators, indexing, and removes manual JSON.parse/stringify

-- ============================================
-- USERS TABLE
-- ============================================

-- metadata: Record<string, unknown> stored as text → jsonb
ALTER TABLE "users" ALTER COLUMN "metadata" TYPE jsonb USING "metadata"::jsonb;
--> statement-breakpoint

-- ============================================
-- BRIEFING SESSIONS
-- ============================================

-- generation_error: error details stored as text JSON → jsonb
ALTER TABLE "briefing_sessions" ALTER COLUMN "generation_error" TYPE jsonb USING "generation_error"::jsonb;
--> statement-breakpoint

-- ============================================
-- PRD SESSIONS
-- ============================================

-- generation_error: error details stored as text JSON → jsonb
ALTER TABLE "prd_sessions" ALTER COLUMN "generation_error" TYPE jsonb USING "generation_error"::jsonb;
--> statement-breakpoint

-- ============================================
-- SM SESSIONS
-- ============================================

-- generation_error: error details stored as text JSON → jsonb
ALTER TABLE "sm_sessions" ALTER COLUMN "generation_error" TYPE jsonb USING "generation_error"::jsonb;
