import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { db } from '@repo/db'
import { briefingMessages, briefingSessions, users } from '@repo/db/schema'
import { desc, eq } from 'drizzle-orm'

function assertDefined<T>(value: T | undefined | null, msg = 'Expected value to be defined'): T {
	if (value == null) throw new Error(msg)
	return value
}

describe('Briefing Session - Create and Verify Timestamps', () => {
	let testUserId: string
	const createdSessionIds: string[] = []

	beforeAll(async () => {
		const [user] = await db
			.insert(users)
			.values({
				clerkId: 'test-clerk-id-timestamps',
				email: 'test-timestamps@example.com',
				name: 'Test Timestamps User',
				role: 'user',
			})
			.onConflictDoUpdate({
				target: users.clerkId,
				set: { email: 'test-timestamps@example.com', name: 'Test Timestamps User' },
			})
			.returning()

		testUserId = assertDefined(user).id
	})

	afterAll(async () => {
		try {
			for (const sessionId of createdSessionIds) {
				await db.delete(briefingSessions).where(eq(briefingSessions.id, sessionId))
			}
			await db.delete(users).where(eq(users.id, testUserId))
		} catch {
			// Connection may already be closed by other test files
		}
	})

	it('should set createdAt and updatedAt on session creation', async () => {
		const beforeInsert = new Date()

		const [row] = await db
			.insert(briefingSessions)
			.values({
				userId: testUserId,
				projectName: 'Timestamp Test Project',
				projectDescription: 'Testing timestamp behavior',
			})
			.returning()

		const afterInsert = new Date()
		const session = assertDefined(row)
		createdSessionIds.push(session.id)

		expect(session.createdAt).toBeInstanceOf(Date)
		expect(session.updatedAt).toBeInstanceOf(Date)

		// createdAt should be within the insert time window (with 1s tolerance)
		expect(session.createdAt.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime() - 1000)
		expect(session.createdAt.getTime()).toBeLessThanOrEqual(afterInsert.getTime() + 1000)

		// updatedAt should be within the insert time window
		expect(session.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime() - 1000)
		expect(session.updatedAt.getTime()).toBeLessThanOrEqual(afterInsert.getTime() + 1000)

		// createdAt and updatedAt should be equal on creation
		expect(session.createdAt.getTime()).toBe(session.updatedAt.getTime())

		// completedAt should be null on creation
		expect(session.completedAt).toBeNull()
	})

	it('should set default values correctly on creation', async () => {
		const [row] = await db
			.insert(briefingSessions)
			.values({
				userId: testUserId,
				projectName: 'Defaults Test Project',
			})
			.returning()

		const session = assertDefined(row)
		createdSessionIds.push(session.id)

		expect(session.status).toBe('active')
		expect(session.currentStep).toBe('init')
		expect(session.projectName).toBe('Defaults Test Project')
		expect(session.projectDescription).toBeNull()
		expect(session.completedAt).toBeNull()
		expect(session.generationStartedAt).toBeNull()
	})

	it('should persist timestamps correctly and match on re-fetch', async () => {
		const [row] = await db
			.insert(briefingSessions)
			.values({
				userId: testUserId,
				projectName: 'Persistence Test',
				projectDescription: 'Verifying DB persistence of timestamps',
			})
			.returning()

		const session = assertDefined(row)
		createdSessionIds.push(session.id)

		const fetched = assertDefined(
			await db.query.briefingSessions.findFirst({
				where: eq(briefingSessions.id, session.id),
			})
		)

		expect(fetched.createdAt).toBeInstanceOf(Date)
		expect(fetched.updatedAt).toBeInstanceOf(Date)

		// Timestamps should match between insert return and re-fetch
		expect(fetched.createdAt.getTime()).toBe(session.createdAt.getTime())
		expect(fetched.updatedAt.getTime()).toBe(session.updatedAt.getTime())
		expect(fetched.completedAt).toBeNull()
	})

	it('should update updatedAt on session modification without changing createdAt', async () => {
		const [row] = await db
			.insert(briefingSessions)
			.values({
				userId: testUserId,
				projectName: 'Update Test',
			})
			.returning()

		const session = assertDefined(row)
		createdSessionIds.push(session.id)

		const originalCreatedAt = session.createdAt.getTime()
		const originalUpdatedAt = session.updatedAt.getTime()

		// Wait to ensure different timestamp
		await new Promise((resolve) => setTimeout(resolve, 50))

		const beforeUpdate = new Date()

		const [updatedRow] = await db
			.update(briefingSessions)
			.set({
				projectName: 'Updated Name',
				updatedAt: new Date(),
			})
			.where(eq(briefingSessions.id, session.id))
			.returning()

		const afterUpdate = new Date()
		const updated = assertDefined(updatedRow)

		// createdAt should NOT change
		expect(updated.createdAt.getTime()).toBe(originalCreatedAt)

		// updatedAt should be newer than original
		expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt)

		// updatedAt should be within the update time window
		expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime() - 1000)
		expect(updated.updatedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime() + 1000)
	})

	it('should set completedAt when session is marked as completed', async () => {
		const [row] = await db
			.insert(briefingSessions)
			.values({
				userId: testUserId,
				projectName: 'Completion Test',
			})
			.returning()

		const session = assertDefined(row)
		createdSessionIds.push(session.id)

		expect(session.completedAt).toBeNull()

		const beforeComplete = new Date()

		const [completedRow] = await db
			.update(briefingSessions)
			.set({
				status: 'completed',
				completedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(briefingSessions.id, session.id))
			.returning()

		const afterComplete = new Date()
		const completed = assertDefined(completedRow)

		expect(completed.status).toBe('completed')
		expect(completed.completedAt).toBeInstanceOf(Date)

		const completedAtTime = assertDefined(completed.completedAt).getTime()
		expect(completedAtTime).toBeGreaterThanOrEqual(beforeComplete.getTime() - 1000)
		expect(completedAtTime).toBeLessThanOrEqual(afterComplete.getTime() + 1000)

		// createdAt should remain unchanged
		expect(completed.createdAt.getTime()).toBe(session.createdAt.getTime())
	})

	it('should create distinct timestamps for separate sessions', async () => {
		const [row1] = await db
			.insert(briefingSessions)
			.values({
				userId: testUserId,
				projectName: 'First Session',
			})
			.returning()

		// Small delay to ensure different timestamps
		await new Promise((resolve) => setTimeout(resolve, 10))

		const [row2] = await db
			.insert(briefingSessions)
			.values({
				userId: testUserId,
				projectName: 'Second Session',
			})
			.returning()

		const session1 = assertDefined(row1)
		const session2 = assertDefined(row2)
		createdSessionIds.push(session1.id, session2.id)

		// Second session should have a later or equal timestamp
		expect(session2.createdAt.getTime()).toBeGreaterThanOrEqual(session1.createdAt.getTime())

		// Session IDs must be different
		expect(session1.id).not.toBe(session2.id)
	})

	it('should set message createdAt when creating a session message', async () => {
		const [row] = await db
			.insert(briefingSessions)
			.values({
				userId: testUserId,
				projectName: 'Message Timestamp Test',
			})
			.returning()

		const session = assertDefined(row)
		createdSessionIds.push(session.id)

		const beforeMessage = new Date()

		const [msgRow] = await db
			.insert(briefingMessages)
			.values({
				sessionId: session.id,
				role: 'assistant',
				content: 'Welcome to the briefing session!',
				step: 'init',
			})
			.returning()

		const afterMessage = new Date()
		const message = assertDefined(msgRow)

		expect(message.createdAt).toBeInstanceOf(Date)
		expect(message.createdAt.getTime()).toBeGreaterThanOrEqual(beforeMessage.getTime() - 1000)
		expect(message.createdAt.getTime()).toBeLessThanOrEqual(afterMessage.getTime() + 1000)
	})

	it('should order sessions by createdAt descending', async () => {
		const sessionIds: string[] = []

		for (let i = 0; i < 3; i++) {
			const [row] = await db
				.insert(briefingSessions)
				.values({
					userId: testUserId,
					projectName: `Order Test ${Date.now()}-${i}`,
				})
				.returning()

			const session = assertDefined(row)
			sessionIds.push(session.id)
			createdSessionIds.push(session.id)

			if (i < 2) {
				await new Promise((resolve) => setTimeout(resolve, 10))
			}
		}

		// Fetch sessions ordered by createdAt desc
		const fetched = await db.query.briefingSessions.findMany({
			where: eq(briefingSessions.userId, testUserId),
			orderBy: [desc(briefingSessions.createdAt)],
		})

		// Get only sessions we just created (by their IDs)
		const orderTestSessions = fetched.filter((s) => sessionIds.includes(s.id))

		expect(orderTestSessions.length).toBe(3)

		// Verify descending order
		for (let i = 0; i < orderTestSessions.length - 1; i++) {
			const current = assertDefined(orderTestSessions[i])
			const next = assertDefined(orderTestSessions[i + 1])
			expect(current.createdAt.getTime()).toBeGreaterThanOrEqual(next.createdAt.getTime())
		}
	})
})
