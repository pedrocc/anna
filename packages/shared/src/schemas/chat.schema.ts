import { z } from 'zod'

export const ChatRoleSchema = z.enum(['system', 'user', 'assistant'])

export const ChatMessageSchema = z.object({
	role: ChatRoleSchema,
	content: z.string().min(1),
})

export const ChatRequestSchema = z.object({
	messages: z.array(ChatMessageSchema).min(1),
	model: z.string().optional(),
	temperature: z.number().min(0).max(2).optional(),
	max_tokens: z.number().min(1).max(128000).optional(),
	stream: z.boolean().optional().default(false),
})

export const ChatCompletionChoiceSchema = z.object({
	index: z.number(),
	message: ChatMessageSchema,
	finish_reason: z.string().nullable(),
})

export const ChatUsageSchema = z.object({
	prompt_tokens: z.number(),
	completion_tokens: z.number(),
	total_tokens: z.number(),
})

export const ChatResponseSchema = z.object({
	id: z.string(),
	model: z.string(),
	choices: z.array(ChatCompletionChoiceSchema),
	usage: ChatUsageSchema,
	created: z.number(),
})

export type ChatRole = z.infer<typeof ChatRoleSchema>
export type ChatMessage = z.infer<typeof ChatMessageSchema>
export type ChatRequest = z.infer<typeof ChatRequestSchema>
export type ChatCompletionChoice = z.infer<typeof ChatCompletionChoiceSchema>
export type ChatUsage = z.infer<typeof ChatUsageSchema>
export type ChatResponse = z.infer<typeof ChatResponseSchema>
