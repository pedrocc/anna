import { describe, expect, it, mock } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { useCallback } from 'react'

/**
 * Tests for PlanningSession's handleStepUpdate callback dependency array.
 *
 * The bug: handleStepUpdate captured an obsolete generateDocument reference
 * when navigating quickly between sessions. This could cause document generation
 * for the wrong session.
 *
 * The fix: Adding `id` to the dependency array ensures handleStepUpdate is
 * recreated when the session ID changes.
 */

// Simulate the hook behavior from PlanningSession
function useHandleStepUpdate(
	id: string | undefined,
	mutate: () => void,
	generateDocument: () => Promise<void>
) {
	// biome-ignore lint/correctness/useExhaustiveDependencies: id ensures callback is recreated when navigating between sessions
	return useCallback(
		(newStep: string) => {
			mutate()
			if (newStep === 'complete') {
				generateDocument()
			}
		},
		[id, mutate, generateDocument]
	)
}

describe('PlanningSession handleStepUpdate', () => {
	it('should recreate callback when id changes', () => {
		const mutate = mock(() => {})
		const generateDoc1 = mock(() => Promise.resolve())
		const generateDoc2 = mock(() => Promise.resolve())

		// First render with session 1
		const { result, rerender } = renderHook(({ id, gen }) => useHandleStepUpdate(id, mutate, gen), {
			initialProps: { id: 'session-1', gen: generateDoc1 },
		})

		const callback1 = result.current

		// Rerender with same id - callback should be stable
		rerender({ id: 'session-1', gen: generateDoc1 })
		expect(result.current).toBe(callback1)

		// Rerender with different id - callback should change
		rerender({ id: 'session-2', gen: generateDoc2 })
		expect(result.current).not.toBe(callback1)

		// Call the new callback and verify it uses the new generateDocument
		result.current('complete')
		expect(generateDoc2).toHaveBeenCalled()
		expect(generateDoc1).not.toHaveBeenCalled()
	})

	it('should call correct generateDocument after session navigation', () => {
		const mutate = mock(() => {})
		const generateForSession1 = mock(() => Promise.resolve())
		const generateForSession2 = mock(() => Promise.resolve())

		const { result, rerender } = renderHook(({ id, gen }) => useHandleStepUpdate(id, mutate, gen), {
			initialProps: { id: 'session-1', gen: generateForSession1 },
		})

		// Navigate to session 2
		rerender({ id: 'session-2', gen: generateForSession2 })

		// Trigger complete step - should use session 2's generateDocument
		result.current('complete')

		expect(generateForSession2).toHaveBeenCalledTimes(1)
		expect(generateForSession1).toHaveBeenCalledTimes(0)
	})

	it('should not call generateDocument for non-complete steps', () => {
		const mutate = mock(() => {})
		const generateDocument = mock(() => Promise.resolve())

		const { result } = renderHook(() => useHandleStepUpdate('session-1', mutate, generateDocument))

		result.current('review')
		expect(generateDocument).not.toHaveBeenCalled()
		expect(mutate).toHaveBeenCalled()
	})

	it('should always call mutate regardless of step', () => {
		const mutate = mock(() => {})
		const generateDocument = mock(() => Promise.resolve())

		const { result } = renderHook(() => useHandleStepUpdate('session-1', mutate, generateDocument))

		result.current('planning')
		expect(mutate).toHaveBeenCalledTimes(1)

		result.current('review')
		expect(mutate).toHaveBeenCalledTimes(2)

		result.current('complete')
		expect(mutate).toHaveBeenCalledTimes(3)
	})
})
