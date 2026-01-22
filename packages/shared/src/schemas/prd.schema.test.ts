import { describe, expect, test } from 'bun:test'
import {
	CreatePrdSessionSchema,
	PrdDomainComplexitySchema,
	PrdProjectTypeSchema,
	PrdSessionSchema,
	PrdStepSchema,
	UpdatePrdSessionSchema,
} from './prd.schema.js'

describe('PrdStepSchema', () => {
	test('accepts valid steps', () => {
		expect(PrdStepSchema.parse('init')).toBe('init')
		expect(PrdStepSchema.parse('discovery')).toBe('discovery')
		expect(PrdStepSchema.parse('complete')).toBe('complete')
	})

	test('rejects invalid step', () => {
		expect(() => PrdStepSchema.parse('invalid')).toThrow()
	})
})

describe('PrdProjectTypeSchema', () => {
	test('accepts all project types', () => {
		const types = [
			'api_backend',
			'mobile_app',
			'saas_b2b',
			'developer_tool',
			'cli_tool',
			'web_app',
			'game',
			'desktop_app',
			'iot_embedded',
			'blockchain_web3',
			'custom',
		]
		for (const type of types) {
			expect(PrdProjectTypeSchema.parse(type)).toBe(type)
		}
	})
})

describe('PrdSessionSchema - boolean skip fields', () => {
	const baseSession = {
		id: '550e8400-e29b-41d4-a716-446655440000',
		userId: '550e8400-e29b-41d4-a716-446655440001',
		projectName: 'Test Project',
		projectDescription: null,
		inputDocuments: [],
		projectType: null,
		domain: null,
		domainComplexity: null,
		executiveSummary: null,
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
		currentStep: 'init' as const,
		status: 'active' as const,
		stepsCompleted: [],
		generationStatus: 'idle' as const,
		generationStartedAt: null,
		generationError: null,
		documentContent: null,
		documentTitle: null,
		completedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	}

	test('skipDomainStep accepts boolean false', () => {
		const result = PrdSessionSchema.parse(baseSession)
		expect(result.skipDomainStep).toBe(false)
	})

	test('skipDomainStep accepts boolean true', () => {
		const session = { ...baseSession, skipDomainStep: true }
		const result = PrdSessionSchema.parse(session)
		expect(result.skipDomainStep).toBe(true)
	})

	test('skipInnovationStep accepts boolean false', () => {
		const result = PrdSessionSchema.parse(baseSession)
		expect(result.skipInnovationStep).toBe(false)
	})

	test('skipInnovationStep accepts boolean true', () => {
		const session = { ...baseSession, skipInnovationStep: true }
		const result = PrdSessionSchema.parse(session)
		expect(result.skipInnovationStep).toBe(true)
	})

	test('rejects non-boolean skipDomainStep', () => {
		const session = { ...baseSession, skipDomainStep: 'true' }
		expect(() => PrdSessionSchema.parse(session)).toThrow()
	})

	test('rejects non-boolean skipInnovationStep', () => {
		const session = { ...baseSession, skipInnovationStep: 'false' }
		expect(() => PrdSessionSchema.parse(session)).toThrow()
	})
})

describe('UpdatePrdSessionSchema - boolean skip fields', () => {
	test('skipDomainStep accepts boolean in updates', () => {
		const result = UpdatePrdSessionSchema.parse({ skipDomainStep: true })
		expect(result.skipDomainStep).toBe(true)
	})

	test('skipInnovationStep accepts boolean in updates', () => {
		const result = UpdatePrdSessionSchema.parse({ skipInnovationStep: false })
		expect(result.skipInnovationStep).toBe(false)
	})

	test('skip fields are optional in updates', () => {
		const result = UpdatePrdSessionSchema.parse({})
		expect(result.skipDomainStep).toBeUndefined()
		expect(result.skipInnovationStep).toBeUndefined()
	})
})

describe('CreatePrdSessionSchema', () => {
	test('validates minimal create data', () => {
		const result = CreatePrdSessionSchema.parse({ projectName: 'Test' })
		expect(result.projectName).toBe('Test')
	})

	test('accepts optional briefingSessionId', () => {
		const result = CreatePrdSessionSchema.parse({
			projectName: 'Test',
			briefingSessionId: '550e8400-e29b-41d4-a716-446655440000',
		})
		expect(result.briefingSessionId).toBe('550e8400-e29b-41d4-a716-446655440000')
	})

	test('rejects empty projectName', () => {
		expect(() => CreatePrdSessionSchema.parse({ projectName: '' })).toThrow()
	})

	test('rejects projectName over 200 chars', () => {
		expect(() => CreatePrdSessionSchema.parse({ projectName: 'a'.repeat(201) })).toThrow()
	})
})

describe('PrdDomainComplexitySchema', () => {
	test('accepts valid complexities', () => {
		expect(PrdDomainComplexitySchema.parse('low')).toBe('low')
		expect(PrdDomainComplexitySchema.parse('medium')).toBe('medium')
		expect(PrdDomainComplexitySchema.parse('high')).toBe('high')
	})

	test('rejects invalid complexity', () => {
		expect(() => PrdDomainComplexitySchema.parse('very_high')).toThrow()
	})
})
