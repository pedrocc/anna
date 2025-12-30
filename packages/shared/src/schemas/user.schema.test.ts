import { describe, expect, test } from 'bun:test'
import { CreateUserSchema, UpdateUserSchema, UserRoleSchema, UserSchema } from './user.schema.js'

describe('UserRoleSchema', () => {
	test('accepts valid roles', () => {
		expect(UserRoleSchema.parse('admin')).toBe('admin')
		expect(UserRoleSchema.parse('user')).toBe('user')
		expect(UserRoleSchema.parse('guest')).toBe('guest')
	})

	test('rejects invalid role', () => {
		expect(() => UserRoleSchema.parse('superadmin')).toThrow()
	})
})

describe('UserSchema', () => {
	const validUser = {
		id: '550e8400-e29b-41d4-a716-446655440000',
		clerkId: 'clerk_123',
		email: 'test@example.com',
		name: 'Test User',
		role: 'user' as const,
		createdAt: new Date(),
		updatedAt: new Date(),
	}

	test('validates complete user', () => {
		const result = UserSchema.parse(validUser)
		expect(result.email).toBe('test@example.com')
		expect(result.role).toBe('user')
	})

	test('applies default role', () => {
		const userWithoutRole = { ...validUser }
		delete (userWithoutRole as Record<string, unknown>).role
		const result = UserSchema.parse(userWithoutRole)
		expect(result.role).toBe('user')
	})

	test('validates optional avatarUrl', () => {
		const userWithAvatar = { ...validUser, avatarUrl: 'https://example.com/avatar.png' }
		const result = UserSchema.parse(userWithAvatar)
		expect(result.avatarUrl).toBe('https://example.com/avatar.png')
	})

	test('rejects invalid email', () => {
		const invalidUser = { ...validUser, email: 'invalid-email' }
		expect(() => UserSchema.parse(invalidUser)).toThrow()
	})

	test('rejects empty name', () => {
		const invalidUser = { ...validUser, name: '' }
		expect(() => UserSchema.parse(invalidUser)).toThrow()
	})

	test('rejects name over 100 characters', () => {
		const invalidUser = { ...validUser, name: 'a'.repeat(101) }
		expect(() => UserSchema.parse(invalidUser)).toThrow()
	})

	test('validates metadata as record', () => {
		const userWithMeta = { ...validUser, metadata: { key: 'value', count: 42 } }
		const result = UserSchema.parse(userWithMeta)
		expect(result.metadata?.key).toBe('value')
	})
})

describe('CreateUserSchema', () => {
	test('omits id and timestamps', () => {
		const createData = {
			clerkId: 'clerk_456',
			email: 'new@example.com',
			name: 'New User',
		}
		const result = CreateUserSchema.parse(createData)
		expect(result.clerkId).toBe('clerk_456')
		expect(result.role).toBe('user')
		expect('id' in result).toBe(false)
		expect('createdAt' in result).toBe(false)
	})

	test('requires clerkId', () => {
		expect(() =>
			CreateUserSchema.parse({
				email: 'test@example.com',
				name: 'Test',
			})
		).toThrow()
	})
})

describe('UpdateUserSchema', () => {
	test('all fields are optional except role default', () => {
		const result = UpdateUserSchema.parse({})
		// role has a default value so it's included even when not provided
		expect(result.role).toBe('user')
	})

	test('accepts partial updates', () => {
		const result = UpdateUserSchema.parse({ name: 'Updated Name' })
		expect(result.name).toBe('Updated Name')
	})

	test('does not include clerkId', () => {
		const result = UpdateUserSchema.parse({ name: 'Test' })
		expect('clerkId' in result).toBe(false)
	})
})
