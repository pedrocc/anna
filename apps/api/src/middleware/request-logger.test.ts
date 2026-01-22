import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { requestId } from 'hono/request-id'
import type { Logger } from 'pino'
import { getRequestLogger, type RequestLoggerVariables, requestLogger } from './request-logger.js'

describe('requestLogger middleware', () => {
	it('should attach logger with requestId to context', async () => {
		const app = new Hono<{ Variables: RequestLoggerVariables }>()
		app.use('*', requestId())
		app.use('*', requestLogger)

		let loggerRequestId: string | undefined
		let loggerPath: string | undefined
		let loggerMethod: string | undefined

		app.get('/test', (c) => {
			const log = c.get('logger')
			const bindings = log.bindings()
			loggerRequestId = bindings['requestId']
			loggerPath = bindings['path']
			loggerMethod = bindings['method']
			return c.json({ ok: true })
		})

		const res = await app.request('/test')

		expect(res.status).toBe(200)
		expect(loggerRequestId).toBeDefined()
		expect(loggerRequestId).toHaveLength(36) // UUID format
		expect(loggerPath).toBe('/test')
		expect(loggerMethod).toBe('GET')
	})

	it('should use custom X-Request-ID header if provided', async () => {
		const app = new Hono<{ Variables: RequestLoggerVariables }>()
		app.use('*', requestId())
		app.use('*', requestLogger)

		const customRequestId = 'custom-request-id-123'
		let loggerRequestId: string | undefined

		app.get('/test', (c) => {
			const log = c.get('logger')
			loggerRequestId = log.bindings()['requestId']
			return c.json({ ok: true })
		})

		const res = await app.request('/test', {
			headers: { 'X-Request-ID': customRequestId },
		})

		expect(res.status).toBe(200)
		expect(loggerRequestId).toBe(customRequestId)
	})

	it('should propagate requestId through nested route handlers', async () => {
		const app = new Hono<{ Variables: RequestLoggerVariables }>()
		app.use('*', requestId())
		app.use('*', requestLogger)

		const capturedIds: string[] = []

		app.use('/api/*', async (c, next) => {
			const log = c.get('logger')
			capturedIds.push(log.bindings()['requestId'])
			await next()
		})

		app.get('/api/test', (c) => {
			const log = c.get('logger')
			capturedIds.push(log.bindings()['requestId'])
			return c.json({ ok: true })
		})

		await app.request('/api/test')

		expect(capturedIds).toHaveLength(2)
		expect(capturedIds[0]).toBe(capturedIds[1])
	})
})

describe('getRequestLogger helper', () => {
	it('should return the logger from context', async () => {
		const app = new Hono<{ Variables: RequestLoggerVariables }>()
		app.use('*', requestId())
		app.use('*', requestLogger)

		let loggerFromHelper: Logger | undefined

		app.get('/test', (c) => {
			loggerFromHelper = getRequestLogger(c)
			return c.json({ ok: true })
		})

		await app.request('/test')

		expect(loggerFromHelper).toBeDefined()
		expect(loggerFromHelper?.bindings()['requestId']).toBeDefined()
	})

	it('should return root logger when middleware is not applied', async () => {
		const app = new Hono()
		// No requestLogger middleware applied

		let loggerFromHelper: Logger | undefined

		app.get('/test', (c) => {
			loggerFromHelper = getRequestLogger(c)
			return c.json({ ok: true })
		})

		await app.request('/test')

		expect(loggerFromHelper).toBeDefined()
		// Root logger should not have requestId binding
		expect(loggerFromHelper?.bindings()['requestId']).toBeUndefined()
	})
})
