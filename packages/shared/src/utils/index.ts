export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export class TimeoutError extends Error {
	constructor(ms: number) {
		super(`Operation timed out after ${ms}ms`)
		this.name = 'TimeoutError'
	}
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	let timeoutId: ReturnType<typeof setTimeout>
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => reject(new TimeoutError(ms)), ms)
	})

	return Promise.race([promise, timeoutPromise]).finally(() => {
		clearTimeout(timeoutId)
	})
}

export function fetchWithTimeout(
	url: string,
	options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
	const { timeout = 30_000, ...fetchOptions } = options

	if (fetchOptions.signal?.aborted) {
		return Promise.reject(fetchOptions.signal.reason ?? new DOMException('Aborted', 'AbortError'))
	}

	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(new TimeoutError(timeout)), timeout)

	const existingSignal = fetchOptions.signal
	if (existingSignal) {
		existingSignal.addEventListener(
			'abort',
			() => {
				controller.abort(existingSignal.reason)
			},
			{ once: true }
		)
	}

	const fetchPromise = fetch(url, { ...fetchOptions, signal: controller.signal })

	return withTimeout(fetchPromise, timeout).finally(() => {
		clearTimeout(timeoutId)
	})
}

export function generateId(): string {
	return crypto.randomUUID()
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
	const result = { ...obj }
	for (const key of keys) {
		delete result[key]
	}
	return result
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
	const result = {} as Pick<T, K>
	for (const key of keys) {
		if (key in obj) {
			result[key] = obj[key]
		}
	}
	return result
}

export function formatDate(date: Date, locale = 'pt-BR'): string {
	return new Intl.DateTimeFormat(locale, {
		dateStyle: 'short',
		timeStyle: 'short',
	}).format(date)
}
