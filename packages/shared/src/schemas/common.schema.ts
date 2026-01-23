import { z } from 'zod'

export const IdSchema = z.uuid()

export const PaginationSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const SortOrderSchema = z.enum(['asc', 'desc'])

export const SortSchema = z.object({
	field: z.string(),
	order: SortOrderSchema.default('desc'),
})

/**
 * Create a sort schema with validated field names
 * @param allowedFields - Array of allowed field names for sorting
 */
export function createSortSchema<const T extends readonly [string, ...string[]]>(allowedFields: T) {
	return z.object({
		sortBy: z.enum(allowedFields).optional(),
		order: SortOrderSchema.default('desc'),
	})
}

export const TimestampsSchema = z.object({
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
})

export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
	z.object({
		success: z.boolean(),
		data: dataSchema,
		meta: z
			.object({
				page: z.number().optional(),
				limit: z.number().optional(),
				total: z.number().optional(),
			})
			.optional(),
	})

export const ApiErrorSchema = z.object({
	success: z.literal(false),
	error: z.object({
		code: z.string(),
		message: z.string(),
		details: z.record(z.string(), z.unknown()).optional(),
	}),
})

export type Id = z.infer<typeof IdSchema>
export type Pagination = z.infer<typeof PaginationSchema>
export type Sort = z.infer<typeof SortSchema>
export type SortOrder = z.infer<typeof SortOrderSchema>
export type Timestamps = z.infer<typeof TimestampsSchema>
export type ApiResponse<T> = {
	success: true
	data: T
	meta?: { page?: number; limit?: number; total?: number }
}
export type ApiError = z.infer<typeof ApiErrorSchema>

export const HttpUrlSchema = z
	.url()
	.refine((url) => url.startsWith('https://') || url.startsWith('http://'), {
		message: 'URL must use http or https protocol',
	})

// Generic rename schema
export const RenameSchema = z.object({
	projectName: z.string().min(1).max(255),
})
export type Rename = z.infer<typeof RenameSchema>

// Session ID param schema for route validation
export const SessionIdParamSchema = z.object({
	id: z.string().uuid('Invalid session ID'),
})
export type SessionIdParam = z.infer<typeof SessionIdParamSchema>

// Session rename request schema
export const RenameSessionSchema = z.object({
	projectName: z.string().min(1, 'Project name is required').max(200).trim(),
})
export type RenameSession = z.infer<typeof RenameSessionSchema>

// Generation error stored as JSONB
export const GenerationErrorSchema = z.object({
	message: z.string(),
	code: z.string(),
	status: z.number().int().optional(),
})
export type GenerationError = z.infer<typeof GenerationErrorSchema>
