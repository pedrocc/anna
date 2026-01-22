import { createMiddleware } from 'hono/factory'
import type { RequestIdVariables } from 'hono/request-id'
import type { Logger } from 'pino'
import { logger as rootLogger } from '../lib/logger.js'

export type RequestLoggerVariables = RequestIdVariables & {
	logger: Logger
}

/**
 * Middleware that creates a child Pino logger with requestId context.
 * Must be used AFTER the requestId() middleware.
 *
 * Usage:
 *   const log = c.get('logger')
 *   log.info({ userId }, 'User logged in')
 */
export const requestLogger = createMiddleware<{ Variables: RequestLoggerVariables }>(
	async (c, next) => {
		const requestId = c.get('requestId')

		const log = rootLogger.child({
			requestId,
			path: c.req.path,
			method: c.req.method,
		})

		c.set('logger', log)

		await next()
	}
)

/**
 * Helper to get the request-scoped logger from context.
 * Falls back to root logger if middleware wasn't applied.
 */
export function getRequestLogger(c: { get: (key: 'logger') => Logger | undefined }): Logger {
	return c.get('logger') ?? rootLogger
}
