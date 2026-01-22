import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { db } from '@repo/db'
import { smEpics, smMessages, smSessions, smStories, users } from '@repo/db/schema'
import { eq } from 'drizzle-orm'

function assertDefined<T>(value: T | undefined | null, msg = 'Expected value to be defined'): T {
	if (value == null) throw new Error(msg)
	return value
}

describe('SM Chat - Transaction atomicity for insert + counter update', () => {
	let testUserId: string
	const createdSessionIds: string[] = []

	beforeAll(async () => {
		const [user] = await db
			.insert(users)
			.values({
				clerkId: 'test-clerk-id-sm-tx',
				email: 'test-sm-tx@example.com',
				name: 'Test SM Transaction User',
				role: 'user',
			})
			.onConflictDoUpdate({
				target: users.clerkId,
				set: { email: 'test-sm-tx@example.com', name: 'Test SM Transaction User' },
			})
			.returning()

		testUserId = assertDefined(user).id
	})

	afterAll(async () => {
		try {
			for (const sessionId of createdSessionIds) {
				await db.delete(smMessages).where(eq(smMessages.sessionId, sessionId))
				await db.delete(smStories).where(eq(smStories.sessionId, sessionId))
				await db.delete(smEpics).where(eq(smEpics.sessionId, sessionId))
				await db.delete(smSessions).where(eq(smSessions.id, sessionId))
			}
			await db.delete(users).where(eq(users.id, testUserId))
		} catch {
			// Connection may already be closed
		}
	})

	it('should atomically insert message, epics, stories, and update counters', async () => {
		// Create a session
		const [session] = await db
			.insert(smSessions)
			.values({
				userId: testUserId,
				projectName: 'TX Test Project',
				projectDescription: 'Testing transaction atomicity',
				currentStep: 'planning',
				totalEpics: 0,
				totalStories: 0,
				totalStoryPoints: 0,
			})
			.returning()

		const sess = assertDefined(session)
		createdSessionIds.push(sess.id)

		// Simulate the chat transaction: insert message + epics + stories + update counters
		await db.transaction(async (tx) => {
			// Insert assistant message
			await tx.insert(smMessages).values({
				sessionId: sess.id,
				role: 'assistant',
				content: 'Here are your epics and stories.',
				step: 'planning',
			})

			// Insert epics
			const [epic1] = await tx
				.insert(smEpics)
				.values({
					sessionId: sess.id,
					number: 1,
					title: 'Epic 1',
					description: 'First epic',
					priority: 'high',
				})
				.returning()

			const [epic2] = await tx
				.insert(smEpics)
				.values({
					sessionId: sess.id,
					number: 2,
					title: 'Epic 2',
					description: 'Second epic',
					priority: 'medium',
				})
				.returning()

			// Insert stories linked to epics
			await tx.insert(smStories).values({
				sessionId: sess.id,
				epicId: assertDefined(epic1).id,
				epicNumber: 1,
				storyNumber: 1,
				storyKey: '1-1',
				title: 'Story 1-1',
				asA: 'user',
				iWant: 'feature A',
				soThat: 'I get value',
				storyPoints: 3,
				priority: 'high',
			})

			await tx.insert(smStories).values({
				sessionId: sess.id,
				epicId: assertDefined(epic2).id,
				epicNumber: 2,
				storyNumber: 1,
				storyKey: '2-1',
				title: 'Story 2-1',
				asA: 'admin',
				iWant: 'feature B',
				soThat: 'I manage things',
				storyPoints: 5,
				priority: 'medium',
			})

			// Update session counters (fresh counts within transaction)
			const [updatedEpics, updatedStories] = await Promise.all([
				tx.query.smEpics.findMany({
					where: eq(smEpics.sessionId, sess.id),
				}),
				tx.query.smStories.findMany({
					where: eq(smStories.sessionId, sess.id),
				}),
			])

			await tx
				.update(smSessions)
				.set({
					updatedAt: new Date(),
					totalEpics: updatedEpics.length,
					totalStories: updatedStories.length,
					totalStoryPoints: updatedStories.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0),
				})
				.where(eq(smSessions.id, sess.id))
		})

		// Verify all data was persisted atomically
		const updatedSession = await db.query.smSessions.findFirst({
			where: eq(smSessions.id, sess.id),
		})

		const finalSession = assertDefined(updatedSession)
		expect(finalSession.totalEpics).toBe(2)
		expect(finalSession.totalStories).toBe(2)
		expect(finalSession.totalStoryPoints).toBe(8) // 3 + 5

		// Verify message was inserted
		const messages = await db.query.smMessages.findMany({
			where: eq(smMessages.sessionId, sess.id),
		})
		expect(messages).toHaveLength(1)
		expect(messages[0]?.role).toBe('assistant')

		// Verify epics were inserted
		const epics = await db.query.smEpics.findMany({
			where: eq(smEpics.sessionId, sess.id),
		})
		expect(epics).toHaveLength(2)

		// Verify stories were inserted
		const stories = await db.query.smStories.findMany({
			where: eq(smStories.sessionId, sess.id),
		})
		expect(stories).toHaveLength(2)
	})

	it('should rollback all changes when transaction fails', async () => {
		// Create a session with initial counters
		const [session] = await db
			.insert(smSessions)
			.values({
				userId: testUserId,
				projectName: 'TX Rollback Test',
				projectDescription: 'Testing transaction rollback',
				currentStep: 'planning',
				totalEpics: 0,
				totalStories: 0,
				totalStoryPoints: 0,
			})
			.returning()

		const sess = assertDefined(session)
		createdSessionIds.push(sess.id)

		// Attempt a transaction that will fail
		try {
			await db.transaction(async (tx) => {
				// Insert a message
				await tx.insert(smMessages).values({
					sessionId: sess.id,
					role: 'assistant',
					content: 'This should be rolled back.',
					step: 'planning',
				})

				// Insert an epic
				await tx
					.insert(smEpics)
					.values({
						sessionId: sess.id,
						number: 1,
						title: 'Epic To Rollback',
						description: 'This epic should not persist',
						priority: 'high',
					})
					.returning()

				// Update counters
				await tx
					.update(smSessions)
					.set({
						totalEpics: 1,
						updatedAt: new Date(),
					})
					.where(eq(smSessions.id, sess.id))

				// Force transaction failure
				throw new Error('Simulated extraction failure')
			})
		} catch (error) {
			expect((error as Error).message).toBe('Simulated extraction failure')
		}

		// Verify nothing was persisted (rollback)
		const afterSession = await db.query.smSessions.findFirst({
			where: eq(smSessions.id, sess.id),
		})

		const finalSession = assertDefined(afterSession)
		expect(finalSession.totalEpics).toBe(0) // Counter not updated
		expect(finalSession.totalStories).toBe(0)
		expect(finalSession.totalStoryPoints).toBe(0)

		// Verify no messages were inserted
		const messages = await db.query.smMessages.findMany({
			where: eq(smMessages.sessionId, sess.id),
		})
		expect(messages).toHaveLength(0)

		// Verify no epics were inserted
		const epics = await db.query.smEpics.findMany({
			where: eq(smEpics.sessionId, sess.id),
		})
		expect(epics).toHaveLength(0)
	})

	it('should keep counters consistent with actual records', async () => {
		// Create a session with one pre-existing epic
		const [session] = await db
			.insert(smSessions)
			.values({
				userId: testUserId,
				projectName: 'TX Counter Consistency',
				projectDescription: 'Counters match records',
				currentStep: 'planning',
				totalEpics: 1,
				totalStories: 0,
				totalStoryPoints: 0,
			})
			.returning()

		const sess = assertDefined(session)
		createdSessionIds.push(sess.id)

		// Pre-insert an epic
		const [existingEpic] = await db
			.insert(smEpics)
			.values({
				sessionId: sess.id,
				number: 1,
				title: 'Existing Epic',
				description: 'Already existed',
				priority: 'medium',
			})
			.returning()

		// Run the transaction to add more data and recalculate counters
		await db.transaction(async (tx) => {
			await tx.insert(smMessages).values({
				sessionId: sess.id,
				role: 'assistant',
				content: 'Adding more stories.',
				step: 'planning',
			})

			// Add a story to the existing epic
			await tx.insert(smStories).values({
				sessionId: sess.id,
				epicId: assertDefined(existingEpic).id,
				epicNumber: 1,
				storyNumber: 1,
				storyKey: '1-1',
				title: 'New Story',
				asA: 'user',
				iWant: 'something',
				soThat: 'benefit',
				storyPoints: 5,
				priority: 'high',
			})

			// Add a second epic with a story
			const [newEpic] = await tx
				.insert(smEpics)
				.values({
					sessionId: sess.id,
					number: 2,
					title: 'New Epic',
					description: 'Just added',
					priority: 'low',
				})
				.returning()

			await tx.insert(smStories).values({
				sessionId: sess.id,
				epicId: assertDefined(newEpic).id,
				epicNumber: 2,
				storyNumber: 1,
				storyKey: '2-1',
				title: 'Another Story',
				asA: 'admin',
				iWant: 'control',
				soThat: 'manage',
				storyPoints: 8,
				priority: 'medium',
			})

			// Recalculate counters from DB within the transaction
			const [txEpics, txStories] = await Promise.all([
				tx.query.smEpics.findMany({
					where: eq(smEpics.sessionId, sess.id),
				}),
				tx.query.smStories.findMany({
					where: eq(smStories.sessionId, sess.id),
				}),
			])

			await tx
				.update(smSessions)
				.set({
					updatedAt: new Date(),
					totalEpics: txEpics.length,
					totalStories: txStories.length,
					totalStoryPoints: txStories.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0),
				})
				.where(eq(smSessions.id, sess.id))
		})

		// Verify counters match actual record counts
		const finalSession = assertDefined(
			await db.query.smSessions.findFirst({ where: eq(smSessions.id, sess.id) })
		)

		const actualEpics = await db.query.smEpics.findMany({
			where: eq(smEpics.sessionId, sess.id),
		})
		const actualStories = await db.query.smStories.findMany({
			where: eq(smStories.sessionId, sess.id),
		})

		expect(finalSession.totalEpics).toBe(actualEpics.length)
		expect(finalSession.totalStories).toBe(actualStories.length)
		expect(finalSession.totalStoryPoints).toBe(
			actualStories.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0)
		)

		// Specific expected values
		expect(finalSession.totalEpics).toBe(2)
		expect(finalSession.totalStories).toBe(2)
		expect(finalSession.totalStoryPoints).toBe(13) // 5 + 8
	})
})
