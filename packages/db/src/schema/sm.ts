import { relations } from 'drizzle-orm'
import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { prdSessions } from './prd'
import { users } from './users'

// ============================================
// ENUMS
// ============================================

export const smStepEnum = pgEnum('sm_step', [
	'init', // Step 1: Inicializacao e carregamento de PRD
	'epics', // Step 2: Definicao de epics
	'stories', // Step 3: Criacao de user stories
	'details', // Step 4: Detalhamento de AC e tasks
	'planning', // Step 5: Sprint planning e priorizacao
	'review', // Step 6: Revisao e validacao
	'complete', // Step 7: Conclusao
])

export const smStatusEnum = pgEnum('sm_status', ['active', 'paused', 'completed', 'archived'])

export const smMessageRoleEnum = pgEnum('sm_message_role', ['system', 'user', 'assistant'])

export const smDocumentTypeEnum = pgEnum('sm_document_type', [
	'sprint_backlog', // Backlog do sprint
	'epic_document', // Documento de epic
	'story_document', // Documento de story
	'sprint_planning', // Planejamento de sprint
	'full_planning', // Documento completo
	'custom', // Documento customizado
])

export const smEpicStatusEnum = pgEnum('sm_epic_status', ['backlog', 'in_progress', 'done'])

export const smStoryStatusEnum = pgEnum('sm_story_status', [
	'backlog',
	'ready_for_dev',
	'in_progress',
	'review',
	'done',
])

export const smStoryPriorityEnum = pgEnum('sm_story_priority', [
	'critical',
	'high',
	'medium',
	'low',
])

// ============================================
// TYPES
// ============================================

export type SmAcceptanceCriteria = {
	id: string
	description: string
	type: 'given_when_then' | 'simple'
	given?: string
	when?: string
	then?: string
}

export type SmTask = {
	id: string
	description: string
	estimatedHours?: number
	acceptanceCriteriaIds?: string[]
	completed: boolean
}

export type SmDevNotes = {
	architecturePatterns?: string[]
	componentsToTouch?: string[]
	testingRequirements?: string[]
	securityConsiderations?: string[]
	performanceNotes?: string[]
	references?: string[]
}

export type SmSprintConfig = {
	sprintDuration: number // in days
	velocityEstimate?: number // story points per sprint
	startDate?: string
	teamSize?: number
}

// ============================================
// TABLES
// ============================================

export const smSessions = pgTable(
	'sm_sessions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),

		// Linked PRD (primary source)
		prdSessionId: uuid('prd_session_id').references(() => prdSessions.id, { onDelete: 'set null' }),

		// Project info
		projectName: text('project_name').notNull(),
		projectDescription: text('project_description'),

		// PRD context (cached from linked PRD)
		prdContext: jsonb('prd_context')
			.$type<{
				projectType?: string | null
				domain?: string | null
				executiveSummary?: string | null
				features?: Array<{
					id: string
					name: string
					description: string
					priority: string
					scope: string
				}>
				functionalRequirements?: Array<{
					id: string
					code: string
					name: string
					description: string
					category: string
					priority: string
					acceptanceCriteria?: string[]
				}>
				nonFunctionalRequirements?: Array<{
					id: string
					code: string
					category: string
					name: string
					description: string
					priority: string
				}>
				personas?: Array<{
					id: string
					name: string
					description: string
				}>
			}>()
			.default({}),

		// Sprint configuration
		sprintConfig: jsonb('sprint_config').$type<SmSprintConfig>().default({
			sprintDuration: 14,
		}),

		// Session state
		currentStep: smStepEnum('current_step').default('init').notNull(),
		status: smStatusEnum('status').default('active').notNull(),
		stepsCompleted: jsonb('steps_completed').$type<string[]>().default([]),

		// Summary stats (updated as stories are created)
		totalEpics: integer('total_epics').default(0),
		totalStories: integer('total_stories').default(0),
		totalStoryPoints: integer('total_story_points').default(0),

		// Final document
		documentContent: text('document_content'),
		documentTitle: text('document_title'),

		// Timestamps
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
		completedAt: timestamp('completed_at', { withTimezone: true }),
	},
	(table) => ({
		userIdIdx: index('sm_sessions_user_id_idx').on(table.userId),
		prdSessionIdIdx: index('sm_sessions_prd_session_id_idx').on(table.prdSessionId),
		statusIdx: index('sm_sessions_status_idx').on(table.status),
		currentStepIdx: index('sm_sessions_current_step_idx').on(table.currentStep),
		createdAtIdx: index('sm_sessions_created_at_idx').on(table.createdAt),
	})
)

export const smMessages = pgTable(
	'sm_messages',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sessionId: uuid('session_id')
			.notNull()
			.references(() => smSessions.id, { onDelete: 'cascade' }),

		// Message content
		role: smMessageRoleEnum('role').notNull(),
		content: text('content').notNull(),

		// Context for the message
		step: smStepEnum('step').notNull(),

		// Token usage tracking
		promptTokens: integer('prompt_tokens'),
		completionTokens: integer('completion_tokens'),

		// Timestamp
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		sessionIdIdx: index('sm_messages_session_id_idx').on(table.sessionId),
		stepIdx: index('sm_messages_step_idx').on(table.step),
		createdAtIdx: index('sm_messages_created_at_idx').on(table.createdAt),
	})
)

