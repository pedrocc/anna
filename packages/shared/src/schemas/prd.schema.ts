import { z } from 'zod'
import { IdSchema, TimestampsSchema } from './common.schema.js'

// ============================================
// ENUMS
// ============================================

export const PrdStepSchema = z.enum([
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

export const PrdStatusSchema = z.enum(['active', 'paused', 'completed', 'archived'])

export const PrdGenerationStatusSchema = z.enum(['idle', 'generating', 'completed', 'failed'])

export const PrdMessageRoleSchema = z.enum(['system', 'user', 'assistant'])

export const PrdDocumentTypeSchema = z.enum([
	'prd_full', // PRD completo
	'executive_summary', // Resumo executivo
	'functional_requirements', // Requisitos funcionais
	'nonfunctional_requirements', // Requisitos não-funcionais
	'user_journeys', // Jornadas de usuário
	'mvp_scope', // Escopo MVP
	'custom', // Documento customizado
])

export const PrdProjectTypeSchema = z.enum([
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

export const PrdDomainComplexitySchema = z.enum(['low', 'medium', 'high'])

// ============================================
// STEP METADATA
// ============================================

export const PrdStepInfoSchema = z.object({
	id: PrdStepSchema,
	name: z.string(),
	description: z.string(),
	icon: z.string(),
	order: z.number(),
	optional: z.boolean().optional(),
})

// ============================================
// COMPLEX TYPE SCHEMAS
// ============================================

export const PrdInputDocumentTypeSchema = z.enum([
	'briefing',
	'brainstorm',
	'research',
	'context',
	'other',
])

export const PrdInputDocumentSchema = z.object({
	name: z.string().min(1),
	path: z.string().min(1),
	type: PrdInputDocumentTypeSchema,
	loadedAt: z.string().datetime(),
})

export const PrdSuccessCriteriaTypeSchema = z.enum(['user', 'business', 'technical'])

export const PrdSuccessCriteriaSchema = z.object({
	id: z.string().uuid(),
	type: PrdSuccessCriteriaTypeSchema,
	description: z.string().min(1),
	metric: z.string().optional(),
	target: z.string().optional(),
})

export const PrdPersonaSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	description: z.string().min(1),
	goals: z.array(z.string()),
	painPoints: z.array(z.string()),
	context: z.string().optional(),
})

export const PrdJourneyStageSchema = z.enum([
	'discovery',
	'onboarding',
	'core_usage',
	'success',
	'long_term',
])

export const PrdJourneyStageDetailSchema = z.object({
	stage: PrdJourneyStageSchema,
	description: z.string().min(1),
	touchpoints: z.array(z.string()).optional(),
	emotions: z.string().optional(),
})

export const PrdUserJourneySchema = z.object({
	id: z.string().uuid(),
	personaId: z.string().uuid(),
	personaName: z.string().min(1),
	stages: z.array(PrdJourneyStageDetailSchema),
})

export const PrdDomainConcernPrioritySchema = z.enum(['critical', 'high', 'medium', 'low'])

export const PrdDomainConcernSchema = z.object({
	id: z.string().uuid(),
	category: z.string().min(1),
	concern: z.string().min(1),
	requirement: z.string().optional(),
	priority: PrdDomainConcernPrioritySchema,
})

export const PrdInnovationSchema = z.object({
	id: z.string().uuid(),
	type: z.string().min(1),
	description: z.string().min(1),
	impact: z.string().min(1),
	risks: z.array(z.string()).optional(),
})

export const PrdFeatureScopeSchema = z.enum(['mvp', 'growth', 'vision'])

export const PrdFeaturePrioritySchema = z.enum(['must_have', 'should_have', 'nice_to_have'])

export const PrdFeatureSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	description: z.string().min(1),
	priority: PrdFeaturePrioritySchema,
	scope: PrdFeatureScopeSchema,
	journeyStage: z.string().optional(),
	successCriteriaIds: z.array(z.string().uuid()).optional(),
})

export const PrdRequirementPrioritySchema = z.enum(['critical', 'high', 'medium', 'low'])

