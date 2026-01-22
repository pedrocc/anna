import { relations } from 'drizzle-orm'
import {
	boolean,
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

export const prdStepEnum = pgEnum('prd_step', [
	'init', // Step 1: Inicialização e detecção de estado
	'discovery', // Step 2: Descoberta de projeto e domínio
	'success', // Step 3: Critérios de sucesso
	'journeys', // Step 4: Mapeamento de jornadas do usuário
	'domain', // Step 5: Exploração domain-específica (opcional)
	'innovation', // Step 6: Descoberta de inovação (opcional)
	'project_type', // Step 7: Deep dive project-type específico
	'scoping', // Step 8: MVP e priorização de features
	'functional', // Step 9: Requisitos funcionais
	'nonfunctional', // Step 10: Requisitos não-funcionais
	'complete', // Step 11: Conclusão
])

export const prdStatusEnum = pgEnum('prd_status', ['active', 'paused', 'completed', 'archived'])

export const prdGenerationStatusEnum = pgEnum('prd_generation_status', [
	'idle', // Nenhuma geração em andamento
	'generating', // Geração em progresso
	'completed', // Geração concluída com sucesso
	'failed', // Geração falhou
])

export const prdMessageRoleEnum = pgEnum('prd_message_role', ['system', 'user', 'assistant'])

export const prdDocumentTypeEnum = pgEnum('prd_document_type', [
	'prd_full', // PRD completo
	'executive_summary', // Resumo executivo
	'functional_requirements', // Requisitos funcionais
	'nonfunctional_requirements', // Requisitos não-funcionais
	'user_journeys', // Jornadas de usuário
	'mvp_scope', // Escopo MVP
	'custom', // Documento customizado
])

export const prdProjectTypeEnum = pgEnum('prd_project_type', [
	'api_backend',
	'mobile_app',
	'saas_b2b',
	'developer_tool',
	'cli_tool',
	'web_app',
	'game',
	'desktop_app',
	'iot_embedded',
	'blockchain_web3',
	'custom',
])

export const prdDomainComplexityEnum = pgEnum('prd_domain_complexity', ['low', 'medium', 'high'])

// ============================================
// TYPES
// ============================================

export type PrdInputDocument = {
	name: string
	path: string
	type: 'briefing' | 'brainstorm' | 'research' | 'context' | 'other'
	loadedAt: string
}

export type PrdSuccessCriteria = {
	id: string
	type: 'user' | 'business' | 'technical'
	description: string
	metric?: string
	target?: string
}

export type PrdPersona = {
	id: string
	name: string
	description: string
	goals: string[]
	painPoints: string[]
	context?: string
}

export type PrdUserJourney = {
	id: string
	personaId: string
	personaName: string
	stages: PrdJourneyStage[]
}

export type PrdJourneyStage = {
	stage: 'discovery' | 'onboarding' | 'core_usage' | 'success' | 'long_term'
	description: string
	touchpoints?: string[]
	emotions?: string
}

export type PrdDomainConcern = {
	id: string
	category: string
	concern: string
	requirement?: string
	priority: 'critical' | 'high' | 'medium' | 'low'
}

export type PrdInnovation = {
	id: string
	type: string
	description: string
	impact: string
	risks?: string[]
}

export type PrdFeature = {
	id: string
	name: string
	description: string
	priority: 'must_have' | 'should_have' | 'nice_to_have'
	scope: 'mvp' | 'growth' | 'vision'
	journeyStage?: string
	successCriteriaIds?: string[]
}

export type PrdFunctionalRequirement = {
	id: string
	code: string // FR-001, FR-002, etc.
	name: string
	description: string
	category: string
	priority: 'critical' | 'high' | 'medium' | 'low'
	featureIds?: string[]
	acceptanceCriteria?: string[]
}

export type PrdNonFunctionalRequirement = {
	id: string
	code: string // NFR-001, NFR-002, etc.
	category:
		| 'performance'
		| 'security'
		| 'reliability'
		| 'usability'
		| 'maintainability'
		| 'compliance'
		| 'scalability'
	name: string
	description: string
	metric?: string
	target?: string
	priority: 'critical' | 'high' | 'medium' | 'low'
}

// ============================================
// TABLES
// ============================================

export const prdSessions = pgTable(
	'prd_sessions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),

		// Project info (Step 1: Init)
		projectName: text('project_name').notNull(),
		projectDescription: text('project_description'),
		inputDocuments: jsonb('input_documents').$type<PrdInputDocument[]>().default([]),

		// Classification (Step 2: Discovery)
		projectType: prdProjectTypeEnum('project_type'),
		domain: text('domain'),
		domainComplexity: prdDomainComplexityEnum('domain_complexity'),
		executiveSummary: text('executive_summary'),
		differentiators: jsonb('differentiators').$type<string[]>().default([]),

		// Success Criteria (Step 3)
		successCriteria: jsonb('success_criteria').$type<PrdSuccessCriteria[]>().default([]),

		// User Journeys (Step 4)
		personas: jsonb('personas').$type<PrdPersona[]>().default([]),
		userJourneys: jsonb('user_journeys').$type<PrdUserJourney[]>().default([]),

		// Domain Exploration (Step 5 - optional)
		domainConcerns: jsonb('domain_concerns').$type<PrdDomainConcern[]>().default([]),
		regulatoryRequirements: jsonb('regulatory_requirements').$type<string[]>().default([]),
		domainExpertise: jsonb('domain_expertise').$type<string[]>().default([]),
		skipDomainStep: boolean('skip_domain_step').default(false).notNull(),

		// Innovation (Step 6 - optional)
		innovations: jsonb('innovations').$type<PrdInnovation[]>().default([]),
		skipInnovationStep: boolean('skip_innovation_step').default(false).notNull(),

		// Project Type Deep Dive (Step 7)
		projectTypeDetails: jsonb('project_type_details').$type<Record<string, unknown>>().default({}),
		projectTypeQuestions: jsonb('project_type_questions')
			.$type<Record<string, string>>()
			.default({}),

		// Scoping (Step 8)
		features: jsonb('features').$type<PrdFeature[]>().default([]),
		outOfScope: jsonb('out_of_scope').$type<string[]>().default([]),
		mvpSuccessCriteria: jsonb('mvp_success_criteria').$type<string[]>().default([]),

		// Functional Requirements (Step 9)
		functionalRequirements: jsonb('functional_requirements')
			.$type<PrdFunctionalRequirement[]>()
			.default([]),

		// Non-Functional Requirements (Step 10)
		nonFunctionalRequirements: jsonb('non_functional_requirements')
			.$type<PrdNonFunctionalRequirement[]>()
			.default([]),

		// Session state
		currentStep: prdStepEnum('current_step').default('init').notNull(),
		status: prdStatusEnum('status').default('active').notNull(),
		stepsCompleted: jsonb('steps_completed').$type<string[]>().default([]),

		// Generation state (persisted for page reload)
		generationStatus: prdGenerationStatusEnum('generation_status').default('idle').notNull(),
		generationStartedAt: timestamp('generation_started_at', { withTimezone: true }),
		generationError: text('generation_error'),

		// Final document (Step 11)
		documentContent: text('document_content'),
		documentTitle: text('document_title'),

		// Timestamps
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
		completedAt: timestamp('completed_at', { withTimezone: true }),
	},
	(table) => ({
		userIdIdx: index('prd_sessions_user_id_idx').on(table.userId),
		statusIdx: index('prd_sessions_status_idx').on(table.status),
		currentStepIdx: index('prd_sessions_current_step_idx').on(table.currentStep),
		projectTypeIdx: index('prd_sessions_project_type_idx').on(table.projectType),
		createdAtIdx: index('prd_sessions_created_at_idx').on(table.createdAt),
		updatedAtIdx: index('prd_sessions_updated_at_idx').on(table.updatedAt),
	})
)

