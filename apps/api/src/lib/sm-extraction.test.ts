import { describe, expect, it } from 'bun:test'
import {
	cleanResponseForDisplay,
	extractSmDataFromResponse,
	SM_DATA_END_MARKER,
	SM_DATA_START_MARKER,
	transformAcceptanceCriteria,
	transformDevNotes,
	transformEpicForInsert,
	transformStoryForInsert,
	transformTasks,
} from './sm-extraction.js'

// ============================================
// EXTRACTION FUNCTIONS
// ============================================

describe('extractSmDataFromResponse', () => {
	it('should extract valid JSON data from response', () => {
		const data = {
			epics: [{ number: 1, title: 'Epic 1', description: 'Desc' }],
			action: 'create',
		}
		const response = `Here is your epic:\n${SM_DATA_START_MARKER}\n${JSON.stringify(data)}\n${SM_DATA_END_MARKER}\nDone!`

		const result = extractSmDataFromResponse(response)

		expect(result).not.toBeNull()
		expect(result?.action).toBe('create')
		expect(result?.epics).toHaveLength(1)
		const epic = result?.epics?.[0]
		expect(epic?.title).toBe('Epic 1')
	})

	it('should return null when no markers present', () => {
		const response = 'Just a regular response with no structured data.'

		const result = extractSmDataFromResponse(response)

		expect(result).toBeNull()
	})

	it('should return null for invalid JSON', () => {
		const response = `${SM_DATA_START_MARKER}\n{invalid json}\n${SM_DATA_END_MARKER}`

		const result = extractSmDataFromResponse(response)

		expect(result).toBeNull()
	})

	it('should return null for JSON that fails schema validation', () => {
		const invalidData = { epics: [{ title: 'Missing number field' }], action: 'create' }
		const response = `${SM_DATA_START_MARKER}\n${JSON.stringify(invalidData)}\n${SM_DATA_END_MARKER}`

		const result = extractSmDataFromResponse(response)

		expect(result).toBeNull()
	})

	it('should handle stories with all optional fields', () => {
		const data = {
			stories: [
				{
					epicNumber: 1,
					storyNumber: 1,
					title: 'Login',
					asA: 'user',
					iWant: 'to login',
					soThat: 'I can access the app',
					description: 'Full login flow',
					storyPoints: 5,
					priority: 'high',
					targetSprint: 2,
					functionalRequirementCodes: ['FR-001', 'FR-002'],
					acceptanceCriteria: [
						{ description: 'Valid credentials', type: 'simple' },
						{
							description: 'GWT',
							type: 'given_when_then',
							given: 'valid user',
							when: 'submits form',
							// biome-ignore lint/suspicious/noThenProperty: Given-When-Then acceptance criteria, not a Promise
							then: 'logs in',
						},
					],
					tasks: [{ description: 'Implement form', estimatedHours: 4 }],
					devNotes: {
						architecturePatterns: ['MVC'],
						componentsToTouch: ['LoginForm'],
						testingRequirements: ['Unit tests'],
						securityConsiderations: ['XSS prevention'],
						performanceNotes: ['Cache tokens'],
						references: ['RFC 6749'],
					},
				},
			],
			action: 'create',
		}
		const response = `${SM_DATA_START_MARKER}\n${JSON.stringify(data)}\n${SM_DATA_END_MARKER}`

		const result = extractSmDataFromResponse(response)

		expect(result).not.toBeNull()
		const story = result?.stories?.[0]
		expect(story?.description).toBe('Full login flow')
		expect(story?.targetSprint).toBe(2)
		expect(story?.functionalRequirementCodes).toEqual(['FR-001', 'FR-002'])
	})

	it('should handle epics with targetSprint and estimatedStoryPoints', () => {
		const data = {
			epics: [
				{
					number: 1,
					title: 'Auth',
					description: 'Authentication epic',
					businessValue: 'Core security',
					priority: 'critical',
					functionalRequirementCodes: ['FR-001'],
					targetSprint: 1,
					estimatedStoryPoints: 21,
				},
			],
			action: 'create',
		}
		const response = `${SM_DATA_START_MARKER}\n${JSON.stringify(data)}\n${SM_DATA_END_MARKER}`

		const result = extractSmDataFromResponse(response)

		expect(result).not.toBeNull()
		const epic = result?.epics?.[0]
		expect(epic?.targetSprint).toBe(1)
		expect(epic?.estimatedStoryPoints).toBe(21)
	})
})

