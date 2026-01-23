import { describe, expect, test } from 'bun:test'
import { ClientEnvSchema, ServerEnvSchema } from './env.schema.js'

const validServerEnv = {
	NODE_ENV: 'development',
	DATABASE_URL: 'https://db.example.com',
	REDIS_URL: 'https://redis.example.com',
	CLERK_SECRET_KEY: 'sk_test_abc123',
	RESEND_API_KEY: 're_abc123',
	OPENROUTER_API_KEY: 'sk-or-abc123',
	API_URL: 'https://api.example.com',
	WEB_URL: 'https://web.example.com',
}

describe('ServerEnvSchema', () => {
	describe('OPENROUTER_API_KEY', () => {
		test('accepts valid key starting with sk-or-', () => {
			const result = ServerEnvSchema.parse(validServerEnv)
			expect(result.OPENROUTER_API_KEY).toBe('sk-or-abc123')
		})

		test('rejects key without sk-or- prefix', () => {
			expect(() =>
				ServerEnvSchema.parse({ ...validServerEnv, OPENROUTER_API_KEY: 'invalid-key' })
			).toThrow()
		})

		test('rejects empty string', () => {
			expect(() => ServerEnvSchema.parse({ ...validServerEnv, OPENROUTER_API_KEY: '' })).toThrow()
		})

		test('rejects key with only sk- prefix', () => {
			expect(() =>
				ServerEnvSchema.parse({ ...validServerEnv, OPENROUTER_API_KEY: 'sk-abc123' })
			).toThrow()
		})

		test('rejects missing OPENROUTER_API_KEY', () => {
			const { OPENROUTER_API_KEY, ...envWithoutKey } = validServerEnv
			expect(() => ServerEnvSchema.parse(envWithoutKey)).toThrow()
		})
	})

	describe('NODE_ENV', () => {
		test('accepts production', () => {
			const result = ServerEnvSchema.parse({ ...validServerEnv, NODE_ENV: 'production' })
			expect(result.NODE_ENV).toBe('production')
		})

		test('accepts development', () => {
			const result = ServerEnvSchema.parse({ ...validServerEnv, NODE_ENV: 'development' })
			expect(result.NODE_ENV).toBe('development')
		})

		test('accepts test', () => {
			const result = ServerEnvSchema.parse({ ...validServerEnv, NODE_ENV: 'test' })
			expect(result.NODE_ENV).toBe('test')
		})

		test('defaults to development when not provided', () => {
			const { NODE_ENV, ...envWithoutNodeEnv } = validServerEnv
			const result = ServerEnvSchema.parse(envWithoutNodeEnv)
			expect(result.NODE_ENV).toBe('development')
		})

		test('rejects invalid NODE_ENV value', () => {
			expect(() => ServerEnvSchema.parse({ ...validServerEnv, NODE_ENV: 'staging' })).toThrow()
		})

		test('rejects empty string', () => {
			expect(() => ServerEnvSchema.parse({ ...validServerEnv, NODE_ENV: '' })).toThrow()
		})
	})

	describe('LOG_LEVEL', () => {
		test('defaults to info when not provided', () => {
			const result = ServerEnvSchema.parse(validServerEnv)
			expect(result.LOG_LEVEL).toBe('info')
		})

		test('accepts debug', () => {
			const result = ServerEnvSchema.parse({ ...validServerEnv, LOG_LEVEL: 'debug' })
			expect(result.LOG_LEVEL).toBe('debug')
		})

		test('accepts info', () => {
			const result = ServerEnvSchema.parse({ ...validServerEnv, LOG_LEVEL: 'info' })
			expect(result.LOG_LEVEL).toBe('info')
		})

		test('accepts warn', () => {
			const result = ServerEnvSchema.parse({ ...validServerEnv, LOG_LEVEL: 'warn' })
			expect(result.LOG_LEVEL).toBe('warn')
		})

		test('accepts error', () => {
			const result = ServerEnvSchema.parse({ ...validServerEnv, LOG_LEVEL: 'error' })
			expect(result.LOG_LEVEL).toBe('error')
		})

		test('rejects invalid log level', () => {
			expect(() => ServerEnvSchema.parse({ ...validServerEnv, LOG_LEVEL: 'trace' })).toThrow()
		})

		test('rejects empty string', () => {
			expect(() => ServerEnvSchema.parse({ ...validServerEnv, LOG_LEVEL: '' })).toThrow()
		})
	})

	describe('defaults', () => {
		test('NODE_ENV defaults to development', () => {
			const { NODE_ENV, ...envWithoutNodeEnv } = validServerEnv
			const result = ServerEnvSchema.parse(envWithoutNodeEnv)
			expect(result.NODE_ENV).toBe('development')
		})

		test('LOG_LEVEL defaults to info', () => {
			const result = ServerEnvSchema.parse(validServerEnv)
			expect(result.LOG_LEVEL).toBe('info')
		})

		test('PORT defaults to 3000', () => {
			const result = ServerEnvSchema.parse(validServerEnv)
			expect(result.PORT).toBe(3000)
		})

		test('TRUST_ALL_PROXIES defaults to false', () => {
			const result = ServerEnvSchema.parse(validServerEnv)
			expect(result.TRUST_ALL_PROXIES).toBe(false)
		})
	})

	describe('CLERK_SECRET_KEY', () => {
		test('accepts valid key starting with sk_', () => {
			const result = ServerEnvSchema.parse(validServerEnv)
			expect(result.CLERK_SECRET_KEY).toBe('sk_test_abc123')
		})

		test('rejects key without sk_ prefix', () => {
			expect(() =>
				ServerEnvSchema.parse({ ...validServerEnv, CLERK_SECRET_KEY: 'invalid' })
			).toThrow()
		})
	})

	describe('RESEND_API_KEY', () => {
		test('accepts valid key starting with re_', () => {
			const result = ServerEnvSchema.parse(validServerEnv)
			expect(result.RESEND_API_KEY).toBe('re_abc123')
		})

		test('rejects key without re_ prefix', () => {
			expect(() =>
				ServerEnvSchema.parse({ ...validServerEnv, RESEND_API_KEY: 'invalid' })
			).toThrow()
		})
	})
})

describe('ClientEnvSchema', () => {
	test('accepts valid client env', () => {
		const result = ClientEnvSchema.parse({
			CLERK_PUBLISHABLE_KEY: 'pk_test_abc123',
			API_URL: 'https://api.example.com',
		})
		expect(result.CLERK_PUBLISHABLE_KEY).toBe('pk_test_abc123')
	})

	test('rejects CLERK_PUBLISHABLE_KEY without pk_ prefix', () => {
		expect(() =>
			ClientEnvSchema.parse({
				CLERK_PUBLISHABLE_KEY: 'invalid',
				API_URL: 'https://api.example.com',
			})
		).toThrow()
	})
})
