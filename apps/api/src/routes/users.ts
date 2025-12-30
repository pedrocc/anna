import { zValidator } from '@hono/zod-validator'
import { db, users } from '@repo/db'
import { CreateUserSchema, PaginationSchema, UpdateUserSchema } from '@repo/shared'
import { eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { commonErrors, successResponse } from '../lib/response.js'
import { type AuthVariables, authMiddleware, getAuth, requireAdmin } from '../middleware/auth.js'

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
userRoutes.post('/', zValidator('json', CreateUserSchema), async (c) => {
	const data = c.req.valid('json')

	const [newUser] = await db.insert(users).values(data).returning()

	return successResponse(c, newUser, 201)
})

// Update user
userRoutes.patch('/:id', authMiddleware, zValidator('json', UpdateUserSchema), async (c) => {
	const { userId } = getAuth(c)
	const id = c.req.param('id')
	const data = c.req.valid('json')

	// Get current user to check permissions
	const currentUser = await db.query.users.findFirst({
		where: eq(users.clerkId, userId),
	})

	if (!currentUser) {
		return commonErrors.notFound(c, 'User not found')
	}

	// Get target user to verify it exists and get clerkId
	const targetUser = await db.query.users.findFirst({
		where: eq(users.id, id),
	})

	if (!targetUser) {
		return commonErrors.notFound(c, 'Target user not found')
	}

	// Only allow users to update themselves OR admins to update anyone
	if (userId !== targetUser.clerkId && currentUser.role !== 'admin') {
		return commonErrors.forbidden(c, 'You can only update your own profile')
	}

	// Prevent role escalation - only admins can change roles
	const updateData = { ...data }
	if (currentUser.role !== 'admin') {
		delete updateData.role
	}

	const [updatedUser] = await db
		.update(users)
		.set({ ...updateData, updatedAt: new Date() })
		.where(eq(users.id, id))
		.returning()

	if (!updatedUser) {
		return commonErrors.notFound(c, 'User not found')
	}

	return successResponse(c, updatedUser)
})
