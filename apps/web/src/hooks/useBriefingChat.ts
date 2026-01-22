import { useAuth } from '@clerk/clerk-react'
import { toast } from '@repo/ui'
import { useCallback, useEffect, useRef, useState } from 'react'

declare const __API_URL__: string | undefined
const API_URL = __API_URL__ ?? 'http://localhost:3000'

// Max buffer size to prevent memory issues (1MB)
const MAX_BUFFER_SIZE = 1024 * 1024

interface UseBriefingChatOptions {
	sessionId: string
	onMessageComplete?: (content: string) => void
	onStepUpdate?: (newStep: string) => void
	onError?: (error: Error) => void
}

interface UseBriefingChatReturn {
	sendMessage: (message: string, action?: string) => Promise<void>
	isStreaming: boolean
	streamingContent: string
	pendingUserMessage: string | null
	error: Error | null
	clearError: () => void
	cancelStream: () => void
}

export function useBriefingChat({
	sessionId,
	onMessageComplete,
	onStepUpdate,
	onError,
}: UseBriefingChatOptions): UseBriefingChatReturn {
	const { getToken } = useAuth()
	const [isStreaming, setIsStreaming] = useState(false)
	const [streamingContent, setStreamingContent] = useState('')
	const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null)
	const [error, setError] = useState<Error | null>(null)

	// Refs for cleanup and abort handling
	const isMountedRef = useRef(true)
	const abortControllerRef = useRef<AbortController | null>(null)
	// Track request ID to prevent stale state updates from previous requests
	const requestIdRef = useRef(0)
	// Track sessionId to prevent callbacks from firing for wrong sessions
	const sessionIdRef = useRef(sessionId)

	// Track mounted state
	useEffect(() => {
		isMountedRef.current = true
		return () => {
			isMountedRef.current = false
			// Cancel any ongoing stream on unmount
			abortControllerRef.current?.abort()
		}
	}, [])

	// Handle sessionId changes - cancel ongoing streams and reset state
	useEffect(() => {
		// If sessionId changed, cancel any ongoing stream and reset state
		if (sessionIdRef.current !== sessionId) {
			abortControllerRef.current?.abort()
			setIsStreaming(false)
			setStreamingContent('')
			setPendingUserMessage(null)
			setError(null)
			// Increment request ID to invalidate any pending callbacks
			requestIdRef.current++
		}
		sessionIdRef.current = sessionId
	}, [sessionId])

	const clearError = useCallback(() => {
		setError(null)
	}, [])

	const cancelStream = useCallback(() => {
		abortControllerRef.current?.abort()
	}, [])

	const sendMessage = useCallback(
		async (message: string, action?: string) => {
			// Cancel any existing stream
			abortControllerRef.current?.abort()
			const abortController = new AbortController()
			abortControllerRef.current = abortController

			// Increment request ID to track this specific request
			const currentRequestId = ++requestIdRef.current

			setIsStreaming(true)
			setStreamingContent('')
			setPendingUserMessage(message)

			try {
				const token = await getToken()

				const response = await fetch(`${API_URL}/api/v1/briefing/chat`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						sessionId,
						message,
						action,
					}),
					signal: abortController.signal,
				})

				if (!response.ok) {
					const errorData = await response.json()
					throw new Error(errorData.error?.message || 'Failed to send message')
				}

				const reader = response.body?.getReader()
				if (!reader) {
					throw new Error('No response body')
				}

				const decoder = new TextDecoder()
				let fullContent = ''
				let buffer = ''
				let messageCompleted = false

				try {
					while (true) {
						const { done, value } = await reader.read()
						if (done) break

						// Check if aborted
						if (abortController.signal.aborted) {
							await reader.cancel()
							break
						}

						buffer += decoder.decode(value, { stream: true })

						// Prevent buffer overflow
						if (buffer.length > MAX_BUFFER_SIZE) {
							buffer = buffer.slice(-MAX_BUFFER_SIZE / 2)
						}

						const lines = buffer.split('\n')
						buffer = lines.pop() ?? ''

						for (const line of lines) {
							const trimmed = line.trim()
							if (!trimmed || !trimmed.startsWith('data: ')) continue

							const data = trimmed.slice(6)
							if (data === '[DONE]') {
								messageCompleted = true
								if (isMountedRef.current) {
									onMessageComplete?.(fullContent)
								}
								break
							}

							try {
								const parsed = JSON.parse(data)
								if (parsed.content) {
									fullContent += parsed.content
									// Only update state if this is still the current request
									if (isMountedRef.current && requestIdRef.current === currentRequestId) {
										setStreamingContent(fullContent)
									}
								}
								if (
									parsed.stepUpdate &&
									isMountedRef.current &&
									requestIdRef.current === currentRequestId &&
									sessionIdRef.current === sessionId
								) {
									onStepUpdate?.(parsed.stepUpdate)
								}
								if (parsed.error) {
									throw new Error(parsed.error.message)
								}
							} catch (parseError) {
								// Ignore JSON parse errors for incomplete chunks
								if (parseError instanceof SyntaxError) continue
								throw parseError
							}
						}

						if (messageCompleted) break
					}
				} finally {
					// Always release the reader
					await reader.cancel().catch(() => {})
					reader.releaseLock()
				}

				// Only call onMessageComplete if not already called and not aborted
				if (
					!messageCompleted &&
					fullContent &&
					!abortController.signal.aborted &&
					isMountedRef.current
				) {
					onMessageComplete?.(fullContent)
				}
			} catch (err) {
				// Don't report abort errors
				if (err instanceof Error && err.name === 'AbortError') {
					return
				}
				const error = err instanceof Error ? err : new Error('Unknown error')
				// Only update error state if this is still the current request
				if (isMountedRef.current && requestIdRef.current === currentRequestId) {
					setError(error)
					toast.error('Erro ao enviar mensagem', { description: error.message })
					onError?.(error)
				}
			} finally {
				// Only update streaming state if this is still the current request
				if (isMountedRef.current && requestIdRef.current === currentRequestId) {
					setIsStreaming(false)
					setPendingUserMessage(null)
				}
			}
		},
		[sessionId, getToken, onMessageComplete, onStepUpdate, onError]
	)

	return {
		sendMessage,
		isStreaming,
		streamingContent,
		pendingUserMessage,
		error,
		clearError,
		cancelStream,
	}
}

