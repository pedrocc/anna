import { closeDb } from '@repo/db'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import { timing } from 'hono/timing'
import { apiLogger } from './lib/logger.js'
import { commonErrors } from './lib/response.js'
import { errorHandler } from './middleware/error-handler.js'
import { closeRedis, rateLimiter } from './middleware/rate-limiter.js'
import { requestLogger } from './middleware/request-logger.js'
import { briefingRoutes } from './routes/briefing.js'
import { chatRoutes } from './routes/chat.js'
import { healthRoutes } from './routes/health.js'
import { kanbanRoutes } from './routes/kanban.js'
import { prdRoutes } from './routes/prd.js'
import { smRoutes } from './routes/sm.js'
import { userRoutes } from './routes/users.js'

const app = new Hono()

const webUrl = process.env['WEB_URL'] ?? 'http://localhost:5173'

// Global middleware
app.use('*', requestId())
app.use('*', requestLogger)
app.use('*', timing())
app.use('*', logger())
app.use('*', secureHeaders())
app.use(
	'*',
	cors({
		origin: [webUrl],
		credentials: true,
		allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
	})
)

// Rate limiting
app.use('*', rateLimiter())

// Error handling
app.onError(errorHandler)

// Routes
app.route('/health', healthRoutes)
app.route('/api/v1/users', userRoutes)
app.route('/api/v1/chat', chatRoutes)
app.route('/api/v1/briefing', briefingRoutes)
app.route('/api/v1/prd', prdRoutes)
app.route('/api/v1/sm', smRoutes)
app.route('/api/v1/kanban', kanbanRoutes)

// 404 handler
app.notFound((c) => {
	return commonErrors.notFound(c, 'Route not found')
})

const port = Number(process.env['PORT']) || 3000

// Graceful shutdown handlers
async function gracefulShutdown(signal: string): Promise<void> {
	apiLogger.info({ signal }, 'Graceful shutdown initiated')
	await Promise.all([closeRedis(), closeDb()])
	apiLogger.info('All connections closed')
	process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

export default {
	port,
	fetch: app.fetch,
	development: true,
	idleTimeout: 120, // 2 minutes for SSE streams
}
