import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import { closeDb, db } from './client.js'
import { smEpics, smMessages, smSessions, smStories, users } from './schema/index.js'

/**
 * Transaction Rollback Tests
 *
 * These tests verify that database transactions properly rollback
 * when errors occur mid-process, ensuring data consistency.
 */

describe('Database Transaction Rollback', () => {
	let testUserId: string

	beforeAll(async () => {
		// Create a test user for the session tests
		const uniqueId = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`
		const [user] = await db
			.insert(users)
			.values({
				clerkId: `clerk_${uniqueId}`,
				email: `test-${uniqueId}@example.com`,
				name: 'Transaction Test User',
			})
			.returning()

		if (!user) {
			throw new Error('Failed to create test user')
		}
		testUserId = user.id
	})

	afterAll(async () => {
		// Cleanup: delete test user (cascades to sessions)
		if (testUserId) {
			await db.delete(users).where(eq(users.id, testUserId))
		}
		await closeDb()
	})

	describe('Session + Message Transaction', () => {
		it('should rollback session creation when message insert fails', async () => {
			const projectName = `rollback-test-${Date.now()}`

			// Count sessions before
			const [beforeCount] = await db
				.select({ count: sql<number>`count(*)` })
				.from(smSessions)
				.where(eq(smSessions.projectName, projectName))

			try {
				await db.transaction(async (tx) => {
					// Step 1: Create session (should succeed)
					const [session] = await tx
						.insert(smSessions)
						.values({
							userId: testUserId,
							projectName,
							projectDescription: 'Test project for rollback',
						})
						.returning()

					expect(session).toBeDefined()
					expect(session?.projectName).toBe(projectName)

					// Step 2: Force an error mid-transaction
					throw new Error('Simulated error to trigger rollback')
				})

				// Should never reach here
				expect.unreachable('Transaction should have thrown')
			} catch (error) {
				// Expected error
				expect(error).toBeInstanceOf(Error)
				expect((error as Error).message).toBe('Simulated error to trigger rollback')
			}

			// Verify: session should NOT exist after rollback
			const [afterCount] = await db
				.select({ count: sql<number>`count(*)` })
				.from(smSessions)
				.where(eq(smSessions.projectName, projectName))

			expect(Number(afterCount?.count)).toBe(Number(beforeCount?.count))

			// Double-check with a direct query
			const orphanSession = await db.query.smSessions.findFirst({
				where: eq(smSessions.projectName, projectName),
			})
			expect(orphanSession).toBeUndefined()
		})

		it('should rollback all operations when later insert fails', async () => {
			const projectName = `multi-rollback-${Date.now()}`

			try {
				await db.transaction(async (tx) => {
					// Step 1: Create session
					const [session] = await tx
						.insert(smSessions)
						.values({
							userId: testUserId,
							projectName,
							projectDescription: 'Test project',
						})
						.returning()

					if (!session) {
						throw new Error('Failed to create session')
					}

					// Step 2: Create welcome message
					await tx.insert(smMessages).values({
						sessionId: session.id,
						role: 'assistant',
						content: 'Welcome message',
						step: 'init',
					})

					// Step 3: Force error AFTER both inserts
					throw new Error('Simulated error after multiple inserts')
				})

				expect.unreachable('Transaction should have thrown')
			} catch (error) {
				expect((error as Error).message).toBe('Simulated error after multiple inserts')
			}

			// Verify: neither session nor message should exist
			const session = await db.query.smSessions.findFirst({
				where: eq(smSessions.projectName, projectName),
			})
			expect(session).toBeUndefined()
		})
	})

	describe('Epic + Story Transaction', () => {
		let testSessionId: string

		beforeAll(async () => {
			// Create a session for epic/story tests
			const [session] = await db
				.insert(smSessions)
				.values({
					userId: testUserId,
					projectName: `epic-story-test-${Date.now()}`,
					projectDescription: 'Session for epic/story rollback tests',
				})
				.returning()

			if (!session) {
				throw new Error('Failed to create test session')
			}
			testSessionId = session.id
		})

		afterAll(async () => {
			// Cleanup session (cascades to epics/stories)
			if (testSessionId) {
				await db.delete(smSessions).where(eq(smSessions.id, testSessionId))
			}
		})

		it('should rollback epic creation when story insert fails', async () => {
			const epicTitle = `rollback-epic-${Date.now()}`

			// Count epics before
			const [beforeEpicCount] = await db
				.select({ count: sql<number>`count(*)` })
				.from(smEpics)
				.where(eq(smEpics.sessionId, testSessionId))

			try {
				await db.transaction(async (tx) => {
					// Step 1: Create epic
					const [epic] = await tx
						.insert(smEpics)
						.values({
							sessionId: testSessionId,
							number: 999,
							title: epicTitle,
							description: 'Test epic for rollback',
						})
						.returning()

					expect(epic).toBeDefined()

					// Step 2: Create story
					if (!epic) {
						throw new Error('Failed to create epic')
					}

					await tx.insert(smStories).values({
						sessionId: testSessionId,
						epicId: epic.id,
						epicNumber: 999,
						storyNumber: 1,
						storyKey: '999-1',
						title: 'Test Story',
						asA: 'test user',
						iWant: 'to test rollback',
						soThat: 'data stays consistent',
					})

					// Step 3: Force error after both inserts
					throw new Error('Simulated error in epic/story creation')
				})

				expect.unreachable('Transaction should have thrown')
			} catch (error) {
				expect((error as Error).message).toBe('Simulated error in epic/story creation')
			}

			// Verify: epic count should be unchanged
			const [afterEpicCount] = await db
				.select({ count: sql<number>`count(*)` })
				.from(smEpics)
				.where(eq(smEpics.sessionId, testSessionId))

			expect(Number(afterEpicCount?.count)).toBe(Number(beforeEpicCount?.count))

			// Verify: no epic with that title exists
			const orphanEpic = await db.query.smEpics.findFirst({
				where: eq(smEpics.title, epicTitle),
			})
			expect(orphanEpic).toBeUndefined()
		})

		it('should rollback counter updates when subsequent operation fails', async () => {
			// First, create a valid epic to work with
			const [testEpic] = await db
				.insert(smEpics)
				.values({
					sessionId: testSessionId,
					number: 888,
					title: `counter-test-epic-${Date.now()}`,
					description: 'Epic for counter rollback test',
				})
				.returning()

			if (!testEpic) {
				throw new Error('Failed to create test epic')
			}

			// Get initial session counters
			const sessionBefore = await db.query.smSessions.findFirst({
				where: eq(smSessions.id, testSessionId),
			})

			const initialStoryCount = sessionBefore?.totalStories ?? 0
			const initialStoryPoints = sessionBefore?.totalStoryPoints ?? 0

			try {
				await db.transaction(async (tx) => {
					// Step 1: Insert story
					const [story] = await tx
						.insert(smStories)
						.values({
							sessionId: testSessionId,
							epicId: testEpic.id,
							epicNumber: 888,
							storyNumber: 1,
							storyKey: '888-1',
							title: 'Counter Test Story',
							asA: 'test user',
							iWant: 'to verify counter rollback',
							soThat: 'counters remain consistent',
							storyPoints: 5,
						})
						.returning()

					expect(story).toBeDefined()

					// Step 2: Update session counters
					await tx
						.update(smSessions)
						.set({
							totalStories: sql`${smSessions.totalStories} + 1`,
							totalStoryPoints: sql`${smSessions.totalStoryPoints} + 5`,
							updatedAt: new Date(),
						})
						.where(eq(smSessions.id, testSessionId))

					// Step 3: Force error AFTER counter update
					throw new Error('Simulated error after counter update')
				})

				expect.unreachable('Transaction should have thrown')
			} catch (error) {
				expect((error as Error).message).toBe('Simulated error after counter update')
			}

			// Verify: counters should be unchanged
			const sessionAfter = await db.query.smSessions.findFirst({
				where: eq(smSessions.id, testSessionId),
			})

			expect(sessionAfter?.totalStories).toBe(initialStoryCount)
			expect(sessionAfter?.totalStoryPoints).toBe(initialStoryPoints)

			// Cleanup test epic
			await db.delete(smEpics).where(eq(smEpics.id, testEpic.id))
		})
	})

	describe('Nested Transaction Behavior', () => {
		it('should rollback entire transaction even with nested operations', async () => {
			const projectName = `nested-tx-${Date.now()}`

			try {
				await db.transaction(async (tx) => {
					// Outer operation: create session
					const [session] = await tx
						.insert(smSessions)
						.values({
							userId: testUserId,
							projectName,
							projectDescription: 'Nested transaction test',
						})
						.returning()

					if (!session) {
						throw new Error('Failed to create session')
					}

					// Create multiple messages in sequence
					await tx.insert(smMessages).values({
						sessionId: session.id,
						role: 'assistant',
						content: 'Message 1',
						step: 'init',
					})

					await tx.insert(smMessages).values({
						sessionId: session.id,
						role: 'user',
						content: 'Message 2',
						step: 'init',
					})

					// Create epic
					const [epic] = await tx
						.insert(smEpics)
						.values({
							sessionId: session.id,
							number: 1,
							title: 'Test Epic',
							description: 'Test Description',
						})
						.returning()

					if (!epic) {
						throw new Error('Failed to create epic')
					}

					// Create story
					await tx.insert(smStories).values({
						sessionId: session.id,
						epicId: epic.id,
						epicNumber: 1,
						storyNumber: 1,
						storyKey: '1-1',
						title: 'Test Story',
						asA: 'user',
						iWant: 'something',
						soThat: 'benefit',
					})

					// Force error after many successful operations
					throw new Error('Simulated error in complex nested transaction')
				})

				expect.unreachable('Transaction should have thrown')
			} catch (error) {
				expect((error as Error).message).toBe('Simulated error in complex nested transaction')
			}

			// Verify: nothing should exist
			const session = await db.query.smSessions.findFirst({
				where: eq(smSessions.projectName, projectName),
			})
			expect(session).toBeUndefined()
		})
	})

	describe('Database Constraint Violations', () => {
		it('should rollback on foreign key constraint violation', async () => {
			const projectName = `fk-violation-${Date.now()}`
			const nonExistentUserId = '00000000-0000-0000-0000-000000000000'

			try {
				await db.transaction(async (tx) => {
					// Try to create session with non-existent user
					await tx.insert(smSessions).values({
						userId: nonExistentUserId,
						projectName,
						projectDescription: 'Should fail due to FK constraint',
					})
				})

				expect.unreachable('Transaction should have failed on FK violation')
			} catch (error) {
				// PostgreSQL throws an error on FK violation
				expect(error).toBeDefined()
			}

			// Verify: no orphan session should exist
			const session = await db.query.smSessions.findFirst({
				where: eq(smSessions.projectName, projectName),
			})
			expect(session).toBeUndefined()
		})

		it('should rollback on unique constraint violation mid-transaction', async () => {
			const projectName = `unique-violation-${Date.now()}`

			// First, create a valid session
			const [existingSession] = await db
				.insert(smSessions)
				.values({
					userId: testUserId,
					projectName: `existing-${projectName}`,
					projectDescription: 'Existing session',
				})
				.returning()

			if (!existingSession) {
				throw new Error('Failed to create existing session')
			}

			// Create an epic with a specific number
			await db.insert(smEpics).values({
				sessionId: existingSession.id,
				number: 1,
				title: 'Existing Epic',
				description: 'Existing epic',
			})

			const newProjectName = `new-${projectName}`

			try {
				await db.transaction(async (tx) => {
					// Step 1: Create new session (should succeed)
					const [newSession] = await tx
						.insert(smSessions)
						.values({
							userId: testUserId,
							projectName: newProjectName,
							projectDescription: 'New session in transaction',
						})
						.returning()

					if (!newSession) {
						throw new Error('Failed to create new session')
					}

					// Step 2: Create message (should succeed)
					await tx.insert(smMessages).values({
						sessionId: newSession.id,
						role: 'assistant',
						content: 'Welcome',
						step: 'init',
					})

					// Step 3: Force error
					throw new Error('Simulated error to test partial rollback')
				})

				expect.unreachable('Transaction should have thrown')
			} catch (error) {
				expect((error as Error).message).toBe('Simulated error to test partial rollback')
			}

			// Verify: new session should NOT exist
			const newSession = await db.query.smSessions.findFirst({
				where: eq(smSessions.projectName, newProjectName),
			})
			expect(newSession).toBeUndefined()

			// Cleanup
			await db.delete(smSessions).where(eq(smSessions.id, existingSession.id))
		})
	})

	describe('Transaction Isolation', () => {
		it('should not see uncommitted changes from failed transactions', async () => {
			const projectName = `isolation-test-${Date.now()}`

			// Start a transaction that will fail
			const txPromise = db.transaction(async (tx) => {
				const [session] = await tx
					.insert(smSessions)
					.values({
						userId: testUserId,
						projectName,
						projectDescription: 'Isolation test',
					})
					.returning()

				if (!session) {
					throw new Error('Failed to create session')
				}

				// Simulate some work
				await new Promise((resolve) => setTimeout(resolve, 50))

				throw new Error('Simulated error for isolation test')
			})

			// Wait a bit for the transaction to start
			await new Promise((resolve) => setTimeout(resolve, 10))

			// Query from outside the transaction - should not see uncommitted data
			const sessionDuringTx = await db.query.smSessions.findFirst({
				where: eq(smSessions.projectName, projectName),
			})
			expect(sessionDuringTx).toBeUndefined()

			// Wait for transaction to fail
			try {
				await txPromise
			} catch {
				// Expected
			}

			// Verify session still doesn't exist after rollback
			const sessionAfterRollback = await db.query.smSessions.findFirst({
				where: eq(smSessions.projectName, projectName),
			})
			expect(sessionAfterRollback).toBeUndefined()
		})
	})

	describe('Successful Transaction Commit', () => {
		it('should persist all changes when transaction completes successfully', async () => {
			const projectName = `success-tx-${Date.now()}`

			// Execute successful transaction
			const result = await db.transaction(async (tx) => {
				const [session] = await tx
					.insert(smSessions)
					.values({
						userId: testUserId,
						projectName,
						projectDescription: 'Successful transaction test',
					})
					.returning()

				if (!session) {
					throw new Error('Failed to create session')
				}

				await tx.insert(smMessages).values({
					sessionId: session.id,
					role: 'assistant',
					content: 'Welcome message',
					step: 'init',
				})

				return session
			})

			const createdSessionId = result.id

			// Verify: session and message should exist
			const session = await db.query.smSessions.findFirst({
				where: eq(smSessions.id, createdSessionId),
				with: {
					messages: true,
				},
			})

			expect(session).toBeDefined()
			expect(session?.projectName).toBe(projectName)
			expect(session?.messages).toHaveLength(1)
			expect(session?.messages[0]?.content).toBe('Welcome message')

			// Cleanup
			await db.delete(smSessions).where(eq(smSessions.id, createdSessionId))
		})
	})
})
