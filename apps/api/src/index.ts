import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import { timing } from 'hono/timing'

import { errorHandler } from './middleware/error-handler.js'
import { rateLimiter } from './middleware/rate-limiter.js'
import { healthRoutes } from './routes/health.js'
import { userRoutes } from './routes/users.js'

const app = new Hono()

const webUrl = process.env['WEB_URL'] ?? 'http://localhost:5173'

// Global middleware
app.use('*', requestId())
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

// 404 handler
app.notFound((c) => {
	return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404)
})

const port = Number(process.env['PORT']) || 3000

export default {
	port,
	fetch: app.fetch,
}
