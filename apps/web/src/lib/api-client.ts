import type {
	BriefingDocumentType,
	BriefingSession,
	PrdDocumentType,
	PrdSession,
	SmDocumentType,
	SmSession,
	User,
} from '@repo/shared'
import useSWR, { type SWRConfiguration } from 'swr'
import { apiRequest, fetcher } from './api.js'

/**
 * API route constants - centralized route management
 */
export const apiRoutes = {
	users: {
		me: '/api/v1/users/me',
		sync: '/api/v1/users/me/sync',
		list: '/api/v1/users',
		byId: (id: string) => `/api/v1/users/${id}`,
	},
	briefing: {
		sessions: '/api/v1/briefing/sessions',
		session: (id: string) => `/api/v1/briefing/sessions/${id}`,
		chat: '/api/v1/briefing/chat',
		document: (id: string) => `/api/v1/briefing/sessions/${id}/document`,
		documents: (sessionId: string) => `/api/v1/briefing/sessions/${sessionId}/documents`,
		documentById: (id: string) => `/api/v1/briefing/documents/${id}`,
		steps: '/api/v1/briefing/steps',
		advance: (id: string) => `/api/v1/briefing/sessions/${id}/advance`,
		complete: (id: string) => `/api/v1/briefing/sessions/${id}/complete`,
	},
	prd: {
		sessions: '/api/v1/prd/sessions',
		session: (id: string) => `/api/v1/prd/sessions/${id}`,
		chat: '/api/v1/prd/chat',
		document: (id: string) => `/api/v1/prd/sessions/${id}/document`,
		documents: (sessionId: string) => `/api/v1/prd/sessions/${sessionId}/documents`,
		documentById: (id: string) => `/api/v1/prd/documents/${id}`,
		steps: '/api/v1/prd/steps',
		advance: (id: string) => `/api/v1/prd/sessions/${id}/advance`,
		skip: (id: string) => `/api/v1/prd/sessions/${id}/skip`,
		complete: (id: string) => `/api/v1/prd/sessions/${id}/complete`,
	},
	sm: {
		sessions: '/api/v1/sm/sessions',
		session: (id: string) => `/api/v1/sm/sessions/${id}`,
		chat: '/api/v1/sm/chat',
		document: (id: string) => `/api/v1/sm/sessions/${id}/document`,
		documents: (sessionId: string) => `/api/v1/sm/sessions/${sessionId}/documents`,
		documentById: (id: string) => `/api/v1/sm/documents/${id}`,
		epics: (sessionId: string) => `/api/v1/sm/sessions/${sessionId}/epics`,
		epicById: (id: string) => `/api/v1/sm/epics/${id}`,
		stories: (sessionId: string) => `/api/v1/sm/sessions/${sessionId}/stories`,
		storyById: (id: string) => `/api/v1/sm/stories/${id}`,
		advance: (id: string) => `/api/v1/sm/sessions/${id}/advance`,
		complete: (id: string) => `/api/v1/sm/sessions/${id}/complete`,
		prdSessions: '/api/v1/sm/prd-sessions',
	},
	kanban: {
		sessions: '/api/v1/kanban/sessions',
		board: (id: string) => `/api/v1/kanban/sessions/${id}/board`,
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
// BRIEFING HOOKS
// ============================================

/**
 * Typed SWR hook for fetching briefing sessions
 */
export function useBriefingSessions(
	params?: { page?: number; limit?: number },
	config?: SWRConfiguration<BriefingSession[]>
) {
	const queryString = params
		? `?${new URLSearchParams({
				page: String(params.page ?? 1),
				limit: String(params.limit ?? 10),
			})}`
		: ''

	return useSWR<BriefingSession[]>(`${apiRoutes.briefing.sessions}${queryString}`, fetcher, config)
}

/**
 * Briefing document type from API
 */
export type BriefingDocumentFromAPI = {
	id: string
	sessionId: string
	type: BriefingDocumentType
	title: string
	content: string
	version: number
	createdAt: string
	updatedAt: string
}

/**
 * Briefing session with messages and documents type
 */
type BriefingSessionWithMessages = BriefingSession & {
	messages: Array<{
		id: string
		role: string
		content: string
		step: string
		createdAt: string
	}>
	documents: BriefingDocumentFromAPI[]
}

/**
 * Typed SWR hook for fetching a specific briefing session
 */
export function useBriefingSession(
	id: string | null,
	config?: SWRConfiguration<BriefingSessionWithMessages>
) {
	return useSWR<BriefingSessionWithMessages>(id ? apiRoutes.briefing.session(id) : null, fetcher, {
		...config,
		refreshInterval: 0, // Don't auto-refresh, we handle this manually
	})
}

/**
 * Typed SWR hook for fetching documents for a briefing session
 */
export function useBriefingDocuments(
	sessionId: string | null,
	config?: SWRConfiguration<BriefingDocumentFromAPI[]>
) {
	return useSWR<BriefingDocumentFromAPI[]>(
		sessionId ? apiRoutes.briefing.documents(sessionId) : null,
		fetcher,
		config
	)
}

/**
 * API mutation functions (non-SWR)
 */
export const api = {
	users: {
		/**
		 * Sync user name from Clerk to database
		 */
		syncName: async (name: string) => {
			return apiRequest<User>(apiRoutes.users.sync, {
				method: 'PATCH',
				json: { name },
			})
		},

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

	briefing: {
		/**
		 * Create a new briefing session
		 */
		createSession: async (data: {
			projectName: string
			projectDescription?: string
			brainstormSessionId?: string
		}) => {
			return apiRequest<BriefingSession>(apiRoutes.briefing.sessions, {
				method: 'POST',
				json: data,
			})
		},

		/**
		 * Update a briefing session
		 */
		updateSession: async (id: string, data: Partial<BriefingSession>) => {
			return apiRequest<BriefingSession>(apiRoutes.briefing.session(id), {
				method: 'PATCH',
				json: data,
			})
		},

		/**
		 * Delete a briefing session
		 */
		deleteSession: async (id: string) => {
			return apiRequest<{ deleted: boolean }>(apiRoutes.briefing.session(id), {
				method: 'DELETE',
			})
		},

		/**
		 * Update document content
		 */
		updateDocument: async (
			id: string,
			data: { content: string; title?: string; executiveSummary?: string }
		) => {
			return apiRequest<BriefingSession>(apiRoutes.briefing.document(id), {
				method: 'PATCH',
				json: data,
			})
		},

		/**
		 * Advance to next step
		 */
		advanceStep: async (id: string) => {
			return apiRequest<BriefingSession>(apiRoutes.briefing.advance(id), {
				method: 'POST',
			})
		},

		/**
		 * Complete session
		 */
		completeSession: async (id: string) => {
			return apiRequest<BriefingSession>(apiRoutes.briefing.complete(id), {
				method: 'POST',
			})
		},

		/**
		 * Get a specific document
		 */
		getDocument: async (documentId: string) => {
			return apiRequest<BriefingDocumentFromAPI>(apiRoutes.briefing.documentById(documentId), {
				method: 'GET',
			})
		},

		/**
		 * Update a specific document
		 */
		updateDocumentById: async (documentId: string, data: { content: string; title?: string }) => {
			return apiRequest<BriefingDocumentFromAPI>(apiRoutes.briefing.documentById(documentId), {
				method: 'PATCH',
				json: data,
			})
		},

		/**
		 * Delete a specific document
		 */
		deleteDocument: async (documentId: string) => {
			return apiRequest<{ deleted: boolean }>(apiRoutes.briefing.documentById(documentId), {
				method: 'DELETE',
			})
		},
	},

	prd: {
		/**
		 * Create a new PRD session
		 */
		createSession: async (data: {
			projectName: string
			projectDescription?: string
			briefingSessionId?: string
		}) => {
			return apiRequest<PrdSession>(apiRoutes.prd.sessions, {
				method: 'POST',
				json: data,
			})
		},

		/**
		 * Update a PRD session
		 */
		updateSession: async (id: string, data: Partial<PrdSession>) => {
			return apiRequest<PrdSession>(apiRoutes.prd.session(id), {
				method: 'PATCH',
				json: data,
			})
		},

		/**
		 * Delete a PRD session
		 */
		deleteSession: async (id: string) => {
			return apiRequest<{ deleted: boolean }>(apiRoutes.prd.session(id), {
				method: 'DELETE',
			})
		},

		/**
		 * Update document content
		 */
		updateDocument: async (id: string, data: { content: string; title?: string }) => {
			return apiRequest<PrdSession>(apiRoutes.prd.document(id), {
				method: 'PATCH',
				json: data,
			})
		},

		/**
		 * Advance to next step
		 */
		advanceStep: async (id: string) => {
			return apiRequest<PrdSession>(apiRoutes.prd.advance(id), {
				method: 'POST',
			})
		},

		/**
		 * Skip optional step
		 */
		skipStep: async (id: string) => {
			return apiRequest<PrdSession>(apiRoutes.prd.skip(id), {
				method: 'POST',
			})
		},

		/**
		 * Complete session
		 */
		completeSession: async (id: string) => {
			return apiRequest<PrdSession>(apiRoutes.prd.complete(id), {
				method: 'POST',
			})
		},

		/**
		 * Get a specific document
		 */
		getDocument: async (documentId: string) => {
			return apiRequest<PrdDocumentFromAPI>(apiRoutes.prd.documentById(documentId), {
				method: 'GET',
			})
		},

		/**
		 * Update a specific document
		 */
		updateDocumentById: async (documentId: string, data: { content: string; title?: string }) => {
			return apiRequest<PrdDocumentFromAPI>(apiRoutes.prd.documentById(documentId), {
				method: 'PATCH',
				json: data,
			})
		},

		/**
		 * Delete a specific document
		 */
		deleteDocumentById: async (documentId: string) => {
			return apiRequest<{ deleted: boolean }>(apiRoutes.prd.documentById(documentId), {
				method: 'DELETE',
			})
		},
	},

	sm: {
		/**
		 * Create a new SM session
		 */
		createSession: async (data: {
			projectName: string
			projectDescription?: string
			prdSessionId?: string
		}) => {
			return apiRequest<SmSession>(apiRoutes.sm.sessions, {
				method: 'POST',
				json: data,
			})
		},

		/**
		 * Update an SM session
		 */
		updateSession: async (id: string, data: Partial<SmSession>) => {
			return apiRequest<SmSession>(apiRoutes.sm.session(id), {
				method: 'PATCH',
				json: data,
			})
		},

		/**
		 * Delete an SM session
		 */
		deleteSession: async (id: string) => {
			return apiRequest<{ deleted: boolean }>(apiRoutes.sm.session(id), {
				method: 'DELETE',
			})
		},

		/**
		 * Advance to next step
		 */
		advanceStep: async (id: string) => {
			return apiRequest<SmSession>(apiRoutes.sm.advance(id), {
				method: 'POST',
			})
		},

		/**
		 * Complete session
		 */
		completeSession: async (id: string) => {
			return apiRequest<SmSession>(apiRoutes.sm.complete(id), {
				method: 'POST',
			})
		},

		/**
		 * Get a specific document
		 */
		getDocument: async (documentId: string) => {
			return apiRequest<SmDocumentFromAPI>(apiRoutes.sm.documentById(documentId), {
				method: 'GET',
			})
		},

		/**
		 * Update a specific document
		 */
		updateDocumentById: async (documentId: string, data: { content: string; title?: string }) => {
			return apiRequest<SmDocumentFromAPI>(apiRoutes.sm.documentById(documentId), {
				method: 'PATCH',
				json: data,
			})
		},

		/**
		 * Delete a specific document
		 */
		deleteDocumentById: async (documentId: string) => {
			return apiRequest<{ deleted: boolean }>(apiRoutes.sm.documentById(documentId), {
				method: 'DELETE',
			})
		},

		/**
		 * Update a story (used for Kanban drag-drop and edit)
		 */
		updateStory: async (
			storyId: string,
			data: {
				status?: string
				priority?: string
				targetSprint?: number | null
				storyPoints?: number | null
				title?: string
				asA?: string
				iWant?: string
				soThat?: string
			}
		) => {
			return apiRequest<KanbanStory>(apiRoutes.sm.storyById(storyId), {
				method: 'PATCH',
				json: data,
			})
		},
	},
}

// ============================================
// PRD HOOKS
// ============================================

/**
 * PRD document type from API
 */
export type PrdDocumentFromAPI = {
	id: string
	sessionId: string
	type: PrdDocumentType
	title: string
	content: string
	version: number
	createdAt: string
	updatedAt: string
}

/**
 * PRD session with messages and documents type
 */
type PrdSessionWithMessages = PrdSession & {
	messages: Array<{
		id: string
		role: string
		content: string
		step: string
		createdAt: string
	}>
	documents: PrdDocumentFromAPI[]
}

/**
 * Typed SWR hook for fetching PRD sessions
 */
export function usePrdSessions(
	params?: { page?: number; limit?: number },
	config?: SWRConfiguration<PrdSession[]>
) {
	const queryString = params
		? `?${new URLSearchParams({
				page: String(params.page ?? 1),
				limit: String(params.limit ?? 10),
			})}`
		: ''

	return useSWR<PrdSession[]>(`${apiRoutes.prd.sessions}${queryString}`, fetcher, config)
}

/**
 * Typed SWR hook for fetching a specific PRD session
 */
export function usePrdSession(
	id: string | null,
	config?: SWRConfiguration<PrdSessionWithMessages>
) {
	return useSWR<PrdSessionWithMessages>(id ? apiRoutes.prd.session(id) : null, fetcher, {
		...config,
		refreshInterval: 0, // Don't auto-refresh, we handle this manually
	})
}

/**
 * Typed SWR hook for fetching documents for a PRD session
 */
export function usePrdDocuments(
	sessionId: string | null,
	config?: SWRConfiguration<PrdDocumentFromAPI[]>
) {
	return useSWR<PrdDocumentFromAPI[]>(
		sessionId ? apiRoutes.prd.documents(sessionId) : null,
		fetcher,
		config
	)
}

// ============================================
// SM (Story Manager) HOOKS
// ============================================

/**
 * SM document type from API
 */
export type SmDocumentFromAPI = {
	id: string
	sessionId: string
	type: SmDocumentType
	title: string
	content: string
	version: number
	createdAt: string
	updatedAt: string
}

/**
 * SM session with messages, epics, stories and documents type
 */
type SmSessionWithMessages = SmSession & {
	messages: Array<{
		id: string
		role: string
		content: string
		step: string
		createdAt: string
	}>
	epics: Array<{
		id: string
		number: number
		title: string
		description: string
		status: string
		priority: string
	}>
	stories: Array<{
		id: string
		storyKey: string
		title: string
		status: string
		priority: string
		storyPoints: number | null
		targetSprint: number | null
		asA: string | null
		iWant: string | null
		soThat: string | null
	}>
	documents: SmDocumentFromAPI[]
}

/**
 * Typed SWR hook for fetching SM sessions
 */
export function useSmSessions(
	params?: { page?: number; limit?: number },
	config?: SWRConfiguration<SmSession[]>
) {
	const queryString = params
		? `?${new URLSearchParams({
				page: String(params.page ?? 1),
				limit: String(params.limit ?? 10),
			})}`
		: ''

	return useSWR<SmSession[]>(`${apiRoutes.sm.sessions}${queryString}`, fetcher, config)
}

/**
 * Typed SWR hook for fetching a specific SM session
 */
export function useSmSession(id: string | null, config?: SWRConfiguration<SmSessionWithMessages>) {
	return useSWR<SmSessionWithMessages>(id ? apiRoutes.sm.session(id) : null, fetcher, {
		...config,
		refreshInterval: 0,
	})
}

/**
 * Typed SWR hook for fetching documents for an SM session
 */
export function useSmDocuments(
	sessionId: string | null,
	config?: SWRConfiguration<SmDocumentFromAPI[]>
) {
	return useSWR<SmDocumentFromAPI[]>(
		sessionId ? apiRoutes.sm.documents(sessionId) : null,
		fetcher,
		config
	)
}

/**
 * Available PRD sessions for linking (completed PRDs)
 */
type SmPrdSessionOption = {
	id: string
	projectName: string
	projectType: string | null
	domain: string | null
	createdAt: string
	updatedAt: string
}

/**
 * Typed SWR hook for fetching available PRD sessions for SM
 */
export function useSmPrdSessions(config?: SWRConfiguration<SmPrdSessionOption[]>) {
	return useSWR<SmPrdSessionOption[]>(apiRoutes.sm.prdSessions, fetcher, config)
}

// ============================================
// KANBAN HOOKS
// ============================================

/**
 * Kanban project (SM session with stories)
 */
export type KanbanProject = {
	id: string
	projectName: string
	projectDescription: string | null
	status: string
	totalEpics: number
	totalStories: number
	totalStoryPoints: number
	createdAt: string
	updatedAt: string
}

/**
 * Kanban epic
 */
export type KanbanEpic = {
	id: string
	number: number
	title: string
	description: string
	status: string
	priority: string
	targetSprint: number | null
	estimatedStoryPoints: number | null
}

/**
 * Kanban story (card)
 */
export type KanbanStory = {
	id: string
	epicId: string
	epicNumber: number
	storyNumber: number
	storyKey: string
	title: string
	asA: string
	iWant: string
	soThat: string
	status: 'backlog' | 'ready_for_dev' | 'in_progress' | 'review' | 'done'
	priority: 'critical' | 'high' | 'medium' | 'low'
	storyPoints: number | null
	targetSprint: number | null
}

/**
 * Kanban board data
 */
export type KanbanBoardData = {
	session: {
		id: string
		projectName: string
		projectDescription: string | null
		status: string
		totalEpics: number
		totalStories: number
		totalStoryPoints: number
		sprintConfig: {
			sprintDuration: number
			velocityEstimate?: number
			startDate?: string
			teamSize?: number
		} | null
	}
	epics: KanbanEpic[]
	stories: KanbanStory[]
	columnStats: {
		backlog: number
		ready_for_dev: number
		in_progress: number
		review: number
		done: number
	}
	filters: {
		sprints: (number | null)[]
		priorities: readonly ['critical', 'high', 'medium', 'low']
	}
}

/**
 * Typed SWR hook for fetching Kanban projects (SM sessions with stories)
 */
export function useKanbanProjects(
	params?: { page?: number; limit?: number },
	config?: SWRConfiguration<KanbanProject[]>
) {
	const queryString = params
		? `?${new URLSearchParams({
				page: String(params.page ?? 1),
				limit: String(params.limit ?? 50),
			})}`
		: ''

	return useSWR<KanbanProject[]>(`${apiRoutes.kanban.sessions}${queryString}`, fetcher, config)
}

/**
 * Typed SWR hook for fetching Kanban board data
 */
export function useKanbanBoard(id: string | null, config?: SWRConfiguration<KanbanBoardData>) {
	return useSWR<KanbanBoardData>(id ? apiRoutes.kanban.board(id) : null, fetcher, {
		...config,
		refreshInterval: 0,
	})
}
