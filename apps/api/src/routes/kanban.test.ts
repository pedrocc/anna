import { beforeEach, describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { kanbanRoutes } from './kanban.js'

describe('Kanban Routes', () => {
	let app: Hono

	beforeEach(() => {
		app = new Hono()
		app.route('/api/v1/kanban', kanbanRoutes)
		process.env['CLERK_SECRET_KEY'] = 'test-secret-key'
	})

	describe('GET /api/v1/kanban/sessions', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/kanban/sessions?page=1&limit=10')
			expect(res.status).toBe(401)

			const data = (await res.json()) as { success: boolean; error: { code: string } }
			expect(data.success).toBe(false)
			expect(data.error.code).toBe('UNAUTHORIZED')
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/kanban/sessions?page=1&limit=10', {
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with malformed authorization header', async () => {
			const res = await app.request('/api/v1/kanban/sessions?page=1&limit=10', {
				headers: { Authorization: 'InvalidFormat token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 for invalid pagination parameters (auth required first)', async () => {
			const res = await app.request('/api/v1/kanban/sessions?page=invalid&limit=10')
			// Auth middleware runs before validation, so returns 401
			expect(res.status).toBe(401)
		})

		it('should return 401 when missing pagination parameters (auth required first)', async () => {
			const res = await app.request('/api/v1/kanban/sessions')
			// Auth middleware runs before validation, so returns 401
			expect(res.status).toBe(401)
		})
	})

	describe('GET /api/v1/kanban/sessions/:id/board', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/kanban/sessions/test-session-id/board')
			expect(res.status).toBe(401)

			const data = (await res.json()) as { success: boolean; error: { code: string } }
			expect(data.success).toBe(false)
			expect(data.error.code).toBe('UNAUTHORIZED')
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/kanban/sessions/test-session-id/board', {
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with malformed authorization header', async () => {
			const res = await app.request('/api/v1/kanban/sessions/test-session-id/board', {
				headers: { Authorization: 'InvalidFormat token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 for different session id formats (auth required first)', async () => {
			// UUID format
			const res1 = await app.request(
				'/api/v1/kanban/sessions/550e8400-e29b-41d4-a716-446655440000/board'
			)
			expect(res1.status).toBe(401)

			// Short ID format
			const res2 = await app.request('/api/v1/kanban/sessions/abc123/board')
			expect(res2.status).toBe(401)
		})
	})
})
