import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { db } from '@repo/db'
import { smEpics, smSessions, smStories, users } from '@repo/db/schema'
import { eq } from 'drizzle-orm'

function assertDefined<T>(value: T | undefined | null, msg = 'Expected value to be defined'): T {
	if (value == null) throw new Error(msg)
	return value
}

describe('SM Stories - Batch creation (parallel)', () => {
	let testUserId: string
	const createdSessionIds: string[] = []

	beforeAll(async () => {
		const [user] = await db
			.insert(users)
			.values({
				clerkId: 'test-clerk-id-sm-batch',
				email: 'test-sm-batch@example.com',
				name: 'Test SM Batch User',
				role: 'user',
			})
			.onConflictDoUpdate({
				target: users.clerkId,
				set: { email: 'test-sm-batch@example.com', name: 'Test SM Batch User' },
			})
			.returning()

		testUserId = assertDefined(user).id
	})

	afterAll(async () => {
		try {
			for (const sessionId of createdSessionIds) {
				await db.delete(smStories).where(eq(smStories.sessionId, sessionId))
				await db.delete(smEpics).where(eq(smEpics.sessionId, sessionId))
				await db.delete(smSessions).where(eq(smSessions.id, sessionId))
			}
			await db.delete(users).where(eq(users.id, testUserId))
		} catch {
			// Connection may already be closed
		}
	})

	it('should create multiple stories in a single transaction and update counters', async () => {
		// Create session
		const [session] = await db
			.insert(smSessions)
			.values({
				userId: testUserId,
				projectName: 'Batch Stories Test',
				projectDescription: 'Testing batch story creation',
				currentStep: 'stories',
				totalEpics: 2,
				totalStories: 0,
				totalStoryPoints: 0,
			})
			.returning()

		const sess = assertDefined(session)
		createdSessionIds.push(sess.id)

		// Create epics
		const [epic1] = await db
			.insert(smEpics)
			.values({
				sessionId: sess.id,
				number: 1,
				title: 'User Authentication',
				description: 'Handle user auth flows',
				priority: 'high',
			})
			.returning()

		const [epic2] = await db
			.insert(smEpics)
			.values({
				sessionId: sess.id,
				number: 2,
				title: 'Dashboard',
				description: 'Main dashboard features',
				priority: 'medium',
			})
			.returning()

		const epicOne = assertDefined(epic1)
		const epicTwo = assertDefined(epic2)

		// Batch insert stories in a single transaction
		const storiesData = [
			{
				epicId: epicOne.id,
				epicNumber: 1,
				storyNumber: 1,
				title: 'Login Flow',
				asA: 'user',
				iWant: 'to log in with email',
				soThat: 'I can access my account',
				storyPoints: 3,
				priority: 'high' as const,
			},
			{
				epicId: epicOne.id,
				epicNumber: 1,
				storyNumber: 2,
				title: 'Password Reset',
				asA: 'user',
				iWant: 'to reset my password',
				soThat: 'I can recover my account',
				storyPoints: 2,
				priority: 'medium' as const,
			},
			{
				epicId: epicTwo.id,
				epicNumber: 2,
				storyNumber: 1,
				title: 'Metrics Overview',
				asA: 'admin',
				iWant: 'to see key metrics',
				soThat: 'I can monitor performance',
				storyPoints: 5,
				priority: 'high' as const,
			},
		]

		const createdStories = await db.transaction(async (tx) => {
			const storyValues = storiesData.map((data) => ({
				sessionId: sess.id,
				storyKey: `${data.epicNumber}-${data.storyNumber}`,
				...data,
			}))

			const inserted = await tx.insert(smStories).values(storyValues).returning()

			// Update session totals atomically
			const totalPoints = storiesData.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0)
			await tx
				.update(smSessions)
				.set({
					totalStories: storiesData.length,
					totalStoryPoints: totalPoints,
					updatedAt: new Date(),
				})
				.where(eq(smSessions.id, sess.id))

			return inserted
		})

		// Verify all stories were created
		expect(createdStories).toHaveLength(3)

		// Verify story keys
		const keys = createdStories.map((s) => s.storyKey).sort()
		expect(keys).toEqual(['1-1', '1-2', '2-1'])

		// Verify stories belong to correct epics
		const epicOneStories = createdStories.filter((s) => s.epicId === epicOne.id)
		const epicTwoStories = createdStories.filter((s) => s.epicId === epicTwo.id)
		expect(epicOneStories).toHaveLength(2)
		expect(epicTwoStories).toHaveLength(1)

		// Verify session counters were updated
		const updatedSession = await db.query.smSessions.findFirst({
			where: eq(smSessions.id, sess.id),
		})
		const finalSession = assertDefined(updatedSession)
		expect(finalSession.totalStories).toBe(3)
		expect(finalSession.totalStoryPoints).toBe(10) // 3 + 2 + 5
	})

	it('should rollback all stories when any insert fails in the batch', async () => {
		// Create session
		const [session] = await db
			.insert(smSessions)
			.values({
				userId: testUserId,
				projectName: 'Batch Rollback Test',
				projectDescription: 'Testing batch rollback',
				currentStep: 'stories',
				totalEpics: 1,
				totalStories: 0,
				totalStoryPoints: 0,
			})
			.returning()

		const sess = assertDefined(session)
		createdSessionIds.push(sess.id)

		const [epic] = await db
			.insert(smEpics)
			.values({
				sessionId: sess.id,
				number: 1,
				title: 'Test Epic',
				description: 'Epic for rollback test',
				priority: 'high',
			})
			.returning()

		const epicOne = assertDefined(epic)

		// Attempt batch insert that will fail mid-transaction
		try {
			await db.transaction(async (tx) => {
				// Insert first story (valid)
				await tx.insert(smStories).values({
					sessionId: sess.id,
					epicId: epicOne.id,
					epicNumber: 1,
					storyNumber: 1,
					storyKey: '1-1',
					title: 'Valid Story',
					asA: 'user',
					iWant: 'something',
					soThat: 'value',
					storyPoints: 3,
					priority: 'high',
				})

				// Force failure
				throw new Error('Simulated batch insertion failure')
			})
		} catch (error) {
			expect((error as Error).message).toBe('Simulated batch insertion failure')
		}

		// Verify no stories were persisted
		const stories = await db.query.smStories.findMany({
			where: eq(smStories.sessionId, sess.id),
		})
		expect(stories).toHaveLength(0)

		// Verify counters unchanged
		const afterSession = await db.query.smSessions.findFirst({
			where: eq(smSessions.id, sess.id),
		})
		const finalSession = assertDefined(afterSession)
		expect(finalSession.totalStories).toBe(0)
		expect(finalSession.totalStoryPoints).toBe(0)
	})

	it('should handle stories with different story points correctly in batch', async () => {
		// Create session
		const [session] = await db
			.insert(smSessions)
			.values({
				userId: testUserId,
				projectName: 'Points Calculation Test',
				projectDescription: 'Testing story points sum',
				currentStep: 'stories',
				totalEpics: 1,
				totalStories: 0,
				totalStoryPoints: 0,
			})
			.returning()

		const sess = assertDefined(session)
		createdSessionIds.push(sess.id)

		const [epic] = await db
			.insert(smEpics)
			.values({
				sessionId: sess.id,
				number: 1,
				title: 'Points Epic',
				description: 'Testing points calculation',
				priority: 'medium',
			})
			.returning()

		const epicOne = assertDefined(epic)

		// Stories with varying points including undefined
		const storiesData = [
			{
				sessionId: sess.id,
				epicId: epicOne.id,
				epicNumber: 1,
				storyNumber: 1,
				storyKey: '1-1',
				title: 'Story with 8 points',
				asA: 'user',
				iWant: 'feature A',
				soThat: 'benefit A',
				storyPoints: 8,
				priority: 'critical' as const,
			},
			{
				sessionId: sess.id,
				epicId: epicOne.id,
				epicNumber: 1,
				storyNumber: 2,
				storyKey: '1-2',
				title: 'Story with no points',
				asA: 'user',
				iWant: 'feature B',
				soThat: 'benefit B',
				priority: 'low' as const,
			},
			{
				sessionId: sess.id,
				epicId: epicOne.id,
				epicNumber: 1,
				storyNumber: 3,
				storyKey: '1-3',
				title: 'Story with 13 points',
				asA: 'developer',
				iWant: 'feature C',
				soThat: 'benefit C',
				storyPoints: 13,
				priority: 'high' as const,
			},
			{
				sessionId: sess.id,
				epicId: epicOne.id,
				epicNumber: 1,
				storyNumber: 4,
				storyKey: '1-4',
				title: 'Story with 1 point',
				asA: 'tester',
				iWant: 'feature D',
				soThat: 'benefit D',
				storyPoints: 1,
				priority: 'medium' as const,
			},
		]

		const createdStories = await db.transaction(async (tx) => {
			const inserted = await tx.insert(smStories).values(storiesData).returning()

			const totalPoints = storiesData.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0)
			await tx
				.update(smSessions)
				.set({
					totalStories: storiesData.length,
					totalStoryPoints: totalPoints,
					updatedAt: new Date(),
				})
				.where(eq(smSessions.id, sess.id))

			return inserted
		})

		expect(createdStories).toHaveLength(4)

		// Verify session counters
		const updatedSession = await db.query.smSessions.findFirst({
			where: eq(smSessions.id, sess.id),
		})
		const finalSession = assertDefined(updatedSession)
		expect(finalSession.totalStories).toBe(4)
		expect(finalSession.totalStoryPoints).toBe(22) // 8 + 0 + 13 + 1
	})

	it('should create stories with acceptance criteria and tasks in batch', async () => {
		// Create session
		const [session] = await db
			.insert(smSessions)
			.values({
				userId: testUserId,
				projectName: 'Rich Stories Test',
				projectDescription: 'Testing batch with AC and tasks',
				currentStep: 'details',
				totalEpics: 1,
				totalStories: 0,
				totalStoryPoints: 0,
			})
			.returning()

		const sess = assertDefined(session)
		createdSessionIds.push(sess.id)

		const [epic] = await db
			.insert(smEpics)
			.values({
				sessionId: sess.id,
				number: 1,
				title: 'Rich Epic',
				description: 'Epic with detailed stories',
				priority: 'high',
			})
			.returning()

		const epicOne = assertDefined(epic)

		const storiesData = [
			{
				sessionId: sess.id,
				epicId: epicOne.id,
				epicNumber: 1,
				storyNumber: 1,
				storyKey: '1-1',
				title: 'Story with AC',
				asA: 'user',
				iWant: 'feature with criteria',
				soThat: 'quality is ensured',
				storyPoints: 5,
				priority: 'high' as const,
				acceptanceCriteria: [
					{
						id: crypto.randomUUID(),
						type: 'given_when_then' as const,
						description: 'Form submission saves data',
						given: 'I am logged in',
						when: 'I click submit',
						// biome-ignore lint/suspicious/noThenProperty: Given-When-Then acceptance criteria, not a Promise
						then: 'the form is saved',
					},
					{
						id: crypto.randomUUID(),
						type: 'simple' as const,
						description: 'Error messages are displayed',
					},
				],
				tasks: [
					{
						id: crypto.randomUUID(),
						description: 'Implement form validation',
						estimatedHours: 4,
						completed: false,
					},
					{
						id: crypto.randomUUID(),
						description: 'Add error handling',
						estimatedHours: 2,
						completed: false,
					},
				],
			},
			{
				sessionId: sess.id,
				epicId: epicOne.id,
				epicNumber: 1,
				storyNumber: 2,
				storyKey: '1-2',
				title: 'Story with tasks only',
				asA: 'developer',
				iWant: 'clear tasks',
				soThat: 'I know what to do',
				storyPoints: 3,
				priority: 'medium' as const,
				tasks: [
					{
						id: crypto.randomUUID(),
						description: 'Set up CI pipeline',
						estimatedHours: 8,
						completed: false,
					},
				],
			},
		]

		const createdStories = await db.transaction(async (tx) => {
			const inserted = await tx.insert(smStories).values(storiesData).returning()

			await tx
				.update(smSessions)
				.set({
					totalStories: storiesData.length,
					totalStoryPoints: storiesData.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0),
					updatedAt: new Date(),
				})
				.where(eq(smSessions.id, sess.id))

			return inserted
		})

		expect(createdStories).toHaveLength(2)

		// Verify first story has AC and tasks
		const storyWithAC = createdStories.find((s) => s.storyKey === '1-1')
		expect(storyWithAC).toBeDefined()
		expect((storyWithAC?.acceptanceCriteria as unknown[])?.length).toBe(2)
		expect((storyWithAC?.tasks as unknown[])?.length).toBe(2)

		// Verify second story has tasks only
		const storyWithTasks = createdStories.find((s) => s.storyKey === '1-2')
		expect(storyWithTasks).toBeDefined()
		expect((storyWithTasks?.tasks as unknown[])?.length).toBe(1)
		expect(storyWithTasks?.acceptanceCriteria).toEqual([])
	})

	it('should increment counters correctly when session already has stories', async () => {
		// Create session with existing stories
		const [session] = await db
			.insert(smSessions)
			.values({
				userId: testUserId,
				projectName: 'Incremental Batch Test',
				projectDescription: 'Testing incremental counter updates',
				currentStep: 'stories',
				totalEpics: 1,
				totalStories: 2,
				totalStoryPoints: 5,
			})
			.returning()

		const sess = assertDefined(session)
		createdSessionIds.push(sess.id)

		const [epic] = await db
			.insert(smEpics)
			.values({
				sessionId: sess.id,
				number: 1,
				title: 'Incremental Epic',
				description: 'Testing incremental additions',
				priority: 'high',
			})
			.returning()

		const epicOne = assertDefined(epic)

		// Pre-existing stories
		await db.insert(smStories).values([
			{
				sessionId: sess.id,
				epicId: epicOne.id,
				epicNumber: 1,
				storyNumber: 1,
				storyKey: '1-1',
				title: 'Existing Story 1',
				asA: 'user',
				iWant: 'existing feature',
				soThat: 'existing value',
				storyPoints: 2,
				priority: 'medium',
			},
			{
				sessionId: sess.id,
				epicId: epicOne.id,
				epicNumber: 1,
				storyNumber: 2,
				storyKey: '1-2',
				title: 'Existing Story 2',
				asA: 'user',
				iWant: 'another feature',
				soThat: 'another value',
				storyPoints: 3,
				priority: 'low',
			},
		])

		// Batch add new stories with incremental counter update (like the endpoint does)
		const newStoriesData = [
			{
				sessionId: sess.id,
				epicId: epicOne.id,
				epicNumber: 1,
				storyNumber: 3,
				storyKey: '1-3',
				title: 'New Story 3',
				asA: 'user',
				iWant: 'new feature A',
				soThat: 'new value A',
				storyPoints: 5,
				priority: 'high' as const,
			},
			{
				sessionId: sess.id,
				epicId: epicOne.id,
				epicNumber: 1,
				storyNumber: 4,
				storyKey: '1-4',
				title: 'New Story 4',
				asA: 'admin',
				iWant: 'new feature B',
				soThat: 'new value B',
				storyPoints: 8,
				priority: 'critical' as const,
			},
		]

		await db.transaction(async (tx) => {
			await tx.insert(smStories).values(newStoriesData)

			const totalNewPoints = newStoriesData.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0)
			const { sql: sqlTag } = await import('drizzle-orm')
			await tx
				.update(smSessions)
				.set({
					totalStories: sqlTag`${smSessions.totalStories} + ${newStoriesData.length}`,
					totalStoryPoints: sqlTag`${smSessions.totalStoryPoints} + ${totalNewPoints}`,
					updatedAt: new Date(),
				})
				.where(eq(smSessions.id, sess.id))
		})

		// Verify counters were incremented (not replaced)
		const updatedSession = await db.query.smSessions.findFirst({
			where: eq(smSessions.id, sess.id),
		})
		const finalSession = assertDefined(updatedSession)
		expect(finalSession.totalStories).toBe(4) // 2 existing + 2 new
		expect(finalSession.totalStoryPoints).toBe(18) // 5 existing + 5 + 8 new
	})
})