export const PrdFunctionalRequirementSchema = z.object({
	id: z.string().uuid(),
	code: z.string().min(1), // FR-001, FR-002, etc.
	name: z.string().min(1),
	description: z.string().min(1),
	category: z.string().min(1),
	priority: PrdRequirementPrioritySchema,
	featureIds: z.array(z.string().uuid()).optional(),
	acceptanceCriteria: z.array(z.string()).optional(),
})

export const PrdNonFunctionalCategorySchema = z.enum([
	'performance',
	'security',
	'reliability',
	'usability',
	'maintainability',
	'compliance',
	'scalability',
])

export const PrdNonFunctionalRequirementSchema = z.object({
	id: z.string().uuid(),
	code: z.string().min(1), // NFR-001, NFR-002, etc.
	category: PrdNonFunctionalCategorySchema,
	name: z.string().min(1),
	description: z.string().min(1),
	metric: z.string().optional(),
	target: z.string().optional(),
	priority: PrdRequirementPrioritySchema,
})

// ============================================
// SESSION SCHEMAS
// ============================================

export const PrdSessionSchema = z
	.object({
		id: IdSchema,
		userId: IdSchema,

		// Project info (Step 1: Init)
		projectName: z.string().min(1).max(200),
		projectDescription: z.string().max(5000).optional().nullable(),
		inputDocuments: z.array(PrdInputDocumentSchema),

		// Classification (Step 2: Discovery)
		projectType: PrdProjectTypeSchema.optional().nullable(),
		domain: z.string().optional().nullable(),
		domainComplexity: PrdDomainComplexitySchema.optional().nullable(),
		executiveSummary: z.string().optional().nullable(),
		differentiators: z.array(z.string()),

		// Success Criteria (Step 3)
		successCriteria: z.array(PrdSuccessCriteriaSchema),

		// User Journeys (Step 4)
		personas: z.array(PrdPersonaSchema),
		userJourneys: z.array(PrdUserJourneySchema),

		// Domain Exploration (Step 5 - optional)
		domainConcerns: z.array(PrdDomainConcernSchema),
		regulatoryRequirements: z.array(z.string()),
		domainExpertise: z.array(z.string()),
		skipDomainStep: z.string().optional().nullable(),

		// Innovation (Step 6 - optional)
		innovations: z.array(PrdInnovationSchema),
		skipInnovationStep: z.string().optional().nullable(),

		// Project Type Deep Dive (Step 7)
		projectTypeDetails: z.record(z.string(), z.unknown()),
		projectTypeQuestions: z.record(z.string(), z.string()),

		// Scoping (Step 8)
		features: z.array(PrdFeatureSchema),
		outOfScope: z.array(z.string()),
		mvpSuccessCriteria: z.array(z.string()),

		// Functional Requirements (Step 9)
		functionalRequirements: z.array(PrdFunctionalRequirementSchema),

		// Non-Functional Requirements (Step 10)
		nonFunctionalRequirements: z.array(PrdNonFunctionalRequirementSchema),

		// Session state
		currentStep: PrdStepSchema,
		status: PrdStatusSchema,
		stepsCompleted: z.array(PrdStepSchema),

		// Generation state (persisted for page reload)
		generationStatus: PrdGenerationStatusSchema,
		generationStartedAt: z.date().optional().nullable(),
		generationError: z.string().optional().nullable(),

		// Final document (Step 11)
		documentContent: z.string().optional().nullable(),
		documentTitle: z.string().optional().nullable(),

		completedAt: z.date().optional().nullable(),
	})
	.merge(TimestampsSchema)

export const CreatePrdSessionSchema = z.object({
	projectName: z.string().min(1).max(200),
	projectDescription: z.string().max(5000).optional(),
	briefingSessionId: IdSchema.optional(), // Opcional - PRD pode ser criado sem briefing
})

