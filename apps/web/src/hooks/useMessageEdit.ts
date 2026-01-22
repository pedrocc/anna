import { useAuth } from '@clerk/clerk-react'
import { toast } from '@repo/ui'
import { useCallback, useEffect, useRef, useState } from 'react'

declare const __API_URL__: string | undefined
const API_URL = __API_URL__ ?? 'http://localhost:3000'

// Max buffer size to prevent memory issues (1MB)
const MAX_BUFFER_SIZE = 1024 * 1024

type ChatModule = 'briefing' | 'prd' | 'sm'

interface UseMessageEditOptions {
	module: ChatModule
	onMessageComplete?: (content: string) => void
	onStepUpdate?: (newStep: string) => void
	onError?: (error: Error) => void
}

interface UseMessageEditReturn {
	editMessage: (messageId: string, content: string) => Promise<void>
	isEditing: boolean
	streamingContent: string
	error: Error | null
	clearError: () => void
	cancelEdit: () => void
}

export function useMessageEdit({
	module,
	onMessageComplete,
	onStepUpdate,
	onError,
}: UseMessageEditOptions): UseMessageEditReturn {
	const { getToken } = useAuth()
	const [isEditing, setIsEditing] = useState(false)
	const [streamingContent, setStreamingContent] = useState('')
	const [error, setError] = useState<Error | null>(null)

	// Refs for cleanup and abort handling
	const isMountedRef = useRef(true)
	const abortControllerRef = useRef<AbortController | null>(null)
	// Track request ID to prevent stale state updates from previous requests
	const requestIdRef = useRef(0)

	// Track mounted state
	useEffect(() => {
		isMountedRef.current = true
		return () => {
			isMountedRef.current = false
			// Cancel any ongoing edit on unmount
			abortControllerRef.current?.abort()
		}
	}, [])

	const clearError = useCallback(() => {
		setError(null)
	}, [])

	const cancelEdit = useCallback(() => {
		abortControllerRef.current?.abort()
	}, [])

	const editMessage = useCallback(
		async (messageId: string, content: string) => {
			// Cancel any existing edit
			abortControllerRef.current?.abort()
			const abortController = new AbortController()
			abortControllerRef.current = abortController

			// Increment request ID to track this specific request
			const currentRequestId = ++requestIdRef.current

			setIsEditing(true)
			setStreamingContent('')
			setError(null)

			try {
				const token = await getToken()

				const response = await fetch(`${API_URL}/api/v1/${module}/messages/${messageId}/edit`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ content }),
					signal: abortController.signal,
				})

				if (!response.ok) {
					const errorData = await response.json()
					throw new Error(errorData.error?.message || 'Failed to edit message')
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
									requestIdRef.current === currentRequestId
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
					toast.error('Erro ao editar mensagem', { description: error.message })
					onError?.(error)
				}
			} finally {
				// Only update editing state if this is still the current request
				if (isMountedRef.current && requestIdRef.current === currentRequestId) {
					setIsEditing(false)
					setStreamingContent('') // Clean up streaming content on completion
				}
			}
		},
		[module, getToken, onMessageComplete, onStepUpdate, onError]
	)

	return {
		editMessage,
		isEditing,
		streamingContent,
		error,
		clearError,
		cancelEdit,
	}
}
