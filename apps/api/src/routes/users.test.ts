import { beforeEach, describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { userRoutes } from './users.js'

describe('User Routes', () => {
	let app: Hono

	beforeEach(() => {
		app = new Hono()
		app.route('/api/v1/users', userRoutes)
		process.env['CLERK_SECRET_KEY'] = 'test-secret-key'
	})

	describe('GET /api/v1/users/me', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/users/me')
			expect(res.status).toBe(401)

			const data = (await res.json()) as { success: boolean; error: { code: string } }
			expect(data.success).toBe(false)
			expect(data.error.code).toBe('UNAUTHORIZED')
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/users/me', {
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with malformed authorization header', async () => {
			const res = await app.request('/api/v1/users/me', {
				headers: { Authorization: 'InvalidFormat token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	describe('GET /api/v1/users', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/users?page=1&limit=10')
			expect(res.status).toBe(401)

			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 for invalid pagination parameters (auth required first)', async () => {
			const res = await app.request('/api/v1/users?page=invalid&limit=10')
			// Auth middleware runs before validation, so returns 401
			expect(res.status).toBe(401)
		})

		it('should return 401 when missing pagination parameters (auth required first)', async () => {
			const res = await app.request('/api/v1/users')
			// Auth middleware runs before validation, so returns 401
			expect(res.status).toBe(401)
		})
	})

	describe('PATCH /api/v1/users/:id', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/users/123', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Updated Name' }),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 for invalid request body (auth required first)', async () => {
			const res = await app.request('/api/v1/users/123', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ invalidField: 'value' }),
			})

			// Auth middleware runs before validation, so returns 401
			expect(res.status).toBe(401)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/users/123', {
				method: 'PATCH',
				headers: {
					Authorization: 'Bearer invalid-token',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ name: 'Updated Name' }),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	describe('POST /api/v1/users (webhook endpoint)', () => {
		it('should return 400 when webhook headers are missing', async () => {
			// Webhook middleware checks for required headers before body validation
			const res = await app.request('/api/v1/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ invalidField: 'value' }),
			})

			// Returns 400 because webhook headers are missing
			expect(res.status).toBe(400)
			const data = (await res.json()) as { error: { message: string } }
			expect(data.error.message).toBe('Missing webhook verification headers')
		})

		it('should return 401 when webhook signature is invalid', async () => {
			const res = await app.request('/api/v1/users', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'svix-id': 'test-id',
					'svix-timestamp': '1234567890',
					'svix-signature': 'invalid-signature',
				},
				body: JSON.stringify({ clerkId: 'test-id', email: 'test@test.com' }),
			})

			// Webhook signature verification fails
			expect(res.status).toBe(401)
			const data = (await res.json()) as { error: { message: string } }
			expect(data.error.message).toBe('Invalid webhook signature')
		})
	})
})
