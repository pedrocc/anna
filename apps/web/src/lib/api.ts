interface ClerkInstance {
	loaded?: boolean
	session?: {
		getToken: () => Promise<string | null>
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
 */
async function getAuthToken(maxWaitMs = 10000): Promise<string | null> {
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
		return await clerk.session.getToken()
	} catch {
		return null
	}
}

export async function fetcher<T>(path: string): Promise<T> {
	const token = await getAuthToken()

	const url = `${API_URL}${path}`
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	}
	if (token) {
		headers['Authorization'] = `Bearer ${token}`
	}

	const res = await fetch(url, { headers })

	if (!res.ok) {
		const error = await res.json().catch(() => ({ error: { message: 'Request failed' } }))
		throw new Error(error.error?.message ?? 'Request failed')
	}

	const data = await res.json()
	return data.data
}

export async function apiRequest<T>(
	path: string,
	options?: RequestInit & { json?: unknown }
): Promise<T> {
	const token = await getAuthToken()

	const res = await fetch(`${API_URL}${path}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...options?.headers,
		},
		body: options?.json ? JSON.stringify(options.json) : options?.body,
	})

	if (!res.ok) {
		const error = await res.json().catch(() => ({ error: { message: 'Request failed' } }))
		throw new Error(error.error?.message ?? 'Request failed')
	}

	const data = await res.json()
	return data.data
}
