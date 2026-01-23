import { type RefObject, useLayoutEffect } from 'react'

/**
 * Auto-scrolls to a target element when a dependency changes.
 * Uses useLayoutEffect to measure and scroll before the browser paints,
 * preventing visual flicker when content changes.
 */
export function useAutoScroll(scrollRef: RefObject<HTMLElement | null>, dependency: unknown) {
	// biome-ignore lint/correctness/useExhaustiveDependencies: dependency triggers scroll, scrollRef is stable
	useLayoutEffect(() => {
		if (!scrollRef.current) return

		scrollRef.current.scrollIntoView({ behavior: 'smooth' })
	}, [dependency])
}
