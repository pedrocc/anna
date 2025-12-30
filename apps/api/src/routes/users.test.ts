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

	describe('POST /api/v1/users', () => {
		it('should return 400 for invalid request body', async () => {
			const res = await app.request('/api/v1/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ invalidField: 'value' }),
			})

			expect(res.status).toBe(400)
		})

		it('should return 400 when missing required fields', async () => {
			const res = await app.request('/api/v1/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ clerkId: 'test-id' }),
			})

			expect(res.status).toBe(400)
		})
	})
})
