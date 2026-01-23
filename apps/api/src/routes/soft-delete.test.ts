import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { db } from '@repo/db'
import {
	briefingSessions,
	prdSessions,
	smEpics,
	smSessions,
	smStories,
	users,
} from '@repo/db/schema'
import { and, eq, isNull } from 'drizzle-orm'

function assertDefined<T>(value: T | undefined | null, msg = 'Expected value to be defined'): T {
	if (value == null) throw new Error(msg)
	return value
}

describe('Soft Delete - Session Tables', () => {
	let testUserId: string
	const createdBriefingIds: string[] = []
	const createdPrdIds: string[] = []
	const createdSmIds: string[] = []

	beforeAll(async () => {
		const [user] = await db
			.insert(users)
			.values({
				clerkId: 'test-clerk-soft-delete',
				email: 'test-soft-delete@example.com',
				name: 'Test Soft Delete User',
				role: 'user',
			})
			.onConflictDoUpdate({
				target: users.clerkId,
				set: { email: 'test-soft-delete@example.com', name: 'Test Soft Delete User' },
			})
			.returning()

		testUserId = assertDefined(user).id
	})

	afterAll(async () => {
		try {
			for (const id of createdBriefingIds) {
				await db.delete(briefingSessions).where(eq(briefingSessions.id, id))
			}
			for (const id of createdPrdIds) {
				await db.delete(prdSessions).where(eq(prdSessions.id, id))
			}
			for (const id of createdSmIds) {
				await db.delete(smSessions).where(eq(smSessions.id, id))
			}
			await db.delete(users).where(eq(users.id, testUserId))
		} catch {
			// Connection may already be closed
		}
	})

	describe('briefing_sessions', () => {
		it('should have deletedAt as null on creation', async () => {
			const [row] = await db
				.insert(briefingSessions)
				.values({
					userId: testUserId,
					projectName: 'Soft Delete Test Briefing',
				})
				.returning()

			const session = assertDefined(row)
			createdBriefingIds.push(session.id)

			expect(session.deletedAt).toBeNull()
		})

		it('should set deletedAt for soft delete', async () => {
			const [row] = await db
				.insert(briefingSessions)
				.values({
					userId: testUserId,
					projectName: 'To Be Soft Deleted Briefing',
				})
				.returning()

			const session = assertDefined(row)
			createdBriefingIds.push(session.id)

			const now = new Date()
			const [updated] = await db
				.update(briefingSessions)
				.set({ deletedAt: now })
				.where(eq(briefingSessions.id, session.id))
				.returning()

			const deleted = assertDefined(updated)
			expect(deleted.deletedAt).toBeInstanceOf(Date)
			expect(assertDefined(deleted.deletedAt).getTime()).toBe(now.getTime())
		})

		it('should be filtered out when querying with isNull(deletedAt)', async () => {
			const [active] = await db
				.insert(briefingSessions)
				.values({
					userId: testUserId,
					projectName: 'Active Briefing Session',
				})
				.returning()

			const [toDelete] = await db
				.insert(briefingSessions)
				.values({
					userId: testUserId,
					projectName: 'Deleted Briefing Session',
				})
				.returning()

			createdBriefingIds.push(assertDefined(active).id, assertDefined(toDelete).id)

			const activeSession = assertDefined(active)
			const deletedSession = assertDefined(toDelete)

			// Soft delete one
			await db
				.update(briefingSessions)
				.set({ deletedAt: new Date() })
				.where(eq(briefingSessions.id, deletedSession.id))

			// Query with soft-delete filter
			const results = await db.query.briefingSessions.findMany({
				where: and(eq(briefingSessions.userId, testUserId), isNull(briefingSessions.deletedAt)),
			})

			const ids = results.map((r) => r.id)
			expect(ids).toContain(activeSession.id)
			expect(ids).not.toContain(deletedSession.id)
		})

		it('should not allow double-delete (isNull filter prevents)', async () => {
			const [row] = await db
				.insert(briefingSessions)
				.values({
					userId: testUserId,
					projectName: 'Double Delete Test',
				})
				.returning()

			const session = assertDefined(row)
			createdBriefingIds.push(session.id)

			// First soft delete
			const [first] = await db
				.update(briefingSessions)
				.set({ deletedAt: new Date() })
				.where(and(eq(briefingSessions.id, session.id), isNull(briefingSessions.deletedAt)))
				.returning()

			expect(first).toBeDefined()

			// Second soft delete attempt should return nothing
			const [second] = await db
				.update(briefingSessions)
				.set({ deletedAt: new Date() })
				.where(and(eq(briefingSessions.id, session.id), isNull(briefingSessions.deletedAt)))
				.returning()

			expect(second).toBeUndefined()
		})
	})

	describe('prd_sessions', () => {
		it('should have deletedAt as null on creation', async () => {
			const [row] = await db
				.insert(prdSessions)
				.values({
					userId: testUserId,
					projectName: 'Soft Delete Test PRD',
				})
				.returning()

			const session = assertDefined(row)
			createdPrdIds.push(session.id)

			expect(session.deletedAt).toBeNull()
		})

		it('should set deletedAt for soft delete', async () => {
			const [row] = await db
				.insert(prdSessions)
				.values({
					userId: testUserId,
					projectName: 'To Be Soft Deleted PRD',
				})
				.returning()

			const session = assertDefined(row)
			createdPrdIds.push(session.id)

			const now = new Date()
			const [updated] = await db
				.update(prdSessions)
				.set({ deletedAt: now })
				.where(eq(prdSessions.id, session.id))
				.returning()

			const deleted = assertDefined(updated)
			expect(deleted.deletedAt).toBeInstanceOf(Date)
		})

		it('should be filtered from completed PRD list when soft-deleted', async () => {
			const [completed] = await db
				.insert(prdSessions)
				.values({
					userId: testUserId,
					projectName: 'Completed PRD Active',
					status: 'completed',
				})
				.returning()

			const [deletedCompleted] = await db
				.insert(prdSessions)
				.values({
					userId: testUserId,
					projectName: 'Completed PRD Deleted',
					status: 'completed',
				})
				.returning()

			const activeCompleted = assertDefined(completed)
			const softDeletedCompleted = assertDefined(deletedCompleted)
			createdPrdIds.push(activeCompleted.id, softDeletedCompleted.id)

			// Soft delete
			await db
				.update(prdSessions)
				.set({ deletedAt: new Date() })
				.where(eq(prdSessions.id, softDeletedCompleted.id))

			// Query like the SM prd-sessions endpoint
			const results = await db.query.prdSessions.findMany({
				where: and(
					eq(prdSessions.userId, testUserId),
					eq(prdSessions.status, 'completed'),
					isNull(prdSessions.deletedAt)
				),
			})

			const ids = results.map((r) => r.id)
			expect(ids).toContain(activeCompleted.id)
			expect(ids).not.toContain(softDeletedCompleted.id)
		})
	})

	describe('sm_sessions', () => {
		it('should have deletedAt as null on creation', async () => {
			const [row] = await db
				.insert(smSessions)
				.values({
					userId: testUserId,
					projectName: 'Soft Delete Test SM',
				})
				.returning()

			const session = assertDefined(row)
			createdSmIds.push(session.id)

			expect(session.deletedAt).toBeNull()
		})

		it('should set deletedAt for soft delete', async () => {
			const [row] = await db
				.insert(smSessions)
				.values({
					userId: testUserId,
					projectName: 'To Be Soft Deleted SM',
				})
				.returning()

			const session = assertDefined(row)
			createdSmIds.push(session.id)

			const now = new Date()
			const [updated] = await db
				.update(smSessions)
				.set({ deletedAt: now })
				.where(eq(smSessions.id, session.id))
				.returning()

			const deleted = assertDefined(updated)
			expect(deleted.deletedAt).toBeInstanceOf(Date)
		})
	})
})

