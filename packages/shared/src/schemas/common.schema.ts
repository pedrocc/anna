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

// ============================================
// FIELD OPTIONALITY CONVENTION
// ============================================
//
// This project follows a strict convention for field optionality across
// CREATE, UPDATE, and READ schemas:
//
//   CREATE → .optional()
//     Field can be omitted. Server applies defaults or leaves as null in DB.
//     Semantics: "you may provide this, or not"
//
//   UPDATE → .optional().nullable()
//     - undefined (omitted): do NOT change this field
//     - null: explicitly CLEAR this field (set to null in DB)
//     - value: SET to this value
//
//   READ → .nullable()
//     Field is always present in the response, but its value may be null
//     (reflecting the DB state). Never undefined in API responses.
//
// Examples:
//   CREATE: projectDescription: z.string().max(5000).optional()
//   UPDATE: projectDescription: z.string().max(5000).optional().nullable()
//   READ:   projectDescription: z.string().max(5000).nullable()
//

/**
 * Wraps a schema for use in CREATE operations.
 * The field becomes optional (can be omitted).
 *
 * Convention: CREATE = optional
 */
export function forCreate<T extends z.ZodType>(schema: T) {
	return schema.optional()
}

/**
 * Wraps a schema for use in UPDATE operations.
 * The field becomes optional AND nullable:
 * - undefined (omitted) = no change
 * - null = clear the field
 * - value = set to value
 *
 * Convention: UPDATE = optional + nullable
 */
export function forUpdate<T extends z.ZodType>(schema: T) {
	return schema.optional().nullable()
}

/**
 * Wraps a schema for use in READ operations.
 * The field is always present but may be null (DB state).
 *
 * Convention: READ = nullable
 */
export function forRead<T extends z.ZodType>(schema: T) {
	return schema.nullable()
}
