import { describe, expect, test } from 'bun:test'
import { RATE_LIMIT, TECHNIQUE_LIST, TECHNIQUES } from './index.js'

describe('RATE_LIMIT', () => {
	test('has base rate limiting values', () => {
		expect(RATE_LIMIT.WINDOW_MS).toBe(60_000)
		expect(RATE_LIMIT.MAX_REQUESTS).toBe(100)
		expect(RATE_LIMIT.MAX_REQUESTS_AUTH).toBe(1000)
	})

	test('has stricter chat rate limits', () => {
		expect(RATE_LIMIT.CHAT_WINDOW_MS).toBe(60_000)
		expect(RATE_LIMIT.CHAT_MAX_REQUESTS).toBe(20)
	})

	test('has stricter document generation rate limits', () => {
		expect(RATE_LIMIT.DOCUMENT_WINDOW_MS).toBe(60_000)
		expect(RATE_LIMIT.DOCUMENT_MAX_REQUESTS).toBe(10)
	})

	test('chat limit is stricter than base', () => {
		expect(RATE_LIMIT.CHAT_MAX_REQUESTS).toBeLessThan(RATE_LIMIT.MAX_REQUESTS)
	})

	test('document limit is stricter than chat', () => {
		expect(RATE_LIMIT.DOCUMENT_MAX_REQUESTS).toBeLessThan(RATE_LIMIT.CHAT_MAX_REQUESTS)
	})
})

describe('TECHNIQUES', () => {
	test('contains all expected techniques', () => {
		const expectedIds = [
			'scamper',
			'what_if',
			'six_hats',
			'five_whys',
			'mind_mapping',
			'analogical',
			'first_principles',
			'yes_and',
			'future_self',
			'reversal',
		]
		for (const id of expectedIds) {
			expect(TECHNIQUES[id as keyof typeof TECHNIQUES]).toBeDefined()
		}
	})

	test('each technique has required fields', () => {
		for (const [key, technique] of Object.entries(TECHNIQUES)) {
			expect(technique.id).toBe(key)
			expect(technique.name).toBeTruthy()
			expect(technique.description).toBeTruthy()
			expect(technique.icon).toBeTruthy()
			expect(technique.estimatedMinutes).toBeGreaterThan(0)
		}
	})

	test('TECHNIQUE_LIST matches TECHNIQUES values', () => {
		expect(TECHNIQUE_LIST.length).toBe(Object.keys(TECHNIQUES).length)
	})
})
