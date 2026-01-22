import type { Context, Next } from 'hono'
import { Webhook } from 'svix'
import { commonErrors } from '../lib/response.js'

/**
 * Middleware to verify Clerk webhook signatures using Svix
 * Must be used BEFORE any body parsing middleware
 */
export async function verifyClerkWebhook(c: Context, next: Next) {
	// Read at runtime to allow test mocking
	const webhookSecret = process.env['CLERK_WEBHOOK_SECRET']

	if (!webhookSecret) {
		// biome-ignore lint/suspicious/noConsole: Critical error needs to be logged for debugging
		console.error('CLERK_WEBHOOK_SECRET is not configured')
		return commonErrors.internalError(c, 'Webhook verification not configured')
	}

	const svixId = c.req.header('svix-id')
	const svixTimestamp = c.req.header('svix-timestamp')
	const svixSignature = c.req.header('svix-signature')

	// Missing headers = not a valid webhook
	if (!svixId || !svixTimestamp || !svixSignature) {
		return commonErrors.badRequest(c, 'Missing webhook verification headers')
	}

	// Validate timestamp is within 5 minutes to prevent replay attacks
	const WEBHOOK_TOLERANCE_MS = 5 * 60 * 1000 // 5 minutes
	const timestampSeconds = Number.parseInt(svixTimestamp, 10)
	if (Number.isNaN(timestampSeconds)) {
		return commonErrors.badRequest(c, 'Invalid webhook timestamp')
	}
	const timestampMs = timestampSeconds * 1000
	const now = Date.now()
	if (Math.abs(now - timestampMs) > WEBHOOK_TOLERANCE_MS) {
		return commonErrors.badRequest(c, 'Webhook timestamp too old or in future')
	}

	// Get raw body for signature verification
	const rawBody = await c.req.text()

	try {
		const wh = new Webhook(webhookSecret)
		wh.verify(rawBody, {
			'svix-id': svixId,
			'svix-timestamp': svixTimestamp,
			'svix-signature': svixSignature,
		})

		// Store parsed body for next handlers
		c.set('webhookPayload', JSON.parse(rawBody))

		await next()
	} catch (_error) {
		// Don't log error details to avoid exposing sensitive information
		return commonErrors.unauthorized(c, 'Invalid webhook signature')
	}
}

/**
 * Type for webhook payload from Clerk
 */
export interface ClerkWebhookPayload {
	type: string
	data: Record<string, unknown>
	object: string
}
