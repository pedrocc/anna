import { TECHNIQUE_IDS } from '@repo/shared/schemas'
import { relations } from 'drizzle-orm'
import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

// ============================================
// ENUMS
// ============================================

export const brainstormStepEnum = pgEnum('brainstorm_step', [
	'setup', // Step 1: Session setup
	'technique', // Step 2: Technique selection
	'execution', // Step 3: Interactive execution
	'document', // Step 4: Organization & document
])

export const brainstormApproachEnum = pgEnum('brainstorm_approach', [
	'ai_recommended', // AI selects techniques based on goals
	'user_selected', // User picks from full list
	'quick_session', // Single rapid technique
	'comprehensive', // All 10 techniques sequentially
])

export const brainstormStatusEnum = pgEnum('brainstorm_status', [
	'active',
	'paused',
	'completed',
	'archived',
])

export const brainstormMessageRoleEnum = pgEnum('brainstorm_message_role', [
	'system',
	'user',
	'assistant',
])

export const brainstormTechniqueEnum = pgEnum('brainstorm_technique', TECHNIQUE_IDS)

// ============================================
// TYPES
// ============================================

export type BrainstormIdea = {
	id: string
	content: string
	technique: string
	category?: string
	priority?: 'high' | 'medium' | 'low'
	createdAt: string
}

// ============================================
// TABLES
// ============================================

export const brainstormSessions = pgTable(
	'brainstorm_sessions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),

		// Project info (Step 1)
		projectName: text('project_name').notNull(),
		projectDescription: text('project_description'),
		goals: jsonb('goals').$type<string[]>(),

		// Session config
		approach: brainstormApproachEnum('approach').default('ai_recommended').notNull(),
		currentStep: brainstormStepEnum('current_step').default('setup').notNull(),
		status: brainstormStatusEnum('status').default('active').notNull(),

		// Selected techniques (Step 2)
		selectedTechniques: jsonb('selected_techniques').$type<string[]>().default([]),
		currentTechniqueIndex: integer('current_technique_index').default(0),

		// Generated ideas (Step 3)
		ideas: jsonb('ideas').$type<BrainstormIdea[]>().default([]),

		// Final document (Step 4)
		documentContent: text('document_content'),
		documentTitle: text('document_title'),

		// Timestamps
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
		completedAt: timestamp('completed_at', { withTimezone: true }),
	},
	(table) => ({
		userIdIdx: index('brainstorm_sessions_user_id_idx').on(table.userId),
		statusIdx: index('brainstorm_sessions_status_idx').on(table.status),
		currentStepIdx: index('brainstorm_sessions_current_step_idx').on(table.currentStep),
		createdAtIdx: index('brainstorm_sessions_created_at_idx').on(table.createdAt),
	})
)

export const brainstormMessages = pgTable(
	'brainstorm_messages',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sessionId: uuid('session_id')
			.notNull()
			.references(() => brainstormSessions.id, { onDelete: 'cascade' }),

		// Message content
		role: brainstormMessageRoleEnum('role').notNull(),
		content: text('content').notNull(),

		// Context for the message
		step: brainstormStepEnum('step').notNull(),
		technique: brainstormTechniqueEnum('technique'),

		// Token usage tracking
		promptTokens: integer('prompt_tokens'),
		completionTokens: integer('completion_tokens'),

		// Timestamp
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		sessionIdIdx: index('brainstorm_messages_session_id_idx').on(table.sessionId),
		stepIdx: index('brainstorm_messages_step_idx').on(table.step),
		createdAtIdx: index('brainstorm_messages_created_at_idx').on(table.createdAt),
	})
)

// ============================================
// RELATIONS
// ============================================

export const brainstormSessionsRelations = relations(brainstormSessions, ({ one, many }) => ({
	user: one(users, {
		fields: [brainstormSessions.userId],
		references: [users.id],
	}),
	messages: many(brainstormMessages),
}))

export const brainstormMessagesRelations = relations(brainstormMessages, ({ one }) => ({
	session: one(brainstormSessions, {
		fields: [brainstormMessages.sessionId],
		references: [brainstormSessions.id],
	}),
}))

// ============================================
// TYPE EXPORTS
// ============================================

export type BrainstormSession = typeof brainstormSessions.$inferSelect
export type NewBrainstormSession = typeof brainstormSessions.$inferInsert
export type BrainstormMessage = typeof brainstormMessages.$inferSelect
export type NewBrainstormMessage = typeof brainstormMessages.$inferInsert
