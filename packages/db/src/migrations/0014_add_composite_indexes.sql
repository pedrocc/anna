-- Add missing updatedAt index on brainstorm_sessions
CREATE INDEX IF NOT EXISTS "brainstorm_sessions_updated_at_idx" ON "brainstorm_sessions" USING btree ("updated_at");

-- Add composite indexes for briefing_sessions
CREATE INDEX IF NOT EXISTS "briefing_sessions_user_status_idx" ON "briefing_sessions" USING btree ("user_id", "status");
CREATE INDEX IF NOT EXISTS "briefing_sessions_user_created_at_idx" ON "briefing_sessions" USING btree ("user_id", "created_at");

-- Add composite indexes for prd_sessions
CREATE INDEX IF NOT EXISTS "prd_sessions_user_status_idx" ON "prd_sessions" USING btree ("user_id", "status");
CREATE INDEX IF NOT EXISTS "prd_sessions_user_created_at_idx" ON "prd_sessions" USING btree ("user_id", "created_at");