describe('Soft Delete - SM Epics and Stories', () => {
	let testUserId: string
	let testSessionId: string

	beforeAll(async () => {
		const [user] = await db
			.insert(users)
			.values({
				clerkId: 'test-clerk-soft-delete-sm',
				email: 'test-soft-delete-sm@example.com',
				name: 'Test Soft Delete SM User',
				role: 'user',
			})
			.onConflictDoUpdate({
				target: users.clerkId,
				set: { email: 'test-soft-delete-sm@example.com', name: 'Test Soft Delete SM User' },
			})
			.returning()

		testUserId = assertDefined(user).id

		const [session] = await db
			.insert(smSessions)
			.values({
				userId: testUserId,
				projectName: 'SM Soft Delete Test Session',
			})
			.returning()

		testSessionId = assertDefined(session).id
	})

	afterAll(async () => {
		try {
			await db.delete(smSessions).where(eq(smSessions.id, testSessionId))
			await db.delete(users).where(eq(users.id, testUserId))
		} catch {
			// Connection may already be closed
		}
	})

	describe('sm_epics', () => {
		it('should have deletedAt as null on creation', async () => {
			const [row] = await db
				.insert(smEpics)
				.values({
					sessionId: testSessionId,
					number: 100,
					title: 'Soft Delete Test Epic',
					description: 'Testing soft delete on epics',
				})
				.returning()

			const epic = assertDefined(row)
			expect(epic.deletedAt).toBeNull()
		})

		it('should set deletedAt for soft delete', async () => {
			const [row] = await db
				.insert(smEpics)
				.values({
					sessionId: testSessionId,
					number: 101,
					title: 'To Be Soft Deleted Epic',
					description: 'This epic will be soft deleted',
				})
				.returning()

			const epic = assertDefined(row)

			const now = new Date()
			const [updated] = await db
				.update(smEpics)
				.set({ deletedAt: now })
				.where(eq(smEpics.id, epic.id))
				.returning()

			const deleted = assertDefined(updated)
			expect(deleted.deletedAt).toBeInstanceOf(Date)
		})

		it('should filter soft-deleted epics from queries', async () => {
			const [active] = await db
				.insert(smEpics)
				.values({
					sessionId: testSessionId,
					number: 102,
					title: 'Active Epic',
					description: 'This epic is active',
				})
				.returning()

			const [toDelete] = await db
				.insert(smEpics)
				.values({
					sessionId: testSessionId,
					number: 103,
					title: 'Deleted Epic',
					description: 'This epic will be deleted',
				})
				.returning()

			// Soft delete
			await db
				.update(smEpics)
				.set({ deletedAt: new Date() })
				.where(eq(smEpics.id, assertDefined(toDelete).id))

			// Query with filter
			const results = await db.query.smEpics.findMany({
				where: and(eq(smEpics.sessionId, testSessionId), isNull(smEpics.deletedAt)),
			})

			const activeEpic = assertDefined(active)
			const deletedEpic = assertDefined(toDelete)

			const ids = results.map((r) => r.id)
			expect(ids).toContain(activeEpic.id)
			expect(ids).not.toContain(deletedEpic.id)
		})
	})

	describe('sm_stories', () => {
		let testEpicId: string

		beforeAll(async () => {
			const [epic] = await db
				.insert(smEpics)
				.values({
					sessionId: testSessionId,
					number: 200,
					title: 'Stories Test Epic',
					description: 'Epic for testing story soft delete',
				})
				.returning()

			testEpicId = assertDefined(epic).id
		})

		it('should have deletedAt as null on creation', async () => {
			const [row] = await db
				.insert(smStories)
				.values({
					sessionId: testSessionId,
					epicId: testEpicId,
					epicNumber: 200,
					storyNumber: 1,
					storyKey: '200-1',
					title: 'Soft Delete Test Story',
					asA: 'developer',
					iWant: 'to test soft delete',
					soThat: 'data is preserved',
				})
				.returning()

			const story = assertDefined(row)
			expect(story.deletedAt).toBeNull()
		})

		it('should set deletedAt for soft delete', async () => {
			const [row] = await db
				.insert(smStories)
				.values({
					sessionId: testSessionId,
					epicId: testEpicId,
					epicNumber: 200,
					storyNumber: 2,
					storyKey: '200-2',
					title: 'To Be Soft Deleted Story',
					asA: 'developer',
					iWant: 'to soft delete this',
					soThat: 'it is preserved',
				})
				.returning()

			const story = assertDefined(row)

			const now = new Date()
			const [updated] = await db
				.update(smStories)
				.set({ deletedAt: now })
				.where(eq(smStories.id, story.id))
				.returning()

			const deleted = assertDefined(updated)
			expect(deleted.deletedAt).toBeInstanceOf(Date)
		})

		it('should filter soft-deleted stories from queries', async () => {
			const [active] = await db
				.insert(smStories)
				.values({
					sessionId: testSessionId,
					epicId: testEpicId,
					epicNumber: 200,
					storyNumber: 3,
					storyKey: '200-3',
					title: 'Active Story',
					asA: 'user',
					iWant: 'to see this',
					soThat: 'it works',
				})
				.returning()

			const [toDelete] = await db
				.insert(smStories)
				.values({
					sessionId: testSessionId,
					epicId: testEpicId,
					epicNumber: 200,
					storyNumber: 4,
					storyKey: '200-4',
					title: 'Deleted Story',
					asA: 'user',
					iWant: 'to hide this',
					soThat: 'it is filtered',
				})
				.returning()

			// Soft delete
			await db
				.update(smStories)
				.set({ deletedAt: new Date() })
				.where(eq(smStories.id, assertDefined(toDelete).id))

			// Query with filter
			const results = await db.query.smStories.findMany({
				where: and(eq(smStories.sessionId, testSessionId), isNull(smStories.deletedAt)),
			})

			const activeStory = assertDefined(active)
			const deletedStory = assertDefined(toDelete)

			const ids = results.map((r) => r.id)
			expect(ids).toContain(activeStory.id)
			expect(ids).not.toContain(deletedStory.id)
		})

		it('should cascade soft delete from epic to stories', async () => {
			const [epic] = await db
				.insert(smEpics)
				.values({
					sessionId: testSessionId,
					number: 300,
					title: 'Cascade Delete Epic',
					description: 'Epic with stories to cascade',
				})
				.returning()

			const epicId = assertDefined(epic).id

			await db
				.insert(smStories)
				.values({
					sessionId: testSessionId,
					epicId,
					epicNumber: 300,
					storyNumber: 1,
					storyKey: '300-1',
					title: 'Cascade Story 1',
					asA: 'user',
					iWant: 'cascade 1',
					soThat: 'test',
				})
				.returning()

			await db
				.insert(smStories)
				.values({
					sessionId: testSessionId,
					epicId,
					epicNumber: 300,
					storyNumber: 2,
					storyKey: '300-2',
					title: 'Cascade Story 2',
					asA: 'user',
					iWant: 'cascade 2',
					soThat: 'test',
				})
				.returning()

			// Simulate cascade soft delete (like the route handler does)
			const now = new Date()
			await db.update(smEpics).set({ deletedAt: now }).where(eq(smEpics.id, epicId))
			await db.update(smStories).set({ deletedAt: now }).where(eq(smStories.epicId, epicId))

			// Verify epic is soft-deleted
			const epicResult = await db.query.smEpics.findFirst({
				where: and(eq(smEpics.id, epicId), isNull(smEpics.deletedAt)),
			})
			expect(epicResult).toBeUndefined()

			// Verify stories are soft-deleted
			const storyResults = await db.query.smStories.findMany({
				where: and(eq(smStories.epicId, epicId), isNull(smStories.deletedAt)),
			})
			expect(storyResults).toHaveLength(0)

			// Verify records still exist in DB (not hard-deleted)
			const allStories = await db.query.smStories.findMany({
				where: eq(smStories.epicId, epicId),
			})
			expect(allStories).toHaveLength(2)
			expect(allStories[0]?.deletedAt).toBeInstanceOf(Date)
			expect(allStories[1]?.deletedAt).toBeInstanceOf(Date)
		})
	})
})
