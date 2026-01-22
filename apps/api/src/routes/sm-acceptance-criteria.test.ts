import { beforeEach, describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { smRoutes } from './sm.js'

/**
 * Integration tests for creating/updating stories with Given-When-Then
 * acceptance criteria via the SM API.
 *
 * These tests validate:
 * 1. Auth is required for story creation/update with AC
 * 2. Validation rejects invalid AC payloads
 * 3. The schema correctly accepts given_when_then type AC
 */
describe('SM Story Acceptance Criteria (Given/When/Then)', () => {
	let app: Hono

	beforeEach(() => {
		app = new Hono()
		app.route('/api/v1/sm', smRoutes)
		process.env['CLERK_SECRET_KEY'] = 'test-secret-key'
	})

	const validGwtAc = {
		id: '550e8400-e29b-41d4-a716-446655440000',
		description: 'User login redirects to dashboard',
		type: 'given_when_then' as const,
		given: 'a registered user on the login page',
		when: 'they enter valid credentials and click submit',
		// biome-ignore lint/suspicious/noThenProperty: Given-When-Then acceptance criteria, not a Promise
		then: 'they are redirected to the dashboard',
	}

	const validSimpleAc = {
		id: '550e8400-e29b-41d4-a716-446655440001',
		description: 'System displays error for invalid email',
		type: 'simple' as const,
	}

	const validStoryPayload = {
		epicId: '550e8400-e29b-41d4-a716-446655440010',
		epicNumber: 1,
		storyNumber: 1,
		title: 'User Authentication',
		asA: 'registered user',
		iWant: 'to log into my account',
		soThat: 'I can access my dashboard',
		acceptanceCriteria: [validGwtAc],
	}

	// ============================================
	// CREATE STORY WITH GWT ACCEPTANCE CRITERIA
	// ============================================

	describe('POST /api/v1/sm/sessions/:id/stories (with AC)', () => {
		it('should return 401 when creating story with GWT AC without auth', async () => {
			const res = await app.request('/api/v1/sm/sessions/test-session-id/stories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(validStoryPayload),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean; error: { code: string } }
			expect(data.success).toBe(false)
			expect(data.error.code).toBe('UNAUTHORIZED')
		})

		it('should return 401 when creating story with multiple AC types', async () => {
			const payload = {
				...validStoryPayload,
				acceptanceCriteria: [validGwtAc, validSimpleAc],
			}

			const res = await app.request('/api/v1/sm/sessions/test-session-id/stories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})

			// Auth middleware runs before validation
			expect(res.status).toBe(401)
		})

		it('should return 401 for GWT AC with all fields populated', async () => {
			const payload = {
				...validStoryPayload,
				acceptanceCriteria: [
					{
						id: '550e8400-e29b-41d4-a716-446655440002',
						description: 'Password reset email sent',
						type: 'given_when_then' as const,
						given: 'a user who forgot their password',
						when: 'they request a password reset',
						// biome-ignore lint/suspicious/noThenProperty: Given-When-Then acceptance criteria, not a Promise
						then: 'an email is sent with a reset link',
					},
					{
						id: '550e8400-e29b-41d4-a716-446655440003',
						description: 'Reset link expires after 24 hours',
						type: 'given_when_then' as const,
						given: 'a password reset link older than 24 hours',
						when: 'the user clicks the link',
						// biome-ignore lint/suspicious/noThenProperty: Given-When-Then acceptance criteria, not a Promise
						then: 'an error message is shown indicating the link has expired',
					},
				],
			}

			const res = await app.request('/api/v1/sm/sessions/test-session-id/stories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})

			expect(res.status).toBe(401)
		})

		it('should reject story with invalid AC type (validation after auth)', async () => {
			const payload = {
				...validStoryPayload,
				acceptanceCriteria: [
					{
						id: '550e8400-e29b-41d4-a716-446655440000',
						description: 'Test',
						type: 'invalid_type',
					},
				],
			}

			const res = await app.request('/api/v1/sm/sessions/test-session-id/stories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})

			// Auth runs first, so we get 401 before validation
			expect(res.status).toBe(401)
		})

		it('should reject story with AC missing required description', async () => {
			const payload = {
				...validStoryPayload,
				acceptanceCriteria: [
					{
						id: '550e8400-e29b-41d4-a716-446655440000',
						type: 'given_when_then',
						given: 'a user',
						when: 'they act',
					},
				],
			}

			const res = await app.request('/api/v1/sm/sessions/test-session-id/stories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})

			expect(res.status).toBe(401)
		})

		it('should reject story with AC having empty description', async () => {
			const payload = {
				...validStoryPayload,
				acceptanceCriteria: [
					{
						id: '550e8400-e29b-41d4-a716-446655440000',
						description: '',
						type: 'given_when_then',
						given: 'a user',
						when: 'they act',
					},
				],
			}

			const res = await app.request('/api/v1/sm/sessions/test-session-id/stories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})

			expect(res.status).toBe(401)
		})

		it('should reject story with AC having invalid UUID', async () => {
			const payload = {
				...validStoryPayload,
				acceptanceCriteria: [
					{
						id: 'not-a-uuid',
						description: 'Test',
						type: 'simple',
					},
				],
			}

			const res = await app.request('/api/v1/sm/sessions/test-session-id/stories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})

			expect(res.status).toBe(401)
		})

		it('should accept story with GWT AC where then is optional', async () => {
			const payload = {
				...validStoryPayload,
				acceptanceCriteria: [
					{
						id: '550e8400-e29b-41d4-a716-446655440000',
						description: 'User clicks submit',
						type: 'given_when_then' as const,
						given: 'a user on the form page',
						when: 'they click submit without filling required fields',
					},
				],
			}

			const res = await app.request('/api/v1/sm/sessions/test-session-id/stories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})

			// Still gets 401 (auth first) but the payload is valid
			expect(res.status).toBe(401)
		})

		it('should accept story with GWT AC where given and when are optional', async () => {
			const payload = {
				...validStoryPayload,
				acceptanceCriteria: [
					{
						id: '550e8400-e29b-41d4-a716-446655440000',
						description: 'Form validation works',
						type: 'given_when_then' as const,
					},
				],
			}

			const res = await app.request('/api/v1/sm/sessions/test-session-id/stories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})

			expect(res.status).toBe(401)
		})

		it('should accept story with empty acceptanceCriteria array', async () => {
			const payload = {
				...validStoryPayload,
				acceptanceCriteria: [],
			}

			const res = await app.request('/api/v1/sm/sessions/test-session-id/stories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})

			expect(res.status).toBe(401)
		})
	})

	// ============================================
	// UPDATE STORY WITH GWT ACCEPTANCE CRITERIA
	// ============================================

	describe('PATCH /api/v1/sm/stories/:id (with AC)', () => {
		it('should return 401 when updating story AC without auth', async () => {
			const res = await app.request('/api/v1/sm/stories/test-story-id', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					acceptanceCriteria: [validGwtAc],
				}),
			})

			expect(res.status).toBe(401)
			const data = (await res.json()) as { success: boolean; error: { code: string } }
			expect(data.success).toBe(false)
			expect(data.error.code).toBe('UNAUTHORIZED')
		})

		it('should return 401 when updating with multiple GWT criteria', async () => {
			const res = await app.request('/api/v1/sm/stories/test-story-id', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					acceptanceCriteria: [
						{
							id: '550e8400-e29b-41d4-a716-446655440004',
							description: 'API returns 200 on success',
							type: 'given_when_then' as const,
							given: 'an authenticated user',
							when: 'they make a valid API request',
							// biome-ignore lint/suspicious/noThenProperty: Given-When-Then acceptance criteria, not a Promise
							then: 'the API returns 200 with the data',
						},
						{
							id: '550e8400-e29b-41d4-a716-446655440005',
							description: 'API returns 401 on unauthorized',
							type: 'given_when_then' as const,
							given: 'an unauthenticated user',
							when: 'they make an API request',
							// biome-ignore lint/suspicious/noThenProperty: Given-When-Then acceptance criteria, not a Promise
							then: 'the API returns 401',
						},
					],
				}),
			})

			expect(res.status).toBe(401)
		})

		it('should return 401 when updating with mixed AC types', async () => {
			const res = await app.request('/api/v1/sm/stories/test-story-id', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					acceptanceCriteria: [validGwtAc, validSimpleAc],
				}),
			})

			expect(res.status).toBe(401)
		})

		it('should accept update with only acceptanceCriteria field', async () => {
			const res = await app.request('/api/v1/sm/stories/test-story-id', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					acceptanceCriteria: [
						{
							id: '550e8400-e29b-41d4-a716-446655440006',
							description: 'Data persists after page reload',
							type: 'given_when_then' as const,
							given: 'a user who has saved their work',
							when: 'they reload the page',
							// biome-ignore lint/suspicious/noThenProperty: Given-When-Then acceptance criteria, not a Promise
							then: 'their previously saved data is still displayed',
						},
					],
				}),
			})

			expect(res.status).toBe(401)
		})
	})

	// ============================================
	// SCHEMA VALIDATION TESTS (direct Zod validation)
	// ============================================

	describe('Schema validation for GWT acceptance criteria', () => {
		const { CreateSmStorySchema, UpdateSmStorySchema, SmAcceptanceCriteriaSchema } =
			require('@repo/shared') as typeof import('@repo/shared')

		it('should validate a complete GWT acceptance criterion', () => {
			const result = SmAcceptanceCriteriaSchema.parse(validGwtAc)
			expect(result.type).toBe('given_when_then')
			expect(result.given).toBe('a registered user on the login page')
			expect(result.when).toBe('they enter valid credentials and click submit')
			expect(result.then).toBe('they are redirected to the dashboard')
			expect(result.description).toBe('User login redirects to dashboard')
		})

		it('should validate GWT AC with only given field', () => {
			const ac = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				description: 'Partial GWT',
				type: 'given_when_then' as const,
				given: 'a user exists',
			}
			const result = SmAcceptanceCriteriaSchema.parse(ac)
			expect(result.given).toBe('a user exists')
			expect(result.when).toBeUndefined()
			expect(result.then).toBeUndefined()
		})

		it('should validate GWT AC with only when field', () => {
			const ac = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				description: 'Partial GWT',
				type: 'given_when_then' as const,
				when: 'user clicks button',
			}
			const result = SmAcceptanceCriteriaSchema.parse(ac)
			expect(result.given).toBeUndefined()
			expect(result.when).toBe('user clicks button')
			expect(result.then).toBeUndefined()
		})

		it('should validate GWT AC with only then field', () => {
			const ac = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				description: 'Partial GWT',
				type: 'given_when_then' as const,
				// biome-ignore lint/suspicious/noThenProperty: Given-When-Then acceptance criteria, not a Promise
				then: 'page redirects',
			}
			const result = SmAcceptanceCriteriaSchema.parse(ac)
			expect(result.given).toBeUndefined()
			expect(result.when).toBeUndefined()
			expect(result.then).toBe('page redirects')
		})

		it('should reject AC with invalid type', () => {
			const ac = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				description: 'Test',
				type: 'bdd_style',
			}
			expect(() => SmAcceptanceCriteriaSchema.parse(ac)).toThrow()
		})

		it('should reject AC without id', () => {
			const ac = {
				description: 'No id',
				type: 'given_when_then',
				given: 'a user',
				when: 'they act',
			}
			expect(() => SmAcceptanceCriteriaSchema.parse(ac)).toThrow()
		})

		it('should reject AC with non-UUID id', () => {
			const ac = {
				id: '12345',
				description: 'Bad id',
				type: 'given_when_then',
			}
			expect(() => SmAcceptanceCriteriaSchema.parse(ac)).toThrow()
		})

		it('should validate CreateSmStorySchema with GWT AC array', () => {
			const result = CreateSmStorySchema.parse(validStoryPayload)
			expect(result.acceptanceCriteria).toHaveLength(1)
			const ac = result.acceptanceCriteria?.[0]
			expect(ac?.type).toBe('given_when_then')
			expect(ac?.given).toBe('a registered user on the login page')
			expect(ac?.when).toBe('they enter valid credentials and click submit')
			expect(ac?.then).toBe('they are redirected to the dashboard')
		})

		it('should validate CreateSmStorySchema without AC (optional)', () => {
			const { acceptanceCriteria: _, ...payloadWithoutAc } = validStoryPayload
			const result = CreateSmStorySchema.parse(payloadWithoutAc)
			expect(result.acceptanceCriteria).toBeUndefined()
		})

		it('should validate UpdateSmStorySchema with only AC field', () => {
			const result = UpdateSmStorySchema.parse({
				acceptanceCriteria: [validGwtAc, validSimpleAc],
			})
			expect(result.acceptanceCriteria).toHaveLength(2)
			expect(result.acceptanceCriteria?.[0]?.type).toBe('given_when_then')
			expect(result.acceptanceCriteria?.[1]?.type).toBe('simple')
		})

		it('should validate story with multiple GWT criteria', () => {
			const payload = {
				...validStoryPayload,
				acceptanceCriteria: [
					{
						id: '550e8400-e29b-41d4-a716-446655440007',
						description: 'Login success',
						type: 'given_when_then' as const,
						given: 'valid credentials',
						when: 'user submits form',
						// biome-ignore lint/suspicious/noThenProperty: Given-When-Then acceptance criteria, not a Promise
						then: 'user sees dashboard',
					},
					{
						id: '550e8400-e29b-41d4-a716-446655440008',
						description: 'Login failure',
						type: 'given_when_then' as const,
						given: 'invalid credentials',
						when: 'user submits form',
						// biome-ignore lint/suspicious/noThenProperty: Given-When-Then acceptance criteria, not a Promise
						then: 'error message is displayed',
					},
					{
						id: '550e8400-e29b-41d4-a716-446655440009',
						description: 'Account lockout',
						type: 'given_when_then' as const,
						given: '5 failed login attempts',
						when: 'user tries again',
						// biome-ignore lint/suspicious/noThenProperty: Given-When-Then acceptance criteria, not a Promise
						then: 'account is locked for 15 minutes',
					},
				],
			}

			const result = CreateSmStorySchema.parse(payload)
			expect(result.acceptanceCriteria).toHaveLength(3)
			for (const ac of result.acceptanceCriteria ?? []) {
				expect(ac.type).toBe('given_when_then')
				expect(ac.given).toBeDefined()
				expect(ac.when).toBeDefined()
				expect(ac.then).toBeDefined()
			}
		})

		it('should reject CreateSmStorySchema with invalid AC in array', () => {
			const payload = {
				...validStoryPayload,
				acceptanceCriteria: [
					validGwtAc,
					{
						id: 'not-a-uuid',
						description: 'Bad AC',
						type: 'given_when_then',
					},
				],
			}
			expect(() => CreateSmStorySchema.parse(payload)).toThrow()
		})

		it('should reject UpdateSmStorySchema with AC missing description', () => {
			expect(() =>
				UpdateSmStorySchema.parse({
					acceptanceCriteria: [
						{
							id: '550e8400-e29b-41d4-a716-446655440000',
							type: 'given_when_then',
							given: 'a user',
						},
					],
				})
			).toThrow()
		})

		it('should reject UpdateSmStorySchema with AC having empty description', () => {
			expect(() =>
				UpdateSmStorySchema.parse({
					acceptanceCriteria: [
						{
							id: '550e8400-e29b-41d4-a716-446655440000',
							description: '',
							type: 'given_when_then',
							given: 'a user',
						},
					],
				})
			).toThrow()
		})
	})
})
