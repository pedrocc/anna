import { describe, expect, test } from 'bun:test'
import {
	BrainstormIdeaSchema,
	BrainstormMessageSchema,
	BrainstormSessionSchema,
} from './brainstorm.schema.js'
import {
	BriefingDocumentSchema,
	BriefingInputDocumentSchema,
	BriefingMessageSchema,
	BriefingSessionSchema,
} from './briefing.schema.js'
import { TimestampsSchema } from './common.schema.js'
import {
	PrdDocumentSchema,
	PrdInputDocumentSchema,
	PrdMessageSchema,
	PrdSessionSchema,
} from './prd.schema.js'
import {
	SmDocumentSchema,
	SmEpicSchema,
	SmMessageSchema,
	SmSessionSchema,
	SmSprintConfigSchema,
	SmStorySchema,
} from './sm.schema.js'

// ============================================
// SHARED: TimestampsSchema coercion
// ============================================

describe('TimestampsSchema date coercion', () => {
	test('accepts Date objects', () => {
		const now = new Date()
		const result = TimestampsSchema.parse({ createdAt: now, updatedAt: now })
		expect(result.createdAt).toEqual(now)
		expect(result.updatedAt).toEqual(now)
	})

	test('coerces ISO string to Date', () => {
		const isoString = '2024-01-15T10:30:00.000Z'
		const result = TimestampsSchema.parse({ createdAt: isoString, updatedAt: isoString })
		expect(result.createdAt).toBeInstanceOf(Date)
		expect(result.updatedAt).toBeInstanceOf(Date)
		expect(result.createdAt.toISOString()).toBe(isoString)
	})

	test('coerces numeric timestamp to Date', () => {
		const timestamp = 1705312200000 // 2024-01-15T10:30:00.000Z
		const result = TimestampsSchema.parse({ createdAt: timestamp, updatedAt: timestamp })
		expect(result.createdAt).toBeInstanceOf(Date)
		expect(result.createdAt.getTime()).toBe(timestamp)
	})

	test('rejects invalid date strings', () => {
		expect(() =>
			TimestampsSchema.parse({ createdAt: 'not-a-date', updatedAt: 'not-a-date' })
		).toThrow()
	})
})

// ============================================
// BRIEFING: Date coercion
// ============================================

describe('Briefing date coercion', () => {
	test('BriefingInputDocumentSchema validates loadedAt as ISO datetime string', () => {
		const isoString = '2024-06-01T12:00:00.000Z'
		const result = BriefingInputDocumentSchema.parse({
			name: 'test-doc',
			path: '/docs/test.md',
			type: 'brainstorm',
			loadedAt: isoString,
		})
		expect(result.loadedAt).toBe(isoString)
	})

	test('BriefingInputDocumentSchema rejects invalid loadedAt string', () => {
		expect(() =>
			BriefingInputDocumentSchema.parse({
				name: 'test-doc',
				path: '/docs/test.md',
				type: 'research',
				loadedAt: 'not-a-date',
			})
		).toThrow()
	})

	test('BriefingMessageSchema coerces createdAt from ISO string', () => {
		const isoString = '2024-06-01T12:00:00.000Z'
		const result = BriefingMessageSchema.parse({
			id: '550e8400-e29b-41d4-a716-446655440000',
			sessionId: '550e8400-e29b-41d4-a716-446655440001',
			role: 'user',
			content: 'Hello',
			step: 'init',
			createdAt: isoString,
		})
		expect(result.createdAt).toBeInstanceOf(Date)
		expect(result.createdAt.toISOString()).toBe(isoString)
	})

	test('BriefingDocumentSchema coerces date fields from ISO strings', () => {
		const created = '2024-06-01T10:00:00.000Z'
		const updated = '2024-06-01T11:00:00.000Z'
		const result = BriefingDocumentSchema.parse({
			id: '550e8400-e29b-41d4-a716-446655440000',
			sessionId: '550e8400-e29b-41d4-a716-446655440001',
			type: 'product_brief',
			title: 'Test Document',
			content: 'Document content',
			version: 1,
			createdAt: created,
			updatedAt: updated,
		})
		expect(result.createdAt).toBeInstanceOf(Date)
		expect(result.updatedAt).toBeInstanceOf(Date)
		expect(result.createdAt.toISOString()).toBe(created)
		expect(result.updatedAt.toISOString()).toBe(updated)
	})

	test('BriefingSessionSchema coerces generationStartedAt and completedAt', () => {
		const genStarted = '2024-06-01T10:00:00.000Z'
		const completed = '2024-06-01T11:00:00.000Z'
		const now = '2024-06-01T09:00:00.000Z'
		const result = BriefingSessionSchema.parse({
			id: '550e8400-e29b-41d4-a716-446655440000',
			userId: '550e8400-e29b-41d4-a716-446655440001',
			projectName: 'Test Project',
			inputDocuments: [],
			keyDifferentiators: [],
			primaryUsers: [],
			secondaryUsers: [],
			userJourneys: [],
			successMetrics: [],
			businessObjectives: [],
			kpis: [],
			mvpFeatures: [],
			outOfScope: [],
			mvpSuccessCriteria: [],
			currentStep: 'init',
			status: 'active',
			stepsCompleted: [],
			generationStatus: 'idle',
			generationStartedAt: genStarted,
			completedAt: completed,
			createdAt: now,
			updatedAt: now,
		})
		expect(result.generationStartedAt).toBeInstanceOf(Date)
		expect(result.completedAt).toBeInstanceOf(Date)
		expect(result.createdAt).toBeInstanceOf(Date)
		expect(result.generationStartedAt?.toISOString()).toBe(genStarted)
		expect(result.completedAt?.toISOString()).toBe(completed)
	})

	test('BriefingSessionSchema accepts null for optional date fields', () => {
		const now = new Date()
		const result = BriefingSessionSchema.parse({
			id: '550e8400-e29b-41d4-a716-446655440000',
			userId: '550e8400-e29b-41d4-a716-446655440001',
			projectName: 'Test Project',
			inputDocuments: [],
			keyDifferentiators: [],
			primaryUsers: [],
			secondaryUsers: [],
			userJourneys: [],
			successMetrics: [],
			businessObjectives: [],
			kpis: [],
			mvpFeatures: [],
			outOfScope: [],
			mvpSuccessCriteria: [],
			currentStep: 'init',
			status: 'active',
			stepsCompleted: [],
			generationStatus: 'idle',
			generationStartedAt: null,
			completedAt: null,
			createdAt: now,
			updatedAt: now,
		})
		expect(result.generationStartedAt).toBeNull()
		expect(result.completedAt).toBeNull()
	})
})

