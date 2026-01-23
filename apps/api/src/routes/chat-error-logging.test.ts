import { describe, expect, it, spyOn } from 'bun:test'
import { createLogger } from '../lib/logger.js'

describe('chat route error logging pattern', () => {
	it('should use Pino logger instead of console.error for unexpected errors', () => {
		const chatLogger = createLogger('chat')
		const errorSpy = spyOn(chatLogger, 'error')
		const consoleSpy = spyOn(console, 'error')

		// Simulate the error logging pattern used in chat route
		const testError = new TypeError('Network failure')
		chatLogger.error({ err: testError, path: '/api/v1/chat' }, 'Unexpected error in chat route')

		expect(errorSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				err: expect.any(Error),
				path: '/api/v1/chat',
			}),
			'Unexpected error in chat route'
		)
		expect(consoleSpy).not.toHaveBeenCalled()

		errorSpy.mockRestore()
		consoleSpy.mockRestore()
	})

	it('should log full error object with stack trace via Pino', () => {
		const chatLogger = createLogger('chat')
		const errorSpy = spyOn(chatLogger, 'error')

		const testError = new Error('Connection timeout')
		chatLogger.error({ err: testError }, 'Chat stream error')

		const callArgs = errorSpy.mock.calls[0]
		expect(callArgs).toBeDefined()
		const loggedData = (callArgs as unknown[])[0] as { err: Error }
		expect(loggedData.err).toBe(testError)
		expect(loggedData.err.message).toBe('Connection timeout')
		expect(loggedData.err.stack).toBeDefined()

		errorSpy.mockRestore()
	})

	it('chat.ts source should not contain console.error', async () => {
		const chatSource = await Bun.file('apps/api/src/routes/chat.ts').text()
		expect(chatSource).not.toContain('console.error')
		expect(chatSource).not.toContain('console.log')
	})

	it('chat.ts source should import and use createLogger', async () => {
		const chatSource = await Bun.file('apps/api/src/routes/chat.ts').text()
		expect(chatSource).toContain("import { createLogger } from '../lib/logger.js'")
		expect(chatSource).toContain("createLogger('chat')")
		expect(chatSource).toContain('chatLogger.error')
	})
})

describe('error logging ensures full error details server-side', () => {
	it('should log error with err field for Pino serialization', () => {
		const logger = createLogger('test')
		const errorSpy = spyOn(logger, 'error')

		const error = new Error('Database connection lost')
		logger.error({ err: error, sessionId: 'sess_123' }, 'Operation failed')

		const callArgs = errorSpy.mock.calls[0]
		expect(callArgs).toBeDefined()
		const loggedData = (callArgs as unknown[])[0] as { err: Error; sessionId: string }
		expect(loggedData.err).toBe(error)
		expect(loggedData.sessionId).toBe('sess_123')

		errorSpy.mockRestore()
	})

	it('index.ts should not contain console.log for shutdown', async () => {
		const indexSource = await Bun.file('apps/api/src/index.ts').text()
		expect(indexSource).not.toContain('console.log')
		expect(indexSource).not.toContain('console.error')
		expect(indexSource).toContain('apiLogger.info')
	})

	it('webhook.ts should not contain console.error', async () => {
		const webhookSource = await Bun.file('apps/api/src/middleware/webhook.ts').text()
		expect(webhookSource).not.toContain('console.error')
		expect(webhookSource).toContain('apiLogger.error')
	})

	it('health.ts should log database errors with dbLogger', async () => {
		const healthSource = await Bun.file('apps/api/src/routes/health.ts').text()
		expect(healthSource).toContain('dbLogger.error')
		expect(healthSource).toContain('err: error')
	})

	it('prd.ts should log AI failures instead of silently catching', async () => {
		const prdSource = await Bun.file('apps/api/src/routes/prd.ts').text()
		expect(prdSource).toContain('AI briefing analysis failed, using fallback')
		expect(prdSource).toContain('Failed to create PRD session')
		expect(prdSource).toContain('Failed to refresh PRD session')
	})

	it('briefing.ts should log session failures', async () => {
		const briefingSource = await Bun.file('apps/api/src/routes/briefing.ts').text()
		expect(briefingSource).toContain('Failed to create briefing session')
		expect(briefingSource).toContain('Failed to refresh briefing session')
	})

	it('sm.ts should log session failures', async () => {
		const smSource = await Bun.file('apps/api/src/routes/sm.ts').text()
		expect(smSource).toContain('Failed to create SM session')
		expect(smSource).toContain('Failed to refresh SM session')
	})
})
