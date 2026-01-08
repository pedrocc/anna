import { RATE_LIMIT } from '@repo/shared'
import { createMiddleware } from 'hono/factory'
import { Redis } from 'ioredis'

let redis: Redis | null = null

function getRedis(): Redis {
	if (!redis) {
		const redisUrl = process.env['REDIS_URL']
		if (!redisUrl) {
			throw new Error('REDIS_URL environment variable is not set')
		}
		redis = new Redis(redisUrl)
	}
	return redis
}

export const rateLimiter = (options?: { windowMs?: number; max?: number }) => {
	const windowMs = options?.windowMs ?? RATE_LIMIT.WINDOW_MS
	const maxRequests = options?.max ?? RATE_LIMIT.MAX_REQUESTS

	return createMiddleware(async (c, next) => {
		// Get client IP from headers or fallback to a unique request identifier
		const forwardedFor = c.req.header('x-forwarded-for')
		const realIp = c.req.header('x-real-ip')
		const cfConnectingIp = c.req.header('cf-connecting-ip') // Cloudflare

		// Use first IP from x-forwarded-for (client IP), or other headers
		const ip = forwardedFor?.split(',')[0]?.trim() ?? realIp ?? cfConnectingIp ?? 'anonymous'
		const key = `ratelimit:${ip}`

		const redisClient = getRedis()
		const current = await redisClient.incr(key)

		if (current === 1) {
			await redisClient.pexpire(key, windowMs)
		}

		const remaining = Math.max(0, maxRequests - current)
		const ttl = await redisClient.pttl(key)

		c.header('X-RateLimit-Limit', String(maxRequests))
		c.header('X-RateLimit-Remaining', String(remaining))
		c.header('X-RateLimit-Reset', String(Date.now() + ttl))

		if (current > maxRequests) {
			return c.json(
				{ success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded' } },
				429
			)
		}

		await next()
	})
}
