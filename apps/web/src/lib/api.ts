import { toast } from '@repo/ui'

interface ClerkInstance {
	loaded?: boolean
	session?: {
		getToken: (options?: { skipCache?: boolean }) => Promise<string | null>
	}
	addListener?: (callback: (resources: { session?: unknown }) => void) => () => void
}

interface ClerkGlobal {
	Clerk?: ClerkInstance
}

// Replaced at build time by Bun's define option
declare const __API_URL__: string | undefined
const API_URL = __API_URL__ ?? '/api'

/**
 * Wait for Clerk to be fully loaded and session to be available, then get the auth token
 * @param maxWaitMs - Maximum time to wait for Clerk to load
 * @param forceRefresh - If true, forces a fresh token fetch (bypasses cache)
 */
async function getAuthToken(maxWaitMs = 10000, forceRefresh = false): Promise<string | null> {
	const startTime = Date.now()

	// Wait for Clerk object to be available
	while (!(globalThis as unknown as ClerkGlobal).Clerk && Date.now() - startTime < maxWaitMs) {
		await new Promise((resolve) => setTimeout(resolve, 50))
	}

	const clerk = (globalThis as unknown as ClerkGlobal).Clerk

	// If Clerk is not available at all, return null
	if (!clerk) {
		return null
	}

	// Wait for Clerk to be loaded
	while (!clerk.loaded && Date.now() - startTime < maxWaitMs) {
		await new Promise((resolve) => setTimeout(resolve, 50))
	}

	if (!clerk.loaded) {
		return null
	}

	// Wait for session to be available
	while (!clerk.session && Date.now() - startTime < maxWaitMs) {
		await new Promise((resolve) => setTimeout(resolve, 100))
	}

	// If still no session after waiting, return null
	if (!clerk.session) {
		return null
	}

	try {
		// Clerk's getToken() accepts skipCache to force a fresh token
		return await clerk.session.getToken(forceRefresh ? { skipCache: true } : undefined)
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
