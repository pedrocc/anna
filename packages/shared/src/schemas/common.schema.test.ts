import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import {
	ApiErrorSchema,
	ApiResponseSchema,
	IdSchema,
	PaginationSchema,
	RenameSchema,
	RenameSessionSchema,
	SessionIdParamSchema,
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

describe('RenameSchema', () => {
	test('validates valid project name', () => {
		const result = RenameSchema.parse({ projectName: 'My Project' })
		expect(result.projectName).toBe('My Project')
	})

	test('rejects empty string', () => {
		expect(() => RenameSchema.parse({ projectName: '' })).toThrow()
	})

	test('rejects string exceeding 255 characters', () => {
		const longName = 'a'.repeat(256)
		expect(() => RenameSchema.parse({ projectName: longName })).toThrow()
	})

	test('accepts string at max length (255)', () => {
		const maxName = 'a'.repeat(255)
		const result = RenameSchema.parse({ projectName: maxName })
		expect(result.projectName).toBe(maxName)
	})

	test('accepts single character string', () => {
		const result = RenameSchema.parse({ projectName: 'A' })
		expect(result.projectName).toBe('A')
	})

	test('rejects missing projectName', () => {
		expect(() => RenameSchema.parse({})).toThrow()
	})
})

describe('SessionIdParamSchema', () => {
	test('validates valid UUID param', () => {
		const result = SessionIdParamSchema.parse({ id: '550e8400-e29b-41d4-a716-446655440000' })
		expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000')
	})

	test('rejects non-UUID string', () => {
		expect(() => SessionIdParamSchema.parse({ id: 'not-a-uuid' })).toThrow()
	})

	test('rejects empty string', () => {
		expect(() => SessionIdParamSchema.parse({ id: '' })).toThrow()
	})

	test('rejects missing id', () => {
		expect(() => SessionIdParamSchema.parse({})).toThrow()
	})

	test('rejects numeric id', () => {
		expect(() => SessionIdParamSchema.parse({ id: 12345 })).toThrow()
	})
})

describe('RenameSessionSchema', () => {
	test('validates valid project name', () => {
		const result = RenameSessionSchema.parse({ projectName: 'My Project' })
		expect(result.projectName).toBe('My Project')
	})

	test('trims whitespace', () => {
		const result = RenameSessionSchema.parse({ projectName: '  My Project  ' })
		expect(result.projectName).toBe('My Project')
	})

	test('rejects empty string', () => {
		expect(() => RenameSessionSchema.parse({ projectName: '' })).toThrow()
	})

	test('trims whitespace-only string to empty (trim runs as transform)', () => {
		const result = RenameSessionSchema.parse({ projectName: '   ' })
		expect(result.projectName).toBe('')
	})

	test('rejects string exceeding 200 characters', () => {
		const longName = 'a'.repeat(201)
		expect(() => RenameSessionSchema.parse({ projectName: longName })).toThrow()
	})

	test('accepts string at max length (200)', () => {
		const maxName = 'a'.repeat(200)
		const result = RenameSessionSchema.parse({ projectName: maxName })
		expect(result.projectName).toBe(maxName)
	})

	test('rejects missing projectName', () => {
		expect(() => RenameSessionSchema.parse({})).toThrow()
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
