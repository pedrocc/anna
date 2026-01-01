import { z } from 'zod'
import { IdSchema, TimestampsSchema } from './common.schema.js'

// ============================================
// ENUMS
// ============================================

export const SmStepSchema = z.enum([
	'init', // Step 1: Inicializacao e carregamento de PRD
	'epics', // Step 2: Definicao de epics
	'stories', // Step 3: Criacao de user stories
	'details', // Step 4: Detalhamento de AC e tasks
	'planning', // Step 5: Sprint planning e priorizacao
	'review', // Step 6: Revisao e validacao
	'complete', // Step 7: Conclusao
])

export const SmStatusSchema = z.enum(['active', 'paused', 'completed', 'archived'])

export const SmMessageRoleSchema = z.enum(['system', 'user', 'assistant'])

export const SmDocumentTypeSchema = z.enum([
	'sprint_backlog',
	'epic_document',
	'story_document',
	'sprint_planning',
	'full_planning',
	'custom',
])

export const SmEpicStatusSchema = z.enum(['backlog', 'in_progress', 'done'])

export const SmStoryStatusSchema = z.enum([
	'backlog',
	'ready_for_dev',
	'in_progress',
	'review',
	'done',
])

export const SmStoryPrioritySchema = z.enum(['critical', 'high', 'medium', 'low'])

// ============================================
// STEP METADATA
// ============================================

export const SmStepInfoSchema = z.object({
	id: SmStepSchema,
	name: z.string(),
	description: z.string(),
	icon: z.string(),
	order: z.number(),
	optional: z.boolean().optional(),
})

// ============================================
// COMPLEX TYPE SCHEMAS
// ============================================

export const SmAcceptanceCriteriaTypeSchema = z.enum(['given_when_then', 'simple'])

export const SmAcceptanceCriteriaSchema = z.object({
	id: z.string().uuid(),
	description: z.string().min(1),
	type: SmAcceptanceCriteriaTypeSchema,
	given: z.string().optional(),
	when: z.string().optional(),
	thenClause: z.string().optional(),
})

export const SmTaskSchema = z.object({
	id: z.string().uuid(),
	description: z.string().min(1),
	estimatedHours: z.number().optional(),
	acceptanceCriteriaIds: z.array(z.string().uuid()).optional(),
	completed: z.boolean(),
})

export const SmDevNotesSchema = z.object({
	architecturePatterns: z.array(z.string()).optional(),
	componentsToTouch: z.array(z.string()).optional(),
	testingRequirements: z.array(z.string()).optional(),
	securityConsiderations: z.array(z.string()).optional(),
	performanceNotes: z.array(z.string()).optional(),
	references: z.array(z.string()).optional(),
})

export const SmSprintConfigSchema = z.object({
	sprintDuration: z.number().int().min(1).max(30),
	velocityEstimate: z.number().int().optional(),
	startDate: z.string().optional(),
	teamSize: z.number().int().optional(),
})

export const SmPrdContextSchema = z.object({
	projectType: z.string().optional().nullable(),
	domain: z.string().optional().nullable(),
	executiveSummary: z.string().optional().nullable(),
	features: z
		.array(
			z.object({
				id: z.string(),
				name: z.string(),
				description: z.string(),
				priority: z.string(),
				scope: z.string(),
			})
		)
		.optional(),
	functionalRequirements: z
		.array(
			z.object({
				id: z.string(),
				code: z.string(),
				name: z.string(),
				description: z.string(),
				category: z.string(),
				priority: z.string(),
				acceptanceCriteria: z.array(z.string()).optional(),
			})
		)
		.optional(),
	nonFunctionalRequirements: z
		.array(
			z.object({
				id: z.string(),
				code: z.string(),
				category: z.string(),
				name: z.string(),
				description: z.string(),
				priority: z.string(),
			})
		)
		.optional(),
	personas: z
		.array(
			z.object({
				id: z.string(),
				name: z.string(),
				description: z.string(),
			})
		)
		.optional(),
})

// ============================================
// EPIC SCHEMAS
// ============================================

export const SmEpicSchema = z.object({
	id: IdSchema,
	sessionId: IdSchema,
	number: z.number().int().min(1),
	title: z.string().min(1),
	description: z.string().min(1),
	businessValue: z.string().optional().nullable(),
	featureIds: z.array(z.string()),
	functionalRequirementCodes: z.array(z.string()),
	status: SmEpicStatusSchema,
	priority: SmStoryPrioritySchema,
	targetSprint: z.number().int().optional().nullable(),
	estimatedStoryPoints: z.number().int().optional().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
})

