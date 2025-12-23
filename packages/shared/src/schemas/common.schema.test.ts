import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import {
	ApiErrorSchema,
	ApiResponseSchema,
	IdSchema,
	PaginationSchema,
	SortSchema,
	TimestampsSchema,
} from './common.schema.js'

describe('IdSchema', () => {
	test('validates valid UUID', () => {
		const validId = '550e8400-e29b-41d4-a716-446655440000'
		expect(IdSchema.parse(validId)).toBe(validId)
	})

	test('rejects invalid UUID', () => {
		expect(() => IdSchema.parse('invalid-id')).toThrow()
	})

	test('rejects empty string', () => {
		expect(() => IdSchema.parse('')).toThrow()
	})
})

describe('PaginationSchema', () => {
	test('uses defaults when no values provided', () => {
		const result = PaginationSchema.parse({})
		expect(result.page).toBe(1)
		expect(result.limit).toBe(20)
	})

	test('coerces string values to numbers', () => {
		const result = PaginationSchema.parse({ page: '2', limit: '50' })
		expect(result.page).toBe(2)
		expect(result.limit).toBe(50)
	})

	test('rejects limit over 100', () => {
		expect(() => PaginationSchema.parse({ limit: 101 })).toThrow()
	})

	test('rejects negative page', () => {
		expect(() => PaginationSchema.parse({ page: -1 })).toThrow()
	})

	test('rejects zero page', () => {
		expect(() => PaginationSchema.parse({ page: 0 })).toThrow()
	})
})

describe('SortSchema', () => {
	test('uses desc as default order', () => {
		const result = SortSchema.parse({ field: 'createdAt' })
		expect(result.field).toBe('createdAt')
		expect(result.order).toBe('desc')
	})

	test('accepts asc order', () => {
		const result = SortSchema.parse({ field: 'name', order: 'asc' })
		expect(result.order).toBe('asc')
	})

	test('rejects invalid order', () => {
		expect(() => SortSchema.parse({ field: 'name', order: 'invalid' })).toThrow()
	})
})

describe('TimestampsSchema', () => {
	test('validates valid dates', () => {
		const now = new Date()
		const result = TimestampsSchema.parse({ createdAt: now, updatedAt: now })
		expect(result.createdAt).toEqual(now)
		expect(result.updatedAt).toEqual(now)
	})

	test('rejects invalid dates', () => {
		expect(() => TimestampsSchema.parse({ createdAt: 'invalid', updatedAt: 'invalid' })).toThrow()
	})
})

describe('ApiResponseSchema', () => {
	test('validates success response with data', () => {
		const schema = ApiResponseSchema(z.string())
		const result = schema.parse({
			success: true,
			data: 'test',
		})
		expect(result.success).toBe(true)
		expect(result.data).toBe('test')
	})

	test('validates response with meta', () => {
		const schema = ApiResponseSchema(z.array(z.string()))
		const result = schema.parse({
			success: true,
			data: ['item1', 'item2'],
			meta: { page: 1, limit: 20, total: 100 },
		})
		expect(result.meta?.total).toBe(100)
	})
})

describe('ApiErrorSchema', () => {
	test('validates error response', () => {
		const result = ApiErrorSchema.parse({
			success: false,
			error: {
				code: 'NOT_FOUND',
				message: 'Resource not found',
			},
		})
		expect(result.success).toBe(false)
		expect(result.error.code).toBe('NOT_FOUND')
	})

	test('validates error with details', () => {
		const result = ApiErrorSchema.parse({
			success: false,
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Invalid input',
				details: { field: 'email', reason: 'invalid format' },
			},
		})
		expect(result.error.details?.field).toBe('email')
	})
})
