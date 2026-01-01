import { zValidator } from '@hono/zod-validator'
import {
	db,
	prdSessions,
	smDocuments,
	smEpics,
	smMessages,
	smSessions,
	smStories,
	users,
} from '@repo/db'
import {
	CreateSmDocumentSchema,
	CreateSmEpicSchema,
	CreateSmSessionSchema,
	CreateSmStorySchema,
	PaginationSchema,
	SmChatRequestSchema,
	UpdateSmDocumentSchema,
	UpdateSmEpicSchema,
	UpdateSmSessionSchema,
	UpdateSmStorySchema,
} from '@repo/shared'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { getOpenRouterClient, OpenRouterAPIError } from '../lib/openrouter.js'
import { commonErrors, successResponse } from '../lib/response.js'
import {
	buildSmDocumentPrompt,
	buildSmSystemPrompt,
	buildSmWelcomeMessage,
	getNextStep,
	SM_STEPS_ORDER,
} from '../lib/sm-prompts.js'
import { type AuthVariables, authMiddleware, getAuth } from '../middleware/auth.js'

export const smRoutes = new Hono<{ Variables: AuthVariables }>()

// ============================================
// HELPER: Get user by clerkId
// ============================================

async function getUserByClerkId(clerkId: string) {
	return db.query.users.findFirst({
		where: eq(users.clerkId, clerkId),
	})
}

// ============================================
// SESSION CRUD ENDPOINTS
// ============================================

// List user's SM sessions
smRoutes.get('/sessions', authMiddleware, zValidator('query', PaginationSchema), async (c) => {
	const { userId } = getAuth(c)
	const { page, limit } = c.req.valid('query')
	const offset = (page - 1) * limit

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const [sessions, countResult] = await Promise.all([
		db.query.smSessions.findMany({
			where: eq(smSessions.userId, user.id),
			limit,
			offset,
			orderBy: [desc(smSessions.updatedAt)],
		}),
		db
			.select({ count: sql<number>`count(*)` })
			.from(smSessions)
			.where(eq(smSessions.userId, user.id)),
	])

	return successResponse(c, sessions, 200, {
		page,
		limit,
		total: Number(countResult[0]?.count ?? 0),
	})
})

// Get single session with messages, epics, stories and documents
smRoutes.get('/sessions/:id', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const session = await db.query.smSessions.findFirst({
		where: and(eq(smSessions.id, sessionId), eq(smSessions.userId, user.id)),
		with: {
			messages: {
				orderBy: [desc(smMessages.createdAt)],
				limit: 100,
			},
			epics: {
				orderBy: [asc(smEpics.number)],
			},
			stories: {
				orderBy: [asc(smStories.epicNumber), asc(smStories.storyNumber)],
			},
			documents: {
				orderBy: [desc(smDocuments.createdAt)],
			},
		},
	})

	if (!session) {
		return commonErrors.notFound(c, 'Session not found')
	}

	// Reverse messages to chronological order
	const messagesChronological = session.messages.reverse()

	return successResponse(c, {
		...session,
		messages: messagesChronological,
	})
})

