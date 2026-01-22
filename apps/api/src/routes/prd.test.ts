import { beforeEach, describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { prdRoutes } from './prd.js'

describe('PRD Routes', () => {
	let app: Hono

	beforeEach(() => {
		app = new Hono()
		app.route('/api/v1/prd', prdRoutes)
		process.env['CLERK_SECRET_KEY'] = 'test-secret-key'
	})

	// ============================================
	// SESSION CRUD ENDPOINTS
	// ============================================

	describe('GET /api/v1/prd/sessions', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/prd/sessions?page=1&limit=10')
			expect(res.status).toBe(401)

			const data = (await res.json()) as { success: boolean; error: { code: string } }
			expect(data.success).toBe(false)
			expect(data.error.code).toBe('UNAUTHORIZED')
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/prd/sessions?page=1&limit=10', {
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 for invalid pagination parameters (auth required first)', async () => {
			const res = await app.request('/api/v1/prd/sessions?page=invalid&limit=10')
			expect(res.status).toBe(401)
		})

		it('should return 401 when missing pagination parameters (auth required first)', async () => {
			const res = await app.request('/api/v1/prd/sessions')
			expect(res.status).toBe(401)
		})
	})

	describe('GET /api/v1/prd/sessions/:id', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/prd/sessions/test-session-id')
			expect(res.status).toBe(401)

			const data = (await res.json()) as { success: boolean; error: { code: string } }
			expect(data.success).toBe(false)
			expect(data.error.code).toBe('UNAUTHORIZED')
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/prd/sessions/test-session-id', {
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	describe('POST /api/v1/prd/sessions', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/prd/sessions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					projectName: 'Test Project',
					projectDescription: 'Test Description',
				}),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 for invalid request body (auth required first)', async () => {
			const res = await app.request('/api/v1/prd/sessions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ invalidField: 'value' }),
			})

			// Auth middleware runs before validation
			expect(res.status).toBe(401)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/prd/sessions', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer invalid-token',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					projectName: 'Test Project',
					projectDescription: 'Test Description',
				}),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	describe('PATCH /api/v1/prd/sessions/:id', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/prd/sessions/test-session-id', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ projectName: 'Updated Name' }),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/prd/sessions/test-session-id', {
				method: 'PATCH',
				headers: {
					Authorization: 'Bearer invalid-token',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ projectName: 'Updated Name' }),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	describe('DELETE /api/v1/prd/sessions/:id', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/prd/sessions/test-session-id', {
				method: 'DELETE',
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/prd/sessions/test-session-id', {
				method: 'DELETE',
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	describe('POST /api/v1/prd/sessions/:id/rename', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request(
				'/api/v1/prd/sessions/550e8400-e29b-41d4-a716-446655440000/rename',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ projectName: 'New Name' }),
				}
			)

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request(
				'/api/v1/prd/sessions/550e8400-e29b-41d4-a716-446655440000/rename',
				{
					method: 'POST',
					headers: {
						Authorization: 'Bearer invalid-token',
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ projectName: 'New Name' }),
				}
			)

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid session ID and no auth (auth checked first)', async () => {
			const res = await app.request('/api/v1/prd/sessions/not-a-valid-uuid/rename', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ projectName: 'New Name' }),
			})

			expect(res.status).toBe(401)
		})
	})

	// ============================================
	// CHAT ENDPOINT
	// ============================================

	describe('POST /api/v1/prd/chat', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/prd/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sessionId: 'test-session-id',
					message: 'Hello',
				}),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/prd/chat', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer invalid-token',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					sessionId: 'test-session-id',
					message: 'Hello',
				}),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 for invalid request body (auth required first)', async () => {
			const res = await app.request('/api/v1/prd/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ invalidField: 'value' }),
			})

			// Auth middleware runs before validation
			expect(res.status).toBe(401)
		})
	})

	// ============================================
	// MESSAGE EDIT ENDPOINT
	// ============================================

	describe('POST /api/v1/prd/messages/:messageId/edit', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/prd/messages/test-message-id/edit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: 'Updated message' }),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/prd/messages/test-message-id/edit', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer invalid-token',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ content: 'Updated message' }),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	// ============================================
	// DOCUMENT ENDPOINTS
	// ============================================

	describe('POST /api/v1/prd/sessions/:id/document', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/prd/sessions/test-session-id/document', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type: 'prd_full' }),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/prd/sessions/test-session-id/document', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer invalid-token',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ type: 'prd_full' }),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	describe('GET /api/v1/prd/sessions/:id/documents', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/prd/sessions/test-session-id/documents')
			expect(res.status).toBe(401)

			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/prd/sessions/test-session-id/documents', {
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	describe('GET /api/v1/prd/documents/:id', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/prd/documents/test-document-id')
			expect(res.status).toBe(401)

			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/prd/documents/test-document-id', {
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	describe('PATCH /api/v1/prd/documents/:id', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/prd/documents/test-document-id', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: 'Updated content' }),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/prd/documents/test-document-id', {
				method: 'PATCH',
				headers: {
					Authorization: 'Bearer invalid-token',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ content: 'Updated content' }),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	describe('DELETE /api/v1/prd/documents/:id', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/prd/documents/test-document-id', {
				method: 'DELETE',
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/prd/documents/test-document-id', {
				method: 'DELETE',
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	// ============================================
	// UTILITY ENDPOINTS
	// ============================================

	describe('GET /api/v1/prd/steps', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/prd/steps')
			expect(res.status).toBe(401)

			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/prd/steps', {
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	describe('POST /api/v1/prd/sessions/:id/advance', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/prd/sessions/test-session-id/advance', {
				method: 'POST',
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/prd/sessions/test-session-id/advance', {
				method: 'POST',
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	describe('POST /api/v1/prd/sessions/:id/skip', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/prd/sessions/test-session-id/skip', {
				method: 'POST',
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/prd/sessions/test-session-id/skip', {
				method: 'POST',
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	describe('POST /api/v1/prd/sessions/:id/complete', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/prd/sessions/test-session-id/complete', {
				method: 'POST',
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/prd/sessions/test-session-id/complete', {
				method: 'POST',
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})
})
