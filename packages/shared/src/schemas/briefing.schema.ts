import { z } from 'zod'
import { IdSchema, TimestampsSchema } from './common.schema.js'

// ============================================
// ENUMS
// ============================================

export const BriefingStepSchema = z.enum([
	'init',
	'vision',
	'users',
	'metrics',
	'scope',
	'complete',
])

export const BriefingStatusSchema = z.enum(['active', 'paused', 'completed', 'archived'])

export const BriefingMessageRoleSchema = z.enum(['system', 'user', 'assistant'])

export const BriefingDocumentTypeSchema = z.enum([
	'product_brief', // Documento completo do Product Brief
	'executive_summary', // Resumo executivo
	'vision_statement', // Statement de visão
	'user_personas', // Documento de personas
	'metrics_dashboard', // Dashboard de métricas
	'mvp_scope', // Escopo do MVP
	'custom', // Documento customizado
])

// ============================================
// STEP METADATA
// ============================================

export const BriefingStepInfoSchema = z.object({
	id: BriefingStepSchema,
	name: z.string(),
	description: z.string(),
	icon: z.string(),
	order: z.number(),
})

// ============================================
// COMPLEX TYPE SCHEMAS
// ============================================

export const BriefingPrimaryUserSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	context: z.string().min(1),
	painPoints: z.array(z.string()),
	goals: z.array(z.string()),
	currentSolutions: z.string().optional(),
})

export const BriefingSecondaryUserSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	role: z.string().min(1),
	relationship: z.string().min(1),
})

export const BriefingUserJourneyStageSchema = z.enum([
	'discovery',
	'onboarding',
	'core_usage',
	'success',
	'long_term',
])

export const BriefingUserJourneySchema = z.object({
	stage: BriefingUserJourneyStageSchema,
	description: z.string().min(1),
})

export const BriefingMetricCategorySchema = z.enum([
	'user',
	'business',
	'growth',
	'engagement',
	'financial',
])

export const BriefingMetricSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	description: z.string().min(1),
	target: z.string().optional(),
	timeframe: z.string().optional(),
	category: BriefingMetricCategorySchema,
})

export const BriefingFeaturePrioritySchema = z.enum(['must_have', 'should_have', 'nice_to_have'])

export const BriefingFeatureSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	description: z.string().min(1),
	priority: BriefingFeaturePrioritySchema,
	inMvp: z.boolean(),
})

export const BriefingInputDocumentTypeSchema = z.enum([
	'brainstorm',
	'research',
	'context',
	'other',
])

export const BriefingInputDocumentSchema = z.object({
	name: z.string().min(1),
	path: z.string().min(1),
	type: BriefingInputDocumentTypeSchema,
	loadedAt: z.string().datetime(),
})

// ============================================
// SESSION SCHEMAS
// ============================================

export const BriefingSessionSchema = z
	.object({
		id: IdSchema,
		userId: IdSchema,

		// Project info (Step 1: Init)
		projectName: z.string().min(1).max(200),
		projectDescription: z.string().max(5000).optional().nullable(),
		inputDocuments: z.array(BriefingInputDocumentSchema),

		// Vision (Step 2)
		problemStatement: z.string().optional().nullable(),
		problemImpact: z.string().optional().nullable(),
		existingSolutionsGaps: z.string().optional().nullable(),
		proposedSolution: z.string().optional().nullable(),
		keyDifferentiators: z.array(z.string()),

		// Users (Step 3)
		primaryUsers: z.array(BriefingPrimaryUserSchema),
		secondaryUsers: z.array(BriefingSecondaryUserSchema),
		userJourneys: z.array(BriefingUserJourneySchema),

		// Metrics (Step 4)
		successMetrics: z.array(BriefingMetricSchema),
		businessObjectives: z.array(z.string()),
		kpis: z.array(BriefingMetricSchema),

		// Scope (Step 5)
		mvpFeatures: z.array(BriefingFeatureSchema),
		outOfScope: z.array(z.string()),
		mvpSuccessCriteria: z.array(z.string()),
		futureVision: z.string().optional().nullable(),

		// Session state
		currentStep: BriefingStepSchema,
		status: BriefingStatusSchema,
		stepsCompleted: z.array(BriefingStepSchema),

		// Final document (Step 6)
		documentContent: z.string().optional().nullable(),
		documentTitle: z.string().optional().nullable(),
		executiveSummary: z.string().optional().nullable(),

		completedAt: z.date().optional().nullable(),
	})
	.merge(TimestampsSchema)

export const CreateBriefingSessionSchema = z.object({
	projectName: z.string().min(1).max(200),
	projectDescription: z.string().max(5000).optional(),
	brainstormSessionId: IdSchema.optional(), // Link opcional a uma sessão de brainstorm
})

