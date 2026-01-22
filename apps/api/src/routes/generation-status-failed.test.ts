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
		it('should update generationStatus to failed and persist generationError with details', async () => {
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

			// Simulate OpenRouterAPIError: persist JSONB with message, code, status
			const errorDetails = {
				message: 'Rate limit exceeded',
				code: 'rate_limit_exceeded',
				status: 429,
			}
			await db
				.update(briefingSessions)
				.set({
					generationStatus: 'failed',
					generationError: errorDetails,
					updatedAt: new Date(),
				})
				.where(eq(briefingSessions.id, sess.id))

			// Verify state persisted
			const updated = await db.query.briefingSessions.findFirst({
				where: eq(briefingSessions.id, sess.id),
			})
			const result = assertDefined(updated)
			expect(result.generationStatus).toBe('failed')

			// JSONB is automatically deserialized by Drizzle
			const error = assertDefined(result.generationError)
			expect(error.message).toBe('Rate limit exceeded')
			expect(error.code).toBe('rate_limit_exceeded')
			expect(error.status).toBe(429)
		})

		it('should persist generationError with UNKNOWN code for non-API errors', async () => {
			const [session] = await db
				.insert(briefingSessions)
				.values({
					userId: testUserId,
					projectName: 'Test Briefing Unknown Error',
					projectDescription: 'Testing unknown error',
					currentStep: 'init',
				})
				.returning()

			const sess = assertDefined(session)
			createdBriefingIds.push(sess.id)

			// Simulate non-API error: persist JSONB with message and UNKNOWN code
			const errorDetails = {
				message: 'Network connection failed',
				code: 'UNKNOWN',
			}
			await db
				.update(briefingSessions)
				.set({
					generationStatus: 'failed',
					generationError: errorDetails,
					updatedAt: new Date(),
				})
				.where(eq(briefingSessions.id, sess.id))

			const updated = await db.query.briefingSessions.findFirst({
				where: eq(briefingSessions.id, sess.id),
			})
			const result = assertDefined(updated)
			expect(result.generationStatus).toBe('failed')

			const error = assertDefined(result.generationError)
			expect(error.message).toBe('Network connection failed')
			expect(error.code).toBe('UNKNOWN')
			expect(error.status).toBeUndefined()
		})

		it('should allow recovery from failed state to generating (clears error)', async () => {
			const errorDetails = {
				message: 'Previous error',
				code: 'server_error',
				status: 500,
			}
			const [session] = await db
				.insert(briefingSessions)
				.values({
					userId: testUserId,
					projectName: 'Test Briefing Recovery',
					projectDescription: 'Testing recovery from failed',
					currentStep: 'init',
					generationStatus: 'failed',
					generationError: errorDetails,
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
		it('should update generationStatus to failed and persist generationError with details', async () => {
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

			// Simulate error with JSONB details
			const errorDetails = {
				message: 'Model not available',
				code: 'model_not_found',
				status: 404,
			}
			await db
				.update(prdSessions)
				.set({
					generationStatus: 'failed',
					generationError: errorDetails,
					updatedAt: new Date(),
				})
				.where(eq(prdSessions.id, sess.id))

			// Verify state persisted
			const updated = await db.query.prdSessions.findFirst({
				where: eq(prdSessions.id, sess.id),
			})
			const result = assertDefined(updated)
			expect(result.generationStatus).toBe('failed')

			const error = assertDefined(result.generationError)
			expect(error.message).toBe('Model not available')
			expect(error.code).toBe('model_not_found')
			expect(error.status).toBe(404)
		})

		it('should allow recovery from failed state to generating', async () => {
			const errorDetails = {
				message: 'Previous error',
				code: 'UNKNOWN',
			}
			const [session] = await db
				.insert(prdSessions)
				.values({
					userId: testUserId,
					projectName: 'Test PRD Recovery',
					projectDescription: 'Testing recovery from failed',
					currentStep: 'init',
					generationStatus: 'failed',
					generationError: errorDetails,
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
		it('should update generationStatus to failed and persist generationError with details', async () => {
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

			// Simulate error with JSONB details
			const errorDetails = {
				message: 'Network timeout connecting to OpenRouter',
				code: 'timeout',
				status: 408,
			}
			await db
				.update(smSessions)
				.set({
					generationStatus: 'failed',
					generationError: errorDetails,
					updatedAt: new Date(),
				})
				.where(eq(smSessions.id, sess.id))

			// Verify state persisted
			const updated = await db.query.smSessions.findFirst({
				where: eq(smSessions.id, sess.id),
			})
			const result = assertDefined(updated)
			expect(result.generationStatus).toBe('failed')

			const error = assertDefined(result.generationError)
			expect(error.message).toBe('Network timeout connecting to OpenRouter')
			expect(error.code).toBe('timeout')
			expect(error.status).toBe(408)
		})

		it('should allow recovery from failed state to generating', async () => {
			const errorDetails = {
				message: 'Previous error',
				code: 'server_error',
				status: 500,
			}
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
					generationError: errorDetails,
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
