import { useAuth } from '@clerk/clerk-react'
import { useCallback, useState } from 'react'

declare const __API_URL__: string | undefined
const API_URL = __API_URL__ ?? 'http://localhost:3000'

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

	const clearError = useCallback(() => {
		setError(null)
	}, [])

	const editMessage = useCallback(
		async (messageId: string, content: string) => {
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
				setIsEditing(false)
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
	}
}
