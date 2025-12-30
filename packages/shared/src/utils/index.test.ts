import { describe, expect, test } from 'bun:test'
import { formatDate, generateId, omit, pick, sleep } from './index.js'

describe('sleep', () => {
	test('resolves after specified time', async () => {
		const start = Date.now()
		await sleep(50)
		const elapsed = Date.now() - start
		expect(elapsed).toBeGreaterThanOrEqual(45)
	})
})

describe('generateId', () => {
	test('returns a valid UUID', () => {
		const id = generateId()
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
		expect(uuidRegex.test(id)).toBe(true)
	})

	test('generates unique IDs', () => {
		const ids = new Set(Array.from({ length: 100 }, () => generateId()))
		expect(ids.size).toBe(100)
	})
})

describe('omit', () => {
	test('removes specified keys from object', () => {
		const obj = { a: 1, b: 2, c: 3 }
		const result = omit(obj, ['b'])
		expect(result).toEqual({ a: 1, c: 3 })
		expect('b' in result).toBe(false)
	})

	test('returns original object when no keys specified', () => {
		const obj = { a: 1, b: 2 }
		const result = omit(obj, [])
		expect(result).toEqual({ a: 1, b: 2 })
	})

	test('removes multiple keys', () => {
		const obj = { a: 1, b: 2, c: 3, d: 4 }
		const result = omit(obj, ['a', 'c'])
		expect(result).toEqual({ b: 2, d: 4 })
	})

	test('does not mutate original object', () => {
		const obj = { a: 1, b: 2 }
		omit(obj, ['a'])
		expect(obj).toEqual({ a: 1, b: 2 })
	})
})

describe('pick', () => {
	test('keeps only specified keys', () => {
		const obj = { a: 1, b: 2, c: 3 }
		const result = pick(obj, ['a', 'c'])
		expect(result).toEqual({ a: 1, c: 3 })
	})

	test('returns empty object when no keys specified', () => {
		const obj = { a: 1, b: 2 }
		const result = pick(obj, [])
		expect(result).toEqual({})
	})

	test('ignores non-existent keys', () => {
		const obj = { a: 1, b: 2 }
		const result = pick(obj, ['a', 'nonexistent' as keyof typeof obj])
		expect(result).toEqual({ a: 1 })
	})

	test('does not mutate original object', () => {
		const obj = { a: 1, b: 2, c: 3 }
		pick(obj, ['a'])
		expect(obj).toEqual({ a: 1, b: 2, c: 3 })
	})
})

describe('formatDate', () => {
	test('formats date in pt-BR locale by default', () => {
		const date = new Date('2024-01-15T10:30:00')
		const result = formatDate(date)
		expect(result).toContain('15')
		expect(result).toContain('01')
		expect(result).toContain('2024')
	})

	test('accepts custom locale', () => {
		const date = new Date('2024-01-15T10:30:00')
		const result = formatDate(date, 'en-US')
		expect(result).toContain('1')
		expect(result).toContain('15')
	})
})
