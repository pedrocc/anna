import type { Context } from 'hono'

export type ApiSuccessResponse<T> = {
	success: true
	data: T
	meta?: {
		page?: number
		limit?: number
		total?: number
		[key: string]: unknown
	}
}

export type ApiErrorResponse = {
	success: false
	error: {
		code: string
		message: string
		details?: unknown
	}
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Helper function to send a standardized success response
 */
export function successResponse<T>(
	c: Context,
	data: T,
	status = 200,
	meta?: ApiSuccessResponse<T>['meta']
) {
	const response: ApiSuccessResponse<T> = {
		success: true,
		data,
	}

	if (meta) {
		response.meta = meta
	}

	return c.json(response, status as never)
}

/**
 * Helper function to send a standardized error response
 */
export function errorResponse(
	c: Context,
	code: string,
	message: string,
	status = 400,
	details?: unknown
) {
	const response: ApiErrorResponse = {
		success: false,
		error: {
			code,
			message,
		},
	}

	if (details) {
		response.error.details = details
	}

	return c.json(response, status as never)
}

/**
 * Common error responses
 */
export const commonErrors = {
	notFound: (c: Context, message = 'Resource not found') =>
		errorResponse(c, 'NOT_FOUND', message, 404),

	unauthorized: (c: Context, message = 'Unauthorized') =>
		errorResponse(c, 'UNAUTHORIZED', message, 401),

	forbidden: (c: Context, message = 'Forbidden') => errorResponse(c, 'FORBIDDEN', message, 403),

	badRequest: (c: Context, message = 'Bad request', details?: unknown) =>
		errorResponse(c, 'BAD_REQUEST', message, 400, details),

	conflict: (c: Context, message = 'Conflict') => errorResponse(c, 'CONFLICT', message, 409),

	internalError: (c: Context, message = 'Internal server error') =>
		errorResponse(c, 'INTERNAL_ERROR', message, 500),

	validationError: (c: Context, details: unknown) =>
		errorResponse(c, 'VALIDATION_ERROR', 'Validation failed', 400, details),
}
