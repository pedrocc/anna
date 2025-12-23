import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { type AuthVariables, authMiddleware, getAuth } from './auth.js'

interface ErrorResponse {
	success: false
	error: { code: string; message: string }
}

interface SuccessResponse {
	success: true
	message?: string
	userId?: string
	sessionId?: string
}

// Test app with auth middleware
const app = new Hono<{ Variables: AuthVariables }>()

app.get('/protected', authMiddleware, (c) => {
	const { userId, sessionId } = getAuth(c)
	return c.json({ success: true, userId, sessionId })
})

app.get('/public', (c) => {
	return c.json({ success: true, message: 'Public route' })
})

describe('Auth Middleware', () => {
	describe('Missing Authorization Header', () => {
		test('rejects request without Authorization header', async () => {
			const res = await app.request('/protected')
			expect(res.status).toBe(401)
			const body = (await res.json()) as ErrorResponse
			expect(body.success).toBe(false)
			expect(body.error.code).toBe('UNAUTHORIZED')
			expect(body.error.message).toBe('Missing or invalid authorization header')
		})

		test('rejects request with empty Authorization header', async () => {
			const res = await app.request('/protected', {
				headers: { Authorization: '' },
			})
			expect(res.status).toBe(401)
		})

		test('rejects request with non-Bearer Authorization', async () => {
			const res = await app.request('/protected', {
				headers: { Authorization: 'Basic dXNlcjpwYXNz' },
			})
			expect(res.status).toBe(401)
		})

		test('rejects request with malformed Bearer token', async () => {
			const res = await app.request('/protected', {
				headers: { Authorization: 'Bearer' },
			})
			expect(res.status).toBe(401)
		})
	})

	describe('Invalid Token', () => {
		let originalKey: string | undefined

		beforeAll(() => {
			originalKey = process.env['CLERK_SECRET_KEY']
			process.env['CLERK_SECRET_KEY'] = 'sk_test_fake_key_for_testing'
		})

		afterAll(() => {
			if (originalKey) {
				process.env['CLERK_SECRET_KEY'] = originalKey
			} else {
				delete process.env['CLERK_SECRET_KEY']
			}
		})

		test('rejects invalid JWT token', async () => {
			const res = await app.request('/protected', {
				headers: { Authorization: 'Bearer invalid.jwt.token' },
			})
			expect(res.status).toBe(401)
			const body = (await res.json()) as ErrorResponse
			expect(body.success).toBe(false)
			expect(body.error.code).toBe('UNAUTHORIZED')
		})

		test('rejects malformed base64 token', async () => {
			// Token with invalid base64 characters
			const fakeToken = 'not-a-valid-jwt-at-all!'
			const res = await app.request('/protected', {
				headers: { Authorization: `Bearer ${fakeToken}` },
			})
			expect(res.status).toBe(401)
		})
	})

	describe('Public Routes', () => {
		test('allows access to public routes without auth', async () => {
			const res = await app.request('/public')
			expect(res.status).toBe(200)
			const body = (await res.json()) as SuccessResponse
			expect(body.success).toBe(true)
			expect(body.message).toBe('Public route')
		})
	})

	describe('Configuration', () => {
		test('returns 500 if CLERK_SECRET_KEY is missing', async () => {
			const originalKey = process.env['CLERK_SECRET_KEY']
			delete process.env['CLERK_SECRET_KEY']

			const res = await app.request('/protected', {
				headers: { Authorization: 'Bearer some.valid.token' },
			})

			expect(res.status).toBe(500)
			const body = (await res.json()) as ErrorResponse
			expect(body.error.code).toBe('CONFIGURATION_ERROR')

			// Restore
			if (originalKey) {
				process.env['CLERK_SECRET_KEY'] = originalKey
			}
		})
	})
})

describe('getAuth Helper', () => {
	test('returns userId and sessionId from context', async () => {
		// This test verifies the getAuth function extracts data correctly
		// The actual verification happens through the middleware chain
		const mockApp = new Hono<{ Variables: AuthVariables }>()

		mockApp.get('/test', (c) => {
			// Manually set variables to test getAuth
			c.set('userId', 'user_test123')
			c.set('sessionId', 'sess_test456')

			const auth = getAuth(c)
			return c.json(auth)
		})

		const res = await mockApp.request('/test')
		expect(res.status).toBe(200)
		const body = (await res.json()) as SuccessResponse
		expect(body.userId).toBe('user_test123')
		expect(body.sessionId).toBe('sess_test456')
	})
})
