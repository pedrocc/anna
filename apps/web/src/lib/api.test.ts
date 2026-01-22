import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { toast } from '@repo/ui'
import { apiRequest, fetcher } from './api.js'

// Mock Clerk globally
const mockGetToken = mock(() => Promise.resolve('test-token'))
;(globalThis as unknown as { Clerk: unknown }).Clerk = {
	loaded: true,
	session: {
		getToken: mockGetToken,
	},
}

describe('API error toast notifications', () => {
	let toastErrorSpy: ReturnType<typeof spyOn>

	beforeEach(() => {
		toastErrorSpy = spyOn(toast, 'error')
	})

	afterEach(() => {
		toastErrorSpy.mockRestore()
		mock.restore()
	})

	describe('fetcher', () => {
		it('should show toast on API error with server message', async () => {
			const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response(JSON.stringify({ error: { message: 'Session not found' } }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				})
			)

			await expect(fetcher('/api/v1/briefing/sessions/123')).rejects.toThrow('Session not found')
			expect(toastErrorSpy).toHaveBeenCalledWith('Erro', { description: 'Session not found' })

			mockFetch.mockRestore()
		})

		it('should show toast with fallback message when response is not JSON', async () => {
			const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response('Internal Server Error', {
					status: 500,
					headers: { 'Content-Type': 'text/plain' },
				})
			)

			await expect(fetcher('/api/v1/users/me')).rejects.toThrow('Request failed')
			expect(toastErrorSpy).toHaveBeenCalledWith('Erro', { description: 'Request failed' })

			mockFetch.mockRestore()
		})

		it('should not show toast on successful request', async () => {
			const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response(JSON.stringify({ success: true, data: { id: '1', name: 'Test' } }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				})
			)

			const result = await fetcher('/api/v1/users/me')
			expect(result).toEqual({ id: '1', name: 'Test' })
			expect(toastErrorSpy).not.toHaveBeenCalled()

			mockFetch.mockRestore()
		})
	})

	describe('apiRequest', () => {
		it('should show toast on API error with server message', async () => {
			const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response(JSON.stringify({ error: { message: 'Validation failed' } }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				})
			)

			await expect(
				apiRequest('/api/v1/briefing/sessions', { method: 'POST', json: {} })
			).rejects.toThrow('Validation failed')
			expect(toastErrorSpy).toHaveBeenCalledWith('Erro', { description: 'Validation failed' })

			mockFetch.mockRestore()
		})

		it('should show toast with fallback message on non-JSON error', async () => {
			const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response('Bad Gateway', {
					status: 502,
					headers: { 'Content-Type': 'text/plain' },
				})
			)

			await expect(apiRequest('/api/v1/users/me', { method: 'PATCH', json: {} })).rejects.toThrow(
				'Request failed'
			)
			expect(toastErrorSpy).toHaveBeenCalledWith('Erro', { description: 'Request failed' })

			mockFetch.mockRestore()
		})

		it('should not show toast on successful request', async () => {
			const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response(JSON.stringify({ success: true, data: { updated: true } }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				})
			)

			const result = await apiRequest('/api/v1/users/me', {
				method: 'PATCH',
				json: { name: 'New' },
			})
			expect(result).toEqual({ updated: true })
			expect(toastErrorSpy).not.toHaveBeenCalled()

			mockFetch.mockRestore()
		})

		it('should retry with fresh token on 401 before showing toast', async () => {
			let callCount = 0
			const mockFetch = spyOn(globalThis, 'fetch').mockImplementation(() => {
				callCount++
				if (callCount === 1) {
					return Promise.resolve(
						new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), {
							status: 401,
							headers: { 'Content-Type': 'application/json' },
						})
					)
				}
				// Second call also fails (token refresh didn't help)
				return Promise.resolve(
					new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), {
						status: 401,
						headers: { 'Content-Type': 'application/json' },
					})
				)
			})

			await expect(apiRequest('/api/v1/users/me')).rejects.toThrow('Unauthorized')
			expect(callCount).toBe(2) // Retried once
			expect(toastErrorSpy).toHaveBeenCalledWith('Erro', { description: 'Unauthorized' })

			mockFetch.mockRestore()
		})
	})
})
