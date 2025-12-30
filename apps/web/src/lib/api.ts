interface ClerkGlobal {
	Clerk?: {
		session?: {
			getToken: () => Promise<string | null>
		}
	}
}

// Replaced at build time by Bun's define option
declare const __API_URL__: string | undefined
const API_URL = __API_URL__ ?? '/api'

export async function fetcher<T>(path: string): Promise<T> {
	const token = await (globalThis as unknown as ClerkGlobal).Clerk?.session?.getToken()

	const res = await fetch(`${API_URL}${path}`, {
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
	})

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
	const token = await (globalThis as unknown as ClerkGlobal).Clerk?.session?.getToken()

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
