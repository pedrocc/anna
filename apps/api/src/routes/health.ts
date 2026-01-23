import { db } from '@repo/db'
import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { dbLogger } from '../lib/logger.js'

export const healthRoutes = new Hono()

healthRoutes.get('/', (c) => {
	return c.json({
		status: 'ok',
		timestamp: new Date().toISOString(),
	})
})

healthRoutes.get('/ready', async (c) => {
	try {
		await db.execute(sql`SELECT 1`)
		return c.json({ status: 'ready', database: 'connected' })
	} catch (error) {
		dbLogger.error({ err: error }, 'Health check: database connection failed')
		return c.json({ status: 'not ready', database: 'disconnected' }, 503)
	}
})

healthRoutes.get('/live', (c) => {
	return c.json({ status: 'live' })
})
