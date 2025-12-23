import { useUser } from '@clerk/clerk-react'
import type { User } from '@repo/shared'
import useSWR from 'swr'

export function DashboardPage() {
	const { user: clerkUser } = useUser()
	const { data: user, error, isLoading } = useSWR<User>('/api/v1/users/me')

	if (isLoading) {
		return (
			<div className="py-8 text-center">
				<div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
				<p className="mt-2 text-gray-600">Loading...</p>
			</div>
		)
	}

	if (error) {
		return (
			<div className="py-8 text-center">
				<div className="rounded-lg bg-red-50 p-4 max-w-md mx-auto">
					<p className="text-red-600">Error loading user data</p>
					<p className="mt-1 text-sm text-red-500">{error.message}</p>
				</div>
			</div>
		)
	}

	return (
		<div className="py-8">
			<h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
			<div className="mt-4 rounded-lg bg-white p-6 shadow-sm">
				<p className="text-gray-600">
					Welcome,{' '}
					<span className="font-medium">{user?.name ?? clerkUser?.firstName ?? 'User'}</span>!
				</p>
				{user ? (
					<>
						<p className="mt-2 text-sm text-gray-500">Email: {user.email}</p>
						<p className="text-sm text-gray-500">Role: {user.role}</p>
					</>
				) : (
					<p className="mt-2 text-sm text-gray-500">
						Your account is not yet synced with the database.
					</p>
				)}
			</div>

			<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<div className="rounded-lg bg-white p-6 shadow-sm">
					<h3 className="font-semibold text-gray-900">Quick Stats</h3>
					<p className="mt-2 text-3xl font-bold text-primary">0</p>
					<p className="text-sm text-gray-500">Projects</p>
				</div>
				<div className="rounded-lg bg-white p-6 shadow-sm">
					<h3 className="font-semibold text-gray-900">Activity</h3>
					<p className="mt-2 text-3xl font-bold text-primary">0</p>
					<p className="text-sm text-gray-500">Actions today</p>
				</div>
				<div className="rounded-lg bg-white p-6 shadow-sm">
					<h3 className="font-semibold text-gray-900">Notifications</h3>
					<p className="mt-2 text-3xl font-bold text-primary">0</p>
					<p className="text-sm text-gray-500">Unread</p>
				</div>
			</div>
		</div>
	)
}
