/**
 * OpenRouter LLM Integration
 * https://openrouter.ai/docs
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1'

export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
	role: ChatRole
	content: string
}

export interface ChatCompletionRequest {
	model?: string
	messages: ChatMessage[]
	temperature?: number
	max_tokens?: number
	top_p?: number
	stream?: boolean
}

export interface ChatCompletionChoice {
	index: number
	message: ChatMessage
	finish_reason: string | null
}

export interface ChatCompletionUsage {
	prompt_tokens: number
	completion_tokens: number
	total_tokens: number
}

export interface ChatCompletionResponse {
	id: string
	model: string
	choices: ChatCompletionChoice[]
	usage: ChatCompletionUsage
	created: number
}

export interface OpenRouterError {
	error: {
		message: string
		type: string
		code: string
	}
}

export class OpenRouterClient {
	private apiKey: string
	private defaultModel: string

	constructor(apiKey?: string, defaultModel?: string) {
		const key = apiKey ?? process.env['OPENROUTER_API_KEY']
		if (!key) {
			throw new Error('OPENROUTER_API_KEY is required')
		}
		this.apiKey = key
		this.defaultModel =
			defaultModel ?? process.env['OPENROUTER_DEFAULT_MODEL'] ?? 'deepseek/deepseek-v3.2'
	}

	async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
		const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.apiKey}`,
				'HTTP-Referer': process.env['WEB_URL'] ?? 'http://localhost:5173',
				'X-Title': 'Anna',
			},
			body: JSON.stringify({
				model: request.model ?? this.defaultModel,
				messages: request.messages,
				temperature: request.temperature ?? 0.7,
				max_tokens: request.max_tokens ?? 4096,
				top_p: request.top_p ?? 1,
				stream: false,
			}),
		})

		if (!response.ok) {
			const error = (await response.json()) as OpenRouterError
			throw new OpenRouterAPIError(
				error.error?.message ?? 'Unknown error',
				error.error?.code ?? 'UNKNOWN',
				response.status
			)
		}

		return response.json() as Promise<ChatCompletionResponse>
	}

	async *chatStream(request: ChatCompletionRequest): AsyncGenerator<string, void, unknown> {
		console.log('[OpenRouter] Starting stream request:', {
			model: request.model ?? this.defaultModel,
			max_tokens: request.max_tokens,
			messages_count: request.messages.length,
		})

		const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.apiKey}`,
				'HTTP-Referer': process.env['WEB_URL'] ?? 'http://localhost:5173',
				'X-Title': 'Anna',
			},
			body: JSON.stringify({
				model: request.model ?? this.defaultModel,
				messages: request.messages,
				temperature: request.temperature ?? 0.7,
				max_tokens: request.max_tokens ?? 4096,
				top_p: request.top_p ?? 1,
				stream: true,
			}),
		})

		console.log('[OpenRouter] Response status:', response.status)

		if (!response.ok) {
			const errorText = await response.text()
			console.error('[OpenRouter] Error response:', errorText)
			let error: OpenRouterError
			try {
				error = JSON.parse(errorText) as OpenRouterError
			} catch {
				throw new OpenRouterAPIError(errorText, 'UNKNOWN', response.status)
			}
			throw new OpenRouterAPIError(
				error.error?.message ?? 'Unknown error',
				error.error?.code ?? 'UNKNOWN',
				response.status
			)
		}

		const reader = response.body?.getReader()
		if (!reader) {
			throw new Error('No response body')
		}

		const decoder = new TextDecoder()
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
				if (data === '[DONE]') return

				try {
					const parsed = JSON.parse(data) as {
						choices: Array<{ delta: { content?: string } }>
					}
					const content = parsed.choices[0]?.delta?.content
					if (content) {
						yield content
					}
				} catch {
					// Ignore JSON parse errors for incomplete chunks
				}
			}
		}
	}
}

export class OpenRouterAPIError extends Error {
	constructor(
		message: string,
		public code: string,
		public status: number
	) {
		super(message)
		this.name = 'OpenRouterAPIError'
	}
}

// Singleton instance
let clientInstance: OpenRouterClient | null = null

export function getOpenRouterClient(): OpenRouterClient {
	if (!clientInstance) {
		clientInstance = new OpenRouterClient()
	}
	return clientInstance
}
