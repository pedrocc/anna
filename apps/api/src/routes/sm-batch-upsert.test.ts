import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { db } from '@repo/db'
import { smEpics, smSessions, smStories, users } from '@repo/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { transformEpicForInsert, transformStoryForInsert } from '../lib/sm-extraction.js'

function assertDefined<T>(value: T | undefined | null, msg = 'Expected value to be defined'): T {
	if (value == null) throw new Error(msg)
	return value
}

describe('SM Batch Upsert - Epics and Stories', () => {
	let testUserId: string
	const createdSessionIds: string[] = []

	beforeAll(async () => {
		const [user] = await db
			.insert(users)
			.values({
				clerkId: 'test-clerk-id-sm-batch-upsert',
				email: 'test-sm-batch-upsert@example.com',
				name: 'Test SM Batch Upsert User',
				role: 'user',
			})
			.onConflictDoUpdate({
				target: users.clerkId,
				set: { email: 'test-sm-batch-upsert@example.com', name: 'Test SM Batch Upsert User' },
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

	describe('Batch Epic Upsert', () => {
		it('should batch insert multiple new epics in a single query', async () => {
			const [session] = await db
				.insert(smSessions)
				.values({
					userId: testUserId,
					projectName: 'Batch Epic Insert Test',
					currentStep: 'epics',
				})
				.returning()

			const sess = assertDefined(session)
			createdSessionIds.push(sess.id)

			const epicDataList = [
				{
					number: 1,
					title: 'Auth Epic',
					description: 'Authentication flows',
					priority: 'high' as const,
				},
				{
					number: 2,
					title: 'Dashboard Epic',
					description: 'Main dashboard',
					priority: 'medium' as const,
				},
				{
					number: 3,
					title: 'Reports Epic',
					description: 'Reporting features',
					priority: 'low' as const,
				},
			]

			const epicIdMap = new Map<number, string>()

			await db.transaction(async (tx) => {
				const epicNumbers = epicDataList.map((e) => e.number)

				// Batch fetch (should find none)
				const existingEpics = await tx.query.smEpics.findMany({
					where: and(eq(smEpics.sessionId, sess.id), inArray(smEpics.number, epicNumbers)),
				})
				expect(existingEpics).toHaveLength(0)

				// Batch insert all new epics
				const epicsToInsert = epicDataList.map((e) =>
					transformEpicForInsert(
						{ ...e, businessValue: undefined, functionalRequirementCodes: [] },
						sess.id
					)
				)

				const insertedEpics = await tx
					.insert(smEpics)
					.values(epicsToInsert)
					.returning({ id: smEpics.id, number: smEpics.number })

				for (const epic of insertedEpics) {
					epicIdMap.set(epic.number, epic.id)
				}
			})

			expect(epicIdMap.size).toBe(3)

			// Verify in DB
			const allEpics = await db.query.smEpics.findMany({
				where: eq(smEpics.sessionId, sess.id),
			})
			expect(allEpics).toHaveLength(3)
			expect(allEpics.map((e) => e.title).sort()).toEqual([
				'Auth Epic',
				'Dashboard Epic',
				'Reports Epic',
			])
		})

		it('should batch fetch existing epics and update them individually', async () => {
			const [session] = await db
				.insert(smSessions)
				.values({
					userId: testUserId,
					projectName: 'Batch Epic Update Test',
					currentStep: 'epics',
				})
				.returning()

			const sess = assertDefined(session)
			createdSessionIds.push(sess.id)

			// Pre-create epics
			await db.insert(smEpics).values([
				{
					sessionId: sess.id,
					number: 1,
					title: 'Original Title 1',
					description: 'Original Desc 1',
					priority: 'medium',
				},
				{
					sessionId: sess.id,
					number: 2,
					title: 'Original Title 2',
					description: 'Original Desc 2',
					priority: 'low',
				},
			])

			const epicDataList = [
				{
					number: 1,
					title: 'Updated Title 1',
					description: 'Updated Desc 1',
					priority: 'high' as const,
				},
				{
					number: 2,
					title: 'Updated Title 2',
					description: 'Updated Desc 2',
					priority: 'critical' as const,
				},
			]

			const epicIdMap = new Map<number, string>()

			await db.transaction(async (tx) => {
				const epicNumbers = epicDataList.map((e) => e.number)

				// Batch fetch all existing
				const existingEpics = await tx.query.smEpics.findMany({
					where: and(eq(smEpics.sessionId, sess.id), inArray(smEpics.number, epicNumbers)),
				})
				expect(existingEpics).toHaveLength(2)

				const existingEpicsByNumber = new Map(existingEpics.map((e) => [e.number, e]))

				for (const epicData of epicDataList) {
					const existing = existingEpicsByNumber.get(epicData.number)
					if (existing) {
						await tx
							.update(smEpics)
							.set({
								title: epicData.title,
								description: epicData.description,
								priority: epicData.priority,
								updatedAt: new Date(),
							})
							.where(eq(smEpics.id, existing.id))
						epicIdMap.set(epicData.number, existing.id)
					}
				}
			})

			expect(epicIdMap.size).toBe(2)

			// Verify updates
			const updatedEpics = await db.query.smEpics.findMany({
				where: eq(smEpics.sessionId, sess.id),
			})
			const epic1 = updatedEpics.find((e) => e.number === 1)
			const epic2 = updatedEpics.find((e) => e.number === 2)
			expect(epic1?.title).toBe('Updated Title 1')
			expect(epic1?.priority).toBe('high')
			expect(epic2?.title).toBe('Updated Title 2')
			expect(epic2?.priority).toBe('critical')
		})

		it('should handle mixed scenario: some epics exist, some are new', async () => {
			const [session] = await db
				.insert(smSessions)
				.values({
					userId: testUserId,
					projectName: 'Batch Epic Mixed Test',
					currentStep: 'epics',
				})
				.returning()

			const sess = assertDefined(session)
			createdSessionIds.push(sess.id)

			// Pre-create epic 1
			await db.insert(smEpics).values({
				sessionId: sess.id,
				number: 1,
				title: 'Existing Epic',
				description: 'Already exists',
				priority: 'medium',
			})

			const epicDataList = [
				{
					number: 1,
					title: 'Updated Existing',
					description: 'Updated',
					priority: 'high' as const,
					businessValue: undefined,
					functionalRequirementCodes: [] as string[],
				},
				{
					number: 2,
					title: 'Brand New Epic',
					description: 'New one',
					priority: 'medium' as const,
					businessValue: 'High value',
					functionalRequirementCodes: ['FR-001'],
				},
				{
					number: 3,
					title: 'Another New',
					description: 'Also new',
					priority: 'low' as const,
					businessValue: undefined,
					functionalRequirementCodes: [] as string[],
				},
			]

			const epicIdMap = new Map<number, string>()

			await db.transaction(async (tx) => {
				const epicNumbers = epicDataList.map((e) => e.number)

				const existingEpics = await tx.query.smEpics.findMany({
					where: and(eq(smEpics.sessionId, sess.id), inArray(smEpics.number, epicNumbers)),
				})
				const existingEpicsByNumber = new Map(existingEpics.map((e) => [e.number, e]))

				const epicsToInsert: ReturnType<typeof transformEpicForInsert>[] = []

				for (const epicData of epicDataList) {
					const existing = existingEpicsByNumber.get(epicData.number)

					if (existing) {
						await tx
							.update(smEpics)
							.set({
								title: epicData.title,
								description: epicData.description,
								priority: epicData.priority ?? 'medium',
								functionalRequirementCodes: epicData.functionalRequirementCodes ?? [],
								updatedAt: new Date(),
							})
							.where(eq(smEpics.id, existing.id))
						epicIdMap.set(epicData.number, existing.id)
					} else {
						epicsToInsert.push(transformEpicForInsert(epicData, sess.id))
					}
				}

				if (epicsToInsert.length > 0) {
					const insertedEpics = await tx
						.insert(smEpics)
						.values(epicsToInsert)
						.returning({ id: smEpics.id, number: smEpics.number })
					for (const epic of insertedEpics) {
						epicIdMap.set(epic.number, epic.id)
					}
				}
			})

			expect(epicIdMap.size).toBe(3)

			const allEpics = await db.query.smEpics.findMany({
				where: eq(smEpics.sessionId, sess.id),
			})
			expect(allEpics).toHaveLength(3)

			const epic1 = allEpics.find((e) => e.number === 1)
			expect(epic1?.title).toBe('Updated Existing')

			const epic2 = allEpics.find((e) => e.number === 2)
			expect(epic2?.title).toBe('Brand New Epic')
			expect(epic2?.functionalRequirementCodes).toEqual(['FR-001'])
		})
	})

	describe('Batch Story Upsert', () => {
		it('should batch insert multiple new stories in a single query', async () => {
			const [session] = await db
				.insert(smSessions)
				.values({
					userId: testUserId,
					projectName: 'Batch Story Insert Test',
					currentStep: 'stories',
				})
				.returning()

			const sess = assertDefined(session)
			createdSessionIds.push(sess.id)

			// Create epics first
			const [epic1, epic2] = await db
				.insert(smEpics)
				.values([
					{
						sessionId: sess.id,
						number: 1,
						title: 'Epic 1',
						description: 'First epic',
						priority: 'high' as const,
					},
					{
						sessionId: sess.id,
						number: 2,
						title: 'Epic 2',
						description: 'Second epic',
						priority: 'medium' as const,
					},
				])
				.returning()

			const epicOne = assertDefined(epic1)
			const epicTwo = assertDefined(epic2)
			const epicIdMap = new Map<number, string>([
				[1, epicOne.id],
				[2, epicTwo.id],
			])

			const storyDataList = [
				{
					epicNumber: 1,
					storyNumber: 1,
					title: 'Login',
					asA: 'user',
					iWant: 'to log in',
					soThat: 'I access my account',
					priority: 'high' as const,
				},
				{
					epicNumber: 1,
					storyNumber: 2,
					title: 'Logout',
					asA: 'user',
					iWant: 'to log out',
					soThat: 'I secure my session',
					priority: 'medium' as const,
				},
				{
					epicNumber: 2,
					storyNumber: 1,
					title: 'Metrics',
					asA: 'admin',
					iWant: 'to see metrics',
					soThat: 'I monitor the system',
					priority: 'high' as const,
				},
			]

			await db.transaction(async (tx) => {
				// Batch fetch existing stories (none should exist)
				const storyKeys = storyDataList.map((s) => `${s.epicNumber}-${s.storyNumber}`)
				const existingStories = await tx.query.smStories.findMany({
					where: and(eq(smStories.sessionId, sess.id), inArray(smStories.storyKey, storyKeys)),
				})
				expect(existingStories).toHaveLength(0)

				// Batch insert all new stories
				const storiesToInsert = storyDataList.map((s) => {
					const epicId = epicIdMap.get(s.epicNumber)
					if (!epicId) throw new Error(`Epic ${s.epicNumber} not found`)
					return transformStoryForInsert(s, sess.id, epicId)
				})

				await tx.insert(smStories).values(storiesToInsert)
			})

			// Verify
			const allStories = await db.query.smStories.findMany({
				where: eq(smStories.sessionId, sess.id),
			})
			expect(allStories).toHaveLength(3)
			expect(allStories.map((s) => s.storyKey).sort()).toEqual(['1-1', '1-2', '2-1'])
		})

		it('should batch fetch existing stories and update them', async () => {
			const [session] = await db
				.insert(smSessions)
				.values({
					userId: testUserId,
					projectName: 'Batch Story Update Test',
					currentStep: 'stories',
				})
				.returning()

			const sess = assertDefined(session)
			createdSessionIds.push(sess.id)

			const [epic] = await db
				.insert(smEpics)
				.values({
					sessionId: sess.id,
					number: 1,
					title: 'Epic',
					description: 'An epic',
					priority: 'high' as const,
				})
				.returning()

			const epicOne = assertDefined(epic)

			// Pre-create stories
			await db.insert(smStories).values([
				{
					sessionId: sess.id,
					epicId: epicOne.id,
					epicNumber: 1,
					storyNumber: 1,
					storyKey: '1-1',
					title: 'Original Story 1',
					asA: 'user',
					iWant: 'original',
					soThat: 'original',
					priority: 'medium',
				},
				{
					sessionId: sess.id,
					epicId: epicOne.id,
					epicNumber: 1,
					storyNumber: 2,
					storyKey: '1-2',
					title: 'Original Story 2',
					asA: 'admin',
					iWant: 'original',
					soThat: 'original',
					priority: 'low',
				},
			])

			const updatedStoryData = [
				{
					epicNumber: 1,
					storyNumber: 1,
					title: 'Updated Story 1',
					asA: 'power user',
					iWant: 'updated feature',
					soThat: 'updated benefit',
					priority: 'high' as const,
				},
				{
					epicNumber: 1,
					storyNumber: 2,
					title: 'Updated Story 2',
					asA: 'super admin',
					iWant: 'updated feature 2',
					soThat: 'updated benefit 2',
					priority: 'critical' as const,
				},
			]

			await db.transaction(async (tx) => {
				const storyKeys = updatedStoryData.map((s) => `${s.epicNumber}-${s.storyNumber}`)
				const existingStories = await tx.query.smStories.findMany({
					where: and(eq(smStories.sessionId, sess.id), inArray(smStories.storyKey, storyKeys)),
				})
				expect(existingStories).toHaveLength(2)

				const existingStoriesByKey = new Map(existingStories.map((s) => [s.storyKey, s]))

				for (const storyData of updatedStoryData) {
					const storyKey = `${storyData.epicNumber}-${storyData.storyNumber}`
					const existing = existingStoriesByKey.get(storyKey)
					if (existing) {
						const updateData = transformStoryForInsert(storyData, sess.id, epicOne.id)
						await tx
							.update(smStories)
							.set({
								title: updateData.title,
								asA: updateData.asA,
								iWant: updateData.iWant,
								soThat: updateData.soThat,
								priority: updateData.priority,
								updatedAt: new Date(),
							})
							.where(eq(smStories.id, existing.id))
					}
				}
			})

			// Verify updates
			const updatedStories = await db.query.smStories.findMany({
				where: eq(smStories.sessionId, sess.id),
			})
			const story1 = updatedStories.find((s) => s.storyKey === '1-1')
			expect(story1?.title).toBe('Updated Story 1')
			expect(story1?.asA).toBe('power user')
			expect(story1?.priority).toBe('high')

			const story2 = updatedStories.find((s) => s.storyKey === '1-2')
			expect(story2?.title).toBe('Updated Story 2')
			expect(story2?.priority).toBe('critical')
		})

		it('should handle mixed scenario: some stories exist, some are new', async () => {
			const [session] = await db
				.insert(smSessions)
				.values({
					userId: testUserId,
					projectName: 'Batch Story Mixed Test',
					currentStep: 'stories',
				})
				.returning()

			const sess = assertDefined(session)
			createdSessionIds.push(sess.id)

			const [epic] = await db
				.insert(smEpics)
				.values({
					sessionId: sess.id,
					number: 1,
					title: 'Epic',
					description: 'An epic',
					priority: 'high' as const,
				})
				.returning()

			const epicOne = assertDefined(epic)

			// Pre-create story 1-1
			await db.insert(smStories).values({
				sessionId: sess.id,
				epicId: epicOne.id,
				epicNumber: 1,
				storyNumber: 1,
				storyKey: '1-1',
				title: 'Existing Story',
				asA: 'user',
				iWant: 'existing',
				soThat: 'existing',
				priority: 'medium',
			})

			const storyDataList = [
				{
					epicNumber: 1,
					storyNumber: 1,
					title: 'Updated Existing',
					asA: 'user',
					iWant: 'updated',
					soThat: 'updated',
					priority: 'high' as const,
				},
				{
					epicNumber: 1,
					storyNumber: 2,
					title: 'New Story',
					asA: 'admin',
					iWant: 'new feature',
					soThat: 'new value',
					priority: 'medium' as const,
				},
				{
					epicNumber: 1,
					storyNumber: 3,
					title: 'Another New',
					asA: 'dev',
					iWant: 'another',
					soThat: 'another',
					priority: 'low' as const,
				},
			]

			await db.transaction(async (tx) => {
				const storyKeys = storyDataList.map((s) => `${s.epicNumber}-${s.storyNumber}`)
				const existingStories = await tx.query.smStories.findMany({
					where: and(eq(smStories.sessionId, sess.id), inArray(smStories.storyKey, storyKeys)),
				})
				const existingStoriesByKey = new Map(existingStories.map((s) => [s.storyKey, s]))

				const storiesToInsert: ReturnType<typeof transformStoryForInsert>[] = []

				for (const storyData of storyDataList) {
					const storyKey = `${storyData.epicNumber}-${storyData.storyNumber}`
					const existing = existingStoriesByKey.get(storyKey)

					if (existing) {
						await tx
							.update(smStories)
							.set({
								title: storyData.title,
								asA: storyData.asA,
								iWant: storyData.iWant,
								soThat: storyData.soThat,
								priority: storyData.priority ?? existing.priority,
								updatedAt: new Date(),
							})
							.where(eq(smStories.id, existing.id))
					} else {
						storiesToInsert.push(transformStoryForInsert(storyData, sess.id, epicOne.id))
					}
				}

				if (storiesToInsert.length > 0) {
					await tx.insert(smStories).values(storiesToInsert)
				}
			})

			// Verify
			const allStories = await db.query.smStories.findMany({
				where: eq(smStories.sessionId, sess.id),
			})
			expect(allStories).toHaveLength(3)

			const story1 = allStories.find((s) => s.storyKey === '1-1')
			expect(story1?.title).toBe('Updated Existing')
			expect(story1?.priority).toBe('high')

			const story2 = allStories.find((s) => s.storyKey === '1-2')
			expect(story2?.title).toBe('New Story')

			const story3 = allStories.find((s) => s.storyKey === '1-3')
			expect(story3?.title).toBe('Another New')
		})

		it('should skip stories when their epic is not found', async () => {
			const [session] = await db
				.insert(smSessions)
				.values({
					userId: testUserId,
					projectName: 'Batch Story Missing Epic Test',
					currentStep: 'stories',
				})
				.returning()

			const sess = assertDefined(session)
			createdSessionIds.push(sess.id)

			const [epic] = await db
				.insert(smEpics)
				.values({
					sessionId: sess.id,
					number: 1,
					title: 'Epic 1',
					description: 'Only epic',
					priority: 'high' as const,
				})
				.returning()

			const epicOne = assertDefined(epic)
			const epicIdMap = new Map<number, string>([[1, epicOne.id]])

			const storyDataList = [
				{
					epicNumber: 1,
					storyNumber: 1,
					title: 'Valid Story',
					asA: 'user',
					iWant: 'valid',
					soThat: 'valid',
					priority: 'high' as const,
				},
				{
					epicNumber: 99,
					storyNumber: 1,
					title: 'Orphan Story',
					asA: 'user',
					iWant: 'orphan',
					soThat: 'orphan',
					priority: 'medium' as const,
				},
			]

			const storiesToInsert: ReturnType<typeof transformStoryForInsert>[] = []
			let skippedCount = 0

			await db.transaction(async (tx) => {
				// Resolve missing epic IDs
				const missingEpicNumbers = [
					...new Set(storyDataList.map((s) => s.epicNumber).filter((n) => !epicIdMap.has(n))),
				]
				if (missingEpicNumbers.length > 0) {
					const foundEpics = await tx.query.smEpics.findMany({
						where: and(eq(smEpics.sessionId, sess.id), inArray(smEpics.number, missingEpicNumbers)),
					})
					for (const e of foundEpics) {
						epicIdMap.set(e.number, e.id)
					}
				}

				const storyKeys = storyDataList.map((s) => `${s.epicNumber}-${s.storyNumber}`)
				const existingStories = await tx.query.smStories.findMany({
					where: and(eq(smStories.sessionId, sess.id), inArray(smStories.storyKey, storyKeys)),
				})
				const existingStoriesByKey = new Map(existingStories.map((s) => [s.storyKey, s]))

				for (const storyData of storyDataList) {
					const epicId = epicIdMap.get(storyData.epicNumber)
					if (!epicId) {
						skippedCount++
						continue
					}
					const storyKey = `${storyData.epicNumber}-${storyData.storyNumber}`
					const existing = existingStoriesByKey.get(storyKey)
					if (!existing) {
						storiesToInsert.push(transformStoryForInsert(storyData, sess.id, epicId))
					}
				}

				if (storiesToInsert.length > 0) {
					await tx.insert(smStories).values(storiesToInsert)
				}
			})

			expect(skippedCount).toBe(1)

			const allStories = await db.query.smStories.findMany({
				where: eq(smStories.sessionId, sess.id),
			})
			expect(allStories).toHaveLength(1)
			expect(allStories[0]?.title).toBe('Valid Story')
		})

		it('should resolve epic IDs from database when not in epicIdMap', async () => {
			const [session] = await db
				.insert(smSessions)
				.values({
					userId: testUserId,
					projectName: 'Batch Story Epic Resolve Test',
					currentStep: 'stories',
				})
				.returning()

			const sess = assertDefined(session)
			createdSessionIds.push(sess.id)

			// Create epics directly (simulating they were created earlier, not in this batch)
			await db.insert(smEpics).values([
				{
					sessionId: sess.id,
					number: 1,
					title: 'Pre-existing Epic 1',
					description: 'Already in DB',
					priority: 'high' as const,
				},
				{
					sessionId: sess.id,
					number: 2,
					title: 'Pre-existing Epic 2',
					description: 'Also in DB',
					priority: 'medium' as const,
				},
			])

			// epicIdMap is empty (simulating stories being processed without corresponding epics in current batch)
			const epicIdMap = new Map<number, string>()

			const storyDataList = [
				{
					epicNumber: 1,
					storyNumber: 1,
					title: 'Story for Epic 1',
					asA: 'user',
					iWant: 'feature',
					soThat: 'value',
					priority: 'high' as const,
				},
				{
					epicNumber: 2,
					storyNumber: 1,
					title: 'Story for Epic 2',
					asA: 'admin',
					iWant: 'feature',
					soThat: 'value',
					priority: 'medium' as const,
				},
			]

			await db.transaction(async (tx) => {
				// Resolve missing epic IDs in batch
				const missingEpicNumbers = [
					...new Set(storyDataList.map((s) => s.epicNumber).filter((n) => !epicIdMap.has(n))),
				]

				expect(missingEpicNumbers).toHaveLength(2)

				if (missingEpicNumbers.length > 0) {
					const foundEpics = await tx.query.smEpics.findMany({
						where: and(eq(smEpics.sessionId, sess.id), inArray(smEpics.number, missingEpicNumbers)),
					})
					for (const e of foundEpics) {
						epicIdMap.set(e.number, e.id)
					}
				}

				expect(epicIdMap.size).toBe(2)

				const storiesToInsert = storyDataList.map((s) => {
					const epicId = epicIdMap.get(s.epicNumber)
					if (!epicId) throw new Error(`Epic ${s.epicNumber} not found`)
					return transformStoryForInsert(s, sess.id, epicId)
				})

				await tx.insert(smStories).values(storiesToInsert)
			})

			const allStories = await db.query.smStories.findMany({
				where: eq(smStories.sessionId, sess.id),
			})
			expect(allStories).toHaveLength(2)
			expect(allStories.map((s) => s.title).sort()).toEqual([
				'Story for Epic 1',
				'Story for Epic 2',
			])
		})
	})

	describe('Combined Epic + Story Batch', () => {
		it('should batch process epics and stories together in one transaction', async () => {
			const [session] = await db
				.insert(smSessions)
				.values({
					userId: testUserId,
					projectName: 'Full Batch Test',
					currentStep: 'stories',
				})
				.returning()

			const sess = assertDefined(session)
			createdSessionIds.push(sess.id)

			const epicDataList = [
				{
					number: 1,
					title: 'Auth',
					description: 'Authentication',
					priority: 'high' as const,
					businessValue: undefined,
					functionalRequirementCodes: [] as string[],
				},
				{
					number: 2,
					title: 'Dashboard',
					description: 'Dashboard features',
					priority: 'medium' as const,
					businessValue: 'Revenue generating',
					functionalRequirementCodes: ['FR-001'],
				},
			]

			const storyDataList = [
				{
					epicNumber: 1,
					storyNumber: 1,
					title: 'Login',
					asA: 'user',
					iWant: 'to login',
					soThat: 'I access the app',
					priority: 'high' as const,
				},
				{
					epicNumber: 1,
					storyNumber: 2,
					title: 'Register',
					asA: 'user',
					iWant: 'to register',
					soThat: 'I have an account',
					priority: 'medium' as const,
				},
				{
					epicNumber: 2,
					storyNumber: 1,
					title: 'View Metrics',
					asA: 'admin',
					iWant: 'to see metrics',
					soThat: 'I monitor health',
					priority: 'high' as const,
				},
			]

			await db.transaction(async (tx) => {
				const epicIdMap = new Map<number, string>()

				// --- Batch process epics ---
				const epicNumbers = epicDataList.map((e) => e.number)
				const existingEpics = await tx.query.smEpics.findMany({
					where: and(eq(smEpics.sessionId, sess.id), inArray(smEpics.number, epicNumbers)),
				})
				const existingEpicsByNumber = new Map(existingEpics.map((e) => [e.number, e]))

				const epicsToInsert: ReturnType<typeof transformEpicForInsert>[] = []
				for (const epicData of epicDataList) {
					const existing = existingEpicsByNumber.get(epicData.number)
					if (existing) {
						epicIdMap.set(epicData.number, existing.id)
					} else {
						epicsToInsert.push(transformEpicForInsert(epicData, sess.id))
					}
				}

				if (epicsToInsert.length > 0) {
					const inserted = await tx
						.insert(smEpics)
						.values(epicsToInsert)
						.returning({ id: smEpics.id, number: smEpics.number })
					for (const e of inserted) {
						epicIdMap.set(e.number, e.id)
					}
				}

				// --- Batch process stories ---
				const storyKeys = storyDataList.map((s) => `${s.epicNumber}-${s.storyNumber}`)
				const existingStories = await tx.query.smStories.findMany({
					where: and(eq(smStories.sessionId, sess.id), inArray(smStories.storyKey, storyKeys)),
				})
				const existingStoriesByKey = new Map(existingStories.map((s) => [s.storyKey, s]))

				const storiesToInsert: ReturnType<typeof transformStoryForInsert>[] = []
				for (const storyData of storyDataList) {
					const epicId = epicIdMap.get(storyData.epicNumber)
					if (!epicId) continue

					const storyKey = `${storyData.epicNumber}-${storyData.storyNumber}`
					const existing = existingStoriesByKey.get(storyKey)
					if (!existing) {
						storiesToInsert.push(transformStoryForInsert(storyData, sess.id, epicId))
					}
				}

				if (storiesToInsert.length > 0) {
					await tx.insert(smStories).values(storiesToInsert)
				}
			})

			// Verify epics
			const allEpics = await db.query.smEpics.findMany({
				where: eq(smEpics.sessionId, sess.id),
			})
			expect(allEpics).toHaveLength(2)

			// Verify stories
			const allStories = await db.query.smStories.findMany({
				where: eq(smStories.sessionId, sess.id),
			})
			expect(allStories).toHaveLength(3)

			// Verify stories linked to correct epics
			const epic1 = allEpics.find((e) => e.number === 1)
			const epic2 = allEpics.find((e) => e.number === 2)
			const storiesForEpic1 = allStories.filter((s) => s.epicId === epic1?.id)
			const storiesForEpic2 = allStories.filter((s) => s.epicId === epic2?.id)
			expect(storiesForEpic1).toHaveLength(2)
			expect(storiesForEpic2).toHaveLength(1)
		})

		it('should rollback entire batch when transaction fails', async () => {
			const [session] = await db
				.insert(smSessions)
				.values({
					userId: testUserId,
					projectName: 'Full Batch Rollback Test',
					currentStep: 'stories',
				})
				.returning()

			const sess = assertDefined(session)
			createdSessionIds.push(sess.id)

			try {
				await db.transaction(async (tx) => {
					// Insert epics
					await tx.insert(smEpics).values({
						sessionId: sess.id,
						number: 1,
						title: 'Will Be Rolled Back',
						description: 'Should not persist',
						priority: 'high',
					})

					// Force failure before stories
					throw new Error('Simulated failure after epic insert')
				})
			} catch (error) {
				expect((error as Error).message).toBe('Simulated failure after epic insert')
			}

			// Verify nothing persisted
			const epics = await db.query.smEpics.findMany({
				where: eq(smEpics.sessionId, sess.id),
			})
			expect(epics).toHaveLength(0)

			const stories = await db.query.smStories.findMany({
				where: eq(smStories.sessionId, sess.id),
			})
			expect(stories).toHaveLength(0)
		})
	})
})
