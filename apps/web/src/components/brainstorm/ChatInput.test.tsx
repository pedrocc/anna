import { describe, expect, it } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { useEffect, useRef, useState } from 'react'

/**
 * Tests for ChatInput's rapid-send protection.
 *
 * The ChatInput component uses a synchronous ref-based guard (isSendingRef)
 * to prevent multiple sends before React's async state propagation
 * disables the button via the `disabled` prop.
 *
 * This simulates the core guard logic without rendering the full component
 * (avoids needing to mock @repo/ui and DOM interactions).
 */

// Simulates the core guard logic of ChatInput
function useChatInputBehavior() {
	const [input, setInput] = useState('test message')
	const [disabled, setDisabled] = useState(false)
	const isSendingRef = useRef(false)
	const sendCount = useRef(0)

	// Reset the sending guard when disabled prop changes
	useEffect(() => {
		if (!disabled) {
			isSendingRef.current = false
		}
	}, [disabled])

	const handleSubmit = () => {
		const trimmed = input.trim()
		if (trimmed && !disabled && !isSendingRef.current) {
			isSendingRef.current = true
			sendCount.current++
			setInput('')
		}
	}

	return {
		handleSubmit,
		getSendCount: () => sendCount.current,
		isSending: () => isSendingRef.current,
		setInput,
		setDisabled,
		input,
		disabled,
	}
}

describe('ChatInput rapid-send guard', () => {
	it('should allow first send', () => {
		const { result } = renderHook(() => useChatInputBehavior())

		act(() => {
			result.current.handleSubmit()
		})

		expect(result.current.getSendCount()).toBe(1)
		expect(result.current.isSending()).toBe(true)
	})

	it('should block rapid second send before disabled prop propagates', () => {
		const { result } = renderHook(() => useChatInputBehavior())

		// Simulate rapid double-click: two sends in same microtask
		act(() => {
			result.current.handleSubmit()
			result.current.handleSubmit()
		})

		expect(result.current.getSendCount()).toBe(1)
	})

	it('should block multiple rapid sends', () => {
		const { result } = renderHook(() => useChatInputBehavior())

		// Simulate 5 rapid clicks
		act(() => {
			result.current.handleSubmit()
			result.current.handleSubmit()
			result.current.handleSubmit()
			result.current.handleSubmit()
			result.current.handleSubmit()
		})

		expect(result.current.getSendCount()).toBe(1)
	})

	it('should allow new send after disabled cycle completes', () => {
		const { result } = renderHook(() => useChatInputBehavior())

		// First send
		act(() => {
			result.current.handleSubmit()
		})
		expect(result.current.getSendCount()).toBe(1)
		expect(result.current.isSending()).toBe(true)

		// Simulate parent setting disabled=true then disabled=false (stream complete)
		act(() => {
			result.current.setDisabled(true)
		})
		act(() => {
			result.current.setDisabled(false)
		})
		expect(result.current.isSending()).toBe(false)

		// Set new input and send again
		act(() => {
			result.current.setInput('second message')
		})
		act(() => {
			result.current.handleSubmit()
		})

		expect(result.current.getSendCount()).toBe(2)
	})

	it('should not send when disabled prop is true', () => {
		const { result } = renderHook(() => useChatInputBehavior())

		act(() => {
			result.current.setDisabled(true)
		})
		act(() => {
			result.current.handleSubmit()
		})

		expect(result.current.getSendCount()).toBe(0)
		expect(result.current.isSending()).toBe(false)
	})

	it('should not send when input is empty', () => {
		const { result } = renderHook(() => useChatInputBehavior())

		act(() => {
			result.current.setInput('')
		})
		act(() => {
			result.current.handleSubmit()
		})

		expect(result.current.getSendCount()).toBe(0)
		expect(result.current.isSending()).toBe(false)
	})

	it('should not send when input is only whitespace', () => {
		const { result } = renderHook(() => useChatInputBehavior())

		act(() => {
			result.current.setInput('   ')
		})
		act(() => {
			result.current.handleSubmit()
		})

		expect(result.current.getSendCount()).toBe(0)
		expect(result.current.isSending()).toBe(false)
	})

	it('should clear input after successful send', () => {
		const { result } = renderHook(() => useChatInputBehavior())

		act(() => {
			result.current.handleSubmit()
		})

		expect(result.current.input).toBe('')
	})

	it('should handle rapid sends across multiple act blocks', () => {
		const { result } = renderHook(() => useChatInputBehavior())

		// First click
		act(() => {
			result.current.handleSubmit()
		})

		// Second click in separate act (still before disabled propagates)
		act(() => {
			result.current.setInput('another message')
		})
		act(() => {
			result.current.handleSubmit()
		})

		// Guard should still block because disabled hasn't cycled
		expect(result.current.getSendCount()).toBe(1)
	})

	it('should reset guard only when disabled transitions to false', () => {
		const { result } = renderHook(() => useChatInputBehavior())

		// Send and lock
		act(() => {
			result.current.handleSubmit()
		})
		expect(result.current.isSending()).toBe(true)

		// Setting disabled=true should NOT reset the guard
		act(() => {
			result.current.setDisabled(true)
		})
		expect(result.current.isSending()).toBe(true)

		// Setting disabled=false SHOULD reset the guard
		act(() => {
			result.current.setDisabled(false)
		})
		expect(result.current.isSending()).toBe(false)
	})
})