export const prdMessages = pgTable(
	'prd_messages',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sessionId: uuid('session_id')
			.notNull()
			.references(() => prdSessions.id, { onDelete: 'cascade' }),

		// Message content
		role: prdMessageRoleEnum('role').notNull(),
		content: text('content').notNull(),

		// Context for the message
		step: prdStepEnum('step').notNull(),

		// Token usage tracking
		promptTokens: integer('prompt_tokens'),
		completionTokens: integer('completion_tokens'),

		// Timestamp
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		sessionIdIdx: index('prd_messages_session_id_idx').on(table.sessionId),
		stepIdx: index('prd_messages_step_idx').on(table.step),
		createdAtIdx: index('prd_messages_created_at_idx').on(table.createdAt),
	})
)

export const prdDocuments = pgTable(
	'prd_documents',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sessionId: uuid('session_id')
			.notNull()
			.references(() => prdSessions.id, { onDelete: 'cascade' }),

		// Document info
		type: prdDocumentTypeEnum('type').notNull(),
		title: text('title').notNull(),
		content: text('content').notNull(),

		// Version tracking
		version: integer('version').default(1).notNull(),

		// Timestamps
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		sessionIdIdx: index('prd_documents_session_id_idx').on(table.sessionId),
		typeIdx: index('prd_documents_type_idx').on(table.type),
		createdAtIdx: index('prd_documents_created_at_idx').on(table.createdAt),
	})
)

// ============================================
// RELATIONS
// ============================================

export const prdSessionsRelations = relations(prdSessions, ({ one, many }) => ({
	user: one(users, {
		fields: [prdSessions.userId],
		references: [users.id],
	}),
	messages: many(prdMessages),
	documents: many(prdDocuments),
}))

export const prdMessagesRelations = relations(prdMessages, ({ one }) => ({
	session: one(prdSessions, {
		fields: [prdMessages.sessionId],
		references: [prdSessions.id],
	}),
}))

export const prdDocumentsRelations = relations(prdDocuments, ({ one }) => ({
	session: one(prdSessions, {
		fields: [prdDocuments.sessionId],
		references: [prdSessions.id],
	}),
}))

// ============================================
// TYPE EXPORTS
// ============================================

export type PrdSession = typeof prdSessions.$inferSelect
export type NewPrdSession = typeof prdSessions.$inferInsert
export type PrdMessage = typeof prdMessages.$inferSelect
export type NewPrdMessage = typeof prdMessages.$inferInsert
export type PrdDocument = typeof prdDocuments.$inferSelect
export type NewPrdDocument = typeof prdDocuments.$inferInsert
