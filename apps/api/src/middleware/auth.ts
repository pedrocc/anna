import { verifyToken } from '@clerk/backend'
import { db, users } from '@repo/db'
import { eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import { authLogger } from '../lib/logger.js'
import { commonErrors, errorResponse } from '../lib/response.js'

export type AuthVariables = {
	userId: string
	sessionId: string
	dbUserId: string
}

export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
	const authHeader = c.req.header('Authorization')

	if (!authHeader?.startsWith('Bearer ')) {
		authLogger.warn('Auth failed: missing or invalid authorization header')
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

		// Extract user info from Clerk token
		const clerkPayload = payload as {
			email?: string
			name?: string
			first_name?: string
			last_name?: string
			full_name?: string
			firstName?: string
			lastName?: string
		}
		const email = clerkPayload.email ?? `${clerkId}@clerk.local`
		const name =
			clerkPayload.name ??
			clerkPayload.full_name ??
			(clerkPayload.first_name || clerkPayload.firstName
				? `${clerkPayload.first_name ?? clerkPayload.firstName ?? ''} ${clerkPayload.last_name ?? clerkPayload.lastName ?? ''}`.trim()
				: null)

		if (!user) {
			const [newUser] = await db
				.insert(users)
				.values({
					clerkId,
					email,
					name: name || 'User',
					role: 'user',
				})
				.returning()

			user = newUser
		} else if (user.name === 'User' && name) {
			// Update user name if it was set to default and we now have a real name
			const [updatedUser] = await db
				.update(users)
				.set({ name, updatedAt: new Date() })
				.where(eq(users.clerkId, clerkId))
				.returning()
			user = updatedUser ?? user
		}

		if (user) {
			c.set('dbUserId', user.id)
		}

		await next()
	} catch (err) {
		authLogger.warn({ err }, 'Auth failed')
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