// Create new session
smRoutes.post('/sessions', authMiddleware, zValidator('json', CreateSmSessionSchema), async (c) => {
	const { userId } = getAuth(c)
	const data = c.req.valid('json')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	// Check for linked PRD session and load context
	let hasPrd = false
	let prdContext = {}
	if (data.prdSessionId) {
		const prd = await db.query.prdSessions.findFirst({
			where: and(eq(prdSessions.id, data.prdSessionId), eq(prdSessions.userId, user.id)),
		})
		if (prd) {
			hasPrd = true
			prdContext = {
				projectType: prd.projectType,
				domain: prd.domain,
				executiveSummary: prd.executiveSummary,
				features: prd.features ?? [],
				functionalRequirements: prd.functionalRequirements ?? [],
				nonFunctionalRequirements: prd.nonFunctionalRequirements ?? [],
				personas: prd.personas ?? [],
			}
		}
	}

	// Create session
	const [newSession] = await db
		.insert(smSessions)
		.values({
			userId: user.id,
			projectName: data.projectName,
			projectDescription: data.projectDescription,
			prdSessionId: data.prdSessionId,
			prdContext,
			sprintConfig: data.sprintConfig ?? { sprintDuration: 14 },
		})
		.returning()

	if (!newSession) {
		return commonErrors.internalError(c, 'Failed to create session')
	}

	// Create welcome message from Bob
	const welcomeMessage = buildSmWelcomeMessage(data.projectName, data.projectDescription, hasPrd)

	await db.insert(smMessages).values({
		sessionId: newSession.id,
		role: 'assistant',
		content: welcomeMessage,
		step: 'init',
	})

	// Get session with messages
	const sessionWithMessages = await db.query.smSessions.findFirst({
		where: eq(smSessions.id, newSession.id),
		with: {
			messages: {
				orderBy: [desc(smMessages.createdAt)],
			},
		},
	})

	return successResponse(
		c,
		{
			...sessionWithMessages,
			messages: sessionWithMessages?.messages.reverse() ?? [],
		},
		201
	)
})

// Update session
smRoutes.patch(
	'/sessions/:id',
	authMiddleware,
	zValidator('json', UpdateSmSessionSchema),
	async (c) => {
		const { userId } = getAuth(c)
		const sessionId = c.req.param('id')
		const data = c.req.valid('json')

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		const [session] = await db
			.update(smSessions)
			.set({ ...data, updatedAt: new Date() })
			.where(and(eq(smSessions.id, sessionId), eq(smSessions.userId, user.id)))
			.returning()

		if (!session) {
			return commonErrors.notFound(c, 'Session not found')
		}

		return successResponse(c, session)
	}
)

// Delete session
smRoutes.delete('/sessions/:id', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const [deleted] = await db
		.delete(smSessions)
		.where(and(eq(smSessions.id, sessionId), eq(smSessions.userId, user.id)))
		.returning()

	if (!deleted) {
		return commonErrors.notFound(c, 'Session not found')
	}

	return successResponse(c, { deleted: true })
})

// ============================================
// CHAT ENDPOINT (STREAMING)
// ============================================

