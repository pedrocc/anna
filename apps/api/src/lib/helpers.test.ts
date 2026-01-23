import { describe, expect, it } from 'bun:test'
import { verifyResourceOwnership } from './helpers.js'

describe('verifyResourceOwnership', () => {
	const userId = 'user-123'

	describe('returns not_found', () => {
		it('when resource is null', () => {
			expect(verifyResourceOwnership(null, userId)).toBe('not_found')
		})

		it('when resource is undefined', () => {
			expect(verifyResourceOwnership(undefined, userId)).toBe('not_found')
		})

		it('when resource.session is null', () => {
			const resource = { session: null }
			expect(verifyResourceOwnership(resource, userId)).toBe('not_found')
		})
	})

	describe('returns forbidden', () => {
		it('when session userId does not match', () => {
			const resource = { session: { userId: 'other-user' } }
			expect(verifyResourceOwnership(resource, userId)).toBe('forbidden')
		})

		it('when session userId is empty string and userId is not', () => {
			const resource = { session: { userId: '' } }
			expect(verifyResourceOwnership(resource, userId)).toBe('forbidden')
		})
	})

	describe('returns ok', () => {
		it('when session userId matches', () => {
			const resource = { session: { userId } }
			expect(verifyResourceOwnership(resource, userId)).toBe('ok')
		})

		it('when both userIds are empty strings', () => {
			const resource = { session: { userId: '' } }
			expect(verifyResourceOwnership(resource, '')).toBe('ok')
		})
	})
})
