import type { Context } from 'hono'
import { z } from 'zod'

export function errorHandler(err: Error, c: Context) {
	if (err instanceof z.ZodError) {
		return c.json(
			{
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Invalid request data',
					details: err.flatten().fieldErrors,
				},
			},
			400
		)
	}

	return c.json(
		{
			success: false,
			error: {
				code: 'INTERNAL_SERVER_ERROR',
				message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
			},
		},
		500
	)
}
