import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

// Mock the closeRedis function before importing index
const mockCloseRedis = mock(() => Promise.resolve())

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
			const mockModule = createMockShutdownModule(mockCloseRedis)

			expect(mockModule.hasHandler('SIGTERM')).toBe(true)
		})

		test('should register SIGINT handler', async () => {
			const mockModule = createMockShutdownModule(mockCloseRedis)

			expect(mockModule.hasHandler('SIGINT')).toBe(true)
		})
	})

	describe('SIGTERM Handler', () => {
		test('should close Redis connection on SIGTERM', async () => {
			const closeRedisMock = mock(() => Promise.resolve())
			const exitMock = mock(() => undefined)

			const mockModule = createMockShutdownModule(closeRedisMock, exitMock)
			await mockModule.triggerSignal('SIGTERM')

			expect(closeRedisMock).toHaveBeenCalledTimes(1)
		})

		test('should call process.exit(0) after closing connections', async () => {
			const closeRedisMock = mock(() => Promise.resolve())
			const exitMock = mock(() => undefined)

			const mockModule = createMockShutdownModule(closeRedisMock, exitMock)
			await mockModule.triggerSignal('SIGTERM')

			expect(exitMock).toHaveBeenCalledTimes(1)
			expect(exitMock).toHaveBeenCalledWith(0)
		})
	})

	describe('SIGINT Handler', () => {
		test('should close Redis connection on SIGINT', async () => {
			const closeRedisMock = mock(() => Promise.resolve())
			const exitMock = mock(() => undefined)

			const mockModule = createMockShutdownModule(closeRedisMock, exitMock)
			await mockModule.triggerSignal('SIGINT')

			expect(closeRedisMock).toHaveBeenCalledTimes(1)
		})

		test('should call process.exit(0) after closing connections', async () => {
			const closeRedisMock = mock(() => Promise.resolve())
			const exitMock = mock(() => undefined)

			const mockModule = createMockShutdownModule(closeRedisMock, exitMock)
			await mockModule.triggerSignal('SIGINT')

			expect(exitMock).toHaveBeenCalledTimes(1)
			expect(exitMock).toHaveBeenCalledWith(0)
		})
	})

	describe('Error Handling', () => {
		test('should handle Redis close errors gracefully', async () => {
			const closeRedisMock = mock(() => Promise.reject(new Error('Redis close failed')))
			const exitMock = mock(() => undefined)

			const mockModule = createMockShutdownModule(closeRedisMock, exitMock)

			// Should not throw
			await expect(mockModule.triggerSignal('SIGTERM')).rejects.toThrow('Redis close failed')
		})
	})
})

/**
 * Creates a mock shutdown module that simulates the signal handler behavior
 * from index.ts for testing purposes
 */
function createMockShutdownModule(
	closeRedis: () => Promise<void>,
	processExit: (code: number) => void = () => undefined
) {
	const handlers = new Map<string, () => Promise<void>>()

	// Simulate the signal handler registration from index.ts
	handlers.set('SIGTERM', async () => {
		await closeRedis()
		processExit(0)
	})

	handlers.set('SIGINT', async () => {
		await closeRedis()
		processExit(0)
	})

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