export const smEpics = pgTable(
	'sm_epics',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sessionId: uuid('session_id')
			.notNull()
			.references(() => smSessions.id, { onDelete: 'cascade' }),

		// Epic info
		number: integer('number').notNull(), // Epic 1, 2, 3...
		title: text('title').notNull(),
		description: text('description').notNull(),
		businessValue: text('business_value'),

		// Links to PRD
		featureIds: jsonb('feature_ids').$type<string[]>().default([]),
		functionalRequirementCodes: jsonb('functional_requirement_codes').$type<string[]>().default([]),

		// Status
		status: smEpicStatusEnum('status').default('backlog').notNull(),
		priority: smStoryPriorityEnum('priority').default('medium').notNull(),

		// Planning
		targetSprint: integer('target_sprint'),
		estimatedStoryPoints: integer('estimated_story_points'),

		// Timestamps
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		sessionIdIdx: index('sm_epics_session_id_idx').on(table.sessionId),
		statusIdx: index('sm_epics_status_idx').on(table.status),
		numberIdx: index('sm_epics_number_idx').on(table.number),
	})
)

export const smStories = pgTable(
	'sm_stories',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sessionId: uuid('session_id')
			.notNull()
			.references(() => smSessions.id, { onDelete: 'cascade' }),
		epicId: uuid('epic_id')
			.notNull()
			.references(() => smEpics.id, { onDelete: 'cascade' }),

		// Story identification
		epicNumber: integer('epic_number').notNull(),
		storyNumber: integer('story_number').notNull(), // Story 1.1, 1.2, 2.1...
		storyKey: text('story_key').notNull(), // "1-1", "1-2", "2-1"

		// User story format
		title: text('title').notNull(),
		asA: text('as_a').notNull(), // As a [role]
		iWant: text('i_want').notNull(), // I want [action]
		soThat: text('so_that').notNull(), // So that [benefit]

		// Full story content
		description: text('description'),

		// Acceptance Criteria
		acceptanceCriteria: jsonb('acceptance_criteria').$type<SmAcceptanceCriteria[]>().default([]),

		// Tasks
		tasks: jsonb('tasks').$type<SmTask[]>().default([]),

		// Dev Notes
		devNotes: jsonb('dev_notes').$type<SmDevNotes>().default({}),

		// Status & Priority
		status: smStoryStatusEnum('status').default('backlog').notNull(),
		priority: smStoryPriorityEnum('priority').default('medium').notNull(),

		// Planning
		storyPoints: integer('story_points'),
		targetSprint: integer('target_sprint'),

		// Links to PRD
		functionalRequirementCodes: jsonb('functional_requirement_codes').$type<string[]>().default([]),

		// Timestamps
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		sessionIdIdx: index('sm_stories_session_id_idx').on(table.sessionId),
		epicIdIdx: index('sm_stories_epic_id_idx').on(table.epicId),
		statusIdx: index('sm_stories_status_idx').on(table.status),
		storyKeyIdx: index('sm_stories_story_key_idx').on(table.storyKey),
	})
)

export const smDocuments = pgTable(
	'sm_documents',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sessionId: uuid('session_id')
			.notNull()
			.references(() => smSessions.id, { onDelete: 'cascade' }),

		// Document info
		type: smDocumentTypeEnum('type').notNull(),
		title: text('title').notNull(),
		content: text('content').notNull(),

		// Version tracking
		version: integer('version').default(1).notNull(),

		// Timestamps
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		sessionIdIdx: index('sm_documents_session_id_idx').on(table.sessionId),
		typeIdx: index('sm_documents_type_idx').on(table.type),
		createdAtIdx: index('sm_documents_created_at_idx').on(table.createdAt),
	})
)

// ============================================
// RELATIONS
// ============================================

export const smSessionsRelations = relations(smSessions, ({ one, many }) => ({
	user: one(users, {
		fields: [smSessions.userId],
		references: [users.id],
	}),
	prdSession: one(prdSessions, {
		fields: [smSessions.prdSessionId],
		references: [prdSessions.id],
	}),
	messages: many(smMessages),
	epics: many(smEpics),
	stories: many(smStories),
	documents: many(smDocuments),
}))

export const smMessagesRelations = relations(smMessages, ({ one }) => ({
	session: one(smSessions, {
		fields: [smMessages.sessionId],
		references: [smSessions.id],
	}),
}))

export const smEpicsRelations = relations(smEpics, ({ one, many }) => ({
	session: one(smSessions, {
		fields: [smEpics.sessionId],
		references: [smSessions.id],
	}),
	stories: many(smStories),
}))

export const smStoriesRelations = relations(smStories, ({ one }) => ({
	session: one(smSessions, {
		fields: [smStories.sessionId],
		references: [smSessions.id],
	}),
	epic: one(smEpics, {
		fields: [smStories.epicId],
		references: [smEpics.id],
	}),
}))

export const smDocumentsRelations = relations(smDocuments, ({ one }) => ({
	session: one(smSessions, {
		fields: [smDocuments.sessionId],
		references: [smSessions.id],
	}),
}))

// ============================================
// TYPE EXPORTS
// ============================================

export type SmSession = typeof smSessions.$inferSelect
export type NewSmSession = typeof smSessions.$inferInsert
export type SmMessage = typeof smMessages.$inferSelect
export type NewSmMessage = typeof smMessages.$inferInsert
export type SmEpic = typeof smEpics.$inferSelect
export type NewSmEpic = typeof smEpics.$inferInsert
export type SmStory = typeof smStories.$inferSelect
export type NewSmStory = typeof smStories.$inferInsert
export type SmDocument = typeof smDocuments.$inferSelect
export type NewSmDocument = typeof smDocuments.$inferInsert
