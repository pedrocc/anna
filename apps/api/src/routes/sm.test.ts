import { beforeEach, describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { smRoutes } from './sm.js'

describe('SM Routes', () => {
	let app: Hono

	beforeEach(() => {
		app = new Hono()
		app.route('/api/v1/sm', smRoutes)
		process.env['CLERK_SECRET_KEY'] = 'test-secret-key'
	})

	// ============================================
	// SESSION CRUD ENDPOINTS
	// ============================================

	describe('GET /api/v1/sm/sessions', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/sm/sessions?page=1&limit=10')
			expect(res.status).toBe(401)

			const data = (await res.json()) as { success: boolean; error: { code: string } }
			expect(data.success).toBe(false)
			expect(data.error.code).toBe('UNAUTHORIZED')
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/sm/sessions?page=1&limit=10', {
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 for invalid pagination parameters (auth required first)', async () => {
			const res = await app.request('/api/v1/sm/sessions?page=invalid&limit=10')
			expect(res.status).toBe(401)
		})

		it('should return 401 when missing pagination parameters (auth required first)', async () => {
			const res = await app.request('/api/v1/sm/sessions')
			expect(res.status).toBe(401)
		})
	})

	describe('GET /api/v1/sm/sessions/:id', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/sm/sessions/test-session-id')
			expect(res.status).toBe(401)

			const data = (await res.json()) as { success: boolean; error: { code: string } }
			expect(data.success).toBe(false)
			expect(data.error.code).toBe('UNAUTHORIZED')
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/sm/sessions/test-session-id', {
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	describe('POST /api/v1/sm/sessions', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/sm/sessions', {
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
			const res = await app.request('/api/v1/sm/sessions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ invalidField: 'value' }),
			})

			// Auth middleware runs before validation
			expect(res.status).toBe(401)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/sm/sessions', {
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

	describe('PATCH /api/v1/sm/sessions/:id', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/sm/sessions/test-session-id', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ projectName: 'Updated Name' }),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/sm/sessions/test-session-id', {
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

	describe('DELETE /api/v1/sm/sessions/:id', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/sm/sessions/test-session-id', {
				method: 'DELETE',
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/sm/sessions/test-session-id', {
				method: 'DELETE',
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	describe('POST /api/v1/sm/sessions/:id/rename', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request(
				'/api/v1/sm/sessions/550e8400-e29b-41d4-a716-446655440000/rename',
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
				'/api/v1/sm/sessions/550e8400-e29b-41d4-a716-446655440000/rename',
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
			const res = await app.request('/api/v1/sm/sessions/not-a-valid-uuid/rename', {
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

	describe('POST /api/v1/sm/chat', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/sm/chat', {
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
			const res = await app.request('/api/v1/sm/chat', {
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
			const res = await app.request('/api/v1/sm/chat', {
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

	describe('POST /api/v1/sm/messages/:messageId/edit', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/sm/messages/test-message-id/edit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: 'Updated message' }),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/sm/messages/test-message-id/edit', {
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
	// EPIC ENDPOINTS
	// ============================================

	describe('POST /api/v1/sm/sessions/:id/epics', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/sm/sessions/test-session-id/epics', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					number: 1,
					title: 'Epic Title',
					description: 'Epic Description',
				}),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/sm/sessions/test-session-id/epics', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer invalid-token',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					number: 1,
					title: 'Epic Title',
					description: 'Epic Description',
				}),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	describe('PATCH /api/v1/sm/epics/:id', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/sm/epics/test-epic-id', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: 'Updated Epic Title' }),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/sm/epics/test-epic-id', {
				method: 'PATCH',
				headers: {
					Authorization: 'Bearer invalid-token',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ title: 'Updated Epic Title' }),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	describe('DELETE /api/v1/sm/epics/:id', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/sm/epics/test-epic-id', {
				method: 'DELETE',
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/sm/epics/test-epic-id', {
				method: 'DELETE',
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	// ============================================
	// STORY ENDPOINTS
	// ============================================

	describe('POST /api/v1/sm/sessions/:id/stories', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/sm/sessions/test-session-id/stories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					epicId: 'test-epic-id',
					epicNumber: 1,
					storyNumber: 1,
					title: 'Story Title',
				}),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/sm/sessions/test-session-id/stories', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer invalid-token',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					epicId: 'test-epic-id',
					epicNumber: 1,
					storyNumber: 1,
					title: 'Story Title',
				}),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	describe('PATCH /api/v1/sm/stories/:id', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/sm/stories/test-story-id', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: 'Updated Story Title' }),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/sm/stories/test-story-id', {
				method: 'PATCH',
				headers: {
					Authorization: 'Bearer invalid-token',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ title: 'Updated Story Title' }),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	describe('DELETE /api/v1/sm/stories/:id', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/sm/stories/test-story-id', {
				method: 'DELETE',
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/sm/stories/test-story-id', {
				method: 'DELETE',
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	// ============================================
	// ENRICHMENT ENDPOINT
	// ============================================

	describe('POST /api/v1/sm/sessions/:id/enrich', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/sm/sessions/test-session-id/enrich', {
				method: 'POST',
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/sm/sessions/test-session-id/enrich', {
				method: 'POST',
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	// ============================================
	// DOCUMENT ENDPOINTS
	// ============================================

	describe('POST /api/v1/sm/sessions/:id/document', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/sm/sessions/test-session-id/document', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type: 'full_planning' }),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/sm/sessions/test-session-id/document', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer invalid-token',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ type: 'full_planning' }),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	describe('GET /api/v1/sm/sessions/:id/documents', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/sm/sessions/test-session-id/documents')
			expect(res.status).toBe(401)

			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/sm/sessions/test-session-id/documents', {
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	describe('GET /api/v1/sm/documents/:id', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/sm/documents/test-document-id')
			expect(res.status).toBe(401)

			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/sm/documents/test-document-id', {
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})

	describe('PATCH /api/v1/sm/documents/:id', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/sm/documents/test-document-id', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: 'Updated content' }),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/sm/documents/test-document-id', {
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

	describe('DELETE /api/v1/sm/documents/:id', () => {
		it('should return 401 without authentication', async () => {
			const res = await app.request('/api/v1/sm/documents/test-document-id', {
				method: 'DELETE',
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})

		it('should return 401 with invalid token', async () => {
			const res = await app.request('/api/v1/sm/documents/test-document-id', {
				method: 'DELETE',
				headers: { Authorization: 'Bearer invalid-token' },
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(false)
		})
	})
})
