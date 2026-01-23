import { relations, sql } from 'drizzle-orm'
import {
	check,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core'
import { users } from './users'

// ============================================
// ENUMS
// ============================================

export const briefingStepEnum = pgEnum('briefing_step', [
	'init', // Step 1: Inicialização e contexto
	'vision', // Step 2: Visão (problema, solução, diferenciadores)
	'users', // Step 3: Personas e jornadas
	'metrics', // Step 4: Métricas de sucesso e KPIs
	'scope', // Step 5: Escopo MVP
	'complete', // Step 6: Conclusão
])

export const briefingStatusEnum = pgEnum('briefing_status', [
	'active',
	'paused',
	'completed',
	'archived',
])

export const briefingGenerationStatusEnum = pgEnum('briefing_generation_status', [
	'idle', // Nenhuma geração em andamento
	'generating', // Geração em progresso
	'completed', // Geração concluída com sucesso
	'failed', // Geração falhou
])

export const briefingMessageRoleEnum = pgEnum('briefing_message_role', [
	'system',
	'user',
	'assistant',
])

export const briefingDocumentTypeEnum = pgEnum('briefing_document_type', [
	'product_brief', // Documento completo do Product Brief
	'executive_summary', // Resumo executivo
	'vision_statement', // Statement de visão
	'user_personas', // Documento de personas
	'metrics_dashboard', // Dashboard de métricas
	'mvp_scope', // Escopo do MVP
	'custom', // Documento customizado
])

// ============================================
// TYPES
// ============================================

export type BriefingPrimaryUser = {
	id: string
	name: string
	context: string
	painPoints: string[]
	goals: string[]
	currentSolutions?: string
}

export type BriefingSecondaryUser = {
	id: string
	name: string
	role: string
	relationship: string
}

export type BriefingUserJourney = {
	stage: 'discovery' | 'onboarding' | 'core_usage' | 'success' | 'long_term'
	description: string
}

export type BriefingMetric = {
	id: string
	name: string
	description: string
	target?: string
	timeframe?: string
	category: 'user' | 'business' | 'growth' | 'engagement' | 'financial'
}

export type BriefingFeature = {
	id: string
	name: string
	description: string
	priority: 'must_have' | 'should_have' | 'nice_to_have'
	inMvp: boolean
}

export type BriefingInputDocument = {
	name: string
	path: string
	type: 'brainstorm' | 'research' | 'context' | 'other'
	loadedAt: string
}

// ============================================
// TABLES
// ============================================

export const briefingSessions = pgTable(
	'briefing_sessions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),

		// Project info (Step 1: Init)
		projectName: text('project_name').notNull(),
		projectDescription: text('project_description'),
		inputDocuments: jsonb('input_documents').$type<BriefingInputDocument[]>().default([]),

		// Vision (Step 2)
		problemStatement: text('problem_statement'),
		problemImpact: text('problem_impact'),
		existingSolutionsGaps: text('existing_solutions_gaps'),
		proposedSolution: text('proposed_solution'),
		keyDifferentiators: jsonb('key_differentiators').$type<string[]>().default([]),

		// Users (Step 3)
		primaryUsers: jsonb('primary_users').$type<BriefingPrimaryUser[]>().default([]),
		secondaryUsers: jsonb('secondary_users').$type<BriefingSecondaryUser[]>().default([]),
		userJourneys: jsonb('user_journeys').$type<BriefingUserJourney[]>().default([]),

		// Metrics (Step 4)
		successMetrics: jsonb('success_metrics').$type<BriefingMetric[]>().default([]),
		businessObjectives: jsonb('business_objectives').$type<string[]>().default([]),
		kpis: jsonb('kpis').$type<BriefingMetric[]>().default([]),

		// Scope (Step 5)
		mvpFeatures: jsonb('mvp_features').$type<BriefingFeature[]>().default([]),
		outOfScope: jsonb('out_of_scope').$type<string[]>().default([]),
		mvpSuccessCriteria: jsonb('mvp_success_criteria').$type<string[]>().default([]),
		futureVision: text('future_vision'),

		// Session state
		currentStep: briefingStepEnum('current_step').default('init').notNull(),
		status: briefingStatusEnum('status').default('active').notNull(),
		stepsCompleted: jsonb('steps_completed').$type<string[]>().default([]),

		// Generation state (persisted for page reload)
		generationStatus: briefingGenerationStatusEnum('generation_status').default('idle').notNull(),
		generationStartedAt: timestamp('generation_started_at', { withTimezone: true }),
		generationError: jsonb('generation_error').$type<{
			message: string
			code: string
			status?: number
		}>(),

		// Final document (Step 6)
		documentContent: text('document_content'),
		documentTitle: text('document_title'),
		executiveSummary: text('executive_summary'),

		// Timestamps
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
		completedAt: timestamp('completed_at', { withTimezone: true }),

		// Soft delete
		deletedAt: timestamp('deleted_at', { withTimezone: true }),
	},
	(table) => ({
		userIdIdx: index('briefing_sessions_user_id_idx').on(table.userId),
		statusIdx: index('briefing_sessions_status_idx').on(table.status),
		currentStepIdx: index('briefing_sessions_current_step_idx').on(table.currentStep),
		createdAtIdx: index('briefing_sessions_created_at_idx').on(table.createdAt),
		updatedAtIdx: index('briefing_sessions_updated_at_idx').on(table.updatedAt),
		deletedAtIdx: index('briefing_sessions_deleted_at_idx').on(table.deletedAt),
		userStatusIdx: index('briefing_sessions_user_status_idx').on(table.userId, table.status),
		userCreatedAtIdx: index('briefing_sessions_user_created_at_idx').on(
			table.userId,
			table.createdAt
		),
		projectNameLength: check(
			'briefing_sessions_project_name_length',
			sql`length(${table.projectName}) > 0 AND length(${table.projectName}) <= 200`
		),
		projectDescriptionMaxLength: check(
			'briefing_sessions_project_description_max_length',
			sql`${table.projectDescription} IS NULL OR length(${table.projectDescription}) <= 5000`
		),
	})
)

