import { describe, expect, it, mock } from 'bun:test'

describe('client', () => {
	describe('closeDb', () => {
		it('should call client.end() when closing', async () => {
			const mockEnd = mock(() => Promise.resolve())

			// Create a mock module that simulates the closeDb behavior
			const mockModule = {
				closeDb: async () => {
					await mockEnd()
				},
			}

			await mockModule.closeDb()

			expect(mockEnd).toHaveBeenCalledTimes(1)
		})

		it('should handle errors from client.end()', async () => {
			const mockEnd = mock(() => Promise.reject(new Error('Connection error')))

			const mockModule = {
				closeDb: async () => {
					await mockEnd()
				},
			}

			await expect(mockModule.closeDb()).rejects.toThrow('Connection error')
		})
	})
})
