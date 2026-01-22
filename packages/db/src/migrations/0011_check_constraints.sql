-- Add CHECK constraints for minimum structure enforcement
-- These mirror Zod validations at the database level for data integrity

-- ============================================
-- USERS TABLE
-- ============================================

-- name must be non-empty
ALTER TABLE "users" ADD CONSTRAINT "users_name_non_empty" CHECK (length("name") > 0);
--> statement-breakpoint

-- email must be non-empty and have minimum length
ALTER TABLE "users" ADD CONSTRAINT "users_email_min_length" CHECK (length("email") >= 5);
--> statement-breakpoint

-- ============================================
-- BRIEFING SESSIONS
-- ============================================

-- project_name: non-empty, max 200 chars
ALTER TABLE "briefing_sessions" ADD CONSTRAINT "briefing_sessions_project_name_length" CHECK (length("project_name") > 0 AND length("project_name") <= 200);
--> statement-breakpoint

-- project_description: max 5000 chars (nullable, so only check when present)
ALTER TABLE "briefing_sessions" ADD CONSTRAINT "briefing_sessions_project_description_max_length" CHECK ("project_description" IS NULL OR length("project_description") <= 5000);
--> statement-breakpoint

-- ============================================
-- BRIEFING MESSAGES
-- ============================================

-- content must be non-empty
ALTER TABLE "briefing_messages" ADD CONSTRAINT "briefing_messages_content_non_empty" CHECK (length("content") > 0);
--> statement-breakpoint

-- token counts must be non-negative when present
ALTER TABLE "briefing_messages" ADD CONSTRAINT "briefing_messages_prompt_tokens_non_negative" CHECK ("prompt_tokens" IS NULL OR "prompt_tokens" >= 0);
--> statement-breakpoint
ALTER TABLE "briefing_messages" ADD CONSTRAINT "briefing_messages_completion_tokens_non_negative" CHECK ("completion_tokens" IS NULL OR "completion_tokens" >= 0);
--> statement-breakpoint

-- ============================================
-- BRIEFING DOCUMENTS
-- ============================================

-- title and content must be non-empty
ALTER TABLE "briefing_documents" ADD CONSTRAINT "briefing_documents_title_non_empty" CHECK (length("title") > 0);
--> statement-breakpoint
ALTER TABLE "briefing_documents" ADD CONSTRAINT "briefing_documents_content_non_empty" CHECK (length("content") > 0);
--> statement-breakpoint

-- version must be >= 1
ALTER TABLE "briefing_documents" ADD CONSTRAINT "briefing_documents_version_positive" CHECK ("version" >= 1);
--> statement-breakpoint

-- ============================================
-- PRD SESSIONS
-- ============================================

-- project_name: non-empty, max 200 chars
ALTER TABLE "prd_sessions" ADD CONSTRAINT "prd_sessions_project_name_length" CHECK (length("project_name") > 0 AND length("project_name") <= 200);
--> statement-breakpoint

-- project_description: max 5000 chars when present
ALTER TABLE "prd_sessions" ADD CONSTRAINT "prd_sessions_project_description_max_length" CHECK ("project_description" IS NULL OR length("project_description") <= 5000);
--> statement-breakpoint

-- ============================================
-- PRD MESSAGES
-- ============================================

-- content must be non-empty
ALTER TABLE "prd_messages" ADD CONSTRAINT "prd_messages_content_non_empty" CHECK (length("content") > 0);
--> statement-breakpoint

-- token counts must be non-negative when present
ALTER TABLE "prd_messages" ADD CONSTRAINT "prd_messages_prompt_tokens_non_negative" CHECK ("prompt_tokens" IS NULL OR "prompt_tokens" >= 0);
--> statement-breakpoint
ALTER TABLE "prd_messages" ADD CONSTRAINT "prd_messages_completion_tokens_non_negative" CHECK ("completion_tokens" IS NULL OR "completion_tokens" >= 0);
--> statement-breakpoint

-- ============================================
-- PRD DOCUMENTS
-- ============================================

