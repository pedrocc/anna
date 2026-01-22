import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { db } from '@repo/db'
import { smEpics, smSessions, smStories, users } from '@repo/db/schema'
import { and, eq, inArray } from 'drizzle-orm'

function assertDefined<T>(value: T | undefined | null, msg = 'Expected value to be defined'): T {
	if (value == null) throw new Error(msg)
	return value
}

describe('Kanban - Batch fetch stories by IDs (inArray)', () => {
	let testUserId: string
	let otherUserId: string
	let sessionId: string
	let otherSessionId: string
	const createdSessionIds: string[] = []
	let storyIds: string[] = []
	let otherUserStoryId: string

	beforeAll(async () => {
		// Create test user
		const [user] = await db
			.insert(users)
			.values({
				clerkId: 'test-clerk-id-kanban-batch-fetch',
				email: 'test-kanban-batch-fetch@example.com',
				name: 'Test Kanban Batch Fetch User',
				role: 'user',
			})
			.onConflictDoUpdate({
				target: users.clerkId,
				set: { email: 'test-kanban-batch-fetch@example.com', name: 'Test Kanban Batch Fetch User' },
			})
			.returning()

		testUserId = assertDefined(user).id

		// Create another user (for access control tests)
		const [otherUser] = await db
			.insert(users)
			.values({
				clerkId: 'test-clerk-id-kanban-batch-fetch-other',
				email: 'test-kanban-batch-fetch-other@example.com',
				name: 'Other User',
				role: 'user',
			})
			.onConflictDoUpdate({
				target: users.clerkId,
				set: { email: 'test-kanban-batch-fetch-other@example.com', name: 'Other User' },
			})
			.returning()

		otherUserId = assertDefined(otherUser).id

		// Create session for test user
		const [session] = await db
			.insert(smSessions)
			.values({
				userId: testUserId,
				projectName: 'Kanban Batch Fetch Test',
				projectDescription: 'Testing batch fetch stories',
				currentStep: 'stories',
				totalEpics: 1,
				totalStories: 3,
				totalStoryPoints: 8,
			})
			.returning()

		const sess = assertDefined(session)
		sessionId = sess.id
		createdSessionIds.push(sess.id)

		// Create epic
		const [epic] = await db
			.insert(smEpics)
			.values({
				sessionId: sess.id,
				number: 1,
				title: 'Test Epic',
				description: 'Epic for batch fetch tests',
				priority: 'high',
			})
			.returning()

		const epicRecord = assertDefined(epic)

		// Create stories
		const storiesData = [
			{
				sessionId: sess.id,
				epicId: epicRecord.id,
				epicNumber: 1,
				storyNumber: 1,
				storyKey: '1-1',
				title: 'Story One',
				asA: 'user',
				iWant: 'to do thing one',
				soThat: 'I get benefit one',
				status: 'backlog' as const,
				priority: 'high' as const,
				storyPoints: 3,
			},
			{
				sessionId: sess.id,
				epicId: epicRecord.id,
				epicNumber: 1,
				storyNumber: 2,
				storyKey: '1-2',
				title: 'Story Two',
				asA: 'admin',
				iWant: 'to do thing two',
				soThat: 'I get benefit two',
				status: 'in_progress' as const,
				priority: 'medium' as const,
				storyPoints: 2,
			},
			{
				sessionId: sess.id,
				epicId: epicRecord.id,
				epicNumber: 1,
				storyNumber: 3,
				storyKey: '1-3',
				title: 'Story Three',
				asA: 'developer',
				iWant: 'to do thing three',
				soThat: 'I get benefit three',
				status: 'done' as const,
				priority: 'low' as const,
				storyPoints: 3,
			},
		]

		const insertedStories = await db.insert(smStories).values(storiesData).returning()
		storyIds = insertedStories.map((s) => s.id)

		// Create session and story for other user
		const [otherSession] = await db
			.insert(smSessions)
			.values({
				userId: otherUserId,
				projectName: 'Other User Project',
				projectDescription: 'Should not be accessible',
				currentStep: 'stories',
				totalEpics: 1,
				totalStories: 1,
				totalStoryPoints: 5,
			})
			.returning()

		const otherSess = assertDefined(otherSession)
		otherSessionId = otherSess.id
		createdSessionIds.push(otherSess.id)

		const [otherEpic] = await db
			.insert(smEpics)
			.values({
				sessionId: otherSess.id,
				number: 1,
				title: 'Other Epic',
				description: 'Other user epic',
				priority: 'medium',
			})
			.returning()

		const otherEpicRecord = assertDefined(otherEpic)

		const [otherStory] = await db
			.insert(smStories)
			.values({
				sessionId: otherSess.id,
				epicId: otherEpicRecord.id,
				epicNumber: 1,
				storyNumber: 1,
				storyKey: '1-1',
				title: 'Other User Story',
				asA: 'other user',
				iWant: 'something private',
				soThat: 'it stays private',
				status: 'backlog',
				priority: 'high',
				storyPoints: 5,
			})
			.returning()

		otherUserStoryId = assertDefined(otherStory).id
	})

	afterAll(async () => {
		try {
			for (const sid of createdSessionIds) {
				await db.delete(smStories).where(eq(smStories.sessionId, sid))
				await db.delete(smEpics).where(eq(smEpics.sessionId, sid))
				await db.delete(smSessions).where(eq(smSessions.id, sid))
			}
			await db.delete(users).where(eq(users.id, testUserId))
			await db.delete(users).where(eq(users.id, otherUserId))
		} catch {
			// Connection may already be closed
		}
	})

	it('should fetch all stories by their IDs using inArray', async () => {
		const stories = await db.query.smStories.findMany({
			where: and(inArray(smStories.id, storyIds), inArray(smStories.sessionId, [sessionId])),
		})

		expect(stories).toHaveLength(3)
		const titles = stories.map((s) => s.title).sort()
		expect(titles).toEqual(['Story One', 'Story Three', 'Story Two'])
	})

	it('should fetch a subset of stories by IDs', async () => {
		const id0 = assertDefined(storyIds[0])
		const id2 = assertDefined(storyIds[2])
		const subset = [id0, id2]

		const stories = await db.query.smStories.findMany({
			where: and(inArray(smStories.id, subset), inArray(smStories.sessionId, [sessionId])),
		})

		expect(stories).toHaveLength(2)
		const returnedIds = stories.map((s) => s.id).sort()
		expect(returnedIds).toEqual(subset.sort())
	})

	it('should not return stories from sessions not in the allowed list', async () => {
		// Query with other user's story ID but scoped to test user's session
		const stories = await db.query.smStories.findMany({
			where: and(
				inArray(smStories.id, [otherUserStoryId]),
				inArray(smStories.sessionId, [sessionId])
			),
		})

		expect(stories).toHaveLength(0)
	})

	it('should handle mix of own and other session story IDs', async () => {
		const id0 = assertDefined(storyIds[0])
		const mixedIds = [id0, otherUserStoryId]

		// Scoped to test user's sessions only
		const stories = await db.query.smStories.findMany({
			where: and(inArray(smStories.id, mixedIds), inArray(smStories.sessionId, [sessionId])),
		})

		// Only the story from the test user's session should be returned
		expect(stories).toHaveLength(1)
		const firstStory = assertDefined(stories[0])
		expect(firstStory.id).toBe(id0)
	})

	it('should return empty array for non-existent IDs', async () => {
		const fakeIds = ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002']

		const stories = await db.query.smStories.findMany({
			where: and(inArray(smStories.id, fakeIds), inArray(smStories.sessionId, [sessionId])),
		})

		expect(stories).toHaveLength(0)
	})

	it('should scope query to multiple session IDs', async () => {
		// Include both sessions - should return stories from both
		const allStoryIds = [...storyIds, otherUserStoryId]

		const stories = await db.query.smStories.findMany({
			where: and(
				inArray(smStories.id, allStoryIds),
				inArray(smStories.sessionId, [sessionId, otherSessionId])
			),
		})

		expect(stories).toHaveLength(4)
	})

	it('should return correct fields when using column selection', async () => {
		const id0 = assertDefined(storyIds[0])
		const stories = await db.query.smStories.findMany({
			where: and(inArray(smStories.id, [id0]), inArray(smStories.sessionId, [sessionId])),
			columns: {
				id: true,
				sessionId: true,
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
		})

		expect(stories).toHaveLength(1)
		const story = assertDefined(stories[0])
		expect(story.id).toBe(id0)
		expect(story.sessionId).toBe(sessionId)
		expect(story.title).toBe('Story One')
		expect(story.asA).toBe('user')
		expect(story.iWant).toBe('to do thing one')
		expect(story.soThat).toBe('I get benefit one')
		expect(story.status).toBe('backlog')
		expect(story.priority).toBe('high')
		expect(story.storyPoints).toBe(3)
		expect(story.storyKey).toBe('1-1')
		expect(story.epicNumber).toBe(1)
		expect(story.storyNumber).toBe(1)
	})

	it('should handle single ID in the array', async () => {
		const id1 = assertDefined(storyIds[1])
		const stories = await db.query.smStories.findMany({
			where: and(inArray(smStories.id, [id1]), inArray(smStories.sessionId, [sessionId])),
		})

		expect(stories).toHaveLength(1)
		const firstStory = assertDefined(stories[0])
		expect(firstStory.title).toBe('Story Two')
		expect(firstStory.status).toBe('in_progress')
	})

	it('should return stories with different statuses correctly', async () => {
		const stories = await db.query.smStories.findMany({
			where: and(inArray(smStories.id, storyIds), inArray(smStories.sessionId, [sessionId])),
		})

		const statusMap = new Map(stories.map((s) => [s.title, s.status]))
		expect(statusMap.get('Story One')).toBe('backlog')
		expect(statusMap.get('Story Two')).toBe('in_progress')
		expect(statusMap.get('Story Three')).toBe('done')
	})
})
