import { verifyToken } from '@clerk/backend'
import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'

export type AuthVariables = {
	userId: string
	sessionId: string
}

export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
	const authHeader = c.req.header('Authorization')

	if (!authHeader?.startsWith('Bearer ')) {
		return c.json(
			{
				success: false,
				error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
			},
			401
		)
	}

	const token = authHeader.slice(7)

	const secretKey = process.env['CLERK_SECRET_KEY']
	if (!secretKey) {
		return c.json(
			{ success: false, error: { code: 'CONFIGURATION_ERROR', message: 'Server misconfigured' } },
			500
		)
	}

	try {
		const payload = await verifyToken(token, {
			secretKey,
		})

		c.set('userId', payload.sub)
		c.set('sessionId', payload.sid ?? '')

		await next()
	} catch {
		return c.json(
			{ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
			401
		)
	}
})

export function getAuth(c: Context<{ Variables: AuthVariables }>) {
	return {
		userId: c.get('userId'),
		sessionId: c.get('sessionId'),
	}
}
