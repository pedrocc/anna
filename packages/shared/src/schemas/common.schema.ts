import { z } from 'zod'

export const IdSchema = z.uuid()

export const PaginationSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const SortSchema = z.object({
	field: z.string(),
	order: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * Create a sort schema with validated field names
 * @param allowedFields - Array of allowed field names for sorting
 */
export function createSortSchema<T extends readonly string[]>(allowedFields: T) {
	return z.object({
		field: z.enum(allowedFields as unknown as [string, ...string[]]),
		order: z.enum(['asc', 'desc']).default('desc'),
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
export type Timestamps = z.infer<typeof TimestampsSchema>
export type ApiResponse<T> = {
	success: true
	data: T
	meta?: { page?: number; limit?: number; total?: number }
}
export type ApiError = z.infer<typeof ApiErrorSchema>

// Generic rename schema
export const RenameSchema = z.object({
	projectName: z.string().min(1).max(255),
})
export type Rename = z.infer<typeof RenameSchema>

// Session rename request schema
export const RenameSessionSchema = z.object({
	projectName: z.string().min(1, 'Project name is required').max(200).trim(),
})
export type RenameSession = z.infer<typeof RenameSessionSchema>
