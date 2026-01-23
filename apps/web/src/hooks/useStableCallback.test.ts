import { describe, expect, it, mock } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { useStableCallback } from './useStableCallback'

describe('useStableCallback', () => {
	it('should return a stable function reference across re-renders', () => {
		const { result, rerender } = renderHook(({ fn }) => useStableCallback(fn), {
			initialProps: { fn: () => 'first' },
		})

		const firstRef = result.current
		rerender({ fn: () => 'second' })
		const secondRef = result.current

		expect(firstRef).toBe(secondRef)
	})

	it('should always call the latest version of the callback', () => {
		const first = mock(() => 'first')
		const second = mock(() => 'second')

		const { result, rerender } = renderHook(({ fn }) => useStableCallback(fn), {
			initialProps: { fn: first },
		})

		expect(result.current()).toBe('first')
		expect(first).toHaveBeenCalledTimes(1)

		rerender({ fn: second })

		expect(result.current()).toBe('second')
		expect(second).toHaveBeenCalledTimes(1)
		expect(first).toHaveBeenCalledTimes(1)
	})

	it('should pass arguments through to the latest callback', () => {
		const fn = mock((a: number, b: string) => `${a}-${b}`)

		const { result } = renderHook(() => useStableCallback(fn))

		const returnValue = result.current(42, 'hello')

		expect(fn).toHaveBeenCalledWith(42, 'hello')
		expect(returnValue).toBe('42-hello')
	})

	it('should handle async callbacks', async () => {
		const fn = mock(async (value: string) => `resolved-${value}`)

		const { result } = renderHook(() => useStableCallback(fn))

		const returnValue = await result.current('test')

		expect(fn).toHaveBeenCalledWith('test')
		expect(returnValue).toBe('resolved-test')
	})

	it('should not create a new closure when callback identity changes', () => {
		let callCount = 0
		const { result, rerender } = renderHook(
			({ id }) =>
				useStableCallback(() => {
					callCount++
					return id
				}),
			{ initialProps: { id: 1 } }
		)

		const stableRef = result.current

		// Re-render with different id (creates new callback)
		rerender({ id: 2 })

		// Reference should be the same
		expect(result.current).toBe(stableRef)

		// But calling it should use the latest closure
		expect(result.current()).toBe(2)
		expect(callCount).toBe(1)
	})

	it('should preserve this context when called', () => {
		const obj = {
			value: 'context',
			method() {
				return this.value
			},
		}

		const { result } = renderHook(() => useStableCallback(obj.method.bind(obj)))

		expect(result.current()).toBe('context')
	})
})
