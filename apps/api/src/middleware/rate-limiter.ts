import { RATE_LIMIT } from '@repo/shared'
import { createMiddleware } from 'hono/factory'
import { Redis } from 'ioredis'
import { getClientIp } from './trusted-proxy.js'

let redis: Redis | null = null

type RateLimitType = 'default' | 'chat' | 'document'

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

/**
 * Gracefully close Redis connection
 * Should be called on process shutdown
 */
export async function closeRedis(): Promise<void> {
	if (redis) {
		await redis.quit()
		redis = null
	}
}

/**
 * Get rate limit config based on type
 */
function getRateLimitConfig(type: RateLimitType): { windowMs: number; max: number } {
	switch (type) {
		case 'chat':
			return {
				windowMs: RATE_LIMIT.CHAT_WINDOW_MS,
				max: RATE_LIMIT.CHAT_MAX_REQUESTS,
			}
		case 'document':
			return {
				windowMs: RATE_LIMIT.DOCUMENT_WINDOW_MS,
				max: RATE_LIMIT.DOCUMENT_MAX_REQUESTS,
			}
		default:
			return {
				windowMs: RATE_LIMIT.WINDOW_MS,
				max: RATE_LIMIT.MAX_REQUESTS,
			}
	}
}

export const rateLimiter = (options?: {
	windowMs?: number
	max?: number
	type?: RateLimitType
}) => {
	const config = options?.type ? getRateLimitConfig(options.type) : getRateLimitConfig('default')
	const windowMs = options?.windowMs ?? config.windowMs
	const maxRequests = options?.max ?? config.max
	const keyPrefix = options?.type ? `ratelimit:${options.type}:` : 'ratelimit:'

	return createMiddleware(async (c, next) => {
		const ip = getClientIp(c)
		const key = `${keyPrefix}${ip}`

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
