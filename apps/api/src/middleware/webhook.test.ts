import { beforeEach, describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { verifyClerkWebhook } from './webhook.js'

describe('verifyClerkWebhook', () => {
	let app: Hono

	beforeEach(() => {
		app = new Hono()
		app.post('/webhook', verifyClerkWebhook, (c) => c.json({ success: true }))
		process.env['CLERK_WEBHOOK_SECRET'] = 'whsec_test_secret_key_for_testing'
	})

	describe('missing headers', () => {
		it('should return 400 when svix-id is missing', async () => {
			const res = await app.request('/webhook', {
				method: 'POST',
				headers: {
					'svix-timestamp': String(Math.floor(Date.now() / 1000)),
					'svix-signature': 'v1,test',
				},
				body: '{}',
			})
			expect(res.status).toBe(400)
			const data = (await res.json()) as { success: boolean; error: { message: string } }
			expect(data.success).toBe(false)
			expect(data.error.message).toBe('Missing webhook verification headers')
		})

		it('should return 400 when svix-timestamp is missing', async () => {
			const res = await app.request('/webhook', {
				method: 'POST',
				headers: {
					'svix-id': 'msg_test123',
					'svix-signature': 'v1,test',
				},
				body: '{}',
			})
			expect(res.status).toBe(400)
			const data = (await res.json()) as { success: boolean; error: { message: string } }
			expect(data.success).toBe(false)
			expect(data.error.message).toBe('Missing webhook verification headers')
		})

		it('should return 400 when svix-signature is missing', async () => {
			const res = await app.request('/webhook', {
				method: 'POST',
				headers: {
					'svix-id': 'msg_test123',
					'svix-timestamp': String(Math.floor(Date.now() / 1000)),
				},
				body: '{}',
			})
			expect(res.status).toBe(400)
			const data = (await res.json()) as { success: boolean; error: { message: string } }
			expect(data.success).toBe(false)
			expect(data.error.message).toBe('Missing webhook verification headers')
		})
	})

	describe('timestamp validation', () => {
		it('should return 400 when timestamp is not a valid number', async () => {
			const res = await app.request('/webhook', {
				method: 'POST',
				headers: {
					'svix-id': 'msg_test123',
					'svix-timestamp': 'not-a-number',
					'svix-signature': 'v1,test',
				},
				body: '{}',
			})
			expect(res.status).toBe(400)
			const data = (await res.json()) as { success: boolean; error: { message: string } }
			expect(data.success).toBe(false)
			expect(data.error.message).toBe('Invalid webhook timestamp')
		})

		it('should return 400 when timestamp is older than 5 minutes', async () => {
			const sixMinutesAgo = Math.floor(Date.now() / 1000) - 6 * 60
			const res = await app.request('/webhook', {
				method: 'POST',
				headers: {
					'svix-id': 'msg_test123',
					'svix-timestamp': String(sixMinutesAgo),
					'svix-signature': 'v1,test',
				},
				body: '{}',
			})
			expect(res.status).toBe(400)
			const data = (await res.json()) as { success: boolean; error: { message: string } }
			expect(data.success).toBe(false)
			expect(data.error.message).toBe('Webhook timestamp too old or in future')
		})

		it('should return 400 when timestamp is more than 5 minutes in the future', async () => {
			const sixMinutesFromNow = Math.floor(Date.now() / 1000) + 6 * 60
			const res = await app.request('/webhook', {
				method: 'POST',
				headers: {
					'svix-id': 'msg_test123',
					'svix-timestamp': String(sixMinutesFromNow),
					'svix-signature': 'v1,test',
				},
				body: '{}',
			})
			expect(res.status).toBe(400)
			const data = (await res.json()) as { success: boolean; error: { message: string } }
			expect(data.success).toBe(false)
			expect(data.error.message).toBe('Webhook timestamp too old or in future')
		})

		it('should accept timestamp within 5 minutes (proceeds to signature verification)', async () => {
			const twoMinutesAgo = Math.floor(Date.now() / 1000) - 2 * 60
			const res = await app.request('/webhook', {
				method: 'POST',
				headers: {
					'svix-id': 'msg_test123',
					'svix-timestamp': String(twoMinutesAgo),
					'svix-signature': 'v1,invalid_sig',
				},
				body: '{}',
			})
			// Passes timestamp check but fails signature verification → 401
			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean; error: { message: string } }
			expect(data.success).toBe(false)
			expect(data.error.message).toBe('Invalid webhook signature')
		})

		it('should accept current timestamp (proceeds to signature verification)', async () => {
			const now = Math.floor(Date.now() / 1000)
			const res = await app.request('/webhook', {
				method: 'POST',
				headers: {
					'svix-id': 'msg_test123',
					'svix-timestamp': String(now),
					'svix-signature': 'v1,invalid_sig',
				},
				body: '{}',
			})
			// Passes timestamp check but fails signature verification → 401
			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean; error: { message: string } }
			expect(data.success).toBe(false)
			expect(data.error.message).toBe('Invalid webhook signature')
		})

		it('should reject timestamp at exactly 5 minutes boundary', async () => {
			// 5 minutes + 1 second to be just past the boundary
			const justPastFiveMinutes = Math.floor(Date.now() / 1000) - 5 * 60 - 1
			const res = await app.request('/webhook', {
				method: 'POST',
				headers: {
					'svix-id': 'msg_test123',
					'svix-timestamp': String(justPastFiveMinutes),
					'svix-signature': 'v1,test',
				},
				body: '{}',
			})
			expect(res.status).toBe(400)
			const data = (await res.json()) as { success: boolean; error: { message: string } }
			expect(data.success).toBe(false)
			expect(data.error.message).toBe('Webhook timestamp too old or in future')
		})
	})

	describe('missing webhook secret', () => {
		it('should return 500 when CLERK_WEBHOOK_SECRET is not configured', async () => {
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
			const data = (await res.json()) as { success: boolean; error: { message: string } }
			expect(data.success).toBe(false)
			expect(data.error.message).toBe('Webhook verification not configured')
		})
	})
})
