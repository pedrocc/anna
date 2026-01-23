import { describe, expect, it } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

/**
 * Tests for session navigation behavior during streaming.
 *
 * The pattern: A single useLayoutEffect handles both mount tracking and
 * sessionId change detection, synchronizing refs before paint to prevent
 * visual flicker and stale state updates.
 */

// Simplified hook that simulates the core session navigation behavior we're testing
function useSessionNavigationBehavior(sessionId: string) {
	const [isStreaming, setIsStreaming] = useState(false)
	const [streamingContent, setStreamingContent] = useState('')
	const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null)
	const [error, setError] = useState<Error | null>(null)

	const isMountedRef = useRef(true)
	const abortControllerRef = useRef<AbortController | null>(null)
	const requestIdRef = useRef(0)
	const sessionIdRef = useRef(sessionId)

	// Combined: track mounted state and handle sessionId changes
	useLayoutEffect(() => {
		isMountedRef.current = true

		if (sessionIdRef.current !== sessionId) {
			abortControllerRef.current?.abort()
			setIsStreaming(false)
			setStreamingContent('')
			setPendingUserMessage(null)
			setError(null)
			requestIdRef.current++
		}
		sessionIdRef.current = sessionId

		return () => {
			isMountedRef.current = false
			abortControllerRef.current?.abort()
		}
	}, [sessionId])

	const cancelStream = useCallback(() => {
		abortControllerRef.current?.abort()
	}, [])

	const startStream = useCallback(
		(message: string) => {
			abortControllerRef.current?.abort()
			abortControllerRef.current = new AbortController()

			const currentRequestId = ++requestIdRef.current

			setIsStreaming(true)
			setStreamingContent('')
			setPendingUserMessage(message)

			// Simulate async streaming - returns helpers for test control
			return {
				currentRequestId,
				abortController: abortControllerRef.current,
				updateContent: (content: string) => {
					if (
						isMountedRef.current &&
						requestIdRef.current === currentRequestId &&
						sessionIdRef.current === sessionId
					) {
						setStreamingContent(content)
					}
				},
				complete: () => {
					if (isMountedRef.current && requestIdRef.current === currentRequestId) {
						setIsStreaming(false)
						setPendingUserMessage(null)
					}
				},
			}
		},
		[sessionId]
	)

	return {
		isStreaming,
		streamingContent,
		pendingUserMessage,
		error,
		cancelStream,
		startStream,
		getRequestId: () => requestIdRef.current,
		getSessionIdRef: () => sessionIdRef.current,
	}
}