export const CreateSmEpicSchema = z.object({
	number: z.number().int().min(1),
	title: z.string().min(1).max(200),
	description: z.string().min(1).max(2000),
	businessValue: z.string().max(1000).optional(),
	featureIds: z.array(z.string()).optional(),
	functionalRequirementCodes: z.array(z.string()).optional(),
	priority: SmStoryPrioritySchema.optional(),
	targetSprint: z.number().int().optional(),
	estimatedStoryPoints: z.number().int().optional(),
})

export const UpdateSmEpicSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().min(1).max(2000).optional(),
	businessValue: z.string().max(1000).optional().nullable(),
	featureIds: z.array(z.string()).optional(),
	functionalRequirementCodes: z.array(z.string()).optional(),
	status: SmEpicStatusSchema.optional(),
	priority: SmStoryPrioritySchema.optional(),
	targetSprint: z.number().int().optional().nullable(),
	estimatedStoryPoints: z.number().int().optional().nullable(),
})

// ============================================
// STORY SCHEMAS
// ============================================

export const SmStorySchema = z.object({
	id: IdSchema,
	sessionId: IdSchema,
	epicId: IdSchema,
	epicNumber: z.number().int(),
	storyNumber: z.number().int(),
	storyKey: z.string(),
	title: z.string(),
	asA: z.string(),
	iWant: z.string(),
	soThat: z.string(),
	description: z.string().optional().nullable(),
	acceptanceCriteria: z.array(SmAcceptanceCriteriaSchema),
	tasks: z.array(SmTaskSchema),
	devNotes: SmDevNotesSchema,
	status: SmStoryStatusSchema,
	priority: SmStoryPrioritySchema,
	storyPoints: z.number().int().optional().nullable(),
	targetSprint: z.number().int().optional().nullable(),
	functionalRequirementCodes: z.array(z.string()),
	createdAt: z.date(),
	updatedAt: z.date(),
})

export const CreateSmStorySchema = z.object({
	epicId: IdSchema,
	epicNumber: z.number().int().min(1),
	storyNumber: z.number().int().min(1),
	title: z.string().min(1).max(200),
	asA: z.string().min(1).max(200),
	iWant: z.string().min(1).max(500),
	soThat: z.string().min(1).max(500),
	description: z.string().max(5000).optional(),
	acceptanceCriteria: z.array(SmAcceptanceCriteriaSchema).optional(),
	tasks: z.array(SmTaskSchema).optional(),
	devNotes: SmDevNotesSchema.optional(),
	priority: SmStoryPrioritySchema.optional(),
	storyPoints: z.number().int().optional(),
	targetSprint: z.number().int().optional(),
	functionalRequirementCodes: z.array(z.string()).optional(),
})

export const UpdateSmStorySchema = z.object({
	title: z.string().min(1).max(200).optional(),
	asA: z.string().min(1).max(200).optional(),
	iWant: z.string().min(1).max(500).optional(),
	soThat: z.string().min(1).max(500).optional(),
	description: z.string().max(5000).optional().nullable(),
	acceptanceCriteria: z.array(SmAcceptanceCriteriaSchema).optional(),
	tasks: z.array(SmTaskSchema).optional(),
	devNotes: SmDevNotesSchema.optional(),
	status: SmStoryStatusSchema.optional(),
	priority: SmStoryPrioritySchema.optional(),
	storyPoints: z.number().int().optional().nullable(),
	targetSprint: z.number().int().optional().nullable(),
	functionalRequirementCodes: z.array(z.string()).optional(),
})

// ============================================
// SESSION SCHEMAS
// ============================================

export const SmSessionSchema = z
	.object({
		id: IdSchema,
		userId: IdSchema,
		prdSessionId: IdSchema.optional().nullable(),
		projectName: z.string().min(1).max(200),
		projectDescription: z.string().max(5000).optional().nullable(),
		prdContext: SmPrdContextSchema,
		sprintConfig: SmSprintConfigSchema,
		currentStep: SmStepSchema,
		status: SmStatusSchema,
		stepsCompleted: z.array(SmStepSchema),
		totalEpics: z.number().int(),
		totalStories: z.number().int(),
		totalStoryPoints: z.number().int(),
		documentContent: z.string().optional().nullable(),
		documentTitle: z.string().optional().nullable(),
		completedAt: z.date().optional().nullable(),
	})
	.merge(TimestampsSchema)

export const CreateSmSessionSchema = z.object({
	projectName: z.string().min(1).max(200),
	projectDescription: z.string().max(5000).optional(),
	prdSessionId: IdSchema.optional(), // Link to PRD session
	sprintConfig: SmSprintConfigSchema.optional(),
})

