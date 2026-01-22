import type { Context } from 'hono'
import { z } from 'zod'
import { apiLogger } from '../lib/logger.js'

export function errorHandler(err: Error, c: Context) {
	const requestId = c.get('requestId') as string | undefined

	if (err instanceof z.ZodError) {
		return c.json(
			{
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Invalid request data',
					details: err.flatten().fieldErrors,
					requestId,
				},
			},
			400
		)
	}

	// Log unexpected errors with requestId for tracing
	apiLogger.error(
		{
			requestId,
			err,
			path: c.req.path,
			method: c.req.method,
		},
		'Unhandled error'
	)

	return c.json(
		{
			success: false,
			error: {
				code: 'INTERNAL_SERVER_ERROR',
				message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
				requestId,
			},
		},
		500
	)
}
