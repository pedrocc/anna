import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { Hono } from 'hono'
import * as loggerModule from '../lib/logger.js'
import { verifyClerkWebhook } from './webhook.js'

describe('webhook error logging', () => {
	let app: Hono
	let errorSpy: ReturnType<typeof spyOn>

	beforeEach(() => {
		app = new Hono()
		app.post('/webhook', verifyClerkWebhook, (c) => c.json({ success: true }))
		errorSpy = spyOn(loggerModule.apiLogger, 'error')
	})

	afterEach(() => {
		delete process.env['CLERK_WEBHOOK_SECRET']
		errorSpy.mockRestore()
	})

	it('should log missing webhook secret with Pino', async () => {
		delete process.env['CLERK_WEBHOOK_SECRET']

		const res = await app.request('/webhook', {
			method: 'POST',
			headers: {
				'svix-id': 'msg_test123',
				'svix-timestamp': String(Math.floor(Date.now() / 1000)),
				'svix-signature': 'v1,test',
			},
			body: '{}',
		})

		expect(res.status).toBe(500)
		expect(errorSpy).toHaveBeenCalledWith('CLERK_WEBHOOK_SECRET is not configured')
	})

	it('should not use console.error for missing secret', async () => {
		const consoleSpy = spyOn(console, 'error')
		delete process.env['CLERK_WEBHOOK_SECRET']

		await app.request('/webhook', {
			method: 'POST',
			headers: {
				'svix-id': 'msg_test123',
				'svix-timestamp': String(Math.floor(Date.now() / 1000)),
				'svix-signature': 'v1,test',
			},
			body: '{}',
		})

		expect(consoleSpy).not.toHaveBeenCalled()
		consoleSpy.mockRestore()
	})
})
