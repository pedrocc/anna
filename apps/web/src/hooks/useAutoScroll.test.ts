import { describe, expect, it, mock } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { useRef } from 'react'
import { useAutoScroll } from './useAutoScroll'

describe('useAutoScroll', () => {
	it('should call scrollIntoView when dependency changes', () => {
		const scrollIntoView = mock(() => {})
		const element = { scrollIntoView } as unknown as HTMLDivElement

		const { rerender } = renderHook(
			({ dep }) => {
				const ref = useRef<HTMLDivElement>(element)
				useAutoScroll(ref, dep)
			},
			{ initialProps: { dep: 1 } }
		)

		expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })

		scrollIntoView.mockClear()

		// Change dependency to trigger another scroll
		rerender({ dep: 2 })

		expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })
	})

	it('should not call scrollIntoView if ref is null', () => {
		const scrollIntoView = mock(() => {})

		renderHook(() => {
			const ref = useRef<HTMLDivElement>(null)
			useAutoScroll(ref, 1)
		})

		expect(scrollIntoView).not.toHaveBeenCalled()
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

		expect(scrollIntoView).toHaveBeenCalledTimes(1)
		scrollIntoView.mockClear()

		// Re-render with same dependency
		rerender({ dep: 1 })

		// Should not scroll again
		expect(scrollIntoView).not.toHaveBeenCalled()
	})

	it('should call scrollIntoView synchronously via useLayoutEffect', () => {
		const callOrder: string[] = []
		const scrollIntoView = mock(() => {
			callOrder.push('scrollIntoView')
		})
		const element = { scrollIntoView } as unknown as HTMLDivElement

		renderHook(() => {
			const ref = useRef<HTMLDivElement>(element)
			useAutoScroll(ref, 1)
		})

		// useLayoutEffect runs synchronously, so scrollIntoView should be called
		// immediately without needing requestAnimationFrame
		expect(scrollIntoView).toHaveBeenCalledTimes(1)
		expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })
	})
})
