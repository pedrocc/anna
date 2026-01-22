import { type RefObject, useEffect } from 'react'

/**
 * Auto-scrolls to a target element when a dependency changes,
 * using requestAnimationFrame with proper cleanup to avoid
 * state updates on unmounted components.
 */
export function useAutoScroll(scrollRef: RefObject<HTMLElement | null>, dependency: unknown) {
	// biome-ignore lint/correctness/useExhaustiveDependencies: dependency triggers scroll, scrollRef is stable
	useEffect(() => {
		const scrollTarget = scrollRef.current
		if (!scrollTarget) return

		const rafId = requestAnimationFrame(() => {
			scrollTarget.scrollIntoView({ behavior: 'smooth' })
		})

		return () => cancelAnimationFrame(rafId)
	}, [dependency])
}
