import { z } from 'zod'

export const ServerEnvSchema = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
	DATABASE_URL: z.url(),
	REDIS_URL: z.url(),
	CLERK_SECRET_KEY: z.string().startsWith('sk_'),
	CLERK_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
	RESEND_API_KEY: z.string().startsWith('re_'),
	SENTRY_DSN: z.url().optional(),
	API_URL: z.url(),
	WEB_URL: z.url(),
	PORT: z.coerce.number().default(3000),
})

export const ClientEnvSchema = z.object({
	CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
	API_URL: z.url(),
	SENTRY_DSN: z.url().optional(),
})

export type ServerEnv = z.infer<typeof ServerEnvSchema>
export type ClientEnv = z.infer<typeof ClientEnvSchema>

export function validateServerEnv(): ServerEnv {
	const result = ServerEnvSchema.safeParse(process.env)
	if (!result.success) {
		throw new Error('Invalid server environment variables')
	}
	return result.data
}

export function validateClientEnv(): ClientEnv {
	const result = ClientEnvSchema.safeParse({
		CLERK_PUBLISHABLE_KEY: process.env['CLERK_PUBLISHABLE_KEY'],
		API_URL: process.env['API_URL'],
		SENTRY_DSN: process.env['SENTRY_DSN'],
	})
	if (!result.success) {
		throw new Error('Invalid client environment variables')
	}
	return result.data
}