-- title and content must be non-empty
ALTER TABLE "prd_documents" ADD CONSTRAINT "prd_documents_title_non_empty" CHECK (length("title") > 0);
--> statement-breakpoint
ALTER TABLE "prd_documents" ADD CONSTRAINT "prd_documents_content_non_empty" CHECK (length("content") > 0);
--> statement-breakpoint

-- version must be >= 1
ALTER TABLE "prd_documents" ADD CONSTRAINT "prd_documents_version_positive" CHECK ("version" >= 1);
--> statement-breakpoint

-- ============================================
-- SM SESSIONS
-- ============================================

-- project_name: non-empty, max 200 chars
ALTER TABLE "sm_sessions" ADD CONSTRAINT "sm_sessions_project_name_length" CHECK (length("project_name") > 0 AND length("project_name") <= 200);
--> statement-breakpoint

-- project_description: max 5000 chars when present
ALTER TABLE "sm_sessions" ADD CONSTRAINT "sm_sessions_project_description_max_length" CHECK ("project_description" IS NULL OR length("project_description") <= 5000);
--> statement-breakpoint

-- total counters must be non-negative
ALTER TABLE "sm_sessions" ADD CONSTRAINT "sm_sessions_total_epics_non_negative" CHECK ("total_epics" IS NULL OR "total_epics" >= 0);
--> statement-breakpoint
ALTER TABLE "sm_sessions" ADD CONSTRAINT "sm_sessions_total_stories_non_negative" CHECK ("total_stories" IS NULL OR "total_stories" >= 0);
--> statement-breakpoint
ALTER TABLE "sm_sessions" ADD CONSTRAINT "sm_sessions_total_story_points_non_negative" CHECK ("total_story_points" IS NULL OR "total_story_points" >= 0);
--> statement-breakpoint

-- ============================================
-- SM EPICS
-- ============================================

-- number must be >= 1
ALTER TABLE "sm_epics" ADD CONSTRAINT "sm_epics_number_positive" CHECK ("number" >= 1);
--> statement-breakpoint

-- title: non-empty, max 200 chars
ALTER TABLE "sm_epics" ADD CONSTRAINT "sm_epics_title_length" CHECK (length("title") > 0 AND length("title") <= 200);
--> statement-breakpoint

-- description: non-empty, max 2000 chars
ALTER TABLE "sm_epics" ADD CONSTRAINT "sm_epics_description_length" CHECK (length("description") > 0 AND length("description") <= 2000);
--> statement-breakpoint

-- business_value: max 1000 chars when present
ALTER TABLE "sm_epics" ADD CONSTRAINT "sm_epics_business_value_max_length" CHECK ("business_value" IS NULL OR length("business_value") <= 1000);
--> statement-breakpoint

-- target_sprint must be >= 1 when present
ALTER TABLE "sm_epics" ADD CONSTRAINT "sm_epics_target_sprint_positive" CHECK ("target_sprint" IS NULL OR "target_sprint" >= 1);
--> statement-breakpoint

-- estimated_story_points must be >= 0 when present
ALTER TABLE "sm_epics" ADD CONSTRAINT "sm_epics_estimated_story_points_non_negative" CHECK ("estimated_story_points" IS NULL OR "estimated_story_points" >= 0);
--> statement-breakpoint

-- ============================================
-- SM STORIES
-- ============================================

-- epic_number and story_number must be >= 1
ALTER TABLE "sm_stories" ADD CONSTRAINT "sm_stories_epic_number_positive" CHECK ("epic_number" >= 1);
--> statement-breakpoint
ALTER TABLE "sm_stories" ADD CONSTRAINT "sm_stories_story_number_positive" CHECK ("story_number" >= 1);
--> statement-breakpoint

-- title: non-empty, max 200 chars
ALTER TABLE "sm_stories" ADD CONSTRAINT "sm_stories_title_length" CHECK (length("title") > 0 AND length("title") <= 200);
--> statement-breakpoint

-- User story fields: non-empty, max length
ALTER TABLE "sm_stories" ADD CONSTRAINT "sm_stories_as_a_length" CHECK (length("as_a") > 0 AND length("as_a") <= 200);
--> statement-breakpoint
ALTER TABLE "sm_stories" ADD CONSTRAINT "sm_stories_i_want_length" CHECK (length("i_want") > 0 AND length("i_want") <= 500);
--> statement-breakpoint
ALTER TABLE "sm_stories" ADD CONSTRAINT "sm_stories_so_that_length" CHECK (length("so_that") > 0 AND length("so_that") <= 500);
--> statement-breakpoint

