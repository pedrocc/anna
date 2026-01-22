import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { requestId } from 'hono/request-id'
import { z } from 'zod'
import type { ApiErrorResponse } from '../lib/response.js'
import { errorHandler } from './error-handler.js'

describe('errorHandler', () => {
	it('should include requestId in Zod validation error responses', async () => {
		const app = new Hono()
		app.use('*', requestId())
		app.onError(errorHandler)

		app.get('/test', () => {
			const schema = z.object({ name: z.string() })
			schema.parse({}) // This will throw ZodError
			return new Response('ok')
		})

		const res = await app.request('/test')
		const body = (await res.json()) as ApiErrorResponse

		expect(res.status).toBe(400)
		expect(body.success).toBe(false)
		expect(body.error.code).toBe('VALIDATION_ERROR')
		expect(body.error.requestId).toBeDefined()
		expect(body.error.requestId).toHaveLength(36)
	})

	it('should use custom X-Request-ID header in error response', async () => {
		const customRequestId = 'custom-error-test-id'
		const app = new Hono()
		app.use('*', requestId())
		app.onError(errorHandler)

		app.get('/test', () => {
			throw new Error('Test error')
		})

		const res = await app.request('/test', {
			headers: { 'X-Request-ID': customRequestId },
		})
		const body = (await res.json()) as ApiErrorResponse

		expect(res.status).toBe(500)
		expect(body.error.requestId).toBe(customRequestId)
	})

	it('should include requestId in internal server error responses', async () => {
		const app = new Hono()
		app.use('*', requestId())
		app.onError(errorHandler)

		app.get('/test', () => {
			throw new Error('Unexpected error')
		})

		const res = await app.request('/test')
		const body = (await res.json()) as ApiErrorResponse

		expect(res.status).toBe(500)
		expect(body.success).toBe(false)
		expect(body.error.code).toBe('INTERNAL_SERVER_ERROR')
		expect(body.error.requestId).toBeDefined()
	})

	it('should handle errors when requestId middleware is not applied', async () => {
		const app = new Hono()
		// No requestId middleware
		app.onError(errorHandler)

		app.get('/test', () => {
			throw new Error('Test error')
		})

		const res = await app.request('/test')
		const body = (await res.json()) as ApiErrorResponse

		expect(res.status).toBe(500)
		expect(body.error.code).toBe('INTERNAL_SERVER_ERROR')
		// requestId should be undefined but not break the response
		expect(body.error.requestId).toBeUndefined()
	})
})
