import type { BrainstormSession, User } from '@repo/shared'
import useSWR, { type SWRConfiguration } from 'swr'
import { apiRequest, fetcher } from './api.js'

/**
 * API route constants - centralized route management
 */
export const apiRoutes = {
	users: {
		me: '/api/v1/users/me',
		list: '/api/v1/users',
		byId: (id: string) => `/api/v1/users/${id}`,
	},
	brainstorm: {
		sessions: '/api/v1/brainstorm/sessions',
		session: (id: string) => `/api/v1/brainstorm/sessions/${id}`,
		chat: '/api/v1/brainstorm/chat',
		document: (id: string) => `/api/v1/brainstorm/sessions/${id}/document`,
		techniques: '/api/v1/brainstorm/techniques',
		advance: (id: string) => `/api/v1/brainstorm/sessions/${id}/advance`,
		complete: (id: string) => `/api/v1/brainstorm/sessions/${id}/complete`,
	},
} as const

/**
 * Typed SWR hook for fetching the current user
 */
export function useCurrentUser(config?: SWRConfiguration<User>) {
	return useSWR<User>(apiRoutes.users.me, fetcher, config)
}

/**
 * Typed SWR hook for fetching the list of users (admin only)
 */
export function useUsers(
	params?: { page?: number; limit?: number },
	config?: SWRConfiguration<User[]>
) {
	const queryString = params
		? `?${new URLSearchParams({
				page: String(params.page ?? 1),
				limit: String(params.limit ?? 10),
			})}`
		: ''

	return useSWR<User[]>(`${apiRoutes.users.list}${queryString}`, fetcher, config)
}

/**
 * Typed SWR hook for fetching a specific user by ID
 */
export function useUser(id: string | null, config?: SWRConfiguration<User>) {
	return useSWR<User>(id ? apiRoutes.users.byId(id) : null, fetcher, config)
}

// ============================================
// BRAINSTORM HOOKS
// ============================================

/**
 * Typed SWR hook for fetching brainstorm sessions
 * Note: fetcher extracts data.data, so this returns the array directly
 */
export function useBrainstormSessions(
	params?: { page?: number; limit?: number },
	config?: SWRConfiguration<BrainstormSession[]>
) {
	const queryString = params
		? `?${new URLSearchParams({
				page: String(params.page ?? 1),
				limit: String(params.limit ?? 10),
			})}`
		: ''

	return useSWR<BrainstormSession[]>(
		`${apiRoutes.brainstorm.sessions}${queryString}`,
		fetcher,
		config
	)
}

/**
 * Session with messages type
 */
type SessionWithMessages = BrainstormSession & {
	messages: Array<{
		id: string
		role: string
		content: string
		step: string
		technique: string | null
		createdAt: string
	}>
}

/**
 * Typed SWR hook for fetching a specific brainstorm session
 */
export function useBrainstormSession(
	id: string | null,
	config?: SWRConfiguration<SessionWithMessages>
) {
	return useSWR<SessionWithMessages>(id ? apiRoutes.brainstorm.session(id) : null, fetcher, {
		...config,
		refreshInterval: 0, // Don't auto-refresh, we handle this manually
	})
}

/**
 * API mutation functions (non-SWR)
 */
export const api = {
	users: {
		/**
		 * Update a user
		 */
		update: async (id: string, data: Partial<User>) => {
			return apiRequest<User>(apiRoutes.users.byId(id), {
				method: 'PATCH',
				json: data,
			})
		},

		/**
		 * Create a user (webhook only)
		 */
		create: async (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
			return apiRequest<User>(apiRoutes.users.list, {
				method: 'POST',
				json: data,
			})
		},
	},

	brainstorm: {
		/**
		 * Create a new brainstorm session
		 */
		createSession: async (data: { projectName: string; projectDescription?: string }) => {
			return apiRequest<BrainstormSession>(apiRoutes.brainstorm.sessions, {
				method: 'POST',
				json: data,
			})
		},

		/**
		 * Update a brainstorm session
		 */
		updateSession: async (id: string, data: Partial<BrainstormSession>) => {
			return apiRequest<BrainstormSession>(apiRoutes.brainstorm.session(id), {
				method: 'PATCH',
				json: data,
			})
		},

		/**
		 * Delete a brainstorm session
		 */
		deleteSession: async (id: string) => {
			return apiRequest<{ deleted: boolean }>(apiRoutes.brainstorm.session(id), {
				method: 'DELETE',
			})
		},

		/**
		 * Update document content
		 */
		updateDocument: async (id: string, data: { content: string; title?: string }) => {
			return apiRequest<BrainstormSession>(apiRoutes.brainstorm.document(id), {
				method: 'PATCH',
				json: data,
			})
		},

		/**
		 * Advance to next step
		 */
		advanceStep: async (id: string) => {
			return apiRequest<BrainstormSession>(apiRoutes.brainstorm.advance(id), {
				method: 'POST',
			})
		},

		/**
		 * Complete session
		 */
		completeSession: async (id: string) => {
			return apiRequest<BrainstormSession>(apiRoutes.brainstorm.complete(id), {
				method: 'POST',
			})
		},
	},
}
