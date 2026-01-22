import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { useRef } from 'react'
import { useAutoScroll } from './useAutoScroll'

describe('useAutoScroll', () => {
	let originalRAF: typeof globalThis.requestAnimationFrame
	let originalCAF: typeof globalThis.cancelAnimationFrame
	let rafCallbacks: Map<number, FrameRequestCallback>
	let nextRafId: number

	beforeEach(() => {
		originalRAF = globalThis.requestAnimationFrame
		originalCAF = globalThis.cancelAnimationFrame
		rafCallbacks = new Map()
		nextRafId = 1

		globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
			const id = nextRafId++
			rafCallbacks.set(id, cb)
			return id
		}
		globalThis.cancelAnimationFrame = (id: number) => {
			rafCallbacks.delete(id)
		}
	})

	afterEach(() => {
		globalThis.requestAnimationFrame = originalRAF
		globalThis.cancelAnimationFrame = originalCAF
	})

	it('should call scrollIntoView via requestAnimationFrame when dependency changes', () => {
		const scrollIntoView = mock(() => {})
		const element = { scrollIntoView } as unknown as HTMLDivElement

		const { rerender } = renderHook(
			({ dep }) => {
				const ref = useRef<HTMLDivElement>(element)
				useAutoScroll(ref, dep)
			},
			{ initialProps: { dep: 1 } }
		)

		// Execute the RAF callback
		for (const [, cb] of rafCallbacks) {
			cb(0)
		}

		expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })

		scrollIntoView.mockClear()
		rafCallbacks.clear()

		// Change dependency to trigger another scroll
		rerender({ dep: 2 })

		for (const [, cb] of rafCallbacks) {
			cb(0)
		}

		expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })
	})

	it('should not call scrollIntoView if ref is null', () => {
		renderHook(() => {
			const ref = useRef<HTMLDivElement>(null)
			useAutoScroll(ref, 1)
		})

		expect(rafCallbacks.size).toBe(0)
	})

	it('should cancel pending animation frame on unmount', () => {
		const scrollIntoView = mock(() => {})
		const element = { scrollIntoView } as unknown as HTMLDivElement

		const { unmount } = renderHook(() => {
			const ref = useRef<HTMLDivElement>(element)
			useAutoScroll(ref, 1)
		})

		expect(rafCallbacks.size).toBe(1)

		unmount()

		// RAF should have been cancelled
		expect(rafCallbacks.size).toBe(0)
		// scrollIntoView should not have been called since we cancelled
		expect(scrollIntoView).not.toHaveBeenCalled()
	})

	it('should cancel previous animation frame when dependency changes', () => {
		const scrollIntoView = mock(() => {})
		const element = { scrollIntoView } as unknown as HTMLDivElement

		const { rerender } = renderHook(
			({ dep }) => {
				const ref = useRef<HTMLDivElement>(element)
				useAutoScroll(ref, dep)
			},
			{ initialProps: { dep: 1 } }
		)

		expect(rafCallbacks.size).toBe(1)
		const firstRafId = [...rafCallbacks.keys()][0]

		// Change dependency - should cancel old RAF and schedule new one
		rerender({ dep: 2 })

		// Old RAF should be cancelled, new one scheduled
		expect(rafCallbacks.has(firstRafId)).toBe(false)
		expect(rafCallbacks.size).toBe(1)
	})

	it('should not re-trigger when dependency stays the same', () => {
		const scrollIntoView = mock(() => {})
		const element = { scrollIntoView } as unknown as HTMLDivElement

		const { rerender } = renderHook(
			({ dep }) => {
				const ref = useRef<HTMLDivElement>(element)
				useAutoScroll(ref, dep)
			},
			{ initialProps: { dep: 1 } }
		)

		// Execute initial RAF
		for (const [, cb] of rafCallbacks) {
			cb(0)
		}
		rafCallbacks.clear()
		scrollIntoView.mockClear()

		// Re-render with same dependency
		rerender({ dep: 1 })

		// No new RAF should be scheduled
		expect(rafCallbacks.size).toBe(0)
		expect(scrollIntoView).not.toHaveBeenCalled()
	})
})
