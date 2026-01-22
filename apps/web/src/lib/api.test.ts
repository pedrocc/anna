import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { toast } from '@repo/ui'
import { apiRequest, fetcher, getAuthToken } from './api.js'

interface MockClerk {
	loaded: boolean
	session: { getToken: ReturnType<typeof mock> } | null
	addListener?: (callback: (resources: { session?: unknown }) => void) => () => void
}

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

describe('getAuthToken', () => {
	let originalClerk: unknown

	beforeEach(() => {
		originalClerk = (globalThis as unknown as { Clerk: unknown }).Clerk
	})

	afterEach(() => {
		;(globalThis as unknown as { Clerk: unknown }).Clerk = originalClerk
	})

	it('should return token immediately when Clerk is loaded with session', async () => {
		const getToken = mock(() => Promise.resolve('immediate-token'))
		;(globalThis as unknown as { Clerk: MockClerk }).Clerk = {
			loaded: true,
			session: { getToken },
		}

		const token = await getAuthToken(1000)
		expect(token).toBe('immediate-token')
		expect(getToken).toHaveBeenCalledTimes(1)
	})

	it('should pass skipCache when forceRefresh is true', async () => {
		const getToken = mock(() => Promise.resolve('fresh-token'))
		;(globalThis as unknown as { Clerk: MockClerk }).Clerk = {
			loaded: true,
			session: { getToken },
		}

		const token = await getAuthToken(1000, true)
		expect(token).toBe('fresh-token')
		expect(getToken).toHaveBeenCalledWith({ skipCache: true })
	})

	it('should return null when Clerk instance is not available within timeout', async () => {
		;(globalThis as unknown as { Clerk: unknown }).Clerk = undefined

		const token = await getAuthToken(100)
		expect(token).toBeNull()
	})

	it('should use addListener to wait for session when not immediately available', async () => {
		const getToken = mock(() => Promise.resolve('listener-token'))

		const clerkInstance: MockClerk = {
			loaded: true,
			session: null,
			addListener: (callback) => {
				// Simulate session becoming available after a short delay
				setTimeout(() => {
					callback({ session: { getToken } })
				}, 50)
				return () => {}
			},
		}
		;(globalThis as unknown as { Clerk: MockClerk }).Clerk = clerkInstance

		const token = await getAuthToken(5000)
		expect(token).toBe('listener-token')
		expect(getToken).toHaveBeenCalledTimes(1)
	})

	it('should return null when addListener times out without session', async () => {
		const clerkInstance: MockClerk = {
			loaded: true,
			session: null,
			addListener: (_callback) => {
				// Never calls the callback (simulates no session)
				return () => {}
			},
		}
		;(globalThis as unknown as { Clerk: MockClerk }).Clerk = clerkInstance

		const token = await getAuthToken(100)
		expect(token).toBeNull()
	})

	it('should return null when addListener is not available and no session', async () => {
		const clerkInstance: MockClerk = {
			loaded: true,
			session: null,
		}
		;(globalThis as unknown as { Clerk: MockClerk }).Clerk = clerkInstance

		const token = await getAuthToken(100)
		expect(token).toBeNull()
	})

	it('should unsubscribe listener after session is received', async () => {
		const getToken = mock(() => Promise.resolve('token'))
		let unsubscribeCalled = false

		const clerkInstance: MockClerk = {
			loaded: true,
			session: null,
			addListener: (callback) => {
				setTimeout(() => {
					callback({ session: { getToken } })
				}, 10)
				return () => {
					unsubscribeCalled = true
				}
			},
		}
		;(globalThis as unknown as { Clerk: MockClerk }).Clerk = clerkInstance

		await getAuthToken(5000)
		expect(unsubscribeCalled).toBe(true)
	})

	it('should unsubscribe listener on timeout', async () => {
		let unsubscribeCalled = false

		const clerkInstance: MockClerk = {
			loaded: true,
			session: null,
			addListener: (_callback) => {
				return () => {
					unsubscribeCalled = true
				}
			},
		}
		;(globalThis as unknown as { Clerk: MockClerk }).Clerk = clerkInstance

		await getAuthToken(50)
		expect(unsubscribeCalled).toBe(true)
	})

	it('should return null when getToken throws', async () => {
		const getToken = mock(() => Promise.reject(new Error('Token error')))
		;(globalThis as unknown as { Clerk: MockClerk }).Clerk = {
			loaded: true,
			session: { getToken },
		}

		const token = await getAuthToken(1000)
		expect(token).toBeNull()
	})

	it('should wait for Clerk instance to become available', async () => {
		;(globalThis as unknown as { Clerk: unknown }).Clerk = undefined

		const getToken = mock(() => Promise.resolve('delayed-token'))

		// Set Clerk after a short delay
		setTimeout(() => {
			;(globalThis as unknown as { Clerk: MockClerk }).Clerk = {
				loaded: true,
				session: { getToken },
			}
		}, 50)

		const token = await getAuthToken(5000)
		expect(token).toBe('delayed-token')
	})
})
