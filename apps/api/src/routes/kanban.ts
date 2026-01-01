import { zValidator } from '@hono/zod-validator'
import { db, smEpics, smSessions, smStories, users } from '@repo/db'
import { PaginationSchema } from '@repo/shared'
import { and, asc, desc, eq, gt, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { commonErrors, successResponse } from '../lib/response.js'
import { type AuthVariables, authMiddleware, getAuth } from '../middleware/auth.js'

export const kanbanRoutes = new Hono<{ Variables: AuthVariables }>()

// ============================================
// HELPER: Get user by clerkId
// ============================================

async function getUserByClerkId(clerkId: string) {
	return db.query.users.findFirst({
		where: eq(users.clerkId, clerkId),
	})
}

// ============================================
// KANBAN ENDPOINTS
// ============================================

/**
 * List SM sessions that have stories (for Kanban project list)
 * Only returns sessions with at least one story
 */
kanbanRoutes.get('/sessions', authMiddleware, zValidator('query', PaginationSchema), async (c) => {
	const { userId } = getAuth(c)
	const { page, limit } = c.req.valid('query')
	const offset = (page - 1) * limit

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	// Get sessions that have stories
	const [sessions, countResult] = await Promise.all([
		db.query.smSessions.findMany({
			where: and(eq(smSessions.userId, user.id), gt(smSessions.totalStories, 0)),
			columns: {
				id: true,
				projectName: true,
				projectDescription: true,
				status: true,
				totalEpics: true,
				totalStories: true,
				totalStoryPoints: true,
				createdAt: true,
				updatedAt: true,
			},
			limit,
			offset,
			orderBy: [desc(smSessions.updatedAt)],
		}),
		db
			.select({ count: sql<number>`count(*)` })
			.from(smSessions)
			.where(and(eq(smSessions.userId, user.id), gt(smSessions.totalStories, 0))),
	])

	return successResponse(c, sessions, 200, {
		page,
		limit,
		total: Number(countResult[0]?.count ?? 0),
	})
})

/**
 * Get Kanban board data for a specific session
 * Returns epics and stories organized for Kanban display
 */
kanbanRoutes.get('/sessions/:id/board', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	// Get session with epics and stories
	const session = await db.query.smSessions.findFirst({
		where: and(eq(smSessions.id, sessionId), eq(smSessions.userId, user.id)),
		columns: {
			id: true,
			projectName: true,
			projectDescription: true,
			status: true,
			totalEpics: true,
			totalStories: true,
			totalStoryPoints: true,
			sprintConfig: true,
		},
		with: {
			epics: {
				orderBy: [asc(smEpics.number)],
				columns: {
					id: true,
					number: true,
					title: true,
					description: true,
					status: true,
					priority: true,
					targetSprint: true,
					estimatedStoryPoints: true,
				},
			},
			stories: {
				orderBy: [asc(smStories.epicNumber), asc(smStories.storyNumber)],
				columns: {
					id: true,
					epicId: true,
					epicNumber: true,
					storyNumber: true,
					storyKey: true,
					title: true,
					asA: true,
					iWant: true,
					soThat: true,
					status: true,
					priority: true,
					storyPoints: true,
					targetSprint: true,
				},
			},
		},
	})

	if (!session) {
		return commonErrors.notFound(c, 'Session not found')
	}

	// Calculate stats per column
	const columnStats = {
		backlog: session.stories.filter((s) => s.status === 'backlog').length,
		ready_for_dev: session.stories.filter((s) => s.status === 'ready_for_dev').length,
		in_progress: session.stories.filter((s) => s.status === 'in_progress').length,
		review: session.stories.filter((s) => s.status === 'review').length,
		done: session.stories.filter((s) => s.status === 'done').length,
	}

	// Get unique sprints and priorities for filters
	const sprints = [...new Set(session.stories.map((s) => s.targetSprint).filter(Boolean))].sort(
		(a, b) => (a ?? 0) - (b ?? 0)
	)
	const priorities = ['critical', 'high', 'medium', 'low'] as const

	return successResponse(c, {
		session: {
			id: session.id,
			projectName: session.projectName,
			projectDescription: session.projectDescription,
			status: session.status,
			totalEpics: session.totalEpics,
			totalStories: session.totalStories,
			totalStoryPoints: session.totalStoryPoints,
			sprintConfig: session.sprintConfig,
		},
		epics: session.epics,
		stories: session.stories,
		columnStats,
		filters: {
			sprints,
			priorities,
		},
	})
})
