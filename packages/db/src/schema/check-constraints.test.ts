import { describe, expect, it } from 'bun:test'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { brainstormMessages, brainstormSessions } from './brainstorm'
import { briefingDocuments, briefingMessages, briefingSessions } from './briefing'
import { prdDocuments, prdMessages, prdSessions } from './prd'
import { smDocuments, smEpics, smMessages, smSessions, smStories } from './sm'
import { users } from './users'

function getCheckConstraints(table: Parameters<typeof getTableConfig>[0]) {
	const config = getTableConfig(table)
	return config.checks.map((c) => c.name)
}

describe('CHECK constraints', () => {
	describe('users table', () => {
		it('should have name non-empty constraint', () => {
			const checks = getCheckConstraints(users)
			expect(checks).toContain('users_name_non_empty')
		})

		it('should have email min length constraint', () => {
			const checks = getCheckConstraints(users)
			expect(checks).toContain('users_email_min_length')
		})
	})

	describe('briefing_sessions table', () => {
		it('should have project_name length constraint', () => {
			const checks = getCheckConstraints(briefingSessions)
			expect(checks).toContain('briefing_sessions_project_name_length')
		})

		it('should have project_description max length constraint', () => {
			const checks = getCheckConstraints(briefingSessions)
			expect(checks).toContain('briefing_sessions_project_description_max_length')
		})
	})

	describe('briefing_messages table', () => {
		it('should have content non-empty constraint', () => {
			const checks = getCheckConstraints(briefingMessages)
			expect(checks).toContain('briefing_messages_content_non_empty')
		})

		it('should have token count non-negative constraints', () => {
			const checks = getCheckConstraints(briefingMessages)
			expect(checks).toContain('briefing_messages_prompt_tokens_non_negative')
			expect(checks).toContain('briefing_messages_completion_tokens_non_negative')
		})
	})

	describe('briefing_documents table', () => {
		it('should have title and content non-empty constraints', () => {
			const checks = getCheckConstraints(briefingDocuments)
			expect(checks).toContain('briefing_documents_title_non_empty')
			expect(checks).toContain('briefing_documents_content_non_empty')
		})

		it('should have version positive constraint', () => {
			const checks = getCheckConstraints(briefingDocuments)
			expect(checks).toContain('briefing_documents_version_positive')
		})
	})

	describe('prd_sessions table', () => {
		it('should have project_name length constraint', () => {
			const checks = getCheckConstraints(prdSessions)
			expect(checks).toContain('prd_sessions_project_name_length')
		})

		it('should have project_description max length constraint', () => {
			const checks = getCheckConstraints(prdSessions)
			expect(checks).toContain('prd_sessions_project_description_max_length')
		})
	})

	describe('prd_messages table', () => {
		it('should have content non-empty constraint', () => {
			const checks = getCheckConstraints(prdMessages)
			expect(checks).toContain('prd_messages_content_non_empty')
		})

		it('should have token count non-negative constraints', () => {
			const checks = getCheckConstraints(prdMessages)
			expect(checks).toContain('prd_messages_prompt_tokens_non_negative')
			expect(checks).toContain('prd_messages_completion_tokens_non_negative')
		})
	})

	describe('prd_documents table', () => {
		it('should have title and content non-empty constraints', () => {
			const checks = getCheckConstraints(prdDocuments)
			expect(checks).toContain('prd_documents_title_non_empty')
			expect(checks).toContain('prd_documents_content_non_empty')
		})

		it('should have version positive constraint', () => {
			const checks = getCheckConstraints(prdDocuments)
			expect(checks).toContain('prd_documents_version_positive')
		})
	})

	describe('sm_sessions table', () => {
		it('should have project_name length constraint', () => {
			const checks = getCheckConstraints(smSessions)
			expect(checks).toContain('sm_sessions_project_name_length')
		})

		it('should have project_description max length constraint', () => {
			const checks = getCheckConstraints(smSessions)
			expect(checks).toContain('sm_sessions_project_description_max_length')
		})

		it('should have total counters non-negative constraints', () => {
			const checks = getCheckConstraints(smSessions)
			expect(checks).toContain('sm_sessions_total_epics_non_negative')
			expect(checks).toContain('sm_sessions_total_stories_non_negative')
			expect(checks).toContain('sm_sessions_total_story_points_non_negative')
		})
	})

	describe('sm_epics table', () => {
		it('should have number positive constraint', () => {
			const checks = getCheckConstraints(smEpics)
			expect(checks).toContain('sm_epics_number_positive')
		})

		it('should have title length constraint', () => {
			const checks = getCheckConstraints(smEpics)
			expect(checks).toContain('sm_epics_title_length')
		})

		it('should have description length constraint', () => {
			const checks = getCheckConstraints(smEpics)
			expect(checks).toContain('sm_epics_description_length')
		})

		it('should have business_value max length constraint', () => {
			const checks = getCheckConstraints(smEpics)
			expect(checks).toContain('sm_epics_business_value_max_length')
		})

		it('should have target_sprint positive constraint', () => {
			const checks = getCheckConstraints(smEpics)
			expect(checks).toContain('sm_epics_target_sprint_positive')
		})

		it('should have estimated_story_points non-negative constraint', () => {
			const checks = getCheckConstraints(smEpics)
			expect(checks).toContain('sm_epics_estimated_story_points_non_negative')
		})
	})

	describe('sm_stories table', () => {
		it('should have epic_number and story_number positive constraints', () => {
			const checks = getCheckConstraints(smStories)
			expect(checks).toContain('sm_stories_epic_number_positive')
			expect(checks).toContain('sm_stories_story_number_positive')
		})

		it('should have title length constraint', () => {
			const checks = getCheckConstraints(smStories)
			expect(checks).toContain('sm_stories_title_length')
		})

		it('should have user story field constraints', () => {
			const checks = getCheckConstraints(smStories)
			expect(checks).toContain('sm_stories_as_a_length')
			expect(checks).toContain('sm_stories_i_want_length')
			expect(checks).toContain('sm_stories_so_that_length')
		})

		it('should have description max length constraint', () => {
			const checks = getCheckConstraints(smStories)
			expect(checks).toContain('sm_stories_description_max_length')
		})

		it('should have story_key non-empty constraint', () => {
			const checks = getCheckConstraints(smStories)
			expect(checks).toContain('sm_stories_story_key_non_empty')
		})

		it('should have story_points non-negative constraint', () => {
			const checks = getCheckConstraints(smStories)
			expect(checks).toContain('sm_stories_story_points_non_negative')
		})

		it('should have target_sprint positive constraint', () => {
			const checks = getCheckConstraints(smStories)
			expect(checks).toContain('sm_stories_target_sprint_positive')
		})
	})

	describe('sm_messages table', () => {
		it('should have content non-empty constraint', () => {
			const checks = getCheckConstraints(smMessages)
			expect(checks).toContain('sm_messages_content_non_empty')
		})

		it('should have token count non-negative constraints', () => {
			const checks = getCheckConstraints(smMessages)
			expect(checks).toContain('sm_messages_prompt_tokens_non_negative')
			expect(checks).toContain('sm_messages_completion_tokens_non_negative')
		})
	})

	describe('sm_documents table', () => {
		it('should have title and content non-empty constraints', () => {
			const checks = getCheckConstraints(smDocuments)
			expect(checks).toContain('sm_documents_title_non_empty')
			expect(checks).toContain('sm_documents_content_non_empty')
		})

		it('should have version positive constraint', () => {
			const checks = getCheckConstraints(smDocuments)
			expect(checks).toContain('sm_documents_version_positive')
		})
	})

	describe('brainstorm_sessions table', () => {
		it('should have project_name length constraint', () => {
			const checks = getCheckConstraints(brainstormSessions)
			expect(checks).toContain('brainstorm_sessions_project_name_length')
		})

		it('should have project_description max length constraint', () => {
			const checks = getCheckConstraints(brainstormSessions)
			expect(checks).toContain('brainstorm_sessions_project_description_max_length')
		})

		it('should have technique_index non-negative constraint', () => {
			const checks = getCheckConstraints(brainstormSessions)
			expect(checks).toContain('brainstorm_sessions_technique_index_non_negative')
		})
	})

	describe('brainstorm_messages table', () => {
		it('should have content non-empty constraint', () => {
			const checks = getCheckConstraints(brainstormMessages)
			expect(checks).toContain('brainstorm_messages_content_non_empty')
		})

		it('should have token count non-negative constraints', () => {
			const checks = getCheckConstraints(brainstormMessages)
			expect(checks).toContain('brainstorm_messages_prompt_tokens_non_negative')
			expect(checks).toContain('brainstorm_messages_completion_tokens_non_negative')
		})
	})

	describe('constraint count verification', () => {
		it('users should have exactly 2 check constraints', () => {
			expect(getCheckConstraints(users)).toHaveLength(2)
		})

		it('briefing_sessions should have exactly 2 check constraints', () => {
			expect(getCheckConstraints(briefingSessions)).toHaveLength(2)
		})

		it('briefing_messages should have exactly 3 check constraints', () => {
			expect(getCheckConstraints(briefingMessages)).toHaveLength(3)
		})

		it('briefing_documents should have exactly 3 check constraints', () => {
			expect(getCheckConstraints(briefingDocuments)).toHaveLength(3)
		})

		it('prd_sessions should have exactly 2 check constraints', () => {
			expect(getCheckConstraints(prdSessions)).toHaveLength(2)
		})

		it('prd_messages should have exactly 3 check constraints', () => {
			expect(getCheckConstraints(prdMessages)).toHaveLength(3)
		})

		it('prd_documents should have exactly 3 check constraints', () => {
			expect(getCheckConstraints(prdDocuments)).toHaveLength(3)
		})

		it('sm_sessions should have exactly 5 check constraints', () => {
			expect(getCheckConstraints(smSessions)).toHaveLength(5)
		})

		it('sm_epics should have exactly 6 check constraints', () => {
			expect(getCheckConstraints(smEpics)).toHaveLength(6)
		})

		it('sm_stories should have exactly 10 check constraints', () => {
			expect(getCheckConstraints(smStories)).toHaveLength(10)
		})

		it('sm_messages should have exactly 3 check constraints', () => {
			expect(getCheckConstraints(smMessages)).toHaveLength(3)
		})

		it('sm_documents should have exactly 3 check constraints', () => {
			expect(getCheckConstraints(smDocuments)).toHaveLength(3)
		})

		it('brainstorm_sessions should have exactly 3 check constraints', () => {
			expect(getCheckConstraints(brainstormSessions)).toHaveLength(3)
		})

		it('brainstorm_messages should have exactly 3 check constraints', () => {
			expect(getCheckConstraints(brainstormMessages)).toHaveLength(3)
		})
	})
})
