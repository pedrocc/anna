import { zValidator } from '@hono/zod-validator'
import { ChatRequestSchema } from '@repo/shared'
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { getOpenRouterClient, OpenRouterAPIError } from '../lib/openrouter.js'
import { commonErrors, successResponse } from '../lib/response.js'
import { type AuthVariables, authMiddleware } from '../middleware/auth.js'

export const chatRoutes = new Hono<{ Variables: AuthVariables }>()

// Chat completion
chatRoutes.post('/', authMiddleware, zValidator('json', ChatRequestSchema), async (c) => {
	const data = c.req.valid('json')

	try {
		const client = getOpenRouterClient()

		// Non-streaming response
		if (!data.stream) {
			const response = await client.chat({
				messages: data.messages,
				model: data.model,
				temperature: data.temperature,
				max_tokens: data.max_tokens,
			})

			return successResponse(c, {
				id: response.id,
				model: response.model,
				message: response.choices[0]?.message,
				usage: response.usage,
			})
		}

		// Streaming response
		return streamSSE(c, async (stream) => {
			try {
				const generator = client.chatStream({
					messages: data.messages,
					model: data.model,
					temperature: data.temperature,
					max_tokens: data.max_tokens,
				})

				for await (const chunk of generator) {
					await stream.writeSSE({
						data: JSON.stringify({ content: chunk }),
					})
				}

				await stream.writeSSE({
					data: '[DONE]',
				})
			} catch (error) {
				if (error instanceof OpenRouterAPIError) {
					await stream.writeSSE({
						data: JSON.stringify({
							error: {
								code: error.code,
								message: error.message,
							},
						}),
					})
				}
			}
		})
	} catch (error) {
		if (error instanceof OpenRouterAPIError) {
			if (error.status === 401) {
				return commonErrors.unauthorized(c, 'Invalid OpenRouter API key')
			}
			if (error.status === 429) {
				return commonErrors.badRequest(c, 'Rate limit exceeded', { code: error.code })
			}
			return commonErrors.badRequest(c, error.message, { code: error.code })
		}

		throw error
	}
})

// List available models
chatRoutes.get('/models', authMiddleware, async (c) => {
	const popularModels = [
		{ id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3', provider: 'DeepSeek' },
		{ id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
		{ id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
		{ id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
		{ id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
		{ id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google' },
		{ id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta' },
	]

	return successResponse(c, popularModels)
})
