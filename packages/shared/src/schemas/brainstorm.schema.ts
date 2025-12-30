import { z } from 'zod'
import { IdSchema, TimestampsSchema } from './common.schema.js'

// ============================================
// ENUMS
// ============================================

export const BrainstormStepSchema = z.enum(['setup', 'technique', 'execution', 'document'])

export const BrainstormApproachSchema = z.enum([
	'ai_recommended',
	'user_selected',
	'quick_session',
	'comprehensive',
])

export const BrainstormStatusSchema = z.enum(['active', 'paused', 'completed', 'archived'])

export const BrainstormTechniqueSchema = z.enum([
	'scamper',
	'what_if',
	'six_hats',
	'five_whys',
	'mind_mapping',
	'analogical',
	'first_principles',
	'yes_and',
	'future_self',
	'reversal',
])

export const BrainstormMessageRoleSchema = z.enum(['system', 'user', 'assistant'])

// ============================================
// TECHNIQUE METADATA
// ============================================

export const TechniqueInfoSchema = z.object({
	id: BrainstormTechniqueSchema,
	name: z.string(),
	description: z.string(),
	icon: z.string(),
	estimatedMinutes: z.number(),
})

// ============================================
// IDEA SCHEMA
// ============================================

export const BrainstormIdeaSchema = z.object({
	id: z.string().uuid(),
	content: z.string().min(1),
	technique: BrainstormTechniqueSchema,
	category: z.string().optional(),
	priority: z.enum(['high', 'medium', 'low']).optional(),
	createdAt: z.string().datetime(),
})

// ============================================
// SESSION SCHEMAS
// ============================================

export const BrainstormSessionSchema = z
	.object({
		id: IdSchema,
		userId: IdSchema,
		projectName: z.string().min(1).max(200),
		projectDescription: z.string().max(5000).optional().nullable(),
		goals: z.array(z.string()).optional().nullable(),
		approach: BrainstormApproachSchema,
		currentStep: BrainstormStepSchema,
		status: BrainstormStatusSchema,
		selectedTechniques: z.array(BrainstormTechniqueSchema),
		currentTechniqueIndex: z.number().int().min(0),
		ideas: z.array(BrainstormIdeaSchema),
		documentContent: z.string().optional().nullable(),
		documentTitle: z.string().optional().nullable(),
		completedAt: z.date().optional().nullable(),
	})
	.merge(TimestampsSchema)

export const CreateBrainstormSessionSchema = z.object({
	projectName: z.string().min(1).max(200),
	projectDescription: z.string().max(5000).optional(),
})

export const UpdateBrainstormSessionSchema = z.object({
	projectName: z.string().min(1).max(200).optional(),
	projectDescription: z.string().max(5000).optional().nullable(),
	goals: z.array(z.string()).optional().nullable(),
	approach: BrainstormApproachSchema.optional(),
	currentStep: BrainstormStepSchema.optional(),
	status: BrainstormStatusSchema.optional(),
	selectedTechniques: z.array(BrainstormTechniqueSchema).optional(),
	currentTechniqueIndex: z.number().int().min(0).optional(),
	ideas: z.array(BrainstormIdeaSchema).optional(),
	documentContent: z.string().optional().nullable(),
	documentTitle: z.string().optional().nullable(),
})

// ============================================
// MESSAGE SCHEMAS
// ============================================

export const BrainstormMessageSchema = z.object({
	id: IdSchema,
	sessionId: IdSchema,
	role: BrainstormMessageRoleSchema,
	content: z.string().min(1),
	step: BrainstormStepSchema,
	technique: BrainstormTechniqueSchema.optional().nullable(),
	promptTokens: z.number().optional().nullable(),
	completionTokens: z.number().optional().nullable(),
	createdAt: z.date(),
})

// ============================================
// CHAT REQUEST SCHEMA
// ============================================

export const BrainstormChatRequestSchema = z.object({
	sessionId: IdSchema,
	message: z.string().min(1).max(10000),
	action: z
		.enum([
			'continue',
			'select_approach',
			'confirm_techniques',
			'add_idea',
			'next_technique',
			'generate_document',
			'update_document',
		])
		.optional(),
})

// ============================================
// DOCUMENT SCHEMAS
// ============================================

export const UpdateDocumentSchema = z.object({
	content: z.string(),
	title: z.string().optional(),
})

export const GenerateDocumentSchema = z.object({
	sessionId: IdSchema,
})

// ============================================
// TYPE EXPORTS
// ============================================

export type BrainstormStep = z.infer<typeof BrainstormStepSchema>
export type BrainstormApproach = z.infer<typeof BrainstormApproachSchema>
export type BrainstormStatus = z.infer<typeof BrainstormStatusSchema>
export type BrainstormTechnique = z.infer<typeof BrainstormTechniqueSchema>
export type BrainstormMessageRole = z.infer<typeof BrainstormMessageRoleSchema>
export type TechniqueInfo = z.infer<typeof TechniqueInfoSchema>
export type BrainstormIdea = z.infer<typeof BrainstormIdeaSchema>
export type BrainstormSession = z.infer<typeof BrainstormSessionSchema>
export type CreateBrainstormSession = z.infer<typeof CreateBrainstormSessionSchema>
export type UpdateBrainstormSession = z.infer<typeof UpdateBrainstormSessionSchema>
export type BrainstormMessage = z.infer<typeof BrainstormMessageSchema>
export type BrainstormChatRequest = z.infer<typeof BrainstormChatRequestSchema>
export type UpdateDocument = z.infer<typeof UpdateDocumentSchema>
export type GenerateDocument = z.infer<typeof GenerateDocumentSchema>
