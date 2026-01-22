import { describe, expect, it } from 'bun:test'

/**
 * Tests for the Map-based O(1) lookup patterns used in:
 * - sm-enrichment.ts: storiesByKey Map for story lookup
 * - sm.ts: storiesCountByEpicId Map for epic context building
 * - KanbanBoard.tsx: storiesById Map for drag events
 */

describe('storiesByKey Map lookup (sm-enrichment pattern)', () => {
	it('should find story by key in O(1)', () => {
		const stories = [
			{ id: '1', storyKey: 'US-001', title: 'Story 1' },
			{ id: '2', storyKey: 'US-002', title: 'Story 2' },
			{ id: '3', storyKey: 'US-003', title: 'Story 3' },
		]

		const storiesByKey = new Map(stories.map((s) => [s.storyKey, s]))

		expect(storiesByKey.get('US-001')).toEqual(stories[0])
		expect(storiesByKey.get('US-002')).toEqual(stories[1])
		expect(storiesByKey.get('US-003')).toEqual(stories[2])
		expect(storiesByKey.get('US-999')).toBeUndefined()
	})

	it('should handle empty stories array', () => {
		const stories: Array<{ id: string; storyKey: string; title: string }> = []
		const storiesByKey = new Map(stories.map((s) => [s.storyKey, s]))

		expect(storiesByKey.size).toBe(0)
		expect(storiesByKey.get('US-001')).toBeUndefined()
	})

	it('should handle duplicate keys by keeping last entry', () => {
		const stories = [
			{ id: '1', storyKey: 'US-001', title: 'First' },
			{ id: '2', storyKey: 'US-001', title: 'Second' },
		]

		const storiesByKey = new Map(stories.map((s) => [s.storyKey, s]))

		expect(storiesByKey.size).toBe(1)
		expect(storiesByKey.get('US-001')?.title).toBe('Second')
	})
})

describe('storiesCountByEpicId Map (sm.ts pattern)', () => {
	it('should count stories per epic in O(n)', () => {
		const stories = [
			{ id: '1', epicId: 'epic-1' },
			{ id: '2', epicId: 'epic-1' },
			{ id: '3', epicId: 'epic-2' },
			{ id: '4', epicId: 'epic-1' },
			{ id: '5', epicId: 'epic-3' },
		]

		const storiesCountByEpicId = new Map<string, number>()
		for (const s of stories) {
			if (s.epicId) {
				storiesCountByEpicId.set(s.epicId, (storiesCountByEpicId.get(s.epicId) ?? 0) + 1)
			}
		}

		expect(storiesCountByEpicId.get('epic-1')).toBe(3)
		expect(storiesCountByEpicId.get('epic-2')).toBe(1)
		expect(storiesCountByEpicId.get('epic-3')).toBe(1)
		expect(storiesCountByEpicId.get('epic-unknown')).toBeUndefined()
	})

	it('should handle stories with null epicId', () => {
		const stories = [
			{ id: '1', epicId: 'epic-1' },
			{ id: '2', epicId: null },
			{ id: '3', epicId: 'epic-1' },
			{ id: '4', epicId: null },
		]

		const storiesCountByEpicId = new Map<string, number>()
		for (const s of stories) {
			if (s.epicId) {
				storiesCountByEpicId.set(s.epicId, (storiesCountByEpicId.get(s.epicId) ?? 0) + 1)
			}
		}

		expect(storiesCountByEpicId.get('epic-1')).toBe(2)
		expect(storiesCountByEpicId.size).toBe(1)
	})

	it('should handle empty stories array', () => {
		const stories: Array<{ id: string; epicId: string | null }> = []

		const storiesCountByEpicId = new Map<string, number>()
		for (const s of stories) {
			if (s.epicId) {
				storiesCountByEpicId.set(s.epicId, (storiesCountByEpicId.get(s.epicId) ?? 0) + 1)
			}
		}

		expect(storiesCountByEpicId.size).toBe(0)
	})

	it('should produce same result as filter().length', () => {
		const stories = [
			{ id: '1', epicId: 'epic-1' },
			{ id: '2', epicId: 'epic-1' },
			{ id: '3', epicId: 'epic-2' },
			{ id: '4', epicId: 'epic-1' },
			{ id: '5', epicId: 'epic-2' },
		]

		const epics = [{ id: 'epic-1' }, { id: 'epic-2' }, { id: 'epic-3' }]

		// Old O(n²) approach
		const oldResult = epics.map((e) => ({
			id: e.id,
			count: stories.filter((s) => s.epicId === e.id).length,
		}))

		// New O(n) approach
		const storiesCountByEpicId = new Map<string, number>()
		for (const s of stories) {
			if (s.epicId) {
				storiesCountByEpicId.set(s.epicId, (storiesCountByEpicId.get(s.epicId) ?? 0) + 1)
			}
		}
		const newResult = epics.map((e) => ({
			id: e.id,
			count: storiesCountByEpicId.get(e.id) ?? 0,
		}))

		expect(newResult).toEqual(oldResult)
	})
})

describe('storiesById Map (KanbanBoard pattern)', () => {
	it('should find story by ID in O(1)', () => {
		const stories = [
			{ id: 'story-1', title: 'Story 1', status: 'backlog' as const },
			{ id: 'story-2', title: 'Story 2', status: 'in_progress' as const },
			{ id: 'story-3', title: 'Story 3', status: 'done' as const },
		]

		const storiesById = new Map(stories.map((s) => [s.id, s]))

		expect(storiesById.get('story-1')).toEqual(stories[0])
		expect(storiesById.get('story-2')).toEqual(stories[1])
		expect(storiesById.get('story-3')).toEqual(stories[2])
		expect(storiesById.get('nonexistent')).toBeUndefined()
	})

	it('should work with Set for valid statuses', () => {
		type StoryStatus = 'backlog' | 'ready_for_dev' | 'in_progress' | 'review' | 'done'
		const VALID_STATUSES: Set<StoryStatus> = new Set([
			'backlog',
			'ready_for_dev',
			'in_progress',
			'review',
			'done',
		])

		expect(VALID_STATUSES.has('backlog')).toBe(true)
		expect(VALID_STATUSES.has('in_progress')).toBe(true)
		expect(VALID_STATUSES.has('done')).toBe(true)
		expect(VALID_STATUSES.has('invalid' as StoryStatus)).toBe(false)
	})
})