// Hook for generating document
export function useBriefingDocument(sessionId: string) {
	const { getToken } = useAuth()
	const [isGenerating, setIsGenerating] = useState(false)
	const [streamingContent, setStreamingContent] = useState('')
	const [error, setError] = useState<Error | null>(null)

	// Refs for cleanup and abort handling
	const isMountedRef = useRef(true)
	const abortControllerRef = useRef<AbortController | null>(null)

	// Track mounted state
	useEffect(() => {
		isMountedRef.current = true
		return () => {
			isMountedRef.current = false
			abortControllerRef.current?.abort()
		}
	}, [])

	const cancelGeneration = useCallback(() => {
		abortControllerRef.current?.abort()
	}, [])

	const generateDocument = useCallback(async () => {
		// Cancel any existing generation
		abortControllerRef.current?.abort()
		const abortController = new AbortController()
		abortControllerRef.current = abortController

		setIsGenerating(true)
		setStreamingContent('')
		setError(null)

		try {
			const token = await getToken()

			const response = await fetch(`${API_URL}/api/v1/briefing/sessions/${sessionId}/document`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({}),
				signal: abortController.signal,
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.error?.message || 'Failed to generate document')
			}

			const reader = response.body?.getReader()
			if (!reader) {
				throw new Error('No response body')
			}

			const decoder = new TextDecoder()
			let fullContent = ''
			let buffer = ''

			try {
				while (true) {
					const { done, value } = await reader.read()
					if (done) break

					if (abortController.signal.aborted) {
						await reader.cancel()
						break
					}

					buffer += decoder.decode(value, { stream: true })

					// Prevent buffer overflow
					if (buffer.length > MAX_BUFFER_SIZE) {
						buffer = buffer.slice(-MAX_BUFFER_SIZE / 2)
					}

					const lines = buffer.split('\n')
					buffer = lines.pop() ?? ''

					for (const line of lines) {
						const trimmed = line.trim()
						if (!trimmed || !trimmed.startsWith('data: ')) continue

						const data = trimmed.slice(6)
						if (data === '[DONE]') {
							return fullContent
						}

						try {
							const parsed = JSON.parse(data)
							if (parsed.content) {
								fullContent += parsed.content
								if (isMountedRef.current) {
									setStreamingContent(fullContent)
								}
							}
							if (parsed.error) {
								throw new Error(parsed.error.message)
							}
						} catch (parseError) {
							if (parseError instanceof SyntaxError) continue
							throw parseError
						}
					}
				}
			} finally {
				await reader.cancel().catch(() => {})
				reader.releaseLock()
			}

			return fullContent
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') {
				return ''
			}
			const error = err instanceof Error ? err : new Error('Unknown error')
			if (isMountedRef.current) {
				setError(error)
				toast.error('Erro ao gerar documento', { description: error.message })
			}
			throw error
		} finally {
			if (isMountedRef.current) {
				setIsGenerating(false)
			}
		}
	}, [sessionId, getToken])

	return {
		generateDocument,
		isGenerating,
		streamingContent,
		error,
		cancelGeneration,
	}
}