describe('useSmChat session navigation', () => {
	it('should reset state when sessionId changes', () => {
		const { result, rerender } = renderHook(
			({ sessionId }) => useSessionNavigationBehavior(sessionId),
			{ initialProps: { sessionId: 'session-1' } }
		)

		// Initial state should be clean
		expect(result.current.isStreaming).toBe(false)
		expect(result.current.streamingContent).toBe('')
		expect(result.current.pendingUserMessage).toBeNull()
		expect(result.current.error).toBeNull()

		// Start streaming in session 1
		let stream1: ReturnType<typeof result.current.startStream>
		act(() => {
			stream1 = result.current.startStream('Hello')
		})
		expect(result.current.isStreaming).toBe(true)
		expect(result.current.pendingUserMessage).toBe('Hello')

		// Simulate content arriving
		act(() => {
			stream1!.updateContent('Partial response')
		})
		expect(result.current.streamingContent).toBe('Partial response')

		// Change session - should reset state
		rerender({ sessionId: 'session-2' })

		expect(result.current.isStreaming).toBe(false)
		expect(result.current.streamingContent).toBe('')
		expect(result.current.pendingUserMessage).toBeNull()
		expect(result.current.error).toBeNull()
	})

	it('should increment requestId when sessionId changes to invalidate pending callbacks', () => {
		const { result, rerender } = renderHook(
			({ sessionId }) => useSessionNavigationBehavior(sessionId),
			{ initialProps: { sessionId: 'session-1' } }
		)

		const initialRequestId = result.current.getRequestId()

		// Change session
		rerender({ sessionId: 'session-2' })

		// requestId should have been incremented
		expect(result.current.getRequestId()).toBe(initialRequestId + 1)
	})

	it('should update sessionIdRef when sessionId changes', () => {
		const { result, rerender } = renderHook(
			({ sessionId }) => useSessionNavigationBehavior(sessionId),
			{ initialProps: { sessionId: 'session-1' } }
		)

		expect(result.current.getSessionIdRef()).toBe('session-1')

		rerender({ sessionId: 'session-2' })

		expect(result.current.getSessionIdRef()).toBe('session-2')
	})

	it('should prevent stale content updates after session change', () => {
		const { result, rerender } = renderHook(
			({ sessionId }) => useSessionNavigationBehavior(sessionId),
			{ initialProps: { sessionId: 'session-1' } }
		)

		// Start streaming in session 1
		let stream1: ReturnType<typeof result.current.startStream>
		act(() => {
			stream1 = result.current.startStream('Message for session 1')
		})

		// Navigate to session 2
		rerender({ sessionId: 'session-2' })

		// Try to update content from session 1's stream (should be ignored)
		act(() => {
			stream1!.updateContent('Stale content from session 1')
		})

		// Content should remain empty for session 2
		expect(result.current.streamingContent).toBe('')
	})

	it('should not reset state when sessionId stays the same', () => {
		const { result, rerender } = renderHook(
			({ sessionId }) => useSessionNavigationBehavior(sessionId),
			{ initialProps: { sessionId: 'session-1' } }
		)

		// Start streaming
		let stream: ReturnType<typeof result.current.startStream>
		act(() => {
			stream = result.current.startStream('Hello')
		})
		act(() => {
			stream!.updateContent('Content')
		})

		const requestIdBefore = result.current.getRequestId()

		// Rerender with same sessionId
		rerender({ sessionId: 'session-1' })

		// State should NOT be reset
		expect(result.current.isStreaming).toBe(true)
		expect(result.current.streamingContent).toBe('Content')
		expect(result.current.getRequestId()).toBe(requestIdBefore)
	})

	it('should create new startStream callback when sessionId changes', () => {
		const { result, rerender } = renderHook(
			({ sessionId }) => useSessionNavigationBehavior(sessionId),
			{ initialProps: { sessionId: 'session-1' } }
		)

		const startStream1 = result.current.startStream

		// Same session - should be stable
		rerender({ sessionId: 'session-1' })
		expect(result.current.startStream).toBe(startStream1)

		// Different session - should change (due to sessionId in dependency array)
		rerender({ sessionId: 'session-2' })
		expect(result.current.startStream).not.toBe(startStream1)
	})

	it('should allow new streams in new session after navigation', () => {
		const { result, rerender } = renderHook(
			({ sessionId }) => useSessionNavigationBehavior(sessionId),
			{ initialProps: { sessionId: 'session-1' } }
		)

		// Start streaming in session 1
		act(() => {
			result.current.startStream('Message 1')
		})

		// Navigate to session 2
		rerender({ sessionId: 'session-2' })

		// Should be able to start new stream in session 2
		let stream2: ReturnType<typeof result.current.startStream>
		act(() => {
			stream2 = result.current.startStream('Message 2')
		})
		act(() => {
			stream2!.updateContent('Response for session 2')
		})

		expect(result.current.isStreaming).toBe(true)
		expect(result.current.streamingContent).toBe('Response for session 2')
		expect(result.current.pendingUserMessage).toBe('Message 2')
	})

	it('should complete stream correctly within same session', () => {
		const { result } = renderHook(() => useSessionNavigationBehavior('session-1'))

		// Start and complete a stream
		let stream: ReturnType<typeof result.current.startStream>
		act(() => {
			stream = result.current.startStream('Hello')
		})
		expect(result.current.isStreaming).toBe(true)

		act(() => {
			stream!.updateContent('Response')
		})
		expect(result.current.streamingContent).toBe('Response')

		act(() => {
			stream!.complete()
		})
		expect(result.current.isStreaming).toBe(false)
		expect(result.current.pendingUserMessage).toBeNull()
	})
})

describe('useSmChat abort behavior', () => {
	it('should abort stream via cancelStream', () => {
		const { result } = renderHook(() => useSessionNavigationBehavior('session-1'))

		let stream: ReturnType<typeof result.current.startStream>
		act(() => {
			stream = result.current.startStream('Hello')
		})
		expect(stream!.abortController.signal.aborted).toBe(false)

		act(() => {
			result.current.cancelStream()
		})
		expect(stream!.abortController.signal.aborted).toBe(true)
	})

	it('should abort stream when sessionId changes', () => {
		const { result, rerender } = renderHook(
			({ sessionId }) => useSessionNavigationBehavior(sessionId),
			{ initialProps: { sessionId: 'session-1' } }
		)

		let stream: ReturnType<typeof result.current.startStream>
		act(() => {
			stream = result.current.startStream('Hello')
		})
		expect(stream!.abortController.signal.aborted).toBe(false)

		// Navigate to different session
		rerender({ sessionId: 'session-2' })

		// Previous stream should be aborted
		expect(stream!.abortController.signal.aborted).toBe(true)
	})

	it('should abort previous stream when starting new stream', () => {
		const { result } = renderHook(() => useSessionNavigationBehavior('session-1'))

		let stream1: ReturnType<typeof result.current.startStream>
		act(() => {
			stream1 = result.current.startStream('Hello')
		})
		expect(stream1!.abortController.signal.aborted).toBe(false)

		let stream2: ReturnType<typeof result.current.startStream>
		act(() => {
			stream2 = result.current.startStream('World')
		})
		expect(stream1!.abortController.signal.aborted).toBe(true)
		expect(stream2!.abortController.signal.aborted).toBe(false)
	})
})