smRoutes.post('/chat', authMiddleware, zValidator('json', SmChatRequestSchema), async (c) => {
	const { userId } = getAuth(c)
	const { sessionId, message, action } = c.req.valid('json')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	// Get session with messages and related data
	const session = await db.query.smSessions.findFirst({
		where: and(eq(smSessions.id, sessionId), eq(smSessions.userId, user.id)),
		with: {
			messages: {
				orderBy: [desc(smMessages.createdAt)],
				limit: 50,
			},
			epics: {
				orderBy: [asc(smEpics.number)],
			},
			stories: {
				orderBy: [asc(smStories.epicNumber), asc(smStories.storyNumber)],
			},
		},
	})

	if (!session) {
		return commonErrors.notFound(c, 'Session not found')
	}

	// Save user message
	await db.insert(smMessages).values({
		sessionId,
		role: 'user',
		content: message,
		step: session.currentStep,
	})

	// Determine mode based on action
	let mode: 'advanced_elicitation' | 'party_mode' | undefined
	if (action === 'advanced_elicitation') mode = 'advanced_elicitation'
	if (action === 'party_mode') mode = 'party_mode'

	// Build epics context
	const epicsContext = session.epics.map((e) => ({
		number: e.number,
		title: e.title,
		description: e.description,
		status: e.status,
		storiesCount: session.stories.filter((s) => s.epicId === e.id).length,
	}))

	// Build stories context
	const storiesContext = session.stories.map((s) => ({
		storyKey: s.storyKey,
		title: s.title,
		status: s.status,
		storyPoints: s.storyPoints,
	}))

	// Build system prompt with session context
	const systemPrompt = buildSmSystemPrompt(
		{
			projectName: session.projectName,
			projectDescription: session.projectDescription,
			prdContext: session.prdContext ?? undefined,
			sprintConfig: session.sprintConfig ?? undefined,
			stepsCompleted: session.stepsCompleted ?? [],
			totalEpics: session.totalEpics,
			totalStories: session.totalStories,
			epics: epicsContext,
			stories: storiesContext,
		},
		session.currentStep,
		mode
	)

	// Build conversation history
	const historyMessages = session.messages
		.reverse()
		.filter((m) => m.role !== 'system')
		.map((m) => ({
			role: m.role as 'user' | 'assistant',
			content: m.content,
		}))

	const llmMessages = [
		{ role: 'system' as const, content: systemPrompt },
		...historyMessages,
		{ role: 'user' as const, content: message },
	]

	// Stream response
	return streamSSE(c, async (stream) => {
		try {
			const client = getOpenRouterClient()
			let fullResponse = ''

			const generator = client.chatStream({
				messages: llmMessages,
				model: 'deepseek/deepseek-chat-v3-0324',
				temperature: 0.7,
				max_tokens: 2048,
			})

			for await (const chunk of generator) {
				fullResponse += chunk
				await stream.writeSSE({
					data: JSON.stringify({ content: chunk }),
				})
			}

			// Save assistant response
			await db.insert(smMessages).values({
				sessionId,
				role: 'assistant',
				content: fullResponse,
				step: session.currentStep,
			})

			// Auto-detect step transitions
			let newStep = session.currentStep
			const newStepsCompleted = [...(session.stepsCompleted ?? [])]

			// Normalize text for comparison
			const normalizedResponse = fullResponse
				.toLowerCase()
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')

			// Check for explicit action to advance
			if (action === 'advance_step') {
				const nextStep = getNextStep(session.currentStep)
				if (nextStep) {
					newStep = nextStep
					if (!newStepsCompleted.includes(session.currentStep)) {
						newStepsCompleted.push(session.currentStep)
					}
				}
			} else {
				// Auto-detect transitions based on keywords
				const transitionKeywords: Record<string, string[]> = {
					epics: [
						'vamos definir os **epics',
						'agrupamentos logicos',
						'definir epics',
						'agora os epics',
					],
					stories: [
						'vamos criar as **user stories',
						'criar stories',
						'user stories para cada epic',
						'agora as stories',
					],
					details: [
						'vamos **detalhar',
						'acceptance criteria',
						'tasks e dev notes',
						'detalhar stories',
					],
					planning: [
						'sprint planning',
						'organizar em sprints',
						'planejar sprints',
						'alocacao em sprints',
					],
					review: [
						'revisao final',
						'validar planejamento',
						'vamos fazer uma **revisao',
						'checklist de validacao',
					],
					complete: [
						'planejamento completo',
						'gerar documentacao',
						'vamos **gerar',
						'documentacao final',
					],
				}

				for (const [targetStep, keywords] of Object.entries(transitionKeywords)) {
					if (keywords.some((kw) => normalizedResponse.includes(kw))) {
						const targetIndex = SM_STEPS_ORDER.indexOf(targetStep as typeof newStep)
						const currentIndex = SM_STEPS_ORDER.indexOf(session.currentStep)

						if (targetIndex === currentIndex + 1) {
							if (!newStepsCompleted.includes(session.currentStep)) {
								newStepsCompleted.push(session.currentStep)
							}
							newStep = targetStep as typeof newStep
							break
						}
					}
				}
			}

			// Update session
			const updateData: {
				updatedAt: Date
				currentStep?: typeof newStep
				stepsCompleted?: string[]
				status?: 'completed'
				completedAt?: Date
				totalEpics?: number
				totalStories?: number
				totalStoryPoints?: number
			} = {
				updatedAt: new Date(),
			}

			if (newStep !== session.currentStep) {
				updateData.currentStep = newStep
				updateData.stepsCompleted = newStepsCompleted
			}

			// Update totals
			updateData.totalEpics = session.epics.length
			updateData.totalStories = session.stories.length
			updateData.totalStoryPoints = session.stories.reduce(
				(sum, s) => sum + (s.storyPoints ?? 0),
				0
			)

			// Mark as completed if reaching complete step
			if (newStep === 'complete' && session.status !== 'completed') {
				updateData.status = 'completed'
				updateData.completedAt = new Date()
			}

			await db.update(smSessions).set(updateData).where(eq(smSessions.id, sessionId))

			await stream.writeSSE({ data: '[DONE]' })
		} catch (error) {
			if (error instanceof OpenRouterAPIError) {
				await stream.writeSSE({
					data: JSON.stringify({
						error: { code: error.code, message: error.message },
					}),
				})
			} else {
				await stream.writeSSE({
					data: JSON.stringify({
						error: { message: 'Failed to generate response' },
					}),
				})
			}
		}
	})
})

