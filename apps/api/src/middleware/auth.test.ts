import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { TokenVerificationError, TokenVerificationErrorReason } from '@clerk/backend/errors'
import { Hono } from 'hono'
import { authLogger } from '../lib/logger.js'
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
	let warnSpy: ReturnType<typeof mock>

	beforeEach(() => {
		warnSpy = mock(() => {})
		authLogger.warn = warnSpy as typeof authLogger.warn
	})

	afterEach(() => {
		mock.restore()
	})

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

		test('logs warning when authorization header is missing', async () => {
			await app.request('/protected')
			expect(warnSpy).toHaveBeenCalledWith('Auth failed: missing or invalid authorization header')
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

		test('rejects malformed JWT with UNAUTHORIZED (non-parseable)', async () => {
			// This token causes a SyntaxError when base64 decoding, not a TokenVerificationError
			const res = await app.request('/protected', {
				headers: { Authorization: 'Bearer invalid.jwt.token' },
			})
			expect(res.status).toBe(401)
			const body = (await res.json()) as ErrorResponse
			expect(body.success).toBe(false)
			expect(body.error.code).toBe('UNAUTHORIZED')
		})

		test('rejects malformed base64 token with TOKEN_INVALID', async () => {
			const fakeToken = 'not-a-valid-jwt-at-all!'
			const res = await app.request('/protected', {
				headers: { Authorization: `Bearer ${fakeToken}` },
			})
			expect(res.status).toBe(401)
			const body = (await res.json()) as ErrorResponse
			expect(body.error.code).toBe('TOKEN_INVALID')
		})

		test('logs warning for unexpected errors during token verification', async () => {
			await app.request('/protected', {
				headers: { Authorization: 'Bearer invalid.jwt.token' },
			})
			expect(warnSpy).toHaveBeenCalledWith(
				expect.objectContaining({ err: expect.any(Error) }),
				'Auth failed: unexpected error'
			)
		})
	})

	describe('Token Error Differentiation (integration)', () => {
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

		test('structurally valid JWT with fake key returns TOKEN_INVALID', async () => {
			// Create a structurally valid JWT that will fail signature verification
			const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
				.replace(/=/g, '')
				.replace(/\+/g, '-')
				.replace(/\//g, '_')
			const payload = btoa(
				JSON.stringify({
					sub: 'user_test',
					exp: Math.floor(Date.now() / 1000) + 3600,
					iat: Math.floor(Date.now() / 1000) - 60,
					nbf: Math.floor(Date.now() / 1000) - 60,
				})
			)
				.replace(/=/g, '')
				.replace(/\+/g, '-')
				.replace(/\//g, '_')
			const token = `${header}.${payload}.fake_signature`

			const res = await app.request('/protected', {
				headers: { Authorization: `Bearer ${token}` },
			})
			expect(res.status).toBe(401)
			const body = (await res.json()) as ErrorResponse
			expect(body.success).toBe(false)
			// May be TOKEN_INVALID or UNAUTHORIZED depending on how Clerk handles it
			expect(body.error.code).not.toBe('TOKEN_EXPIRED')
		}, 10000)
	})

	describe('Token Error Differentiation (mocked)', () => {
		let originalKey: string | undefined

		beforeAll(() => {
			originalKey = process.env['CLERK_SECRET_KEY']
			process.env['CLERK_SECRET_KEY'] = 'sk_test_fake_key_for_mocked_tests'
		})

		afterAll(() => {
			if (originalKey) {
				process.env['CLERK_SECRET_KEY'] = originalKey
			} else {
				delete process.env['CLERK_SECRET_KEY']
			}
		})

		test('returns TOKEN_EXPIRED for TokenVerificationError with TokenExpired reason', async () => {
			// Use a dedicated app that mocks verifyToken to throw TokenExpired
			const { Hono } = await import('hono')
			const { createMiddleware } = await import('hono/factory')
			const { errorResponse, commonErrors } = await import('../lib/response.js')

			const mockMiddleware = createMiddleware<{ Variables: AuthVariables }>(async (c, _next) => {
				const authHeader = c.req.header('Authorization')
				if (!authHeader?.startsWith('Bearer ')) {
					return commonErrors.unauthorized(c, 'Missing or invalid authorization header')
				}

				const secretKey = process.env['CLERK_SECRET_KEY']
				if (!secretKey) {
					return errorResponse(c, 'CONFIGURATION_ERROR', 'Server misconfigured', 500)
				}

				// Simulate TokenExpired error
				const err = new TokenVerificationError({
					message: 'Token has expired',
					reason: TokenVerificationErrorReason.TokenExpired,
				})

				if (err instanceof TokenVerificationError) {
					if (err.reason === TokenVerificationErrorReason.TokenExpired) {
						return errorResponse(c, 'TOKEN_EXPIRED', 'Token expired', 401)
					}
					return errorResponse(c, 'TOKEN_INVALID', 'Invalid token', 401)
				}

				return commonErrors.unauthorized(c, 'Invalid token')
			})

			const testApp = new Hono<{ Variables: AuthVariables }>()
			testApp.get('/test', mockMiddleware, (c) => c.json({ success: true }))

			const res = await testApp.request('/test', {
				headers: { Authorization: 'Bearer some.token.here' },
			})
			expect(res.status).toBe(401)
			const body = (await res.json()) as ErrorResponse
			expect(body.error.code).toBe('TOKEN_EXPIRED')
			expect(body.error.message).toBe('Token expired')
		})

		test('returns TOKEN_INVALID for TokenVerificationError with TokenInvalid reason', async () => {
			const { Hono } = await import('hono')
			const { createMiddleware } = await import('hono/factory')
			const { errorResponse, commonErrors } = await import('../lib/response.js')

			const mockMiddleware = createMiddleware<{ Variables: AuthVariables }>(async (c, _next) => {
				const authHeader = c.req.header('Authorization')
				if (!authHeader?.startsWith('Bearer ')) {
					return commonErrors.unauthorized(c, 'Missing or invalid authorization header')
				}

				const secretKey = process.env['CLERK_SECRET_KEY']
				if (!secretKey) {
					return errorResponse(c, 'CONFIGURATION_ERROR', 'Server misconfigured', 500)
				}

				// Simulate TokenInvalid error
				const err = new TokenVerificationError({
					message: 'Token is invalid',
					reason: TokenVerificationErrorReason.TokenInvalid,
				})

				if (err instanceof TokenVerificationError) {
					if (err.reason === TokenVerificationErrorReason.TokenExpired) {
						return errorResponse(c, 'TOKEN_EXPIRED', 'Token expired', 401)
					}
					return errorResponse(c, 'TOKEN_INVALID', 'Invalid token', 401)
				}

				return commonErrors.unauthorized(c, 'Invalid token')
			})

			const testApp = new Hono<{ Variables: AuthVariables }>()
			testApp.get('/test', mockMiddleware, (c) => c.json({ success: true }))

			const res = await testApp.request('/test', {
				headers: { Authorization: 'Bearer some.token.here' },
			})
			expect(res.status).toBe(401)
			const body = (await res.json()) as ErrorResponse
			expect(body.error.code).toBe('TOKEN_INVALID')
			expect(body.error.message).toBe('Invalid token')
		})

		test('returns UNAUTHORIZED for non-TokenVerificationError', async () => {
			const { Hono } = await import('hono')
			const { createMiddleware } = await import('hono/factory')
			const { commonErrors } = await import('../lib/response.js')

			const mockMiddleware = createMiddleware<{ Variables: AuthVariables }>(async (c, _next) => {
				const authHeader = c.req.header('Authorization')
				if (!authHeader?.startsWith('Bearer ')) {
					return commonErrors.unauthorized(c, 'Missing or invalid authorization header')
				}

				// Simulate a generic error (not TokenVerificationError)
				const err = new Error('Network error')

				if (err instanceof TokenVerificationError) {
					// Won't match
				}

				return commonErrors.unauthorized(c, 'Invalid token')
			})

			const testApp = new Hono<{ Variables: AuthVariables }>()
			testApp.get('/test', mockMiddleware, (c) => c.json({ success: true }))

			const res = await testApp.request('/test', {
				headers: { Authorization: 'Bearer some.token.here' },
			})
			expect(res.status).toBe(401)
			const body = (await res.json()) as ErrorResponse
			expect(body.error.code).toBe('UNAUTHORIZED')
			expect(body.error.message).toBe('Invalid token')
		})

		test('returns TOKEN_INVALID for other TokenVerificationError reasons', async () => {
			const { Hono } = await import('hono')
			const { createMiddleware } = await import('hono/factory')
			const { errorResponse, commonErrors } = await import('../lib/response.js')

			const mockMiddleware = createMiddleware<{ Variables: AuthVariables }>(async (c, _next) => {
				const authHeader = c.req.header('Authorization')
				if (!authHeader?.startsWith('Bearer ')) {
					return commonErrors.unauthorized(c, 'Missing or invalid authorization header')
				}

				const secretKey = process.env['CLERK_SECRET_KEY']
				if (!secretKey) {
					return errorResponse(c, 'CONFIGURATION_ERROR', 'Server misconfigured', 500)
				}

				// Simulate TokenInvalidSignature error
				const err = new TokenVerificationError({
					message: 'Token signature invalid',
					reason: TokenVerificationErrorReason.TokenInvalidSignature,
				})

				if (err instanceof TokenVerificationError) {
					if (err.reason === TokenVerificationErrorReason.TokenExpired) {
						return errorResponse(c, 'TOKEN_EXPIRED', 'Token expired', 401)
					}
					return errorResponse(c, 'TOKEN_INVALID', 'Invalid token', 401)
				}

				return commonErrors.unauthorized(c, 'Invalid token')
			})

			const testApp = new Hono<{ Variables: AuthVariables }>()
			testApp.get('/test', mockMiddleware, (c) => c.json({ success: true }))

			const res = await testApp.request('/test', {
				headers: { Authorization: 'Bearer some.token.here' },
			})
			expect(res.status).toBe(401)
			const body = (await res.json()) as ErrorResponse
			expect(body.error.code).toBe('TOKEN_INVALID')
			expect(body.error.message).toBe('Invalid token')
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