-- description: max 5000 chars when present
ALTER TABLE "sm_stories" ADD CONSTRAINT "sm_stories_description_max_length" CHECK ("description" IS NULL OR length("description") <= 5000);
--> statement-breakpoint

-- story_key: non-empty
ALTER TABLE "sm_stories" ADD CONSTRAINT "sm_stories_story_key_non_empty" CHECK (length("story_key") > 0);
--> statement-breakpoint

-- story_points must be >= 0 when present
ALTER TABLE "sm_stories" ADD CONSTRAINT "sm_stories_story_points_non_negative" CHECK ("story_points" IS NULL OR "story_points" >= 0);
--> statement-breakpoint

-- target_sprint must be >= 1 when present
ALTER TABLE "sm_stories" ADD CONSTRAINT "sm_stories_target_sprint_positive" CHECK ("target_sprint" IS NULL OR "target_sprint" >= 1);
--> statement-breakpoint

-- ============================================
-- SM MESSAGES
-- ============================================

-- content must be non-empty
ALTER TABLE "sm_messages" ADD CONSTRAINT "sm_messages_content_non_empty" CHECK (length("content") > 0);
--> statement-breakpoint

-- token counts must be non-negative when present
ALTER TABLE "sm_messages" ADD CONSTRAINT "sm_messages_prompt_tokens_non_negative" CHECK ("prompt_tokens" IS NULL OR "prompt_tokens" >= 0);
--> statement-breakpoint
ALTER TABLE "sm_messages" ADD CONSTRAINT "sm_messages_completion_tokens_non_negative" CHECK ("completion_tokens" IS NULL OR "completion_tokens" >= 0);
--> statement-breakpoint

-- ============================================
-- SM DOCUMENTS
-- ============================================

-- title and content must be non-empty
ALTER TABLE "sm_documents" ADD CONSTRAINT "sm_documents_title_non_empty" CHECK (length("title") > 0);
--> statement-breakpoint
ALTER TABLE "sm_documents" ADD CONSTRAINT "sm_documents_content_non_empty" CHECK (length("content") > 0);
--> statement-breakpoint

-- version must be >= 1
ALTER TABLE "sm_documents" ADD CONSTRAINT "sm_documents_version_positive" CHECK ("version" >= 1);
--> statement-breakpoint

-- ============================================
-- BRAINSTORM SESSIONS
-- ============================================

-- project_name: non-empty, max 200 chars
ALTER TABLE "brainstorm_sessions" ADD CONSTRAINT "brainstorm_sessions_project_name_length" CHECK (length("project_name") > 0 AND length("project_name") <= 200);
--> statement-breakpoint

-- project_description: max 5000 chars when present
ALTER TABLE "brainstorm_sessions" ADD CONSTRAINT "brainstorm_sessions_project_description_max_length" CHECK ("project_description" IS NULL OR length("project_description") <= 5000);
--> statement-breakpoint

-- current_technique_index must be >= 0
ALTER TABLE "brainstorm_sessions" ADD CONSTRAINT "brainstorm_sessions_technique_index_non_negative" CHECK ("current_technique_index" IS NULL OR "current_technique_index" >= 0);
--> statement-breakpoint

-- ============================================
-- BRAINSTORM MESSAGES
-- ============================================

-- content must be non-empty
ALTER TABLE "brainstorm_messages" ADD CONSTRAINT "brainstorm_messages_content_non_empty" CHECK (length("content") > 0);
--> statement-breakpoint

-- token counts must be non-negative when present
ALTER TABLE "brainstorm_messages" ADD CONSTRAINT "brainstorm_messages_prompt_tokens_non_negative" CHECK ("prompt_tokens" IS NULL OR "prompt_tokens" >= 0);
--> statement-breakpoint
ALTER TABLE "brainstorm_messages" ADD CONSTRAINT "brainstorm_messages_completion_tokens_non_negative" CHECK ("completion_tokens" IS NULL OR "completion_tokens" >= 0);