// ============================================
// EPIC ENDPOINTS
// ============================================

// Create epic
smRoutes.post(
	'/sessions/:id/epics',
	authMiddleware,
	zValidator('json', CreateSmEpicSchema),
	async (c) => {
		const { userId } = getAuth(c)
		const sessionId = c.req.param('id')
		const data = c.req.valid('json')

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		// Verify session belongs to user
		const session = await db.query.smSessions.findFirst({
			where: and(eq(smSessions.id, sessionId), eq(smSessions.userId, user.id)),
		})

		if (!session) {
			return commonErrors.notFound(c, 'Session not found')
		}

		const [epic] = await db
			.insert(smEpics)
			.values({
				sessionId,
				...data,
			})
			.returning()

		// Update session totals
		await db
			.update(smSessions)
			.set({
				totalEpics: sql`${smSessions.totalEpics} + 1`,
				updatedAt: new Date(),
			})
			.where(eq(smSessions.id, sessionId))

		return successResponse(c, epic, 201)
	}
)

// Update epic
smRoutes.patch('/epics/:id', authMiddleware, zValidator('json', UpdateSmEpicSchema), async (c) => {
	const { userId } = getAuth(c)
	const epicId = c.req.param('id')
	const data = c.req.valid('json')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	// Get epic with session
	const epic = await db.query.smEpics.findFirst({
		where: eq(smEpics.id, epicId),
		with: {
			session: true,
		},
	})

	if (!epic) {
		return commonErrors.notFound(c, 'Epic not found')
	}

	if (epic.session.userId !== user.id) {
		return commonErrors.forbidden(c, 'Access denied')
	}

	const [updated] = await db
		.update(smEpics)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(smEpics.id, epicId))
		.returning()

	return successResponse(c, updated)
})

// Delete epic
smRoutes.delete('/epics/:id', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const epicId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const epic = await db.query.smEpics.findFirst({
		where: eq(smEpics.id, epicId),
		with: {
			session: true,
		},
	})

	if (!epic) {
		return commonErrors.notFound(c, 'Epic not found')
	}

	if (epic.session.userId !== user.id) {
		return commonErrors.forbidden(c, 'Access denied')
	}

	await db.delete(smEpics).where(eq(smEpics.id, epicId))

	// Update session totals
	await db
		.update(smSessions)
		.set({
			totalEpics: sql`GREATEST(${smSessions.totalEpics} - 1, 0)`,
			updatedAt: new Date(),
		})
		.where(eq(smSessions.id, epic.sessionId))

	return successResponse(c, { deleted: true })
})

// ============================================
// STORY ENDPOINTS
// ============================================

