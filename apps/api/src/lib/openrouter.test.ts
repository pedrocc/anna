import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { TimeoutError } from '@repo/shared'
import { OpenRouterClient } from './openrouter.js'

function mockFetch(impl: (url: string | URL | Request, init?: RequestInit) => Promise<Response>) {
	globalThis.fetch = Object.assign(impl, { preconnect: () => {} }) as typeof fetch
}

describe('OpenRouterClient', () => {
	describe('constructor', () => {
		test('throws when no API key provided', () => {
			const original = process.env['OPENROUTER_API_KEY']
			delete process.env['OPENROUTER_API_KEY']
			expect(() => new OpenRouterClient()).toThrow('OPENROUTER_API_KEY is required')
			if (original) process.env['OPENROUTER_API_KEY'] = original
		})

		test('accepts options', () => {
			const client = new OpenRouterClient({
				apiKey: 'test-key',
				defaultModel: 'test-model',
				timeout: 5000,
				streamConnectTimeout: 3000,
				streamReadTimeout: 2000,
			})
			expect(client).toBeDefined()
		})
	})

	describe('chat with timeout', () => {
		let client: OpenRouterClient
		let originalFetch: typeof globalThis.fetch

		beforeEach(() => {
			originalFetch = globalThis.fetch
			client = new OpenRouterClient({
				apiKey: 'test-key',
				timeout: 100,
			})
		})

		afterEach(() => {
			globalThis.fetch = originalFetch
		})

		test('rejects with TimeoutError when request exceeds timeout', async () => {
			mockFetch(() => new Promise(() => {}))

			try {
				await client.chat({
					messages: [{ role: 'user', content: 'hello' }],
				})
				expect.unreachable('should have thrown')
			} catch (err) {
				expect(
					err instanceof TimeoutError || (err instanceof Error && err.name === 'AbortError')
				).toBe(true)
			}
		})

		test('resolves when response arrives before timeout', async () => {
			const mockResponse: ChatCompletionResponse = {
				id: 'test-id',
				model: 'test-model',
				choices: [
					{ index: 0, message: { role: 'assistant', content: 'hi' }, finish_reason: 'stop' },
				],
				usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
				created: Date.now(),
			}

			mockFetch(() =>
				Promise.resolve(
					new Response(JSON.stringify(mockResponse), {
						status: 200,
						headers: { 'Content-Type': 'application/json' },
					})
				)
			)

			const result = await client.chat({
				messages: [{ role: 'user', content: 'hello' }],
			})
			expect(result.choices[0]?.message.content).toBe('hi')
		})
	})

	describe('chatStream with timeout', () => {
		let client: OpenRouterClient
		let originalFetch: typeof globalThis.fetch

		beforeEach(() => {
			originalFetch = globalThis.fetch
			client = new OpenRouterClient({
				apiKey: 'test-key',
				streamConnectTimeout: 100,
				streamReadTimeout: 100,
			})
		})

		afterEach(() => {
			globalThis.fetch = originalFetch
		})

		test('rejects with TimeoutError when connection exceeds timeout', async () => {
			mockFetch(() => new Promise(() => {}))

			const gen = client.chatStream({
				messages: [{ role: 'user', content: 'hello' }],
			})

			try {
				await gen.next()
				expect.unreachable('should have thrown')
			} catch (err) {
				expect(
					err instanceof TimeoutError || (err instanceof Error && err.name === 'AbortError')
				).toBe(true)
			}
		})

		test('rejects with TimeoutError when stream read stalls', async () => {
			const encoder = new TextEncoder()
			let readCount = 0

			const mockStream = new ReadableStream<Uint8Array>({
				pull(controller) {
					readCount++
					if (readCount === 1) {
						controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n'))
					}
					// Second read never resolves (simulates stall)
					return new Promise(() => {})
				},
			})

			mockFetch(() =>
				Promise.resolve(
					new Response(mockStream, {
						status: 200,
						headers: { 'Content-Type': 'text/event-stream' },
					})
				)
			)

			const gen = client.chatStream({
				messages: [{ role: 'user', content: 'hello' }],
			})

			// First chunk succeeds
			const first = await gen.next()
			expect(first.value).toBe('hi')

			// Second read should timeout
			try {
				await gen.next()
				expect.unreachable('should have thrown')
			} catch (err) {
				expect(err).toBeInstanceOf(TimeoutError)
			}
		})

		test('yields content when stream responds within timeout', async () => {
			const encoder = new TextEncoder()
			let readCount = 0

			const mockStream = new ReadableStream<Uint8Array>({
				pull(controller) {
					readCount++
					if (readCount === 1) {
						controller.enqueue(
							encoder.encode('data: {"choices":[{"delta":{"content":"hello"}}]}\n\n')
						)
					} else if (readCount === 2) {
						controller.enqueue(
							encoder.encode('data: {"choices":[{"delta":{"content":" world"}}]}\n\n')
						)
					} else {
						controller.enqueue(encoder.encode('data: [DONE]\n\n'))
					}
				},
			})

			mockFetch(() =>
				Promise.resolve(
					new Response(mockStream, {
						status: 200,
						headers: { 'Content-Type': 'text/event-stream' },
					})
				)
			)

			const gen = client.chatStream({
				messages: [{ role: 'user', content: 'hello' }],
			})

			const chunks: string[] = []
			for await (const chunk of gen) {
				chunks.push(chunk)
			}
			expect(chunks).toEqual(['hello', ' world'])
		})
	})
})

interface ChatCompletionResponse {
	id: string
	model: string
	choices: Array<{
		index: number
		message: { role: string; content: string }
		finish_reason: string | null
	}>
	usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
	created: number
}
