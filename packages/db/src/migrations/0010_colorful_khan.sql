CREATE INDEX "briefing_sessions_updated_at_idx" ON "briefing_sessions" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "prd_sessions_updated_at_idx" ON "prd_sessions" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "sm_epics_session_number_idx" ON "sm_epics" USING btree ("session_id","number");--> statement-breakpoint
CREATE INDEX "sm_sessions_updated_at_idx" ON "sm_sessions" USING btree ("updated_at");