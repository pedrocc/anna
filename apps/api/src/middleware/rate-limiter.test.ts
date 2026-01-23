import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Context } from 'hono'
import { Hono } from 'hono'

type ClerkAuthVariables = {
	clerkAuth: { userId: string }
}

// Mock Redis before importing the rate limiter
const mockRedisInstance = {
	incr: mock(() => Promise.resolve(1)),
	pexpire: mock(() => Promise.resolve(1)),
	pttl: mock(() => Promise.resolve(60000)),
	quit: mock(() => Promise.resolve()),
}

mock.module('ioredis', () => ({
	Redis: class MockRedis {
		incr = mockRedisInstance.incr
		pexpire = mockRedisInstance.pexpire
		pttl = mockRedisInstance.pttl
		quit = mockRedisInstance.quit
	},
}))

import { RATE_LIMIT } from '@repo/shared'
import { closeRedis, rateLimiter, userKeyExtractor } from './rate-limiter.js'

describe('rate-limiter middleware', () => {
	const originalEnv = { ...process.env }

	beforeEach(() => {
		process.env['REDIS_URL'] = 'redis://localhost:6379'
		mockRedisInstance.incr.mockReset()
		mockRedisInstance.pexpire.mockReset()
		mockRedisInstance.pttl.mockReset()
		mockRedisInstance.incr.mockImplementation(() => Promise.resolve(1))
		mockRedisInstance.pexpire.mockImplementation(() => Promise.resolve(1))
		mockRedisInstance.pttl.mockImplementation(() => Promise.resolve(60000))
	})

	afterEach(() => {
		process.env = { ...originalEnv }
	})

	describe('default rate limiting', () => {
		it('should allow requests under the limit', async () => {
			const app = new Hono()
			app.use('*', rateLimiter())
			app.get('/', (c) => c.json({ ok: true }))

			const res = await app.request('/')
			expect(res.status).toBe(200)
			expect(res.headers.get('X-RateLimit-Limit')).toBe(String(RATE_LIMIT.MAX_REQUESTS))
			expect(res.headers.get('X-RateLimit-Remaining')).toBe(String(RATE_LIMIT.MAX_REQUESTS - 1))
		})

		it('should return 429 when rate limit is exceeded', async () => {
			mockRedisInstance.incr.mockImplementation(() => Promise.resolve(RATE_LIMIT.MAX_REQUESTS + 1))

			const app = new Hono()
			app.use('*', rateLimiter())
			app.get('/', (c) => c.json({ ok: true }))

			const res = await app.request('/')
			expect(res.status).toBe(429)

			const body = (await res.json()) as { success: boolean; error: { code: string } }
			expect(body.success).toBe(false)
			expect(body.error.code).toBe('TOO_MANY_REQUESTS')
		})

		it('should set expiration on first request', async () => {
			mockRedisInstance.incr.mockImplementation(() => Promise.resolve(1))

			const app = new Hono()
			app.use('*', rateLimiter())
			app.get('/', (c) => c.json({ ok: true }))

			await app.request('/')
			expect(mockRedisInstance.pexpire).toHaveBeenCalledWith(
				expect.stringContaining('ratelimit:'),
				RATE_LIMIT.WINDOW_MS
			)
		})

		it('should not set expiration on subsequent requests', async () => {
			mockRedisInstance.incr.mockImplementation(() => Promise.resolve(5))

			const app = new Hono()
			app.use('*', rateLimiter())
			app.get('/', (c) => c.json({ ok: true }))

			await app.request('/')
			expect(mockRedisInstance.pexpire).not.toHaveBeenCalled()
		})
	})

	describe('chat rate limiting', () => {
		it('should use chat-specific limits', async () => {
			const app = new Hono()
			app.use('*', rateLimiter({ type: 'chat' }))
			app.get('/', (c) => c.json({ ok: true }))

			const res = await app.request('/')
			expect(res.status).toBe(200)
			expect(res.headers.get('X-RateLimit-Limit')).toBe(String(RATE_LIMIT.CHAT_MAX_REQUESTS))
		})

		it('should return 429 when chat rate limit is exceeded', async () => {
			mockRedisInstance.incr.mockImplementation(() =>
				Promise.resolve(RATE_LIMIT.CHAT_MAX_REQUESTS + 1)
			)

			const app = new Hono()
			app.use('*', rateLimiter({ type: 'chat' }))
			app.get('/', (c) => c.json({ ok: true }))

			const res = await app.request('/')
			expect(res.status).toBe(429)
		})

		it('should use chat key prefix', async () => {
			const app = new Hono()
			app.use('*', rateLimiter({ type: 'chat' }))
			app.get('/', (c) => c.json({ ok: true }))

			await app.request('/')
			expect(mockRedisInstance.incr).toHaveBeenCalledWith(
				expect.stringContaining('ratelimit:chat:')
			)
		})

		it('should set chat window expiration on first request', async () => {
			mockRedisInstance.incr.mockImplementation(() => Promise.resolve(1))

			const app = new Hono()
			app.use('*', rateLimiter({ type: 'chat' }))
			app.get('/', (c) => c.json({ ok: true }))

			await app.request('/')
			expect(mockRedisInstance.pexpire).toHaveBeenCalledWith(
				expect.stringContaining('ratelimit:chat:'),
				RATE_LIMIT.CHAT_WINDOW_MS
			)
		})
	})

	describe('document rate limiting', () => {
		it('should use document-specific limits', async () => {
			const app = new Hono()
			app.use('*', rateLimiter({ type: 'document' }))
			app.get('/', (c) => c.json({ ok: true }))

			const res = await app.request('/')
			expect(res.status).toBe(200)
			expect(res.headers.get('X-RateLimit-Limit')).toBe(String(RATE_LIMIT.DOCUMENT_MAX_REQUESTS))
		})

		it('should return 429 when document rate limit is exceeded', async () => {
			mockRedisInstance.incr.mockImplementation(() =>
				Promise.resolve(RATE_LIMIT.DOCUMENT_MAX_REQUESTS + 1)
			)

			const app = new Hono()
			app.use('*', rateLimiter({ type: 'document' }))
			app.get('/', (c) => c.json({ ok: true }))

			const res = await app.request('/')
			expect(res.status).toBe(429)
		})

		it('should use document key prefix', async () => {
			const app = new Hono()
			app.use('*', rateLimiter({ type: 'document' }))
			app.get('/', (c) => c.json({ ok: true }))

			await app.request('/')
			expect(mockRedisInstance.incr).toHaveBeenCalledWith(
				expect.stringContaining('ratelimit:document:')
			)
		})
	})

	describe('per-user rate limiting (keyExtractor)', () => {
		it('should use user ID as key when keyExtractor provides it', async () => {
			const app = new Hono<{ Variables: ClerkAuthVariables }>()
			// Simulate auth middleware setting clerkAuth
			app.use('*', async (c, next) => {
				c.set('clerkAuth', { userId: 'user_123' })
				await next()
			})
			app.use('*', rateLimiter({ type: 'chat', keyExtractor: userKeyExtractor }))
			app.get('/', (c) => c.json({ ok: true }))

			await app.request('/')
			expect(mockRedisInstance.incr).toHaveBeenCalledWith('ratelimit:chat:user_123')
		})

		it('should fall back to IP when keyExtractor returns undefined', async () => {
			const app = new Hono()
			// No auth context set
			app.use('*', rateLimiter({ type: 'chat', keyExtractor: userKeyExtractor }))
			app.get('/', (c) => c.json({ ok: true }))

			await app.request('/')
			// Should use IP-based key (not user-based)
			const calls = mockRedisInstance.incr.mock.calls as unknown as string[][]
			const calledKey = calls[0]?.[0] ?? ''
			expect(calledKey).toMatch(/^ratelimit:chat:/)
			expect(calledKey).not.toContain('user_')
		})

		it('should rate limit per user independently', async () => {
			let requestCount = 0
			mockRedisInstance.incr.mockImplementation(() => {
				requestCount++
				return Promise.resolve(requestCount)
			})

			const app = new Hono<{ Variables: ClerkAuthVariables }>()
			app.use('*', async (c, next) => {
				c.set('clerkAuth', { userId: 'user_abc' })
				await next()
			})
			app.use('*', rateLimiter({ type: 'chat', keyExtractor: userKeyExtractor }))
			app.get('/', (c) => c.json({ ok: true }))

			const res = await app.request('/')
			expect(res.status).toBe(200)
			expect(mockRedisInstance.incr).toHaveBeenCalledWith('ratelimit:chat:user_abc')
		})

		it('should enforce chat limit per user', async () => {
			mockRedisInstance.incr.mockImplementation(() =>
				Promise.resolve(RATE_LIMIT.CHAT_MAX_REQUESTS + 1)
			)

			const app = new Hono<{ Variables: ClerkAuthVariables }>()
			app.use('*', async (c, next) => {
				c.set('clerkAuth', { userId: 'user_limited' })
				await next()
			})
			app.use('*', rateLimiter({ type: 'chat', keyExtractor: userKeyExtractor }))
			app.get('/', (c) => c.json({ ok: true }))

			const res = await app.request('/')
			expect(res.status).toBe(429)

			const body = (await res.json()) as { error: { code: string } }
			expect(body.error.code).toBe('TOO_MANY_REQUESTS')
		})

		it('should use custom keyExtractor function', async () => {
			const customExtractor = (_c: Context) => 'custom-key-42'

			const app = new Hono()
			app.use('*', rateLimiter({ type: 'chat', keyExtractor: customExtractor }))
			app.get('/', (c) => c.json({ ok: true }))

			await app.request('/')
			expect(mockRedisInstance.incr).toHaveBeenCalledWith('ratelimit:chat:custom-key-42')
		})
	})

	describe('userKeyExtractor', () => {
		it('should extract userId from clerkAuth context', () => {
			const mockContext = {
				get: (key: string) => {
					if (key === 'clerkAuth') return { userId: 'user_test123' }
					return undefined
				},
			}
			const result = userKeyExtractor(mockContext as unknown as Context)
			expect(result).toBe('user_test123')
		})

		it('should return undefined when clerkAuth is not set', () => {
			const mockContext = {
				get: () => undefined,
			}
			const result = userKeyExtractor(mockContext as unknown as Context)
			expect(result).toBeUndefined()
		})

		it('should return undefined when userId is null', () => {
			const mockContext = {
				get: (key: string) => {
					if (key === 'clerkAuth') return { userId: null }
					return undefined
				},
			}
			const result = userKeyExtractor(mockContext as unknown as Context)
			expect(result).toBeUndefined()
		})

		it('should return undefined when get throws', () => {
			const mockContext = {
				get: () => {
					throw new Error('Context not available')
				},
			}
			const result = userKeyExtractor(mockContext as unknown as Context)
			expect(result).toBeUndefined()
		})
	})

	describe('custom options', () => {
		it('should allow custom windowMs', async () => {
			mockRedisInstance.incr.mockImplementation(() => Promise.resolve(1))

			const app = new Hono()
			app.use('*', rateLimiter({ windowMs: 30_000 }))
			app.get('/', (c) => c.json({ ok: true }))

			await app.request('/')
			expect(mockRedisInstance.pexpire).toHaveBeenCalledWith(expect.any(String), 30_000)
		})

		it('should allow custom max requests', async () => {
			const app = new Hono()
			app.use('*', rateLimiter({ max: 5 }))
			app.get('/', (c) => c.json({ ok: true }))

			const res = await app.request('/')
			expect(res.headers.get('X-RateLimit-Limit')).toBe('5')
		})

		it('should override type config with explicit windowMs and max', async () => {
			mockRedisInstance.incr.mockImplementation(() => Promise.resolve(1))

			const app = new Hono()
			app.use('*', rateLimiter({ type: 'chat', windowMs: 120_000, max: 5 }))
			app.get('/', (c) => c.json({ ok: true }))

			const res = await app.request('/')
			expect(res.headers.get('X-RateLimit-Limit')).toBe('5')
			expect(mockRedisInstance.pexpire).toHaveBeenCalledWith(expect.any(String), 120_000)
		})
	})

	describe('rate limit headers', () => {
		it('should include X-RateLimit-Limit header', async () => {
			const app = new Hono()
			app.use('*', rateLimiter({ type: 'chat' }))
			app.get('/', (c) => c.json({ ok: true }))

			const res = await app.request('/')
			expect(res.headers.get('X-RateLimit-Limit')).toBe(String(RATE_LIMIT.CHAT_MAX_REQUESTS))
		})

		it('should include X-RateLimit-Remaining header', async () => {
			mockRedisInstance.incr.mockImplementation(() => Promise.resolve(5))

			const app = new Hono()
			app.use('*', rateLimiter({ type: 'chat' }))
			app.get('/', (c) => c.json({ ok: true }))

			const res = await app.request('/')
			expect(res.headers.get('X-RateLimit-Remaining')).toBe(
				String(RATE_LIMIT.CHAT_MAX_REQUESTS - 5)
			)
		})

		it('should include X-RateLimit-Reset header', async () => {
			mockRedisInstance.pttl.mockImplementation(() => Promise.resolve(45000))

			const app = new Hono()
			app.use('*', rateLimiter({ type: 'chat' }))
			app.get('/', (c) => c.json({ ok: true }))

			const res = await app.request('/')
			const reset = Number(res.headers.get('X-RateLimit-Reset'))
			expect(reset).toBeGreaterThan(Date.now())
		})

		it('should show 0 remaining when at limit', async () => {
			mockRedisInstance.incr.mockImplementation(() => Promise.resolve(RATE_LIMIT.CHAT_MAX_REQUESTS))

			const app = new Hono()
			app.use('*', rateLimiter({ type: 'chat' }))
			app.get('/', (c) => c.json({ ok: true }))

			const res = await app.request('/')
			expect(res.status).toBe(200) // At limit but not exceeded
			expect(res.headers.get('X-RateLimit-Remaining')).toBe('0')
		})

		it('should show 0 remaining when over limit', async () => {
			mockRedisInstance.incr.mockImplementation(() =>
				Promise.resolve(RATE_LIMIT.CHAT_MAX_REQUESTS + 5)
			)

			const app = new Hono()
			app.use('*', rateLimiter({ type: 'chat' }))
			app.get('/', (c) => c.json({ ok: true }))

			const res = await app.request('/')
			expect(res.status).toBe(429)
			expect(res.headers.get('X-RateLimit-Remaining')).toBe('0')
		})
	})

	describe('closeRedis', () => {
		it('should close redis connection gracefully', async () => {
			// Trigger redis initialization by making a request
			const app = new Hono()
			app.use('*', rateLimiter())
			app.get('/', (c) => c.json({ ok: true }))
			await app.request('/')

			await closeRedis()
			expect(mockRedisInstance.quit).toHaveBeenCalled()
		})
	})
})
