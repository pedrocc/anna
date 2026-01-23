import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { Hono } from 'hono'
import * as loggerModule from '../lib/logger.js'

// Mock db to simulate connection failure
mock.module('@repo/db', () => ({
	db: {
		execute: () => {
			throw new Error('Connection refused')
		},
	},
}))

// Re-import after mocking
const { healthRoutes } = await import('./health.js')

describe('health route error logging', () => {
	let app: Hono
	let errorSpy: ReturnType<typeof spyOn>

	beforeEach(() => {
		app = new Hono()
		app.route('/health', healthRoutes)
		errorSpy = spyOn(loggerModule.dbLogger, 'error')
	})

	afterEach(() => {
		errorSpy.mockRestore()
	})

	it('should log database connection errors with Pino', async () => {
		const res = await app.request('/health/ready')

		expect(res.status).toBe(503)
		const body = (await res.json()) as { status: string; database: string }
		expect(body.status).toBe('not ready')
		expect(body.database).toBe('disconnected')
		expect(errorSpy).toHaveBeenCalled()
	})

	it('should include error details in the log', async () => {
		await app.request('/health/ready')

		expect(errorSpy).toHaveBeenCalledWith(
			expect.objectContaining({ err: expect.any(Error) }),
			expect.stringContaining('database connection failed')
		)
	})

	it('should not use console.error', async () => {
		const consoleSpy = spyOn(console, 'error')

		await app.request('/health/ready')

		expect(consoleSpy).not.toHaveBeenCalled()
		consoleSpy.mockRestore()
	})
})