export const UpdatePrdSessionSchema = z.object({
	projectName: z.string().min(1).max(200).optional(),
	projectDescription: z.string().max(5000).optional().nullable(),
	inputDocuments: z.array(PrdInputDocumentSchema).optional(),

	// Classification
	projectType: PrdProjectTypeSchema.optional().nullable(),
	domain: z.string().optional().nullable(),
	domainComplexity: PrdDomainComplexitySchema.optional().nullable(),
	executiveSummary: z.string().optional().nullable(),
	differentiators: z.array(z.string()).optional(),

	// Success Criteria
	successCriteria: z.array(PrdSuccessCriteriaSchema).optional(),

	// User Journeys
	personas: z.array(PrdPersonaSchema).optional(),
	userJourneys: z.array(PrdUserJourneySchema).optional(),

	// Domain
	domainConcerns: z.array(PrdDomainConcernSchema).optional(),
	regulatoryRequirements: z.array(z.string()).optional(),
	domainExpertise: z.array(z.string()).optional(),
	skipDomainStep: z.string().optional().nullable(),

	// Innovation
	innovations: z.array(PrdInnovationSchema).optional(),
	skipInnovationStep: z.string().optional().nullable(),

	// Project Type
	projectTypeDetails: z.record(z.string(), z.unknown()).optional(),
	projectTypeQuestions: z.record(z.string(), z.string()).optional(),

	// Scoping
	features: z.array(PrdFeatureSchema).optional(),
	outOfScope: z.array(z.string()).optional(),
	mvpSuccessCriteria: z.array(z.string()).optional(),

	// Requirements
	functionalRequirements: z.array(PrdFunctionalRequirementSchema).optional(),
	nonFunctionalRequirements: z.array(PrdNonFunctionalRequirementSchema).optional(),

	// State
	currentStep: PrdStepSchema.optional(),
	status: PrdStatusSchema.optional(),
	stepsCompleted: z.array(PrdStepSchema).optional(),

	// Document
	documentContent: z.string().optional().nullable(),
	documentTitle: z.string().optional().nullable(),
})

// ============================================
// MESSAGE SCHEMAS
// ============================================

export const PrdMessageSchema = z.object({
	id: IdSchema,
	sessionId: IdSchema,
	role: PrdMessageRoleSchema,
	content: z.string().min(1),
	step: PrdStepSchema,
	promptTokens: z.number().optional().nullable(),
	completionTokens: z.number().optional().nullable(),
	createdAt: z.date(),
})

// ============================================
// CHAT REQUEST SCHEMA
// ============================================

export const PrdChatRequestSchema = z.object({
	sessionId: IdSchema,
	message: z.string().min(1).max(10000),
	action: z
		.enum([
			'continue', // Continuar conversa normal
			'advance_step', // Avançar para próximo step
			'skip_step', // Pular step opcional (domain, innovation)
			'advanced_elicitation', // [A] Aprofundar no tópico
			'party_mode', // [P] Múltiplas perspectivas
			'generate_document', // Gerar documento final
			'update_document', // Atualizar documento existente
		])
		.optional(),
})

export const EditPrdMessageRequestSchema = z.object({
	content: z.string().min(1).max(10000),
})

// ============================================
// DOCUMENT SCHEMAS
// ============================================

export const PrdDocumentSchema = z.object({
	id: IdSchema,
	sessionId: IdSchema,
	type: PrdDocumentTypeSchema,
	title: z.string().min(1),
	content: z.string().min(1),
	version: z.number().int().min(1),
	createdAt: z.date(),
	updatedAt: z.date(),
})

export const CreatePrdDocumentSchema = z.object({
	type: PrdDocumentTypeSchema.optional(), // Defaults to 'prd_full' if not provided
	title: z.string().min(1).max(200).optional(), // Auto-generated if not provided
})

export const UpdatePrdDocumentSchema = z.object({
	content: z.string(),
	title: z.string().optional(),
})

export const GeneratePrdDocumentSchema = z.object({
	sessionId: IdSchema,
	type: PrdDocumentTypeSchema.optional().default('prd_full'),
	regenerate: z.boolean().optional().default(false),
})

// ============================================
// PROJECT TYPE CONFIGURATIONS
// ============================================