// Create story
smRoutes.post(
	'/sessions/:id/stories',
	authMiddleware,
	zValidator('json', CreateSmStorySchema),
	async (c) => {
		const { userId } = getAuth(c)
		const sessionId = c.req.param('id')
		const data = c.req.valid('json')

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		// Verify session belongs to user
		const session = await db.query.smSessions.findFirst({
			where: and(eq(smSessions.id, sessionId), eq(smSessions.userId, user.id)),
		})

		if (!session) {
			return commonErrors.notFound(c, 'Session not found')
		}

		// Verify epic belongs to session
		const epic = await db.query.smEpics.findFirst({
			where: and(eq(smEpics.id, data.epicId), eq(smEpics.sessionId, sessionId)),
		})

		if (!epic) {
			return commonErrors.notFound(c, 'Epic not found')
		}

		const storyKey = `${data.epicNumber}-${data.storyNumber}`

		const [story] = await db
			.insert(smStories)
			.values({
				sessionId,
				storyKey,
				...data,
			})
			.returning()

		// Update session totals
		const storyPoints = data.storyPoints ?? 0
		await db
			.update(smSessions)
			.set({
				totalStories: sql`${smSessions.totalStories} + 1`,
				totalStoryPoints: sql`${smSessions.totalStoryPoints} + ${storyPoints}`,
				updatedAt: new Date(),
			})
			.where(eq(smSessions.id, sessionId))

		return successResponse(c, story, 201)
	}
)

// Update story
smRoutes.patch(
	'/stories/:id',
	authMiddleware,
	zValidator('json', UpdateSmStorySchema),
	async (c) => {
		const { userId } = getAuth(c)
		const storyId = c.req.param('id')
		const data = c.req.valid('json')

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		// Get story with session
		const story = await db.query.smStories.findFirst({
			where: eq(smStories.id, storyId),
			with: {
				session: true,
			},
		})

		if (!story) {
			return commonErrors.notFound(c, 'Story not found')
		}

		if (story.session.userId !== user.id) {
			return commonErrors.forbidden(c, 'Access denied')
		}

		const [updated] = await db
			.update(smStories)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(smStories.id, storyId))
			.returning()

		return successResponse(c, updated)
	}
)

// Delete story
smRoutes.delete('/stories/:id', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const storyId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const story = await db.query.smStories.findFirst({
		where: eq(smStories.id, storyId),
		with: {
			session: true,
		},
	})

	if (!story) {
		return commonErrors.notFound(c, 'Story not found')
	}

	if (story.session.userId !== user.id) {
		return commonErrors.forbidden(c, 'Access denied')
	}

	const storyPoints = story.storyPoints ?? 0

	await db.delete(smStories).where(eq(smStories.id, storyId))

	// Update session totals
	await db
		.update(smSessions)
		.set({
			totalStories: sql`GREATEST(${smSessions.totalStories} - 1, 0)`,
			totalStoryPoints: sql`GREATEST(${smSessions.totalStoryPoints} - ${storyPoints}, 0)`,
			updatedAt: new Date(),
		})
		.where(eq(smSessions.id, story.sessionId))

	return successResponse(c, { deleted: true })
})

// ============================================
// DOCUMENT ENDPOINTS
// ============================================