describe('cleanResponseForDisplay', () => {
	it('should remove data block from response', () => {
		const response = `Here is your epic.\n${SM_DATA_START_MARKER}\n{"action":"create"}\n${SM_DATA_END_MARKER}\nAll done!`

		const result = cleanResponseForDisplay(response)

		expect(result).toBe('Here is your epic.\n\nAll done!')
	})

	it('should remove multiple data blocks', () => {
		const response = `First\n${SM_DATA_START_MARKER}\n{}\n${SM_DATA_END_MARKER}\nMiddle\n${SM_DATA_START_MARKER}\n{}\n${SM_DATA_END_MARKER}\nLast`

		const result = cleanResponseForDisplay(response)

		expect(result).toBe('First\n\nMiddle\n\nLast')
	})

	it('should return original if no data block present', () => {
		const response = 'Just a regular response.'

		const result = cleanResponseForDisplay(response)

		expect(result).toBe('Just a regular response.')
	})
})

// ============================================
// TRANSFORMATION FUNCTIONS
// ============================================

describe('transformAcceptanceCriteria', () => {
	it('should return empty array for undefined input', () => {
		expect(transformAcceptanceCriteria(undefined)).toEqual([])
	})

	it('should return empty array for empty array input', () => {
		expect(transformAcceptanceCriteria([])).toEqual([])
	})

	it('should transform simple criteria with generated UUID', () => {
		const criteria = [{ description: 'User can login' }]

		const result = transformAcceptanceCriteria(criteria)

		expect(result).toHaveLength(1)
		const [first] = result
		expect(first?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
		expect(first?.description).toBe('User can login')
		expect(first?.type).toBe('simple')
	})

	it('should transform given_when_then criteria', () => {
		const criteria = [
			{
				description: 'Login flow',
				type: 'given_when_then' as const,
				given: 'a registered user',
				when: 'they submit credentials',
				// biome-ignore lint/suspicious/noThenProperty: Given-When-Then acceptance criteria, not a Promise
				then: 'they are authenticated',
			},
		]

		const result = transformAcceptanceCriteria(criteria)

		expect(result).toHaveLength(1)
		const [first] = result
		expect(first?.type).toBe('given_when_then')
		expect(first?.given).toBe('a registered user')
		expect(first?.when).toBe('they submit credentials')
		expect(first?.then).toBe('they are authenticated')
	})

	it('should generate unique UUIDs for each criterion', () => {
		const criteria = [{ description: 'First' }, { description: 'Second' }]

		const result = transformAcceptanceCriteria(criteria)

		const [first, second] = result
		expect(first?.id).not.toBe(second?.id)
	})
})

describe('transformTasks', () => {
	it('should return empty array for undefined input', () => {
		expect(transformTasks(undefined)).toEqual([])
	})

	it('should return empty array for empty array input', () => {
		expect(transformTasks([])).toEqual([])
	})

	it('should transform tasks with generated UUID and completed=false', () => {
		const tasks = [{ description: 'Implement login form' }]

		const result = transformTasks(tasks)

		expect(result).toHaveLength(1)
		const [first] = result
		expect(first?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
		expect(first?.description).toBe('Implement login form')
		expect(first?.completed).toBe(false)
	})

	it('should preserve estimatedHours', () => {
		const tasks = [{ description: 'Task', estimatedHours: 8 }]

		const result = transformTasks(tasks)

		const [first] = result
		expect(first?.estimatedHours).toBe(8)
	})

	it('should leave estimatedHours undefined when not provided', () => {
		const tasks = [{ description: 'Task' }]

		const result = transformTasks(tasks)

		const [first] = result
		expect(first?.estimatedHours).toBeUndefined()
	})
})

describe('transformDevNotes', () => {
	it('should return empty object for undefined input', () => {
		expect(transformDevNotes(undefined)).toEqual({})
	})

	it('should pass through all fields', () => {
		const devNotes = {
			architecturePatterns: ['MVC', 'Repository'],
			componentsToTouch: ['AuthService', 'UserController'],
			testingRequirements: ['Integration tests'],
			securityConsiderations: ['XSS prevention'],
			performanceNotes: ['Use connection pooling'],
			references: ['RFC 6749'],
		}

		const result = transformDevNotes(devNotes)

		expect(result).toEqual(devNotes)
	})

	it('should handle partial dev notes', () => {
		const devNotes = {
			architecturePatterns: ['MVC'],
		}

		const result = transformDevNotes(devNotes)

		expect(result.architecturePatterns).toEqual(['MVC'])
		expect(result.componentsToTouch).toBeUndefined()
		expect(result.testingRequirements).toBeUndefined()
	})
})

describe('transformEpicForInsert', () => {
	const sessionId = '550e8400-e29b-41d4-a716-446655440000'

	it('should transform epic with required fields and defaults', () => {
		const epic = {
			number: 1,
			title: 'Authentication',
			description: 'User authentication epic',
		}

		const result = transformEpicForInsert(epic, sessionId)

		expect(result.sessionId).toBe(sessionId)
		expect(result.number).toBe(1)
		expect(result.title).toBe('Authentication')
		expect(result.description).toBe('User authentication epic')
		expect(result.priority).toBe('medium')
		expect(result.status).toBe('backlog')
		expect(result.functionalRequirementCodes).toEqual([])
		expect(result.featureIds).toEqual([])
		expect(result.targetSprint).toBeUndefined()
		expect(result.estimatedStoryPoints).toBeUndefined()
	})

	it('should preserve optional fields', () => {
		const epic = {
			number: 2,
			title: 'Payments',
			description: 'Payment processing',
			businessValue: 'Revenue generation',
			priority: 'critical' as const,
			functionalRequirementCodes: ['FR-010', 'FR-011'],
			targetSprint: 3,
			estimatedStoryPoints: 34,
		}

		const result = transformEpicForInsert(epic, sessionId)

		expect(result.businessValue).toBe('Revenue generation')
		expect(result.priority).toBe('critical')
		expect(result.functionalRequirementCodes).toEqual(['FR-010', 'FR-011'])
		expect(result.targetSprint).toBe(3)
		expect(result.estimatedStoryPoints).toBe(34)
	})

	it('should default priority to medium when not provided', () => {
		const epic = { number: 1, title: 'Test', description: 'Test' }

		const result = transformEpicForInsert(epic, sessionId)

		expect(result.priority).toBe('medium')
	})
})

describe('transformStoryForInsert', () => {
	const sessionId = '550e8400-e29b-41d4-a716-446655440000'
	const epicId = '660e8400-e29b-41d4-a716-446655440001'

	it('should transform story with required fields and defaults', () => {
		const story = {
			epicNumber: 1,
			storyNumber: 1,
			title: 'User Login',
			asA: 'registered user',
			iWant: 'to log into the system',
			soThat: 'I can access my dashboard',
		}

		const result = transformStoryForInsert(story, sessionId, epicId)

		expect(result.sessionId).toBe(sessionId)
		expect(result.epicId).toBe(epicId)
		expect(result.epicNumber).toBe(1)
		expect(result.storyNumber).toBe(1)
		expect(result.storyKey).toBe('1-1')
		expect(result.title).toBe('User Login')
		expect(result.asA).toBe('registered user')
		expect(result.iWant).toBe('to log into the system')
		expect(result.soThat).toBe('I can access my dashboard')
		expect(result.description).toBeUndefined()
		expect(result.acceptanceCriteria).toEqual([])
		expect(result.tasks).toEqual([])
		expect(result.devNotes).toEqual({})
		expect(result.priority).toBe('medium')
		expect(result.status).toBe('backlog')
		expect(result.targetSprint).toBeUndefined()
		expect(result.functionalRequirementCodes).toEqual([])
	})

	it('should generate correct storyKey from epic and story numbers', () => {
		const story = {
			epicNumber: 3,
			storyNumber: 5,
			title: 'Test',
			asA: 'user',
			iWant: 'something',
			soThat: 'benefit',
		}

		const result = transformStoryForInsert(story, sessionId, epicId)

		expect(result.storyKey).toBe('3-5')
	})

	it('should preserve all optional fields', () => {
		const story = {
			epicNumber: 1,
			storyNumber: 2,
			title: 'Password Reset',
			asA: 'user',
			iWant: 'to reset my password',
			soThat: 'I can regain access',
			description: 'Full password reset flow with email verification',
			storyPoints: 8,
			priority: 'high' as const,
			targetSprint: 2,
			functionalRequirementCodes: ['FR-003', 'FR-004'],
			acceptanceCriteria: [{ description: 'Email sent', type: 'simple' as const }],
			tasks: [{ description: 'Build reset form', estimatedHours: 3 }],
			devNotes: {
				securityConsiderations: ['Token expiry'],
			},
		}

		const result = transformStoryForInsert(story, sessionId, epicId)

		expect(result.description).toBe('Full password reset flow with email verification')
		expect(result.storyPoints).toBe(8)
		expect(result.priority).toBe('high')
		expect(result.targetSprint).toBe(2)
		expect(result.functionalRequirementCodes).toEqual(['FR-003', 'FR-004'])
		expect(result.acceptanceCriteria).toHaveLength(1)
		expect(result.tasks).toHaveLength(1)
		expect(result.devNotes.securityConsiderations).toEqual(['Token expiry'])
	})

	it('should default functionalRequirementCodes to empty array when not provided', () => {
		const story = {
			epicNumber: 1,
			storyNumber: 1,
			title: 'Test',
			asA: 'user',
			iWant: 'something',
			soThat: 'benefit',
		}

		const result = transformStoryForInsert(story, sessionId, epicId)

		expect(result.functionalRequirementCodes).toEqual([])
	})

	it('should transform nested acceptance criteria and tasks', () => {
		const story = {
			epicNumber: 1,
			storyNumber: 1,
			title: 'Test',
			asA: 'user',
			iWant: 'something',
			soThat: 'benefit',
			acceptanceCriteria: [
				{
					description: 'GWT test',
					type: 'given_when_then' as const,
					given: 'precondition',
					when: 'action',
					// biome-ignore lint/suspicious/noThenProperty: Given-When-Then acceptance criteria, not a Promise
					then: 'expected',
				},
			],
			tasks: [{ description: 'Task 1', estimatedHours: 2 }, { description: 'Task 2' }],
		}

		const result = transformStoryForInsert(story, sessionId, epicId)

		expect(result.acceptanceCriteria).toHaveLength(1)
		const [firstAc] = result.acceptanceCriteria
		expect(firstAc?.type).toBe('given_when_then')
		expect(firstAc?.given).toBe('precondition')
		expect(result.tasks).toHaveLength(2)
		const [firstTask, secondTask] = result.tasks
		expect(firstTask?.completed).toBe(false)
		expect(firstTask?.estimatedHours).toBe(2)
		expect(secondTask?.estimatedHours).toBeUndefined()
	})
})