// ============================================
// PRD: Date coercion
// ============================================

describe('PRD date coercion', () => {
	test('PrdInputDocumentSchema validates loadedAt as ISO datetime string', () => {
		const isoString = '2024-06-01T12:00:00.000Z'
		const result = PrdInputDocumentSchema.parse({
			name: 'briefing-doc',
			path: '/docs/briefing.md',
			type: 'briefing',
			loadedAt: isoString,
		})
		expect(result.loadedAt).toBe(isoString)
	})

	test('PrdMessageSchema coerces createdAt from ISO string', () => {
		const isoString = '2024-06-01T12:00:00.000Z'
		const result = PrdMessageSchema.parse({
			id: '550e8400-e29b-41d4-a716-446655440000',
			sessionId: '550e8400-e29b-41d4-a716-446655440001',
			role: 'assistant',
			content: 'Response',
			step: 'init',
			createdAt: isoString,
		})
		expect(result.createdAt).toBeInstanceOf(Date)
	})

	test('PrdDocumentSchema coerces timestamps', () => {
		const created = '2024-06-01T10:00:00.000Z'
		const updated = '2024-06-01T11:00:00.000Z'
		const result = PrdDocumentSchema.parse({
			id: '550e8400-e29b-41d4-a716-446655440000',
			sessionId: '550e8400-e29b-41d4-a716-446655440001',
			type: 'prd_full',
			title: 'PRD Document',
			content: 'PRD content',
			version: 1,
			createdAt: created,
			updatedAt: updated,
		})
		expect(result.createdAt).toBeInstanceOf(Date)
		expect(result.updatedAt).toBeInstanceOf(Date)
	})

	test('PrdSessionSchema coerces all date fields', () => {
		const now = '2024-06-01T09:00:00.000Z'
		const result = PrdSessionSchema.parse({
			id: '550e8400-e29b-41d4-a716-446655440000',
			userId: '550e8400-e29b-41d4-a716-446655440001',
			projectName: 'Test PRD',
			inputDocuments: [],
			differentiators: [],
			successCriteria: [],
			personas: [],
			userJourneys: [],
			domainConcerns: [],
			regulatoryRequirements: [],
			domainExpertise: [],
			skipDomainStep: false,
			innovations: [],
			skipInnovationStep: false,
			projectTypeDetails: {},
			projectTypeQuestions: {},
			features: [],
			outOfScope: [],
			mvpSuccessCriteria: [],
			functionalRequirements: [],
			nonFunctionalRequirements: [],
			currentStep: 'init',
			status: 'active',
			stepsCompleted: [],
			generationStatus: 'idle',
			generationStartedAt: now,
			completedAt: now,
			createdAt: now,
			updatedAt: now,
		})
		expect(result.generationStartedAt).toBeInstanceOf(Date)
		expect(result.completedAt).toBeInstanceOf(Date)
		expect(result.createdAt).toBeInstanceOf(Date)
		expect(result.updatedAt).toBeInstanceOf(Date)
	})
})