export const UpdateSmSessionSchema = z.object({
	projectName: z.string().min(1).max(200).optional(),
	projectDescription: z.string().max(5000).optional().nullable(),
	prdContext: SmPrdContextSchema.optional(),
	sprintConfig: SmSprintConfigSchema.optional(),
	currentStep: SmStepSchema.optional(),
	status: SmStatusSchema.optional(),
	stepsCompleted: z.array(SmStepSchema).optional(),
	totalEpics: z.number().int().optional(),
	totalStories: z.number().int().optional(),
	totalStoryPoints: z.number().int().optional(),
	documentContent: z.string().optional().nullable(),
	documentTitle: z.string().optional().nullable(),
})

// ============================================
// MESSAGE SCHEMAS
// ============================================

export const SmMessageSchema = z.object({
	id: IdSchema,
	sessionId: IdSchema,
	role: SmMessageRoleSchema,
	content: z.string().min(1),
	step: SmStepSchema,
	promptTokens: z.number().optional().nullable(),
	completionTokens: z.number().optional().nullable(),
	createdAt: z.date(),
})

// ============================================
// CHAT REQUEST SCHEMA
// ============================================

export const SmChatRequestSchema = z.object({
	sessionId: IdSchema,
	message: z.string().min(1).max(10000),
	action: z
		.enum([
			'continue', // Continuar conversa normal
			'advance_step', // Avancar para proximo step
			'create_epic', // Criar epic
			'create_story', // Criar story
			'advanced_elicitation', // [A] Aprofundar
			'party_mode', // [P] Multiplas perspectivas
			'generate_document', // Gerar documento final
		])
		.optional(),
})

// ============================================
// DOCUMENT SCHEMAS
// ============================================

export const SmDocumentSchema = z.object({
	id: IdSchema,
	sessionId: IdSchema,
	type: SmDocumentTypeSchema,
	title: z.string().min(1),
	content: z.string().min(1),
	version: z.number().int().min(1),
	createdAt: z.date(),
	updatedAt: z.date(),
})

export const CreateSmDocumentSchema = z.object({
	type: SmDocumentTypeSchema.optional(),
	title: z.string().min(1).max(200).optional(),
})

export const UpdateSmDocumentSchema = z.object({
	content: z.string(),
	title: z.string().optional(),
})

// ============================================
// TYPE EXPORTS
// ============================================

export type SmStep = z.infer<typeof SmStepSchema>
export type SmStatus = z.infer<typeof SmStatusSchema>
export type SmMessageRole = z.infer<typeof SmMessageRoleSchema>
export type SmDocumentType = z.infer<typeof SmDocumentTypeSchema>
export type SmEpicStatus = z.infer<typeof SmEpicStatusSchema>
export type SmStoryStatus = z.infer<typeof SmStoryStatusSchema>
export type SmStoryPriority = z.infer<typeof SmStoryPrioritySchema>
export type SmStepInfo = z.infer<typeof SmStepInfoSchema>
export type SmAcceptanceCriteriaType = z.infer<typeof SmAcceptanceCriteriaTypeSchema>
export type SmAcceptanceCriteria = z.infer<typeof SmAcceptanceCriteriaSchema>
export type SmTask = z.infer<typeof SmTaskSchema>
export type SmDevNotes = z.infer<typeof SmDevNotesSchema>
export type SmSprintConfig = z.infer<typeof SmSprintConfigSchema>
export type SmPrdContext = z.infer<typeof SmPrdContextSchema>
export type SmEpic = z.infer<typeof SmEpicSchema>
export type CreateSmEpic = z.infer<typeof CreateSmEpicSchema>
export type UpdateSmEpic = z.infer<typeof UpdateSmEpicSchema>
export type SmStory = z.infer<typeof SmStorySchema>
export type CreateSmStory = z.infer<typeof CreateSmStorySchema>
export type UpdateSmStory = z.infer<typeof UpdateSmStorySchema>
export type SmSession = z.infer<typeof SmSessionSchema>
export type CreateSmSession = z.infer<typeof CreateSmSessionSchema>
export type UpdateSmSession = z.infer<typeof UpdateSmSessionSchema>
export type SmMessage = z.infer<typeof SmMessageSchema>
export type SmChatRequest = z.infer<typeof SmChatRequestSchema>
export type SmDocument = z.infer<typeof SmDocumentSchema>
export type CreateSmDocument = z.infer<typeof CreateSmDocumentSchema>
export type UpdateSmDocument = z.infer<typeof UpdateSmDocumentSchema>
