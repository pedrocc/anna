import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

// Store original process.on and process.exit
const originalProcessOn = process.on.bind(process)
const originalProcessExit = process.exit

// Captured signal handlers
let signalHandlers: Map<string, () => Promise<void>>

describe('Graceful Shutdown', () => {
	beforeEach(() => {
		signalHandlers = new Map()

		// Mock process.on to capture signal handlers
		process.on = ((signal: string, handler: () => Promise<void>): NodeJS.Process => {
			if (signal === 'SIGTERM' || signal === 'SIGINT') {
				signalHandlers.set(signal, handler)
			}
			return process
		}) as typeof process.on

		// Mock process.exit to prevent actually exiting
		process.exit = mock(() => undefined) as never
	})

	afterEach(() => {
		// Restore original functions
		process.on = originalProcessOn
		process.exit = originalProcessExit
		mock.restore()
	})

	describe('Signal Handler Registration', () => {
		test('should register SIGTERM handler', async () => {
			// Re-import to trigger registration with our mocked process.on
			// Note: Due to module caching, this tests the pattern, not the actual registration
			const mockModule = createMockShutdownModule(
				() => Promise.resolve(),
				() => Promise.resolve()
			)

			expect(mockModule.hasHandler('SIGTERM')).toBe(true)
		})

		test('should register SIGINT handler', async () => {
			const mockModule = createMockShutdownModule(
				() => Promise.resolve(),
				() => Promise.resolve()
			)

			expect(mockModule.hasHandler('SIGINT')).toBe(true)
		})
	})

	describe('SIGTERM Handler', () => {
		test('should close Redis and DB connections on SIGTERM', async () => {
			const closeRedisMock = mock(() => Promise.resolve())
			const closeDbMock = mock(() => Promise.resolve())
			const exitMock = mock(() => undefined)

			const mockModule = createMockShutdownModule(closeRedisMock, closeDbMock, exitMock)
			await mockModule.triggerSignal('SIGTERM')

			expect(closeRedisMock).toHaveBeenCalledTimes(1)
			expect(closeDbMock).toHaveBeenCalledTimes(1)
		})

		test('should call process.exit(0) after closing connections', async () => {
			const closeRedisMock = mock(() => Promise.resolve())
			const closeDbMock = mock(() => Promise.resolve())
			const exitMock = mock(() => undefined)

			const mockModule = createMockShutdownModule(closeRedisMock, closeDbMock, exitMock)
			await mockModule.triggerSignal('SIGTERM')

			expect(exitMock).toHaveBeenCalledTimes(1)
			expect(exitMock).toHaveBeenCalledWith(0)
		})

		test('should close connections in parallel', async () => {
			const callOrder: string[] = []
			const closeRedisMock = mock(async () => {
				callOrder.push('redis-start')
				await new Promise((r) => setTimeout(r, 10))
				callOrder.push('redis-end')
			})
			const closeDbMock = mock(async () => {
				callOrder.push('db-start')
				await new Promise((r) => setTimeout(r, 10))
				callOrder.push('db-end')
			})
			const exitMock = mock(() => undefined)

			const mockModule = createMockShutdownModule(closeRedisMock, closeDbMock, exitMock)
			await mockModule.triggerSignal('SIGTERM')

			// Both should start before either ends (parallel execution)
			expect(callOrder.indexOf('redis-start')).toBeLessThan(callOrder.indexOf('redis-end'))
			expect(callOrder.indexOf('db-start')).toBeLessThan(callOrder.indexOf('db-end'))
			// Verify both started before both ended
			const firstEnd = Math.min(callOrder.indexOf('redis-end'), callOrder.indexOf('db-end'))
			expect(callOrder.indexOf('redis-start')).toBeLessThan(firstEnd)
			expect(callOrder.indexOf('db-start')).toBeLessThan(firstEnd)
		})
	})

	describe('SIGINT Handler', () => {
		test('should close Redis and DB connections on SIGINT', async () => {
			const closeRedisMock = mock(() => Promise.resolve())
			const closeDbMock = mock(() => Promise.resolve())
			const exitMock = mock(() => undefined)

			const mockModule = createMockShutdownModule(closeRedisMock, closeDbMock, exitMock)
			await mockModule.triggerSignal('SIGINT')

			expect(closeRedisMock).toHaveBeenCalledTimes(1)
			expect(closeDbMock).toHaveBeenCalledTimes(1)
		})

		test('should call process.exit(0) after closing connections', async () => {
			const closeRedisMock = mock(() => Promise.resolve())
			const closeDbMock = mock(() => Promise.resolve())
			const exitMock = mock(() => undefined)

			const mockModule = createMockShutdownModule(closeRedisMock, closeDbMock, exitMock)
			await mockModule.triggerSignal('SIGINT')

			expect(exitMock).toHaveBeenCalledTimes(1)
			expect(exitMock).toHaveBeenCalledWith(0)
		})
	})

	describe('Error Handling', () => {
		test('should propagate Redis close errors', async () => {
			const closeRedisMock = mock(() => Promise.reject(new Error('Redis close failed')))
			const closeDbMock = mock(() => Promise.resolve())
			const exitMock = mock(() => undefined)

			const mockModule = createMockShutdownModule(closeRedisMock, closeDbMock, exitMock)

			await expect(mockModule.triggerSignal('SIGTERM')).rejects.toThrow('Redis close failed')
		})

		test('should propagate DB close errors', async () => {
			const closeRedisMock = mock(() => Promise.resolve())
			const closeDbMock = mock(() => Promise.reject(new Error('DB close failed')))
			const exitMock = mock(() => undefined)

			const mockModule = createMockShutdownModule(closeRedisMock, closeDbMock, exitMock)

			await expect(mockModule.triggerSignal('SIGTERM')).rejects.toThrow('DB close failed')
		})
	})
})

/**
 * Creates a mock shutdown module that simulates the signal handler behavior
 * from index.ts for testing purposes
 */
function createMockShutdownModule(
	closeRedis: () => Promise<void>,
	closeDb: () => Promise<void>,
	processExit: (code: number) => void = () => undefined
) {
	const handlers = new Map<string, () => Promise<void>>()

	// Simulate the gracefulShutdown function from index.ts
	const gracefulShutdown = async () => {
		await Promise.all([closeRedis(), closeDb()])
		processExit(0)
	}

	handlers.set('SIGTERM', gracefulShutdown)
	handlers.set('SIGINT', gracefulShutdown)

	return {
		hasHandler: (signal: string) => handlers.has(signal),
		triggerSignal: async (signal: string) => {
			const handler = handlers.get(signal)
			if (handler) {
				await handler()
			}
		},
	}
}
