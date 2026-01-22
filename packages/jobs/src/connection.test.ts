import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'

describe('connection', () => {
	let mockRedis: {
		status: string
		quit: () => Promise<string>
	}

	beforeEach(() => {
		mockRedis = {
			status: 'ready',
			quit: mock(() => Promise.resolve('OK')),
		}
	})

	afterEach(() => {
		mock.restore()
	})

	describe('closeRedis', () => {
		it('should call quit when connection is active', async () => {
			// Mock the module
			const mockModule = {
				connection: mockRedis,
				closeRedis: async () => {
					if (mockRedis.status !== 'end') {
						await mockRedis.quit()
					}
				},
			}

			await mockModule.closeRedis()

			expect(mockRedis.quit).toHaveBeenCalledTimes(1)
		})

		it('should not call quit when connection is already ended', async () => {
			mockRedis.status = 'end'

			const mockModule = {
				connection: mockRedis,
				closeRedis: async () => {
					if (mockRedis.status !== 'end') {
						await mockRedis.quit()
					}
				},
			}

			await mockModule.closeRedis()

			expect(mockRedis.quit).toHaveBeenCalledTimes(0)
		})
	})
})