// ============================================
// BRAINSTORM: Date coercion
// ============================================

describe('Brainstorm date coercion', () => {
	test('BrainstormIdeaSchema coerces createdAt from ISO string', () => {
		const isoString = '2024-06-01T12:00:00.000Z'
		const result = BrainstormIdeaSchema.parse({
			id: '550e8400-e29b-41d4-a716-446655440000',
			content: 'Great idea',
			technique: 'scamper',
			createdAt: isoString,
		})
		expect(result.createdAt).toBeInstanceOf(Date)
		expect(result.createdAt.toISOString()).toBe(isoString)
	})

	test('BrainstormIdeaSchema accepts Date object', () => {
		const now = new Date()
		const result = BrainstormIdeaSchema.parse({
			id: '550e8400-e29b-41d4-a716-446655440000',
			content: 'Another idea',
			technique: 'what_if',
			createdAt: now,
		})
		expect(result.createdAt).toEqual(now)
	})

	test('BrainstormMessageSchema coerces createdAt', () => {
		const isoString = '2024-06-01T12:00:00.000Z'
		const result = BrainstormMessageSchema.parse({
			id: '550e8400-e29b-41d4-a716-446655440000',
			sessionId: '550e8400-e29b-41d4-a716-446655440001',
			role: 'user',
			content: 'Hello',
			step: 'setup',
			createdAt: isoString,
		})
		expect(result.createdAt).toBeInstanceOf(Date)
	})

	test('BrainstormSessionSchema coerces completedAt and timestamps', () => {
		const now = '2024-06-01T12:00:00.000Z'
		const completed = '2024-06-01T14:00:00.000Z'
		const result = BrainstormSessionSchema.parse({
			id: '550e8400-e29b-41d4-a716-446655440000',
			userId: '550e8400-e29b-41d4-a716-446655440001',
			projectName: 'Brainstorm Session',
			approach: 'ai_recommended',
			currentStep: 'setup',
			status: 'active',
			selectedTechniques: ['scamper'],
			currentTechniqueIndex: 0,
			ideas: [],
			completedAt: completed,
			createdAt: now,
			updatedAt: now,
		})
		expect(result.completedAt).toBeInstanceOf(Date)
		expect(result.completedAt?.toISOString()).toBe(completed)
		expect(result.createdAt).toBeInstanceOf(Date)
	})
})

// ============================================
// SM: Date coercion
// ============================================

