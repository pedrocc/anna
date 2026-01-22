import { toast } from '@repo/ui'

interface ClerkSession {
	getToken: (options?: { skipCache?: boolean }) => Promise<string | null>
}

interface ClerkInstance {
	loaded?: boolean
	session?: ClerkSession
	addListener?: (callback: (resources: { session?: ClerkSession | null }) => void) => () => void
}

interface ClerkGlobal {
	Clerk?: ClerkInstance
}

// Replaced at build time by Bun's define option
declare const __API_URL__: string | undefined
const API_URL = __API_URL__ ?? '/api'

/**
 * Returns a promise that resolves when Clerk is available on globalThis.
 * Uses a brief polling loop only for the initial Clerk object availability
 * (before addListener can be used), with a timeout.
 */
function waitForClerkInstance(maxWaitMs: number): Promise<ClerkInstance | null> {
	const clerk = (globalThis as unknown as ClerkGlobal).Clerk
	if (clerk) return Promise.resolve(clerk)

	return new Promise((resolve) => {
		const startTime = Date.now()
		const interval = setInterval(() => {
			const instance = (globalThis as unknown as ClerkGlobal).Clerk
			if (instance) {
				clearInterval(interval)
				resolve(instance)
			} else if (Date.now() - startTime >= maxWaitMs) {
				clearInterval(interval)
				resolve(null)
			}
		}, 50)
	})
}

/**
 * Uses clerk.addListener to wait for the session to become available.
 * Resolves immediately if the session already exists.
 */
function waitForClerkSession(
	clerk: ClerkInstance,
	maxWaitMs: number
): Promise<ClerkSession | null> {
	if (clerk.session) return Promise.resolve(clerk.session)

	return new Promise((resolve) => {
		const timeout = setTimeout(() => {
			unsubscribe?.()
			resolve(null)
		}, maxWaitMs)

		const unsubscribe = clerk.addListener?.((resources) => {
			if (resources.session) {
				clearTimeout(timeout)
				unsubscribe?.()
				resolve(resources.session as ClerkSession)
			}
		})

		// If addListener is not available, fall back to null
		if (!unsubscribe) {
			clearTimeout(timeout)
			resolve(null)
		}
	})
}

/**
 * Wait for Clerk to be fully loaded and session to be available, then get the auth token.
 * Uses clerk.addListener to avoid polling for session readiness.
 * @param maxWaitMs - Maximum time to wait for Clerk to load
 * @param forceRefresh - If true, forces a fresh token fetch (bypasses cache)
 */
export async function getAuthToken(
	maxWaitMs = 10000,
	forceRefresh = false
): Promise<string | null> {
	const clerk = await waitForClerkInstance(maxWaitMs)
	if (!clerk) return null

	// If Clerk is already loaded and has a session, get token directly
	if (clerk.loaded && clerk.session) {
		try {
			return await clerk.session.getToken(forceRefresh ? { skipCache: true } : undefined)
		} catch {
			return null
		}
	}

	// Use addListener to wait for the session
	const session = await waitForClerkSession(clerk, maxWaitMs)
	if (!session) return null

	try {
		return await session.getToken(forceRefresh ? { skipCache: true } : undefined)
	} catch {
		return null
	}
}

export async function fetcher<T>(path: string): Promise<T> {
	const makeRequest = async (forceRefresh: boolean): Promise<Response> => {
		const token = await getAuthToken(10000, forceRefresh)
		const url = `${API_URL}${path}`
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		}
		if (token) {
			headers['Authorization'] = `Bearer ${token}`
		}
		return fetch(url, { headers })
	}

	let res = await makeRequest(false)

	// If 401 Unauthorized, try once with a fresh token
	if (res.status === 401) {
		res = await makeRequest(true)
	}

	if (!res.ok) {
		const error = await res.json().catch(() => ({ error: { message: 'Request failed' } }))
		const message = error.error?.message ?? 'Request failed'
		toast.error('Erro', { description: message })
		throw new Error(message)
	}

	const data = await res.json()
	return data.data
}

export async function apiRequest<T>(
	path: string,
	options?: RequestInit & { json?: unknown }
): Promise<T> {
	const makeRequest = async (forceRefresh: boolean): Promise<Response> => {
		const token = await getAuthToken(10000, forceRefresh)
		return fetch(`${API_URL}${path}`, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...(token ? { Authorization: `Bearer ${token}` } : {}),
				...options?.headers,
			},
			body: options?.json ? JSON.stringify(options.json) : options?.body,
		})
	}

	let res = await makeRequest(false)

	// If 401 Unauthorized, try once with a fresh token
	if (res.status === 401) {
		res = await makeRequest(true)
	}

	if (!res.ok) {
		const error = await res.json().catch(() => ({ error: { message: 'Request failed' } }))
		const message = error.error?.message ?? 'Request failed'
		toast.error('Erro', { description: message })
		throw new Error(message)
	}

	const data = await res.json()
	return data.data
}
