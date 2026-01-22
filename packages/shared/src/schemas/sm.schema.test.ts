import { describe, expect, test } from 'bun:test'
import {
	SmAcceptanceCriteriaSchema,
	SmExtractedAcceptanceCriteriaSchema,
	SmSprintConfigSchema,
	SmStoryPrioritySchema,
} from './sm.schema.js'

describe('SmAcceptanceCriteriaSchema', () => {
	test('validates simple acceptance criteria', () => {
		const ac = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			description: 'User can log in',
			type: 'simple' as const,
		}
		const result = SmAcceptanceCriteriaSchema.parse(ac)
		expect(result.type).toBe('simple')
		expect(result.description).toBe('User can log in')
	})

	test('validates given_when_then acceptance criteria with thenClause', () => {
		const ac = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			description: 'Login flow',
			type: 'given_when_then' as const,
			given: 'a registered user',
			when: 'they enter valid credentials',
			thenClause: 'they are redirected to the dashboard',
		}
		const result = SmAcceptanceCriteriaSchema.parse(ac)
		expect(result.thenClause).toBe('they are redirected to the dashboard')
		expect(result.given).toBe('a registered user')
		expect(result.when).toBe('they enter valid credentials')
	})

	test('thenClause is optional', () => {
		const ac = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			description: 'Basic criteria',
			type: 'given_when_then' as const,
			given: 'a user',
			when: 'they click submit',
		}
		const result = SmAcceptanceCriteriaSchema.parse(ac)
		expect(result.thenClause).toBeUndefined()
	})

	test('rejects unknown type', () => {
		const ac = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			description: 'Test',
			type: 'unknown',
		}
		expect(() => SmAcceptanceCriteriaSchema.parse(ac)).toThrow()
	})

	test('rejects empty description', () => {
		const ac = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			description: '',
			type: 'simple' as const,
		}
		expect(() => SmAcceptanceCriteriaSchema.parse(ac)).toThrow()
	})
})

describe('SmExtractedAcceptanceCriteriaSchema', () => {
	test('uses then (not thenClause) for AI-extracted data', () => {
		const extracted = {
			description: 'Login flow',
			type: 'given_when_then' as const,
			given: 'a user',
			when: 'they login',
			// biome-ignore lint/suspicious/noThenProperty: Testing Given-When-Then AC format, not a Promise
			then: 'they see dashboard',
		}
		const result = SmExtractedAcceptanceCriteriaSchema.parse(extracted)
		expect(result.then).toBe('they see dashboard')
	})

	test('then is optional in extracted data', () => {
		const extracted = {
			description: 'Simple criteria',
		}
		const result = SmExtractedAcceptanceCriteriaSchema.parse(extracted)
		expect(result.then).toBeUndefined()
	})
})

describe('SmSprintConfigSchema', () => {
	test('validates basic sprint config', () => {
		const config = { sprintDuration: 14 }
		const result = SmSprintConfigSchema.parse(config)
		expect(result.sprintDuration).toBe(14)
	})

	test('rejects duration below 1', () => {
		expect(() => SmSprintConfigSchema.parse({ sprintDuration: 0 })).toThrow()
	})

	test('rejects duration above 30', () => {
		expect(() => SmSprintConfigSchema.parse({ sprintDuration: 31 })).toThrow()
	})

	test('validates optional fields', () => {
		const config = {
			sprintDuration: 14,
			velocityEstimate: 40,
			startDate: '2025-01-01',
			teamSize: 5,
		}
		const result = SmSprintConfigSchema.parse(config)
		expect(result.velocityEstimate).toBe(40)
		expect(result.teamSize).toBe(5)
	})
})

describe('SmStoryPrioritySchema', () => {
	test('accepts valid priorities', () => {
		expect(SmStoryPrioritySchema.parse('critical')).toBe('critical')
		expect(SmStoryPrioritySchema.parse('high')).toBe('high')
		expect(SmStoryPrioritySchema.parse('medium')).toBe('medium')
		expect(SmStoryPrioritySchema.parse('low')).toBe('low')
	})

	test('rejects invalid priority', () => {
		expect(() => SmStoryPrioritySchema.parse('urgent')).toThrow()
	})
})