export const UpdateBriefingSessionSchema = z.object({
	projectName: z.string().min(1).max(200).optional(),
	projectDescription: z.string().max(5000).optional().nullable(),
	inputDocuments: z.array(BriefingInputDocumentSchema).optional(),

	// Vision
	problemStatement: z.string().optional().nullable(),
	problemImpact: z.string().optional().nullable(),
	existingSolutionsGaps: z.string().optional().nullable(),
	proposedSolution: z.string().optional().nullable(),
	keyDifferentiators: z.array(z.string()).optional(),

	// Users
	primaryUsers: z.array(BriefingPrimaryUserSchema).optional(),
	secondaryUsers: z.array(BriefingSecondaryUserSchema).optional(),
	userJourneys: z.array(BriefingUserJourneySchema).optional(),

	// Metrics
	successMetrics: z.array(BriefingMetricSchema).optional(),
	businessObjectives: z.array(z.string()).optional(),
	kpis: z.array(BriefingMetricSchema).optional(),

	// Scope
	mvpFeatures: z.array(BriefingFeatureSchema).optional(),
	outOfScope: z.array(z.string()).optional(),
	mvpSuccessCriteria: z.array(z.string()).optional(),
	futureVision: z.string().optional().nullable(),

	// State
	currentStep: BriefingStepSchema.optional(),
	status: BriefingStatusSchema.optional(),
	stepsCompleted: z.array(BriefingStepSchema).optional(),

	// Document
	documentContent: z.string().optional().nullable(),
	documentTitle: z.string().optional().nullable(),
	executiveSummary: z.string().optional().nullable(),
})

// ============================================
// MESSAGE SCHEMAS
// ============================================

export const BriefingMessageSchema = z.object({
	id: IdSchema,
	sessionId: IdSchema,
	role: BriefingMessageRoleSchema,
	content: z.string().min(1),
	step: BriefingStepSchema,
	promptTokens: z.number().optional().nullable(),
	completionTokens: z.number().optional().nullable(),
	createdAt: z.date(),
})

// ============================================
// CHAT REQUEST SCHEMA
// ============================================

export const BriefingChatRequestSchema = z.object({
	sessionId: IdSchema,
	message: z.string().min(1).max(10000),
	action: z
		.enum([
			'continue', // Continuar conversa normal
			'advance_step', // Avançar para próximo step
			'advanced_elicitation', // [A] Aprofundar no tópico
			'party_mode', // [P] Múltiplas perspectivas
			'generate_document', // Gerar documento final
			'update_document', // Atualizar documento existente
		])
		.optional(),
})

// ============================================
// DOCUMENT SCHEMAS
// ============================================

export const BriefingDocumentSchema = z.object({
	id: IdSchema,
	sessionId: IdSchema,
	type: BriefingDocumentTypeSchema,
	title: z.string().min(1),
	content: z.string().min(1),
	version: z.number().int().min(1),
	createdAt: z.date(),
	updatedAt: z.date(),
})

export const CreateBriefingDocumentSchema = z.object({
	type: BriefingDocumentTypeSchema.optional(), // Defaults to 'product_brief' if not provided
	title: z.string().min(1).max(200).optional(), // Auto-generated if not provided
})

export const UpdateBriefingDocumentSchema = z.object({
	content: z.string(),
	title: z.string().optional(),
	executiveSummary: z.string().optional(),
})

export const GenerateBriefingDocumentSchema = z.object({
	sessionId: IdSchema,
	type: BriefingDocumentTypeSchema.optional().default('product_brief'),
	regenerate: z.boolean().optional().default(false), // Se true, gera nova versão mesmo que já exista
})

// ============================================
// TYPE EXPORTS
// ============================================

export type BriefingStep = z.infer<typeof BriefingStepSchema>
export type BriefingStatus = z.infer<typeof BriefingStatusSchema>
export type BriefingMessageRole = z.infer<typeof BriefingMessageRoleSchema>
export type BriefingStepInfo = z.infer<typeof BriefingStepInfoSchema>
export type BriefingPrimaryUser = z.infer<typeof BriefingPrimaryUserSchema>
export type BriefingSecondaryUser = z.infer<typeof BriefingSecondaryUserSchema>
export type BriefingUserJourneyStage = z.infer<typeof BriefingUserJourneyStageSchema>
export type BriefingUserJourney = z.infer<typeof BriefingUserJourneySchema>
export type BriefingMetricCategory = z.infer<typeof BriefingMetricCategorySchema>
export type BriefingMetric = z.infer<typeof BriefingMetricSchema>
export type BriefingFeaturePriority = z.infer<typeof BriefingFeaturePrioritySchema>
export type BriefingFeature = z.infer<typeof BriefingFeatureSchema>
export type BriefingInputDocumentType = z.infer<typeof BriefingInputDocumentTypeSchema>
export type BriefingInputDocument = z.infer<typeof BriefingInputDocumentSchema>
export type BriefingSession = z.infer<typeof BriefingSessionSchema>
export type CreateBriefingSession = z.infer<typeof CreateBriefingSessionSchema>
export type UpdateBriefingSession = z.infer<typeof UpdateBriefingSessionSchema>
export type BriefingMessage = z.infer<typeof BriefingMessageSchema>
export type BriefingChatRequest = z.infer<typeof BriefingChatRequestSchema>
export type BriefingDocumentType = z.infer<typeof BriefingDocumentTypeSchema>
export type BriefingDocument = z.infer<typeof BriefingDocumentSchema>
export type CreateBriefingDocument = z.infer<typeof CreateBriefingDocumentSchema>
export type UpdateBriefingDocument = z.infer<typeof UpdateBriefingDocumentSchema>
export type GenerateBriefingDocument = z.infer<typeof GenerateBriefingDocumentSchema>
