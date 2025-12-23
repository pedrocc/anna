import { Redis } from 'ioredis'

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379'

export const connection = new Redis(REDIS_URL, {
	maxRetriesPerRequest: null,
})

export const defaultJobOptions = {
	attempts: 3,
	backoff: {
		type: 'exponential' as const,
		delay: 1000,
	},
	removeOnComplete: {
		count: 1000,
		age: 24 * 3600, // 24 hours
	},
	removeOnFail: {
		count: 5000,
	},
}
