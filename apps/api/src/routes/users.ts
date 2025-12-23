import { zValidator } from '@hono/zod-validator'
import { db, users } from '@repo/db'
import { CreateUserSchema, PaginationSchema, UpdateUserSchema } from '@repo/shared'
import { eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { type AuthVariables, authMiddleware, getAuth } from '../middleware/auth.js'

export const userRoutes = new Hono<{ Variables: AuthVariables }>()

// Get current user
userRoutes.get('/me', authMiddleware, async (c) => {
	const { userId } = getAuth(c)

	const user = await db.query.users.findFirst({
		where: eq(users.clerkId, userId),
	})

	if (!user) {
		return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404)
	}

	return c.json({ success: true, data: user })
})

// List users (admin only)
userRoutes.get('/', authMiddleware, zValidator('query', PaginationSchema), async (c) => {
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

	return c.json({
		success: true,
		data: userList,
		meta: { page, limit, total: Number(countResult[0]?.count ?? 0) },
	})
})

// Create user (webhook from Clerk)
userRoutes.post('/', zValidator('json', CreateUserSchema), async (c) => {
	const data = c.req.valid('json')

	const [newUser] = await db.insert(users).values(data).returning()

	return c.json({ success: true, data: newUser }, 201)
})

// Update user
userRoutes.patch('/:id', authMiddleware, zValidator('json', UpdateUserSchema), async (c) => {
	const id = c.req.param('id')
	const data = c.req.valid('json')

	const [updatedUser] = await db
		.update(users)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(users.id, id))
		.returning()

	if (!updatedUser) {
		return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404)
	}

	return c.json({ success: true, data: updatedUser })
})
