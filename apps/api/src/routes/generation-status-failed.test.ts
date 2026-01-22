import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { db } from '@repo/db'
import { briefingSessions, prdSessions, smSessions, users } from '@repo/db/schema'
import { eq } from 'drizzle-orm'

function assertDefined<T>(value: T | undefined | null, msg = 'Expected value to be defined'): T {
	if (value == null) throw new Error(msg)
	return value
}

describe('generationStatus failed state on SSE stream errors', () => {
	let testUserId: string
	const createdBriefingIds: string[] = []
	const createdPrdIds: string[] = []
	const createdSmIds: string[] = []

	beforeAll(async () => {
		const [user] = await db
			.insert(users)
			.values({
				clerkId: 'test-clerk-gen-status-failed',
				email: 'test-gen-status@example.com',
				name: 'Test Gen Status User',
				role: 'user',
			})
			.onConflictDoUpdate({
				target: users.clerkId,
				set: { email: 'test-gen-status@example.com', name: 'Test Gen Status User' },
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

	describe('Briefing session', () => {
		it('should update generationStatus to failed and persist generationError', async () => {
			const [session] = await db
				.insert(briefingSessions)
				.values({
					userId: testUserId,
					projectName: 'Test Briefing Failed',
					projectDescription: 'Testing failed status',
					currentStep: 'init',
				})
				.returning()

			const sess = assertDefined(session)
			createdBriefingIds.push(sess.id)

			expect(sess.generationStatus).toBe('idle')
			expect(sess.generationError).toBeNull()

			// Simulate error: update to failed with error message
			const errorMessage = 'OpenRouter API rate limit exceeded'
			await db
				.update(briefingSessions)
				.set({
					generationStatus: 'failed',
					generationError: errorMessage,
					updatedAt: new Date(),
				})
				.where(eq(briefingSessions.id, sess.id))

			// Verify state persisted
			const updated = await db.query.briefingSessions.findFirst({
				where: eq(briefingSessions.id, sess.id),
			})
			const result = assertDefined(updated)
			expect(result.generationStatus).toBe('failed')
			expect(result.generationError).toBe(errorMessage)
		})

		it('should allow recovery from failed state to generating', async () => {
			const [session] = await db
				.insert(briefingSessions)
				.values({
					userId: testUserId,
					projectName: 'Test Briefing Recovery',
					projectDescription: 'Testing recovery from failed',
					currentStep: 'init',
					generationStatus: 'failed',
					generationError: 'Previous error',
				})
				.returning()

			const sess = assertDefined(session)
			createdBriefingIds.push(sess.id)

			// Simulate retry: transition from failed to generating
			await db
				.update(briefingSessions)
				.set({
					generationStatus: 'generating',
					generationStartedAt: new Date(),
					generationError: null,
				})
				.where(eq(briefingSessions.id, sess.id))

			const updated = await db.query.briefingSessions.findFirst({
				where: eq(briefingSessions.id, sess.id),
			})
			const result = assertDefined(updated)
			expect(result.generationStatus).toBe('generating')
			expect(result.generationError).toBeNull()
		})
	})

	describe('PRD session', () => {
		it('should update generationStatus to failed and persist generationError', async () => {
			const [session] = await db
				.insert(prdSessions)
				.values({
					userId: testUserId,
					projectName: 'Test PRD Failed',
					projectDescription: 'Testing failed status',
					currentStep: 'init',
				})
				.returning()

			const sess = assertDefined(session)
			createdPrdIds.push(sess.id)

			expect(sess.generationStatus).toBe('idle')
			expect(sess.generationError).toBeNull()

			// Simulate error: update to failed with error message
			const errorMessage = 'Failed to generate response'
			await db
				.update(prdSessions)
				.set({
					generationStatus: 'failed',
					generationError: errorMessage,
					updatedAt: new Date(),
				})
				.where(eq(prdSessions.id, sess.id))

			// Verify state persisted
			const updated = await db.query.prdSessions.findFirst({
				where: eq(prdSessions.id, sess.id),
			})
			const result = assertDefined(updated)
			expect(result.generationStatus).toBe('failed')
			expect(result.generationError).toBe(errorMessage)
		})

		it('should allow recovery from failed state to generating', async () => {
			const [session] = await db
				.insert(prdSessions)
				.values({
					userId: testUserId,
					projectName: 'Test PRD Recovery',
					projectDescription: 'Testing recovery from failed',
					currentStep: 'init',
					generationStatus: 'failed',
					generationError: 'Previous error',
				})
				.returning()

			const sess = assertDefined(session)
			createdPrdIds.push(sess.id)

			// Simulate retry: transition from failed to generating
			await db
				.update(prdSessions)
				.set({
					generationStatus: 'generating',
					generationStartedAt: new Date(),
					generationError: null,
				})
				.where(eq(prdSessions.id, sess.id))

			const updated = await db.query.prdSessions.findFirst({
				where: eq(prdSessions.id, sess.id),
			})
			const result = assertDefined(updated)
			expect(result.generationStatus).toBe('generating')
			expect(result.generationError).toBeNull()
		})
	})

	describe('SM session', () => {
		it('should update generationStatus to failed and persist generationError', async () => {
			const [session] = await db
				.insert(smSessions)
				.values({
					userId: testUserId,
					projectName: 'Test SM Failed',
					projectDescription: 'Testing failed status',
					currentStep: 'init',
					totalEpics: 0,
					totalStories: 0,
					totalStoryPoints: 0,
				})
				.returning()

			const sess = assertDefined(session)
			createdSmIds.push(sess.id)

			expect(sess.generationStatus).toBe('idle')
			expect(sess.generationError).toBeNull()

			// Simulate error: update to failed with error message
			const errorMessage = 'Network timeout connecting to OpenRouter'
			await db
				.update(smSessions)
				.set({
					generationStatus: 'failed',
					generationError: errorMessage,
					updatedAt: new Date(),
				})
				.where(eq(smSessions.id, sess.id))

			// Verify state persisted
			const updated = await db.query.smSessions.findFirst({
				where: eq(smSessions.id, sess.id),
			})
			const result = assertDefined(updated)
			expect(result.generationStatus).toBe('failed')
			expect(result.generationError).toBe(errorMessage)
		})

		it('should allow recovery from failed state to generating', async () => {
			const [session] = await db
				.insert(smSessions)
				.values({
					userId: testUserId,
					projectName: 'Test SM Recovery',
					projectDescription: 'Testing recovery from failed',
					currentStep: 'init',
					totalEpics: 0,
					totalStories: 0,
					totalStoryPoints: 0,
					generationStatus: 'failed',
					generationError: 'Previous error',
				})
				.returning()

			const sess = assertDefined(session)
			createdSmIds.push(sess.id)

			// Simulate retry: transition from failed to generating
			await db
				.update(smSessions)
				.set({
					generationStatus: 'generating',
					generationStartedAt: new Date(),
					generationError: null,
				})
				.where(eq(smSessions.id, sess.id))

			const updated = await db.query.smSessions.findFirst({
				where: eq(smSessions.id, sess.id),
			})
			const result = assertDefined(updated)
			expect(result.generationStatus).toBe('generating')
			expect(result.generationError).toBeNull()
		})
	})
})
