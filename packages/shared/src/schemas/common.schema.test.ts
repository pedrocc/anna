import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import {
	ApiErrorSchema,
	ApiResponseSchema,
	createSortSchema,
	forCreate,
	forRead,
	forUpdate,
	HttpUrlSchema,
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

	test('rejects zero limit', () => {
		expect(() => PaginationSchema.parse({ limit: 0 })).toThrow()
	})

	test('rejects negative limit', () => {
		expect(() => PaginationSchema.parse({ limit: -1 })).toThrow()
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

describe('createSortSchema', () => {
	const UserSortSchema = createSortSchema(['name', 'email'] as const)

	test('accepts valid sortBy field', () => {
		const result = UserSortSchema.parse({ sortBy: 'name' })
		expect(result.sortBy).toBe('name')
		expect(result.order).toBe('desc')
	})

	test('accepts all allowed fields', () => {
		expect(UserSortSchema.parse({ sortBy: 'name' }).sortBy).toBe('name')
		expect(UserSortSchema.parse({ sortBy: 'email' }).sortBy).toBe('email')
	})

	test('uses desc as default order', () => {
		const result = UserSortSchema.parse({ sortBy: 'name' })
		expect(result.order).toBe('desc')
	})

	test('accepts explicit asc order', () => {
		const result = UserSortSchema.parse({ sortBy: 'name', order: 'asc' })
		expect(result.order).toBe('asc')
	})

	test('accepts explicit desc order', () => {
		const result = UserSortSchema.parse({ sortBy: 'email', order: 'desc' })
		expect(result.order).toBe('desc')
	})

	test('rejects invalid sortBy field', () => {
		expect(() => UserSortSchema.parse({ sortBy: 'invalid' })).toThrow()
	})

	test('rejects invalid order value', () => {
		expect(() => UserSortSchema.parse({ sortBy: 'name', order: 'invalid' })).toThrow()
	})

	test('sortBy is optional', () => {
		const result = UserSortSchema.parse({})
		expect(result.sortBy).toBeUndefined()
		expect(result.order).toBe('desc')
	})

	test('works with different field sets', () => {
		const DateSortSchema = createSortSchema(['createdAt', 'updatedAt', 'deletedAt'] as const)
		expect(DateSortSchema.parse({ sortBy: 'createdAt' }).sortBy).toBe('createdAt')
		expect(DateSortSchema.parse({ sortBy: 'updatedAt' }).sortBy).toBe('updatedAt')
		expect(DateSortSchema.parse({ sortBy: 'deletedAt' }).sortBy).toBe('deletedAt')
		expect(() => DateSortSchema.parse({ sortBy: 'name' })).toThrow()
	})

	test('works with single field', () => {
		const SingleSortSchema = createSortSchema(['id'] as const)
		expect(SingleSortSchema.parse({ sortBy: 'id' }).sortBy).toBe('id')
		expect(() => SingleSortSchema.parse({ sortBy: 'name' })).toThrow()
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

describe('HttpUrlSchema', () => {
	test('accepts https URL', () => {
		const result = HttpUrlSchema.parse('https://example.com')
		expect(result).toBe('https://example.com')
	})

	test('accepts http URL', () => {
		const result = HttpUrlSchema.parse('http://example.com')
		expect(result).toBe('http://example.com')
	})

	test('accepts https URL with path', () => {
		const result = HttpUrlSchema.parse('https://example.com/path/to/resource')
		expect(result).toBe('https://example.com/path/to/resource')
	})

	test('accepts http URL with port', () => {
		const result = HttpUrlSchema.parse('http://localhost:3000')
		expect(result).toBe('http://localhost:3000')
	})

	test('rejects javascript: protocol', () => {
		expect(() => HttpUrlSchema.parse('javascript:alert(1)')).toThrow()
	})

	test('rejects file: protocol', () => {
		expect(() => HttpUrlSchema.parse('file:///etc/passwd')).toThrow()
	})

	test('rejects ftp: protocol', () => {
		expect(() => HttpUrlSchema.parse('ftp://example.com/file')).toThrow()
	})

	test('rejects data: protocol', () => {
		expect(() => HttpUrlSchema.parse('data:text/html,<script>alert(1)</script>')).toThrow()
	})

	test('rejects invalid URL', () => {
		expect(() => HttpUrlSchema.parse('not-a-url')).toThrow()
	})

	test('rejects empty string', () => {
		expect(() => HttpUrlSchema.parse('')).toThrow()
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

describe('forCreate', () => {
	const schema = z.object({
		name: z.string().min(1),
		description: forCreate(z.string().max(500)),
	})

	test('accepts value when provided', () => {
		const result = schema.parse({ name: 'Test', description: 'A description' })
		expect(result.description).toBe('A description')
	})

	test('accepts omitted field (undefined)', () => {
		const result = schema.parse({ name: 'Test' })
		expect(result.description).toBeUndefined()
	})

	test('rejects null (not nullable)', () => {
		expect(() => schema.parse({ name: 'Test', description: null })).toThrow()
	})

	test('still validates inner schema', () => {
		expect(() => schema.parse({ name: 'Test', description: 'a'.repeat(501) })).toThrow()
	})
})

describe('forUpdate', () => {
	const schema = z.object({
		name: forUpdate(z.string().min(1)),
		description: forUpdate(z.string().max(500)),
	})

	test('accepts value when provided', () => {
		const result = schema.parse({ name: 'Updated', description: 'New desc' })
		expect(result.name).toBe('Updated')
		expect(result.description).toBe('New desc')
	})

	test('accepts omitted fields (no change semantics)', () => {
		const result = schema.parse({})
		expect(result.name).toBeUndefined()
		expect(result.description).toBeUndefined()
	})

	test('accepts null (clear field semantics)', () => {
		const result = schema.parse({ name: null, description: null })
		expect(result.name).toBeNull()
		expect(result.description).toBeNull()
	})

	test('still validates inner schema when value provided', () => {
		expect(() => schema.parse({ name: '' })).toThrow()
		expect(() => schema.parse({ description: 'a'.repeat(501) })).toThrow()
	})

	test('distinguishes undefined vs null vs value', () => {
		const full = schema.parse({ name: 'Val', description: null })
		expect(full.name).toBe('Val')
		expect(full.description).toBeNull()

		const empty = schema.parse({})
		expect(empty.name).toBeUndefined()
		expect(empty.description).toBeUndefined()
	})
})

describe('forRead', () => {
	const schema = z.object({
		name: z.string().min(1),
		description: forRead(z.string().max(500)),
	})

	test('accepts value when present', () => {
		const result = schema.parse({ name: 'Test', description: 'A desc' })
		expect(result.description).toBe('A desc')
	})

	test('accepts null (DB may store null)', () => {
		const result = schema.parse({ name: 'Test', description: null })
		expect(result.description).toBeNull()
	})

	test('rejects omitted field (always present in READ)', () => {
		expect(() => schema.parse({ name: 'Test' })).toThrow()
	})

	test('still validates inner schema when value provided', () => {
		expect(() => schema.parse({ name: 'Test', description: 'a'.repeat(501) })).toThrow()
	})
})
