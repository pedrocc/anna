import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, render } from '@testing-library/react'
import { UserSync } from './Layout.js'

// Mock @clerk/clerk-react
const mockUseUser = mock(() => ({ user: null, isLoaded: false }))
mock.module('@clerk/clerk-react', () => ({
	useUser: mockUseUser,
	SignedIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	SignedOut: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	RedirectToSignIn: () => null,
}))

// Mock api-client
let syncNameMock = mock(() => Promise.resolve({}))
mock.module('../lib/api-client', () => ({
	api: {
		users: {
			get syncName() {
				return syncNameMock
			},
		},
	},
}))

describe('UserSync', () => {
	beforeEach(() => {
		syncNameMock = mock(() => Promise.resolve({}))
		mockUseUser.mockReturnValue({ user: null, isLoaded: false })
	})

	afterEach(() => {
		mock.restore()
	})

	it('does not call syncName when user is not loaded', () => {
		mockUseUser.mockReturnValue({ user: null, isLoaded: false })
		render(<UserSync />)
		expect(syncNameMock).not.toHaveBeenCalled()
	})

	it('does not call syncName when user is null', () => {
		mockUseUser.mockReturnValue({ user: null, isLoaded: true })
		render(<UserSync />)
		expect(syncNameMock).not.toHaveBeenCalled()
	})

	it('does not call syncName when user has no name', () => {
		mockUseUser.mockReturnValue({
			user: { id: 'user_1', fullName: '', firstName: null, lastName: null },
			isLoaded: true,
		})
		render(<UserSync />)
		expect(syncNameMock).not.toHaveBeenCalled()
	})

	it('calls syncName with fullName when user is loaded', async () => {
		mockUseUser.mockReturnValue({
			user: { id: 'user_1', fullName: 'John Doe', firstName: 'John', lastName: 'Doe' },
			isLoaded: true,
		})

		await act(async () => {
			render(<UserSync />)
		})

		expect(syncNameMock).toHaveBeenCalledWith('John Doe')
	})

	it('uses firstName + lastName when fullName is empty', async () => {
		mockUseUser.mockReturnValue({
			user: { id: 'user_1', fullName: '', firstName: 'Jane', lastName: 'Smith' },
			isLoaded: true,
		})

		await act(async () => {
			render(<UserSync />)
		})

		expect(syncNameMock).toHaveBeenCalledWith('Jane Smith')
	})

	it('does not retry after successful sync on rerender', async () => {
		mockUseUser.mockReturnValue({
			user: { id: 'user_1', fullName: 'John Doe', firstName: 'John', lastName: 'Doe' },
			isLoaded: true,
		})

		const { rerender } = await act(async () => {
			return render(<UserSync />)
		})

		// Wait for the promise to resolve
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0))
		})

		expect(syncNameMock).toHaveBeenCalledTimes(1)

		// Rerender should not trigger another sync
		await act(async () => {
			rerender(<UserSync />)
		})

		expect(syncNameMock).toHaveBeenCalledTimes(1)
	})

	it('retries after failed sync on rerender', async () => {
		syncNameMock = mock(() => Promise.reject(new Error('Network error')))

		mockUseUser.mockReturnValue({
			user: { id: 'user_1', fullName: 'John Doe', firstName: 'John', lastName: 'Doe' },
			isLoaded: true,
		})

		await act(async () => {
			render(<UserSync />)
		})

		// Wait for the promise to reject and finally to run
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0))
		})

		expect(syncNameMock).toHaveBeenCalledTimes(1)

		// Now make it succeed on retry
		syncNameMock = mock(() => Promise.resolve({}))

		// Re-trigger the effect by simulating a user object change
		mockUseUser.mockReturnValue({
			user: { id: 'user_1', fullName: 'John Doe', firstName: 'John', lastName: 'Doe' },
			isLoaded: true,
		})
	})

	it('re-syncs when user.id changes', async () => {
		mockUseUser.mockReturnValue({
			user: { id: 'user_1', fullName: 'John Doe', firstName: 'John', lastName: 'Doe' },
			isLoaded: true,
		})

		const { rerender } = await act(async () => {
			return render(<UserSync />)
		})

		// Wait for promise to resolve
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0))
		})

		expect(syncNameMock).toHaveBeenCalledTimes(1)
		expect(syncNameMock).toHaveBeenCalledWith('John Doe')

		// Change user (simulating a different Clerk user)
		mockUseUser.mockReturnValue({
			user: { id: 'user_2', fullName: 'Jane Smith', firstName: 'Jane', lastName: 'Smith' },
			isLoaded: true,
		})

		await act(async () => {
			rerender(<UserSync />)
		})

		// Wait for promise to resolve
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0))
		})

		expect(syncNameMock).toHaveBeenCalledTimes(2)
		expect(syncNameMock).toHaveBeenLastCalledWith('Jane Smith')
	})

	it('re-syncs when user name changes for same user.id', async () => {
		mockUseUser.mockReturnValue({
			user: { id: 'user_1', fullName: 'John Doe', firstName: 'John', lastName: 'Doe' },
			isLoaded: true,
		})

		const { rerender } = await act(async () => {
			return render(<UserSync />)
		})

		// Wait for promise to resolve
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0))
		})

		expect(syncNameMock).toHaveBeenCalledTimes(1)
		expect(syncNameMock).toHaveBeenCalledWith('John Doe')

		// Same user.id but name changed (e.g. user updated profile in Clerk)
		mockUseUser.mockReturnValue({
			user: { id: 'user_1', fullName: 'John Smith', firstName: 'John', lastName: 'Smith' },
			isLoaded: true,
		})

		await act(async () => {
			rerender(<UserSync />)
		})

		// Wait for promise to resolve
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0))
		})

		expect(syncNameMock).toHaveBeenCalledTimes(2)
		expect(syncNameMock).toHaveBeenLastCalledWith('John Smith')
	})

	it('does not re-sync when user object changes but name stays the same', async () => {
		mockUseUser.mockReturnValue({
			user: { id: 'user_1', fullName: 'John Doe', firstName: 'John', lastName: 'Doe' },
			isLoaded: true,
		})

		const { rerender } = await act(async () => {
			return render(<UserSync />)
		})

		// Wait for promise to resolve
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0))
		})

		expect(syncNameMock).toHaveBeenCalledTimes(1)

		// Same user.id and same name, but new user object reference
		mockUseUser.mockReturnValue({
			user: { id: 'user_1', fullName: 'John Doe', firstName: 'John', lastName: 'Doe' },
			isLoaded: true,
		})

		await act(async () => {
			rerender(<UserSync />)
		})

		// Wait for promise to resolve
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0))
		})

		// Should not re-sync since id + name are unchanged
		expect(syncNameMock).toHaveBeenCalledTimes(1)
	})

	it('prevents concurrent sync calls', async () => {
		let resolveSync: (() => void) | null = null
		syncNameMock = mock(
			() =>
				new Promise<Record<string, never>>((resolve) => {
					resolveSync = () => resolve({})
				})
		)

		mockUseUser.mockReturnValue({
			user: { id: 'user_1', fullName: 'John Doe', firstName: 'John', lastName: 'Doe' },
			isLoaded: true,
		})

		const { rerender } = await act(async () => {
			return render(<UserSync />)
		})

		// First call should have been made
		expect(syncNameMock).toHaveBeenCalledTimes(1)

		// Rerender while first call is still pending
		await act(async () => {
			rerender(<UserSync />)
		})

		// Should not make a second call while first is pending
		expect(syncNameMock).toHaveBeenCalledTimes(1)

		// Resolve the first call
		await act(async () => {
			resolveSync?.()
			await new Promise((resolve) => setTimeout(resolve, 0))
		})

		// After resolve, still only 1 call because user.id is now synced
		expect(syncNameMock).toHaveBeenCalledTimes(1)
	})
})