export const ProjectTypeConfigSchema = z.object({
	id: PrdProjectTypeSchema,
	name: z.string(),
	detectionSignals: z.array(z.string()),
	keyQuestions: z.array(z.string()),
	requiredSections: z.array(z.string()),
	skipSections: z.array(z.string()),
	innovationSignals: z.array(z.string()),
})

export const DomainConfigSchema = z.object({
	id: z.string(),
	name: z.string(),
	complexity: PrdDomainComplexitySchema,
	signals: z.array(z.string()),
	keyConcerns: z.array(z.string()),
	requiredKnowledge: z.array(z.string()),
	specialSections: z.array(z.string()),
})

// ============================================
// TYPE EXPORTS
// ============================================

export type PrdStep = z.infer<typeof PrdStepSchema>
export type PrdStatus = z.infer<typeof PrdStatusSchema>
export type PrdGenerationStatus = z.infer<typeof PrdGenerationStatusSchema>
export type PrdMessageRole = z.infer<typeof PrdMessageRoleSchema>
export type PrdDocumentType = z.infer<typeof PrdDocumentTypeSchema>
export type PrdProjectType = z.infer<typeof PrdProjectTypeSchema>
export type PrdDomainComplexity = z.infer<typeof PrdDomainComplexitySchema>
export type PrdStepInfo = z.infer<typeof PrdStepInfoSchema>
export type PrdInputDocumentType = z.infer<typeof PrdInputDocumentTypeSchema>
export type PrdInputDocument = z.infer<typeof PrdInputDocumentSchema>
export type PrdSuccessCriteriaType = z.infer<typeof PrdSuccessCriteriaTypeSchema>
export type PrdSuccessCriteria = z.infer<typeof PrdSuccessCriteriaSchema>
export type PrdPersona = z.infer<typeof PrdPersonaSchema>
export type PrdJourneyStage = z.infer<typeof PrdJourneyStageSchema>
export type PrdJourneyStageDetail = z.infer<typeof PrdJourneyStageDetailSchema>
export type PrdUserJourney = z.infer<typeof PrdUserJourneySchema>
export type PrdDomainConcernPriority = z.infer<typeof PrdDomainConcernPrioritySchema>
export type PrdDomainConcern = z.infer<typeof PrdDomainConcernSchema>
export type PrdInnovation = z.infer<typeof PrdInnovationSchema>
export type PrdFeatureScope = z.infer<typeof PrdFeatureScopeSchema>
export type PrdFeaturePriority = z.infer<typeof PrdFeaturePrioritySchema>
export type PrdFeature = z.infer<typeof PrdFeatureSchema>
export type PrdRequirementPriority = z.infer<typeof PrdRequirementPrioritySchema>
export type PrdFunctionalRequirement = z.infer<typeof PrdFunctionalRequirementSchema>
export type PrdNonFunctionalCategory = z.infer<typeof PrdNonFunctionalCategorySchema>
export type PrdNonFunctionalRequirement = z.infer<typeof PrdNonFunctionalRequirementSchema>
export type PrdSession = z.infer<typeof PrdSessionSchema>
export type CreatePrdSession = z.infer<typeof CreatePrdSessionSchema>
export type UpdatePrdSession = z.infer<typeof UpdatePrdSessionSchema>
export type PrdMessage = z.infer<typeof PrdMessageSchema>
export type PrdChatRequest = z.infer<typeof PrdChatRequestSchema>
export type EditPrdMessageRequest = z.infer<typeof EditPrdMessageRequestSchema>
export type PrdDocument = z.infer<typeof PrdDocumentSchema>
export type CreatePrdDocument = z.infer<typeof CreatePrdDocumentSchema>
export type UpdatePrdDocument = z.infer<typeof UpdatePrdDocumentSchema>
export type GeneratePrdDocument = z.infer<typeof GeneratePrdDocumentSchema>
export type ProjectTypeConfig = z.infer<typeof ProjectTypeConfigSchema>
export type DomainConfig = z.infer<typeof DomainConfigSchema>
