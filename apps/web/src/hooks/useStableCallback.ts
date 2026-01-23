import { useCallback, useRef } from 'react'

/**
 * Returns a stable callback reference that always invokes the latest version
 * of the provided function. Useful for stabilizing SWR's `mutate` or any
 * callback that may change identity across renders, preventing unnecessary
 * re-creations of dependent callbacks and stale closures.
 */
// biome-ignore lint/suspicious/noExplicitAny: generic callback type
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
	const callbackRef = useRef(callback)
	callbackRef.current = callback

	return useCallback((...args: Parameters<T>) => callbackRef.current(...args), []) as T
}
