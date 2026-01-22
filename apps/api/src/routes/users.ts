import { zValidator } from '@hono/zod-validator'
import { db, users } from '@repo/db'
import {
	CreateUserSchema,
	PaginationSchema,
	UpdateSelfSchema,
	UpdateUserSchema,
} from '@repo/shared'
import { eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { commonErrors, successResponse } from '../lib/response.js'
import { type AuthVariables, authMiddleware, getAuth, requireAdmin } from '../middleware/auth.js'
import { verifyClerkWebhook } from '../middleware/webhook.js'

export const userRoutes = new Hono<{ Variables: AuthVariables }>()

// Get current user
userRoutes.get('/me', authMiddleware, async (c) => {
	const { userId } = getAuth(c)

	const user = await db.query.users.findFirst({
		where: eq(users.clerkId, userId),
	})

	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	return successResponse(c, user)
})

// List users (admin only)
userRoutes.get(
	'/',
	authMiddleware,
	requireAdmin,
	zValidator('query', PaginationSchema),
	async (c) => {
		const { page, limit } = c.req.valid('query')
		const offset = (page - 1) * limit

		const [userList, countResult] = await Promise.all([
			db.query.users.findMany({
				limit,
				offset,
				orderBy: (users, { desc }) => [desc(users.createdAt)],
			}),
			db.select({ count: sql<number>`count(*)` }).from(users),
		])

		return successResponse(c, userList, 200, {
			page,
			limit,
			total: Number(countResult[0]?.count ?? 0),
		})
	}
)

// Create user (webhook from Clerk)
// Uses verifyClerkWebhook middleware to validate webhook signature
userRoutes.post('/', verifyClerkWebhook, zValidator('json', CreateUserSchema), async (c) => {
	const data = c.req.valid('json')

	const [newUser] = await db.insert(users).values(data).returning()

	return successResponse(c, newUser, 201)
})

// Update current user's own profile
userRoutes.patch('/me', authMiddleware, zValidator('json', UpdateSelfSchema), async (c) => {
	const { userId } = getAuth(c)
	const data = c.req.valid('json')

	const [updatedUser] = await db
		.update(users)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(users.clerkId, userId))
		.returning()

	if (!updatedUser) {
		return commonErrors.notFound(c, 'User not found')
	}

	return successResponse(c, updatedUser)
})

// Sync user name from Clerk (called from frontend)
userRoutes.patch(
	'/me/sync',
	authMiddleware,
	zValidator('json', UpdateUserSchema.pick({ name: true })),
	async (c) => {
		const { userId } = getAuth(c)
		const { name } = c.req.valid('json')

		if (!name) {
			return commonErrors.badRequest(c, 'Name is required')
		}

		const [updatedUser] = await db
			.update(users)
			.set({ name, updatedAt: new Date() })
			.where(eq(users.clerkId, userId))
			.returning()

		if (!updatedUser) {
			return commonErrors.notFound(c, 'User not found')
		}

		return successResponse(c, updatedUser)
	}
)

// Update user by ID (admin only)
userRoutes.patch(
	'/:id',
	authMiddleware,
	requireAdmin,
	zValidator('json', UpdateUserSchema),
	async (c) => {
		const id = c.req.param('id')
		const data = c.req.valid('json')

		const [updatedUser] = await db
			.update(users)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(users.id, id))
			.returning()

		if (!updatedUser) {
			return commonErrors.notFound(c, 'User not found')
		}

		return successResponse(c, updatedUser)
	}
)