// Generate document from session
smRoutes.post(
	'/sessions/:id/document',
	authMiddleware,
	zValidator('json', CreateSmDocumentSchema.optional()),
	async (c) => {
		const { userId } = getAuth(c)
		const sessionId = c.req.param('id')
		const body = c.req.valid('json')
		const docType = body?.type ?? 'full_planning'

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		// Get session with all data
		const session = await db.query.smSessions.findFirst({
			where: and(eq(smSessions.id, sessionId), eq(smSessions.userId, user.id)),
			with: {
				epics: {
					orderBy: [asc(smEpics.number)],
				},
				stories: {
					orderBy: [asc(smStories.epicNumber), asc(smStories.storyNumber)],
				},
			},
		})

		if (!session) {
			return commonErrors.notFound(c, 'Session not found')
		}

		// Check if document of this type already exists
		const existingDoc = await db.query.smDocuments.findFirst({
			where: and(eq(smDocuments.sessionId, sessionId), eq(smDocuments.type, docType)),
			orderBy: [desc(smDocuments.version)],
		})
		const nextVersion = existingDoc ? existingDoc.version + 1 : 1

		// Stream document generation
		return streamSSE(c, async (stream) => {
			try {
				const client = getOpenRouterClient()
				let fullDocument = ''

				const epicsData = session.epics.map((e) => ({
					number: e.number,
					title: e.title,
					description: e.description,
					businessValue: e.businessValue,
				}))

				const storiesData = session.stories.map((s) => ({
					storyKey: s.storyKey,
					title: s.title,
					asA: s.asA,
					iWant: s.iWant,
					soThat: s.soThat,
					acceptanceCriteria: s.acceptanceCriteria ?? [],
					tasks: s.tasks ?? [],
					devNotes: s.devNotes ?? undefined,
					storyPoints: s.storyPoints,
					priority: s.priority,
					status: s.status,
				}))

				const prompt = buildSmDocumentPrompt(
					{
						projectName: session.projectName,
						projectDescription: session.projectDescription,
						prdContext: session.prdContext ?? undefined,
						sprintConfig: session.sprintConfig ?? undefined,
					},
					epicsData,
					storiesData
				)

				const generator = client.chatStream({
					messages: [{ role: 'user', content: prompt }],
					model: 'deepseek/deepseek-chat-v3-0324',
					temperature: 0.5,
					max_tokens: 8192,
				})

				for await (const chunk of generator) {
					fullDocument += chunk
					await stream.writeSSE({
						data: JSON.stringify({ content: chunk }),
					})
				}

				// Define title based on document type
				const docTitles: Record<string, string> = {
					sprint_backlog: `Sprint Backlog: ${session.projectName}`,
					epic_document: `Epic Document: ${session.projectName}`,
					story_document: `Story Document: ${session.projectName}`,
					sprint_planning: `Sprint Planning: ${session.projectName}`,
					full_planning: `Full Planning: ${session.projectName}`,
					custom: body?.title ?? `Custom Document: ${session.projectName}`,
				}

				// Save to sm_documents table
				const [newDoc] = await db
					.insert(smDocuments)
					.values({
						sessionId,
						type: docType,
						title: docTitles[docType] ?? `Document: ${session.projectName}`,
						content: fullDocument,
						version: nextVersion,
					})
					.returning()

				// Also update session
				await db
					.update(smSessions)
					.set({
						documentContent: fullDocument,
						documentTitle: docTitles[docType],
						currentStep: 'complete',
						status: 'completed',
						completedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(eq(smSessions.id, sessionId))

				await stream.writeSSE({
					data: JSON.stringify({
						done: true,
						document: newDoc,
					}),
				})
				await stream.writeSSE({ data: '[DONE]' })
			} catch (error) {
				if (error instanceof OpenRouterAPIError) {
					await stream.writeSSE({
						data: JSON.stringify({
							error: { code: error.code, message: error.message },
						}),
					})
				} else {
					await stream.writeSSE({
						data: JSON.stringify({
							error: { message: 'Failed to generate document' },
						}),
					})
				}
			}
		})
	}
)

// List all documents for a session
smRoutes.get('/sessions/:id/documents', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const session = await db.query.smSessions.findFirst({
		where: and(eq(smSessions.id, sessionId), eq(smSessions.userId, user.id)),
	})

	if (!session) {
		return commonErrors.notFound(c, 'Session not found')
	}

	const documents = await db.query.smDocuments.findMany({
		where: eq(smDocuments.sessionId, sessionId),
		orderBy: [desc(smDocuments.createdAt)],
	})

	return successResponse(c, documents)
})

// Get a specific document
smRoutes.get('/documents/:id', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const documentId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const document = await db.query.smDocuments.findFirst({
		where: eq(smDocuments.id, documentId),
		with: {
			session: true,
		},
	})

	if (!document) {
		return commonErrors.notFound(c, 'Document not found')
	}

	if (document.session.userId !== user.id) {
		return commonErrors.forbidden(c, 'Access denied')
	}

	return successResponse(c, document)
})

