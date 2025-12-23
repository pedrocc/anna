import { db } from '@repo/db'
import { sql } from 'drizzle-orm'
import { Hono } from 'hono'

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
	} catch {
		return c.json({ status: 'not ready', database: 'disconnected' }, 503)
	}
})

healthRoutes.get('/live', (c) => {
	return c.json({ status: 'live' })
})
