/**
 * OpenRouter LLM Integration
 * https://openrouter.ai/docs
 */

import { fetchWithTimeout, TimeoutError, withTimeout } from '@repo/shared'
import { openrouterLogger } from './logger.js'

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

export interface OpenRouterClientOptions {
	apiKey?: string
	defaultModel?: string
	/** Timeout for non-streaming requests in ms (default: 60000) */
	timeout?: number
	/** Timeout for streaming connection in ms (default: 30000) */
	streamConnectTimeout?: number
	/** Timeout for individual stream reads in ms (default: 30000) */
	streamReadTimeout?: number
}

export class OpenRouterClient {
	private apiKey: string
	private defaultModel: string
	private timeout: number
	private streamConnectTimeout: number
	private streamReadTimeout: number

	constructor(options: OpenRouterClientOptions = {}) {
		const key = options.apiKey ?? process.env['OPENROUTER_API_KEY']
		if (!key) {
			throw new Error('OPENROUTER_API_KEY is required')
		}
		this.apiKey = key
		this.defaultModel =
			options.defaultModel ?? process.env['OPENROUTER_DEFAULT_MODEL'] ?? 'deepseek/deepseek-v3.2'
		this.timeout = options.timeout ?? 60_000
		this.streamConnectTimeout = options.streamConnectTimeout ?? 30_000
		this.streamReadTimeout = options.streamReadTimeout ?? 30_000
	}

	async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
		const response = await fetchWithTimeout(`${OPENROUTER_API_URL}/chat/completions`, {
			method: 'POST',
			timeout: this.timeout,
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
		openrouterLogger.debug(
			{
				model: request.model ?? this.defaultModel,
				max_tokens: request.max_tokens,
				messages_count: request.messages.length,
			},
			'Starting stream request'
		)

		const response = await fetchWithTimeout(`${OPENROUTER_API_URL}/chat/completions`, {
			method: 'POST',
			timeout: this.streamConnectTimeout,
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

		openrouterLogger.debug({ status: response.status }, 'Response received')

		if (!response.ok) {
			const errorText = await response.text()
			openrouterLogger.error({ status: response.status, error: errorText }, 'API error response')
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

		try {
			while (true) {
				const { done, value } = await withTimeout(reader.read(), this.streamReadTimeout)
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
		} finally {
			// Always release the reader lock to prevent memory leaks
			reader.releaseLock()
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

export { TimeoutError }

// Singleton instance
let clientInstance: OpenRouterClient | null = null

export function getOpenRouterClient(options?: OpenRouterClientOptions): OpenRouterClient {
	if (!clientInstance) {
		clientInstance = new OpenRouterClient(options)
	}
	return clientInstance
}