export const briefingMessages = pgTable(
	'briefing_messages',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sessionId: uuid('session_id')
			.notNull()
			.references(() => briefingSessions.id, { onDelete: 'cascade' }),

		// Message content
		role: briefingMessageRoleEnum('role').notNull(),
		content: text('content').notNull(),

		// Context for the message
		step: briefingStepEnum('step').notNull(),

		// Token usage tracking
		promptTokens: integer('prompt_tokens'),
		completionTokens: integer('completion_tokens'),

		// Timestamp
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		sessionIdIdx: index('briefing_messages_session_id_idx').on(table.sessionId),
		stepIdx: index('briefing_messages_step_idx').on(table.step),
		createdAtIdx: index('briefing_messages_created_at_idx').on(table.createdAt),
		contentNonEmpty: check(
			'briefing_messages_content_non_empty',
			sql`length(${table.content}) > 0`
		),
		promptTokensNonNegative: check(
			'briefing_messages_prompt_tokens_non_negative',
			sql`${table.promptTokens} IS NULL OR ${table.promptTokens} >= 0`
		),
		completionTokensNonNegative: check(
			'briefing_messages_completion_tokens_non_negative',
			sql`${table.completionTokens} IS NULL OR ${table.completionTokens} >= 0`
		),
	})
)

export const briefingDocuments = pgTable(
	'briefing_documents',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sessionId: uuid('session_id')
			.notNull()
			.references(() => briefingSessions.id, { onDelete: 'cascade' }),

		// Document info
		type: briefingDocumentTypeEnum('type').notNull(),
		title: text('title').notNull(),
		content: text('content').notNull(),

		// Version tracking
		version: integer('version').default(1).notNull(),

		// Timestamps
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => ({
		sessionIdIdx: index('briefing_documents_session_id_idx').on(table.sessionId),
		typeIdx: index('briefing_documents_type_idx').on(table.type),
		createdAtIdx: index('briefing_documents_created_at_idx').on(table.createdAt),
		titleNonEmpty: check('briefing_documents_title_non_empty', sql`length(${table.title}) > 0`),
		contentNonEmpty: check(
			'briefing_documents_content_non_empty',
			sql`length(${table.content}) > 0`
		),
		versionPositive: check('briefing_documents_version_positive', sql`${table.version} >= 1`),
	})
)

// ============================================
// RELATIONS
// ============================================

export const briefingSessionsRelations = relations(briefingSessions, ({ one, many }) => ({
	user: one(users, {
		fields: [briefingSessions.userId],
		references: [users.id],
	}),
	messages: many(briefingMessages),
	documents: many(briefingDocuments),
}))

export const briefingMessagesRelations = relations(briefingMessages, ({ one }) => ({
	session: one(briefingSessions, {
		fields: [briefingMessages.sessionId],
		references: [briefingSessions.id],
	}),
}))

export const briefingDocumentsRelations = relations(briefingDocuments, ({ one }) => ({
	session: one(briefingSessions, {
		fields: [briefingDocuments.sessionId],
		references: [briefingSessions.id],
	}),
}))

// ============================================
// TYPE EXPORTS
// ============================================

export type BriefingSession = typeof briefingSessions.$inferSelect
export type NewBriefingSession = typeof briefingSessions.$inferInsert
export type BriefingMessage = typeof briefingMessages.$inferSelect
export type NewBriefingMessage = typeof briefingMessages.$inferInsert
export type BriefingDocument = typeof briefingDocuments.$inferSelect
export type NewBriefingDocument = typeof briefingDocuments.$inferInsert