// Update a specific document
smRoutes.patch(
	'/documents/:id',
	authMiddleware,
	zValidator('json', UpdateSmDocumentSchema),
	async (c) => {
		const { userId } = getAuth(c)
		const documentId = c.req.param('id')
		const { content, title } = c.req.valid('json')

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		const document = await db.query.smDocuments.findFirst({
			where: eq(smDocuments.id, documentId),
			with: {
				session: true,
			},
		})

		if (!document) {
			return commonErrors.notFound(c, 'Document not found')
		}

		if (document.session.userId !== user.id) {
			return commonErrors.forbidden(c, 'Access denied')
		}

		const [updated] = await db
			.update(smDocuments)
			.set({
				content,
				...(title && { title }),
				updatedAt: new Date(),
			})
			.where(eq(smDocuments.id, documentId))
			.returning()

		return successResponse(c, updated)
	}
)

// Delete a specific document
smRoutes.delete('/documents/:id', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const documentId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const document = await db.query.smDocuments.findFirst({
		where: eq(smDocuments.id, documentId),
		with: {
			session: true,
		},
	})

	if (!document) {
		return commonErrors.notFound(c, 'Document not found')
	}

	if (document.session.userId !== user.id) {
		return commonErrors.forbidden(c, 'Access denied')
	}

	await db.delete(smDocuments).where(eq(smDocuments.id, documentId))

	return successResponse(c, { deleted: true })
})

// ============================================
// UTILITY ENDPOINTS
// ============================================

// Get available PRD sessions for linking
smRoutes.get('/prd-sessions', authMiddleware, async (c) => {
	const { userId } = getAuth(c)

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	// Get completed PRD sessions
	const prds = await db.query.prdSessions.findMany({
		where: and(eq(prdSessions.userId, user.id), eq(prdSessions.status, 'completed')),
		orderBy: [desc(prdSessions.updatedAt)],
		columns: {
			id: true,
			projectName: true,
			projectType: true,
			domain: true,
			createdAt: true,
			updatedAt: true,
		},
	})

	return successResponse(c, prds)
})

// Advance to next step
smRoutes.post('/sessions/:id/advance', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const session = await db.query.smSessions.findFirst({
		where: and(eq(smSessions.id, sessionId), eq(smSessions.userId, user.id)),
	})

	if (!session) {
		return commonErrors.notFound(c, 'Session not found')
	}

	const nextStep = getNextStep(session.currentStep)

	if (!nextStep) {
		return commonErrors.badRequest(c, 'Already at final step')
	}

	const stepsCompleted = [...(session.stepsCompleted ?? [])]
	if (!stepsCompleted.includes(session.currentStep)) {
		stepsCompleted.push(session.currentStep)
	}

	const isCompleted = nextStep === 'complete'

	const [updated] = await db
		.update(smSessions)
		.set({
			currentStep: nextStep,
			stepsCompleted,
			...(isCompleted && { status: 'completed', completedAt: new Date() }),
			updatedAt: new Date(),
		})
		.where(eq(smSessions.id, sessionId))
		.returning()

	return successResponse(c, updated)
})

// Complete session
smRoutes.post('/sessions/:id/complete', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const [session] = await db
		.update(smSessions)
		.set({
			status: 'completed',
			completedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(and(eq(smSessions.id, sessionId), eq(smSessions.userId, user.id)))
		.returning()

	if (!session) {
		return commonErrors.notFound(c, 'Session not found')
	}

	return successResponse(c, session)
})
