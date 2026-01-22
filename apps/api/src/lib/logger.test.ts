import { describe, expect, it } from 'bun:test'
import pino from 'pino'

// Re-create the redact config to test it in isolation
const redactPaths = [
	'*.apiKey',
	'*.api_key',
	'*.API_KEY',
	'*.authorization',
	'*.Authorization',
	'*.password',
	'*.token',
	'*.Token',
	'*.secret',
	'*.Secret',
	'*.refreshToken',
	'*.refresh_token',
	'req.headers.cookie',
	'req.headers.Cookie',
]

function createTestLogger() {
	const output: string[] = []
	const stream = {
		write(msg: string) {
			output.push(msg)
		},
	}
	const log = pino(
		{
			redact: {
				paths: redactPaths,
				censor: '[REDACTED]',
			},
		},
		stream as unknown as pino.DestinationStream
	)
	return { log, output }
}

function getLoggedObject(output: string[]): Record<string, unknown> {
	return JSON.parse(output[0] as string)
}

describe('logger redaction', () => {
	describe('token paths', () => {
		it('should redact *.token', () => {
			const { log, output } = createTestLogger()
			log.info({ data: { token: 'my-secret-token' } }, 'test')
			const logged = getLoggedObject(output)
			expect((logged['data'] as Record<string, unknown>)['token']).toBe('[REDACTED]')
		})

		it('should redact *.Token', () => {
			const { log, output } = createTestLogger()
			log.info({ data: { Token: 'my-secret-token' } }, 'test')
			const logged = getLoggedObject(output)
			expect((logged['data'] as Record<string, unknown>)['Token']).toBe('[REDACTED]')
		})

		it('should redact *.refreshToken', () => {
			const { log, output } = createTestLogger()
			log.info({ session: { refreshToken: 'rt_abc123' } }, 'test')
			const logged = getLoggedObject(output)
			expect((logged['session'] as Record<string, unknown>)['refreshToken']).toBe('[REDACTED]')
		})

		it('should redact *.refresh_token', () => {
			const { log, output } = createTestLogger()
			log.info({ auth: { refresh_token: 'rt_xyz789' } }, 'test')
			const logged = getLoggedObject(output)
			expect((logged['auth'] as Record<string, unknown>)['refresh_token']).toBe('[REDACTED]')
		})
	})

	describe('secret paths', () => {
		it('should redact *.secret', () => {
			const { log, output } = createTestLogger()
			log.info({ config: { secret: 'super-secret' } }, 'test')
			const logged = getLoggedObject(output)
			expect((logged['config'] as Record<string, unknown>)['secret']).toBe('[REDACTED]')
		})

		it('should redact *.Secret', () => {
			const { log, output } = createTestLogger()
			log.info({ config: { Secret: 'super-secret' } }, 'test')
			const logged = getLoggedObject(output)
			expect((logged['config'] as Record<string, unknown>)['Secret']).toBe('[REDACTED]')
		})
	})

	describe('cookie paths', () => {
		it('should redact req.headers.cookie', () => {
			const { log, output } = createTestLogger()
			log.info({ req: { headers: { cookie: 'session=abc123' } } }, 'test')
			const logged = getLoggedObject(output)
			const req = logged['req'] as Record<string, unknown>
			const headers = req['headers'] as Record<string, unknown>
			expect(headers['cookie']).toBe('[REDACTED]')
		})

		it('should redact req.headers.Cookie', () => {
			const { log, output } = createTestLogger()
			log.info({ req: { headers: { Cookie: 'session=xyz789' } } }, 'test')
			const logged = getLoggedObject(output)
			const req = logged['req'] as Record<string, unknown>
			const headers = req['headers'] as Record<string, unknown>
			expect(headers['Cookie']).toBe('[REDACTED]')
		})
	})

	describe('api key paths', () => {
		it('should redact *.apiKey', () => {
			const { log, output } = createTestLogger()
			log.info({ service: { apiKey: 'sk-123' } }, 'test')
			const logged = getLoggedObject(output)
			expect((logged['service'] as Record<string, unknown>)['apiKey']).toBe('[REDACTED]')
		})

		it('should redact *.api_key', () => {
			const { log, output } = createTestLogger()
			log.info({ service: { api_key: 'sk-456' } }, 'test')
			const logged = getLoggedObject(output)
			expect((logged['service'] as Record<string, unknown>)['api_key']).toBe('[REDACTED]')
		})

		it('should redact *.API_KEY', () => {
			const { log, output } = createTestLogger()
			log.info({ env: { API_KEY: 'sk-789' } }, 'test')
			const logged = getLoggedObject(output)
			expect((logged['env'] as Record<string, unknown>)['API_KEY']).toBe('[REDACTED]')
		})
	})

	describe('password and authorization paths', () => {
		it('should redact *.password', () => {
			const { log, output } = createTestLogger()
			log.info({ user: { password: 'hunter2' } }, 'test')
			const logged = getLoggedObject(output)
			expect((logged['user'] as Record<string, unknown>)['password']).toBe('[REDACTED]')
		})

		it('should redact *.authorization', () => {
			const { log, output } = createTestLogger()
			log.info({ headers: { authorization: 'Bearer token123' } }, 'test')
			const logged = getLoggedObject(output)
			expect((logged['headers'] as Record<string, unknown>)['authorization']).toBe('[REDACTED]')
		})

		it('should redact *.Authorization', () => {
			const { log, output } = createTestLogger()
			log.info({ headers: { Authorization: 'Bearer token456' } }, 'test')
			const logged = getLoggedObject(output)
			expect((logged['headers'] as Record<string, unknown>)['Authorization']).toBe('[REDACTED]')
		})
	})

	describe('non-sensitive fields', () => {
		it('should NOT redact non-sensitive fields', () => {
			const { log, output } = createTestLogger()
			log.info({ user: { name: 'John', email: 'john@example.com' } }, 'test')
			const logged = getLoggedObject(output)
			const user = logged['user'] as Record<string, unknown>
			expect(user['name']).toBe('John')
			expect(user['email']).toBe('john@example.com')
		})
	})
})
