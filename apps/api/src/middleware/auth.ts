import { verifyToken } from '@clerk/backend'
import { db, users } from '@repo/db'
import { eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import { commonErrors, errorResponse } from '../lib/response.js'

export type AuthVariables = {
	userId: string
	sessionId: string
	dbUserId: string
}

export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
	const authHeader = c.req.header('Authorization')

	if (!authHeader?.startsWith('Bearer ')) {
		return commonErrors.unauthorized(c, 'Missing or invalid authorization header')
	}

	const token = authHeader.slice(7)

	const secretKey = process.env['CLERK_SECRET_KEY']
	if (!secretKey) {
		return errorResponse(c, 'CONFIGURATION_ERROR', 'Server misconfigured', 500)
	}

	try {
		const payload = await verifyToken(token, {
			secretKey,
		})

		const clerkId = payload.sub
		c.set('userId', clerkId)
		c.set('sessionId', payload.sid ?? '')

		// Auto-create user if not exists
		let user = await db.query.users.findFirst({
			where: eq(users.clerkId, clerkId),
		})

		if (!user) {
			// Extract email from token claims or use placeholder
			const email = (payload as { email?: string }).email ?? `${clerkId}@clerk.local`
			const name = (payload as { name?: string }).name ?? 'User'

			const [newUser] = await db
				.insert(users)
				.values({
					clerkId,
					email,
					name,
					role: 'user',
				})
				.returning()

			user = newUser
		}

		if (user) {
			c.set('dbUserId', user.id)
		}

		await next()
	} catch {
		return commonErrors.unauthorized(c, 'Invalid token')
	}
})

export function getAuth(c: Context<{ Variables: AuthVariables }>) {
	return {
		userId: c.get('userId'),
		sessionId: c.get('sessionId'),
		dbUserId: c.get('dbUserId'),
	}
}

export const requireAdmin = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
	const { userId } = getAuth(c)

	const user = await db.query.users.findFirst({
		where: eq(users.clerkId, userId),
	})

	if (user?.role !== 'admin') {
		return commonErrors.forbidden(c, 'Admin access required')
	}

	await next()
})
