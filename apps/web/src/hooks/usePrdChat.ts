import { useAuth } from '@clerk/clerk-react'
import { useCallback, useState } from 'react'

declare const __API_URL__: string | undefined
const API_URL = __API_URL__ ?? 'http://localhost:3000'

interface UsePrdChatOptions {
	sessionId: string
	onMessageComplete?: (content: string) => void
	onStepUpdate?: (newStep: string) => void
	onError?: (error: Error) => void
}

interface UsePrdChatReturn {
	sendMessage: (message: string, action?: string) => Promise<void>
	isStreaming: boolean
	streamingContent: string
	pendingUserMessage: string | null
	error: Error | null
	clearError: () => void
}

export function usePrdChat({
	sessionId,
	onMessageComplete,
	onStepUpdate,
	onError,
}: UsePrdChatOptions): UsePrdChatReturn {
	const { getToken } = useAuth()
	const [isStreaming, setIsStreaming] = useState(false)
	const [streamingContent, setStreamingContent] = useState('')
	const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null)
	const [error, setError] = useState<Error | null>(null)

	const clearError = useCallback(() => {
		setError(null)
	}, [])

	const sendMessage = useCallback(
		async (message: string, action?: string) => {
			setIsStreaming(true)
			setStreamingContent('')
			setPendingUserMessage(message)
			setError(null)

			try {
				const token = await getToken()

				const response = await fetch(`${API_URL}/api/v1/prd/chat`, {
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

				while (true) {
					const { done, value } = await reader.read()
					if (done) break

					buffer += decoder.decode(value, { stream: true })
					const lines = buffer.split('\n')
					buffer = lines.pop() ?? ''

					for (const line of lines) {
						const trimmed = line.trim()
						if (!trimmed || !trimmed.startsWith('data: ')) continue

						const data = trimmed.slice(6)
						if (data === '[DONE]') {
							onMessageComplete?.(fullContent)
							break
						}

						try {
							const parsed = JSON.parse(data)
							if (parsed.content) {
								fullContent += parsed.content
								setStreamingContent(fullContent)
							}
							if (parsed.stepUpdate) {
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
				}

				// Final content
				if (fullContent) {
					onMessageComplete?.(fullContent)
				}
			} catch (err) {
				const error = err instanceof Error ? err : new Error('Unknown error')
				setError(error)
				onError?.(error)
			} finally {
				setIsStreaming(false)
				setPendingUserMessage(null)
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
	}
}

// Hook for generating document
export function usePrdDocument(sessionId: string) {
	const { getToken } = useAuth()
	const [isGenerating, setIsGenerating] = useState(false)
	const [streamingContent, setStreamingContent] = useState('')
	const [error, setError] = useState<Error | null>(null)

	const generateDocument = useCallback(async () => {
		setIsGenerating(true)
		setStreamingContent('')
		setError(null)

		try {
			const token = await getToken()

			const response = await fetch(`${API_URL}/api/v1/prd/sessions/${sessionId}/document`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({}),
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

			while (true) {
				const { done, value } = await reader.read()
				if (done) break

				buffer += decoder.decode(value, { stream: true })
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
							setStreamingContent(fullContent)
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

			return fullContent
		} catch (err) {
			const error = err instanceof Error ? err : new Error('Unknown error')
			setError(error)
			throw error
		} finally {
			setIsGenerating(false)
		}
	}, [sessionId, getToken])

	return {
		generateDocument,
		isGenerating,
		streamingContent,
		error,
	}
}
