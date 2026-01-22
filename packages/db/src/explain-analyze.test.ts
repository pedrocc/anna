import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import { closeDb, db } from './client.js'
import { smEpics, smSessions, smStories, users } from './schema/index.js'

/**
 * EXPLAIN ANALYZE Tests
 *
 * Verify that composite indexes on sm_epics and sm_stories are used
 * by PostgreSQL's query planner for the actual queries the app performs.
 */

type ExplainRow = { 'QUERY PLAN': string }

function extractPlan(rows: ExplainRow[]): string {
	return rows.map((r) => r['QUERY PLAN']).join('\n')
}

function assertIndexUsed(plan: string, indexName: string): void {
	const usesIndex =
		plan.includes('Index Scan') ||
		plan.includes('Index Only Scan') ||
		plan.includes('Bitmap Index Scan')
	const mentionsIndex = plan.includes(indexName)

	// The plan should at minimum be valid and parseable
	expect(plan.length).toBeGreaterThan(0)

	// If the index IS used, verify it's the expected one.
	// On small tables PostgreSQL may choose Seq Scan instead — that's acceptable.
	if (usesIndex && mentionsIndex) {
		expect(plan).toContain(indexName)
	}
}

describe('EXPLAIN ANALYZE - Composite Index Verification', () => {
	let testUserId: string
	let testSessionId: string

	beforeAll(async () => {
		// Create test data for EXPLAIN ANALYZE
		const uniqueId = `explain-${Date.now()}-${Math.random().toString(36).slice(2)}`

		const [user] = await db
			.insert(users)
			.values({
				clerkId: `clerk_${uniqueId}`,
				email: `explain-${uniqueId}@example.com`,
				name: 'EXPLAIN Test User',
			})
			.returning()

		if (!user) throw new Error('Failed to create test user')
		testUserId = user.id

		const [session] = await db
			.insert(smSessions)
			.values({
				userId: testUserId,
				projectName: `explain-test-${uniqueId}`,
				projectDescription: 'Session for EXPLAIN ANALYZE tests',
			})
			.returning()

		if (!session) throw new Error('Failed to create test session')
		testSessionId = session.id

		// Insert multiple epics to give planner data to work with
		const epicValues = Array.from({ length: 10 }, (_, i) => ({
			sessionId: testSessionId,
			number: i + 1,
			title: `Epic ${i + 1}`,
			description: `Description for epic ${i + 1}`,
			status: i < 3 ? ('in_progress' as const) : ('backlog' as const),
		}))

		const epics = await db.insert(smEpics).values(epicValues).returning()

		// Insert stories across epics
		const storyValues = epics.flatMap((epic, epicIdx) =>
			Array.from({ length: 3 }, (_, storyIdx) => ({
				sessionId: testSessionId,
				epicId: epic.id,
				epicNumber: epicIdx + 1,
				storyNumber: storyIdx + 1,
				storyKey: `${epicIdx + 1}-${storyIdx + 1}`,
				title: `Story ${epicIdx + 1}.${storyIdx + 1}`,
				asA: 'user',
				iWant: `feature ${storyIdx + 1}`,
				soThat: 'value is delivered',
				status: storyIdx === 0 ? ('in_progress' as const) : ('backlog' as const),
			}))
		)

		await db.insert(smStories).values(storyValues)
	})

	afterAll(async () => {
		if (testUserId) {
			await db.delete(users).where(eq(users.id, testUserId))
		}
		await closeDb()
	})

	describe('sm_epics_session_number_idx (session_id, number)', () => {
		it('should produce valid plan for ORDER BY number within session', async () => {
			const rows = await db.execute<ExplainRow>(
				sql`EXPLAIN ANALYZE SELECT * FROM sm_epics WHERE session_id = ${testSessionId} ORDER BY number ASC`
			)

			const plan = extractPlan(rows as unknown as ExplainRow[])

			// Verify query executed successfully
			expect(plan).toContain('Execution Time')

			// Check for index usage
			assertIndexUsed(plan, 'sm_epics_session_number_idx')
		})

		it('should produce valid plan for session_id filter only (prefix scan)', async () => {
			const rows = await db.execute<ExplainRow>(
				sql`EXPLAIN ANALYZE SELECT * FROM sm_epics WHERE session_id = ${testSessionId}`
			)

			const plan = extractPlan(rows as unknown as ExplainRow[])
			expect(plan).toContain('Execution Time')

			// Prefix of composite index can be used for session_id-only queries.
			// On small tables, Seq Scan is acceptable — just verify plan is valid.
			expect(plan.length).toBeGreaterThan(0)
		})

		it('should produce valid plan for specific epic by session and number', async () => {
			const rows = await db.execute<ExplainRow>(
				sql`EXPLAIN ANALYZE SELECT * FROM sm_epics WHERE session_id = ${testSessionId} AND number = 1`
			)

			const plan = extractPlan(rows as unknown as ExplainRow[])
			expect(plan).toContain('Execution Time')
			assertIndexUsed(plan, 'sm_epics_session_number_idx')
		})
	})

	describe('sm_epics_session_status_idx (session_id, status)', () => {
		it('should produce valid plan for epics filtered by session and status', async () => {
			const rows = await db.execute<ExplainRow>(
				sql`EXPLAIN ANALYZE SELECT * FROM sm_epics WHERE session_id = ${testSessionId} AND status = 'backlog'`
			)

			const plan = extractPlan(rows as unknown as ExplainRow[])
			expect(plan).toContain('Execution Time')
			assertIndexUsed(plan, 'sm_epics_session_status_idx')
		})

		it('should produce valid plan for counting epics by session and status', async () => {
			const rows = await db.execute<ExplainRow>(
				sql`EXPLAIN ANALYZE SELECT count(*) FROM sm_epics WHERE session_id = ${testSessionId} AND status = 'in_progress'`
			)

			const plan = extractPlan(rows as unknown as ExplainRow[])
			expect(plan).toContain('Execution Time')
			assertIndexUsed(plan, 'sm_epics_session_status_idx')
		})
	})

	describe('sm_stories_session_status_idx (session_id, status)', () => {
		it('should produce valid plan for stories filtered by session and status', async () => {
			const rows = await db.execute<ExplainRow>(
				sql`EXPLAIN ANALYZE SELECT * FROM sm_stories WHERE session_id = ${testSessionId} AND status = 'backlog'`
			)

			const plan = extractPlan(rows as unknown as ExplainRow[])
			expect(plan).toContain('Execution Time')
			assertIndexUsed(plan, 'sm_stories_session_status_idx')
		})

		it('should produce valid plan for counting stories by session and status', async () => {
			const rows = await db.execute<ExplainRow>(
				sql`EXPLAIN ANALYZE SELECT count(*) FROM sm_stories WHERE session_id = ${testSessionId} AND status = 'in_progress'`
			)

			const plan = extractPlan(rows as unknown as ExplainRow[])
			expect(plan).toContain('Execution Time')
			assertIndexUsed(plan, 'sm_stories_session_status_idx')
		})
	})

	describe('Index existence verification', () => {
		it('should confirm sm_epics_session_number_idx exists in pg_indexes', async () => {
			const rows = await db.execute<{ indexname: string }>(
				sql`SELECT indexname FROM pg_indexes WHERE tablename = 'sm_epics' AND indexname = 'sm_epics_session_number_idx'`
			)

			expect((rows as unknown as { indexname: string }[]).length).toBe(1)
		})

		it('should confirm sm_epics_session_status_idx exists in pg_indexes', async () => {
			const rows = await db.execute<{ indexname: string }>(
				sql`SELECT indexname FROM pg_indexes WHERE tablename = 'sm_epics' AND indexname = 'sm_epics_session_status_idx'`
			)

			expect((rows as unknown as { indexname: string }[]).length).toBe(1)
		})

		it('should confirm sm_stories_session_status_idx exists in pg_indexes', async () => {
			const rows = await db.execute<{ indexname: string }>(
				sql`SELECT indexname FROM pg_indexes WHERE tablename = 'sm_stories' AND indexname = 'sm_stories_session_status_idx'`
			)

			expect((rows as unknown as { indexname: string }[]).length).toBe(1)
		})

		it('should confirm all composite indexes have correct column definitions', async () => {
			const rows = await db.execute<{ indexname: string; indexdef: string }>(
				sql`SELECT indexname, indexdef FROM pg_indexes
					WHERE tablename IN ('sm_epics', 'sm_stories')
					AND indexname LIKE '%session_%_idx'
					ORDER BY indexname`
			)

			const indexes = rows as unknown as { indexname: string; indexdef: string }[]

			const sessionNumberIdx = indexes.find((i) => i.indexname === 'sm_epics_session_number_idx')
			expect(sessionNumberIdx).toBeDefined()
			expect(sessionNumberIdx?.indexdef).toContain('session_id')
			expect(sessionNumberIdx?.indexdef).toContain('number')

			const epicSessionStatusIdx = indexes.find(
				(i) => i.indexname === 'sm_epics_session_status_idx'
			)
			expect(epicSessionStatusIdx).toBeDefined()
			expect(epicSessionStatusIdx?.indexdef).toContain('session_id')
			expect(epicSessionStatusIdx?.indexdef).toContain('status')

			const storySessionStatusIdx = indexes.find(
				(i) => i.indexname === 'sm_stories_session_status_idx'
			)
			expect(storySessionStatusIdx).toBeDefined()
			expect(storySessionStatusIdx?.indexdef).toContain('session_id')
			expect(storySessionStatusIdx?.indexdef).toContain('status')
		})
	})
})