describe('SM date coercion', () => {
	test('SmSprintConfigSchema keeps startDate as string', () => {
		const dateStr = '2024-06-01'
		const result = SmSprintConfigSchema.parse({
			sprintDuration: 14,
			startDate: dateStr,
		})
		expect(result.startDate).toBe(dateStr)
	})

	test('SmSprintConfigSchema allows omitting startDate', () => {
		const result = SmSprintConfigSchema.parse({
			sprintDuration: 14,
		})
		expect(result.startDate).toBeUndefined()
	})

	test('SmEpicSchema coerces timestamps from ISO strings', () => {
		const created = '2024-06-01T10:00:00.000Z'
		const updated = '2024-06-01T11:00:00.000Z'
		const result = SmEpicSchema.parse({
			id: '550e8400-e29b-41d4-a716-446655440000',
			sessionId: '550e8400-e29b-41d4-a716-446655440001',
			number: 1,
			title: 'Epic 1',
			description: 'First epic',
			featureIds: [],
			functionalRequirementCodes: [],
			status: 'backlog',
			priority: 'high',
			createdAt: created,
			updatedAt: updated,
		})
		expect(result.createdAt).toBeInstanceOf(Date)
		expect(result.updatedAt).toBeInstanceOf(Date)
		expect(result.createdAt.toISOString()).toBe(created)
	})

	test('SmStorySchema coerces timestamps from ISO strings', () => {
		const created = '2024-06-01T10:00:00.000Z'
		const updated = '2024-06-01T11:00:00.000Z'
		const result = SmStorySchema.parse({
			id: '550e8400-e29b-41d4-a716-446655440000',
			sessionId: '550e8400-e29b-41d4-a716-446655440001',
			epicId: '550e8400-e29b-41d4-a716-446655440002',
			epicNumber: 1,
			storyNumber: 1,
			storyKey: 'E1-S1',
			title: 'Story 1',
			asA: 'user',
			iWant: 'to login',
			soThat: 'I can access the app',
			acceptanceCriteria: [],
			tasks: [],
			devNotes: {},
			status: 'backlog',
			priority: 'high',
			functionalRequirementCodes: [],
			createdAt: created,
			updatedAt: updated,
		})
		expect(result.createdAt).toBeInstanceOf(Date)
		expect(result.updatedAt).toBeInstanceOf(Date)
	})

	test('SmMessageSchema coerces createdAt', () => {
		const isoString = '2024-06-01T12:00:00.000Z'
		const result = SmMessageSchema.parse({
			id: '550e8400-e29b-41d4-a716-446655440000',
			sessionId: '550e8400-e29b-41d4-a716-446655440001',
			role: 'user',
			content: 'Hello',
			step: 'init',
			createdAt: isoString,
		})
		expect(result.createdAt).toBeInstanceOf(Date)
	})

	test('SmDocumentSchema coerces timestamps', () => {
		const created = '2024-06-01T10:00:00.000Z'
		const updated = '2024-06-01T11:00:00.000Z'
		const result = SmDocumentSchema.parse({
			id: '550e8400-e29b-41d4-a716-446655440000',
			sessionId: '550e8400-e29b-41d4-a716-446655440001',
			type: 'sprint_backlog',
			title: 'Sprint Backlog',
			content: 'Content here',
			version: 1,
			createdAt: created,
			updatedAt: updated,
		})
		expect(result.createdAt).toBeInstanceOf(Date)
		expect(result.updatedAt).toBeInstanceOf(Date)
	})

	test('SmSessionSchema coerces all date fields', () => {
		const now = '2024-06-01T09:00:00.000Z'
		const genStarted = '2024-06-01T10:00:00.000Z'
		const completed = '2024-06-01T11:00:00.000Z'
		const result = SmSessionSchema.parse({
			id: '550e8400-e29b-41d4-a716-446655440000',
			userId: '550e8400-e29b-41d4-a716-446655440001',
			projectName: 'Test SM',
			prdContext: {},
			sprintConfig: { sprintDuration: 14 },
			currentStep: 'init',
			status: 'active',
			stepsCompleted: [],
			generationStatus: 'idle',
			generationStartedAt: genStarted,
			totalEpics: 0,
			totalStories: 0,
			totalStoryPoints: 0,
			completedAt: completed,
			createdAt: now,
			updatedAt: now,
		})
		expect(result.generationStartedAt).toBeInstanceOf(Date)
		expect(result.completedAt).toBeInstanceOf(Date)
		expect(result.createdAt).toBeInstanceOf(Date)
		expect(result.updatedAt).toBeInstanceOf(Date)
	})
})

// ============================================
// Cross-cutting: Edge cases
// ============================================

describe('Date coercion edge cases', () => {
	test('rejects completely invalid date strings', () => {
		expect(() =>
			TimestampsSchema.parse({ createdAt: 'not-a-date', updatedAt: 'also-not-a-date' })
		).toThrow()
	})

	test('coerces date-only strings (YYYY-MM-DD)', () => {
		const dateStr = '2024-06-01'
		const result = TimestampsSchema.parse({ createdAt: dateStr, updatedAt: dateStr })
		expect(result.createdAt).toBeInstanceOf(Date)
		expect(result.createdAt.getFullYear()).toBe(2024)
		expect(result.createdAt.getMonth()).toBe(5) // June is 5 (0-indexed)
		expect(result.createdAt.getDate()).toBe(1)
	})

	test('coerces ISO strings with timezone offset', () => {
		const isoWithTz = '2024-06-01T12:00:00+03:00'
		const result = TimestampsSchema.parse({ createdAt: isoWithTz, updatedAt: isoWithTz })
		expect(result.createdAt).toBeInstanceOf(Date)
		// +03:00 offset means UTC time is 09:00
		expect(result.createdAt.getUTCHours()).toBe(9)
	})

	test('handles null for optional nullable date fields', () => {
		const result = BrainstormSessionSchema.parse({
			id: '550e8400-e29b-41d4-a716-446655440000',
			userId: '550e8400-e29b-41d4-a716-446655440001',
			projectName: 'Test',
			approach: 'ai_recommended',
			currentStep: 'setup',
			status: 'active',
			selectedTechniques: ['scamper'],
			currentTechniqueIndex: 0,
			ideas: [],
			completedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		})
		expect(result.completedAt).toBeNull()
	})

	test('handles undefined for optional date fields', () => {
		const result = SmSprintConfigSchema.parse({
			sprintDuration: 14,
		})
		expect(result.startDate).toBeUndefined()
	})
})
