import { describe, expect, it } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Tests for requestId guard behavior in useBriefingChat.
 *
 * The pattern: State updates should only occur if the current requestId
 * matches the requestId of the response. This prevents stale responses
 * from overwriting newer data when multiple requests are in flight.
 */

// Simplified hook that simulates the core requestId guard behavior
function useBriefingChatBehavior(sessionId: string) {
	const [isStreaming, setIsStreaming] = useState(false)
	const [streamingContent, setStreamingContent] = useState('')
	const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null)
	const [error, setError] = useState<Error | null>(null)

	const isMountedRef = useRef(true)
	const abortControllerRef = useRef<AbortController | null>(null)
	const requestIdRef = useRef(0)
	const sessionIdRef = useRef(sessionId)

	useEffect(() => {
		isMountedRef.current = true
		return () => {
			isMountedRef.current = false
			abortControllerRef.current?.abort()
		}
	}, [])

	// Handle sessionId changes - reset state and invalidate pending callbacks
	useEffect(() => {
		if (sessionIdRef.current !== sessionId) {
			abortControllerRef.current?.abort()
			setIsStreaming(false)
			setStreamingContent('')
			setPendingUserMessage(null)
			setError(null)
			requestIdRef.current++
		}
		sessionIdRef.current = sessionId
	}, [sessionId])

	const sendMessage = useCallback(
		(message: string) => {
			abortControllerRef.current?.abort()
			abortControllerRef.current = new AbortController()

			const currentRequestId = ++requestIdRef.current

			setIsStreaming(true)
			setStreamingContent('')
			setPendingUserMessage(message)
			setError(null)

			return {
				currentRequestId,
				abortController: abortControllerRef.current,
				// Simulate async content updates - only apply if requestId matches
				updateContent: (content: string) => {
					if (isMountedRef.current && requestIdRef.current === currentRequestId) {
						setStreamingContent(content)
					}
				},
				// Simulate step updates - guard by requestId AND sessionId
				triggerStepUpdate: (callback: () => void) => {
					if (
						isMountedRef.current &&
						requestIdRef.current === currentRequestId &&
						sessionIdRef.current === sessionId
					) {
						callback()
					}
				},
				// Simulate error handling
				setErrorWithGuard: (err: Error) => {
					if (isMountedRef.current && requestIdRef.current === currentRequestId) {
						setError(err)
					}
				},
				// Simulate completion
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
		sendMessage,
		getRequestId: () => requestIdRef.current,
		getSessionIdRef: () => sessionIdRef.current,
	}
}

describe('useBriefingChat requestId guard', () => {
	it('should only update state if requestId matches current request', () => {
		const { result } = renderHook(() => useBriefingChatBehavior('session-1'))

		// Start first request
		let request1: ReturnType<typeof result.current.sendMessage>
		act(() => {
			request1 = result.current.sendMessage('Message 1')
		})
		const requestId1 = request1!.currentRequestId

		// Start second request (should invalidate first)
		let request2: ReturnType<typeof result.current.sendMessage>
		act(() => {
			request2 = result.current.sendMessage('Message 2')
		})
		const requestId2 = request2!.currentRequestId

		expect(requestId2).toBe(requestId1 + 1)

		// Try to update from request1 - should be ignored
		act(() => {
			request1!.updateContent('Stale content from request 1')
		})
		expect(result.current.streamingContent).toBe('')

		// Update from request2 - should work
		act(() => {
			request2!.updateContent('Content from request 2')
		})
		expect(result.current.streamingContent).toBe('Content from request 2')
	})

	it('should guard error state updates with requestId', () => {
		const { result } = renderHook(() => useBriefingChatBehavior('session-1'))

		// Start two requests
		let request1: ReturnType<typeof result.current.sendMessage>
		act(() => {
			request1 = result.current.sendMessage('Message 1')
		})

		let request2: ReturnType<typeof result.current.sendMessage>
		act(() => {
			request2 = result.current.sendMessage('Message 2')
		})

		// Error from request1 should be ignored
		act(() => {
			request1!.setErrorWithGuard(new Error('Stale error'))
		})
		expect(result.current.error).toBeNull()

		// Error from request2 should work
		act(() => {
			request2!.setErrorWithGuard(new Error('Current error'))
		})
		expect(result.current.error?.message).toBe('Current error')
	})

	it('should guard completion state updates with requestId', () => {
		const { result } = renderHook(() => useBriefingChatBehavior('session-1'))

		// Start request1
		let request1: ReturnType<typeof result.current.sendMessage>
		act(() => {
			request1 = result.current.sendMessage('Message 1')
		})
		expect(result.current.isStreaming).toBe(true)

		// Start request2
		let request2: ReturnType<typeof result.current.sendMessage>
		act(() => {
			request2 = result.current.sendMessage('Message 2')
		})
		expect(result.current.isStreaming).toBe(true)

		// Complete request1 - should be ignored, isStreaming should stay true
		act(() => {
			request1!.complete()
		})
		expect(result.current.isStreaming).toBe(true)

		// Complete request2 - should work
		act(() => {
			request2!.complete()
		})
		expect(result.current.isStreaming).toBe(false)
	})

	it('should guard step update callbacks with requestId and sessionId', () => {
		const { result, rerender } = renderHook(({ sessionId }) => useBriefingChatBehavior(sessionId), {
			initialProps: { sessionId: 'session-1' },
		})

		let stepUpdateCalled = false
		const stepCallback = () => {
			stepUpdateCalled = true
		}

		// Start request in session-1
		let request1: ReturnType<typeof result.current.sendMessage>
		act(() => {
			request1 = result.current.sendMessage('Message 1')
		})

		// Navigate to session-2
		rerender({ sessionId: 'session-2' })

		// Try to trigger step update from session-1 request - should be ignored
		act(() => {
			request1!.triggerStepUpdate(stepCallback)
		})
		expect(stepUpdateCalled).toBe(false)

		// Start request in session-2
		let request2: ReturnType<typeof result.current.sendMessage>
		act(() => {
			request2 = result.current.sendMessage('Message 2')
		})

		// Trigger step update from session-2 request - should work
		act(() => {
			request2!.triggerStepUpdate(stepCallback)
		})
		expect(stepUpdateCalled).toBe(true)
	})

	it('should increment requestId when session changes', () => {
		const { result, rerender } = renderHook(({ sessionId }) => useBriefingChatBehavior(sessionId), {
			initialProps: { sessionId: 'session-1' },
		})

		const initialRequestId = result.current.getRequestId()

		// Navigate to session-2
		rerender({ sessionId: 'session-2' })

		expect(result.current.getRequestId()).toBe(initialRequestId + 1)
	})

	it('should not increment requestId on re-render with same sessionId', () => {
		const { result, rerender } = renderHook(({ sessionId }) => useBriefingChatBehavior(sessionId), {
			initialProps: { sessionId: 'session-1' },
		})

		const requestIdBefore = result.current.getRequestId()

		// Rerender with same sessionId
		rerender({ sessionId: 'session-1' })

		expect(result.current.getRequestId()).toBe(requestIdBefore)
	})

	it('should abort previous request when starting new request', () => {
		const { result } = renderHook(() => useBriefingChatBehavior('session-1'))

		let request1: ReturnType<typeof result.current.sendMessage>
		act(() => {
			request1 = result.current.sendMessage('Message 1')
		})
		expect(request1!.abortController.signal.aborted).toBe(false)

		let request2: ReturnType<typeof result.current.sendMessage>
		act(() => {
			request2 = result.current.sendMessage('Message 2')
		})

		expect(request1!.abortController.signal.aborted).toBe(true)
		expect(request2!.abortController.signal.aborted).toBe(false)
	})

	it('should abort request when sessionId changes', () => {
		const { result, rerender } = renderHook(({ sessionId }) => useBriefingChatBehavior(sessionId), {
			initialProps: { sessionId: 'session-1' },
		})

		let request: ReturnType<typeof result.current.sendMessage>
		act(() => {
			request = result.current.sendMessage('Message 1')
		})
		expect(request!.abortController.signal.aborted).toBe(false)

		// Navigate to session-2
		rerender({ sessionId: 'session-2' })

		expect(request!.abortController.signal.aborted).toBe(true)
	})
})

describe('useBriefingChat session navigation', () => {
	it('should reset all streaming state when session changes', () => {
		const { result, rerender } = renderHook(({ sessionId }) => useBriefingChatBehavior(sessionId), {
			initialProps: { sessionId: 'session-1' },
		})

		// Start streaming
		let request: ReturnType<typeof result.current.sendMessage>
		act(() => {
			request = result.current.sendMessage('Hello')
		})
		act(() => {
			request!.updateContent('Streaming content')
		})

		expect(result.current.isStreaming).toBe(true)
		expect(result.current.streamingContent).toBe('Streaming content')
		expect(result.current.pendingUserMessage).toBe('Hello')

		// Navigate to new session
		rerender({ sessionId: 'session-2' })

		// All state should be reset
		expect(result.current.isStreaming).toBe(false)
		expect(result.current.streamingContent).toBe('')
		expect(result.current.pendingUserMessage).toBeNull()
		expect(result.current.error).toBeNull()
	})

	it('should allow streaming in new session after navigation', () => {
		const { result, rerender } = renderHook(({ sessionId }) => useBriefingChatBehavior(sessionId), {
			initialProps: { sessionId: 'session-1' },
		})

		// Stream in session-1
		act(() => {
			result.current.sendMessage('Message for session 1')
		})

		// Navigate to session-2
		rerender({ sessionId: 'session-2' })

		// Should be able to stream in session-2
		let request2: ReturnType<typeof result.current.sendMessage>
		act(() => {
			request2 = result.current.sendMessage('Message for session 2')
		})
		act(() => {
			request2!.updateContent('Content for session 2')
		})

		expect(result.current.isStreaming).toBe(true)
		expect(result.current.streamingContent).toBe('Content for session 2')
		expect(result.current.pendingUserMessage).toBe('Message for session 2')
	})
})
