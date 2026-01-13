import {
	type SmExtractedAcceptanceCriteria,
	type SmExtractedData,
	SmExtractedDataSchema,
	type SmExtractedEpic,
	type SmExtractedStory,
	type SmExtractedTask,
} from '@repo/shared'

// Use native crypto.randomUUID() for generating UUIDs
const generateUUID = (): string => crypto.randomUUID()

// ============================================
// EXTRACTION PATTERNS
// ============================================

/**
 * Markers for the structured data block in AI responses
 */
export const SM_DATA_START_MARKER = '---SM_DATA_START---'
export const SM_DATA_END_MARKER = '---SM_DATA_END---'

/**
 * Pattern to match the structured data block in AI responses
 * Format:
 * ---SM_DATA_START---
 * { JSON content }
 * ---SM_DATA_END---
 */
// Pattern for extraction (captures JSON content)
const SM_DATA_EXTRACT_PATTERN = /---SM_DATA_START---\s*([\s\S]*?)\s*---SM_DATA_END---/
// Pattern for cleaning (removes all occurrences)
const SM_DATA_CLEAN_PATTERN = /---SM_DATA_START---[\s\S]*?---SM_DATA_END---/g

// ============================================
// EXTRACTION FUNCTIONS
// ============================================

/**
 * Extracts structured epic/story data from an AI response
 *
 * @param response - The full AI response text
 * @returns Parsed and validated data, or null if no valid data found
 */
export function extractSmDataFromResponse(response: string): SmExtractedData | null {
	const match = response.match(SM_DATA_EXTRACT_PATTERN)
	if (!match?.[1]) {
		return null
	}

	try {
		const rawJson = match[1].trim()
		const parsed = JSON.parse(rawJson)

		// Validate with Zod schema
		const result = SmExtractedDataSchema.safeParse(parsed)
		if (!result.success) {
			console.error('[SM Extraction] Validation failed:', result.error.issues)
			return null
		}

		return result.data
	} catch (error) {
		console.error('[SM Extraction] Failed to parse JSON:', error)
		return null
	}
}

/**
 * Removes the structured data block from the response
 * so only the natural language text is shown to the user
 *
 * @param response - The full AI response text
 * @returns The response with SM_DATA block removed
 */
export function cleanResponseForDisplay(response: string): string {
	return response.replace(SM_DATA_CLEAN_PATTERN, '').trim()
}

// ============================================
// DATA TRANSFORMATION HELPERS
// ============================================

/**
 * Transforms extracted acceptance criteria to database format
 */
export function transformAcceptanceCriteria(
	criteria: SmExtractedAcceptanceCriteria[] | undefined
): Array<{
	id: string
	description: string
	type: 'simple' | 'given_when_then'
	given?: string
	when?: string
	thenClause?: string
}> {
	if (!criteria || criteria.length === 0) {
		return []
	}

	return criteria.map((ac) => ({
		id: generateUUID(),
		description: ac.description,
		type: ac.type ?? 'simple',
		given: ac.given,
		when: ac.when,
		thenClause: ac.then,
	}))
}

/**
 * Transforms extracted tasks to database format
 */
export function transformTasks(tasks: SmExtractedTask[] | undefined): Array<{
	id: string
	description: string
	estimatedHours?: number
	acceptanceCriteriaIds?: string[]
	completed: boolean
}> {
	if (!tasks || tasks.length === 0) {
		return []
	}

	return tasks.map((task) => ({
		id: generateUUID(),
		description: task.description,
		estimatedHours: task.estimatedHours,
		completed: false,
	}))
}

/**
 * Transforms extracted dev notes to database format
 */
export function transformDevNotes(devNotes: SmExtractedStory['devNotes']): {
	architecturePatterns?: string[]
	componentsToTouch?: string[]
	testingRequirements?: string[]
	securityConsiderations?: string[]
	performanceNotes?: string[]
	references?: string[]
} {
	if (!devNotes) {
		return {}
	}

	return {
		architecturePatterns: devNotes.architecturePatterns,
		componentsToTouch: devNotes.componentsToTouch,
		testingRequirements: devNotes.testingRequirements,
		securityConsiderations: devNotes.securityConsiderations,
		performanceNotes: devNotes.performanceNotes,
		references: devNotes.references,
	}
}

/**
 * Transforms extracted epic to database insert format
 */
export function transformEpicForInsert(
	epic: SmExtractedEpic,
	sessionId: string
): {
	sessionId: string
	number: number
	title: string
	description: string
	businessValue?: string
	priority: 'critical' | 'high' | 'medium' | 'low'
	functionalRequirementCodes: string[]
	featureIds: string[]
	status: 'backlog' | 'in_progress' | 'done'
} {
	return {
		sessionId,
		number: epic.number,
		title: epic.title,
		description: epic.description,
		businessValue: epic.businessValue,
		priority: epic.priority ?? 'medium',
		functionalRequirementCodes: epic.functionalRequirementCodes ?? [],
		featureIds: [],
		status: 'backlog',
	}
}

/**
 * Transforms extracted story to database insert format
 */
export function transformStoryForInsert(
	story: SmExtractedStory,
	sessionId: string,
	epicId: string
): {
	sessionId: string
	epicId: string
	epicNumber: number
	storyNumber: number
	storyKey: string
	title: string
	asA: string
	iWant: string
	soThat: string
	acceptanceCriteria: ReturnType<typeof transformAcceptanceCriteria>
	tasks: ReturnType<typeof transformTasks>
	devNotes: ReturnType<typeof transformDevNotes>
	storyPoints?: number
	priority: 'critical' | 'high' | 'medium' | 'low'
	status: 'backlog' | 'ready_for_dev' | 'in_progress' | 'review' | 'done'
	functionalRequirementCodes: string[]
} {
	return {
		sessionId,
		epicId,
		epicNumber: story.epicNumber,
		storyNumber: story.storyNumber,
		storyKey: `${story.epicNumber}-${story.storyNumber}`,
		title: story.title,
		asA: story.asA,
		iWant: story.iWant,
		soThat: story.soThat,
		acceptanceCriteria: transformAcceptanceCriteria(story.acceptanceCriteria),
		tasks: transformTasks(story.tasks),
		devNotes: transformDevNotes(story.devNotes),
		storyPoints: story.storyPoints,
		priority: story.priority ?? 'medium',
		status: 'backlog',
		functionalRequirementCodes: [],
	}
}
