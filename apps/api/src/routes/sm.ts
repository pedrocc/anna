import { zValidator } from '@hono/zod-validator'
import {
	briefingSessions,
	db,
	prdSessions,
	smDocuments,
	smEpics,
	smMessages,
	smSessions,
	smStories,
} from '@repo/db'
import type { SmStep } from '@repo/shared'
import {
	CreateSmDocumentSchema,
	CreateSmEpicSchema,
	CreateSmSessionSchema,
	CreateSmStoriesBatchSchema,
	CreateSmStorySchema,
	EditSmMessageRequestSchema,
	PaginationSchema,
	RenameSessionSchema,
	SessionIdParamSchema,
	SmChatRequestSchema,
	UpdateSmDocumentSchema,
	UpdateSmEpicSchema,
	UpdateSmSessionSchema,
	UpdateSmStorySchema,
} from '@repo/shared'
import { and, asc, desc, eq, gte, inArray, ne, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { getUserByClerkId } from '../lib/helpers.js'
import { createLogger } from '../lib/logger.js'
import { getOpenRouterClient, OpenRouterAPIError } from '../lib/openrouter.js'

const smLogger = createLogger('sm')

import { commonErrors, successResponse } from '../lib/response.js'
import { enrichStoriesFromConversation } from '../lib/sm-enrichment.js'
import {
	cleanResponseForDisplay,
	extractSmDataFromResponse,
	transformEpicForInsert,
	transformStoryForInsert,
} from '../lib/sm-extraction.js'
import {
	buildSmDocumentPrompt,
	buildSmSystemPrompt,
	buildSmWelcomeMessage,
	getNextStep,
	SM_STEPS_ORDER,
} from '../lib/sm-prompts.js'
import { type AuthVariables, authMiddleware, getAuth } from '../middleware/auth.js'
import { rateLimiter } from '../middleware/rate-limiter.js'

export const smRoutes = new Hono<{ Variables: AuthVariables }>()

// ============================================
// STEP COMPLETION PATTERNS (Auto-detect transitions)
// ============================================

// Padrões de linguagem natural para detecção automática de transições
// Nota: patterns testados contra string normalizada (lowercase, sem acentos)
const stepCompletionPatterns: Record<SmStep, RegExp[]> = {
	init: [
		// Marcador legado (compatibilidade)
		/\[avancar:\s*epics\]/i,
		// Padrões naturais
		/vamos\s+(para\s+)?(os\s+)?epics/i,
		/avanc(ar|ando)\s+para\s+(os\s+)?epics/i,
		/comecar\s+(a\s+)?(definir\s+)?(os\s+)?epics/i,
		/vamos\s+definir\s+(os\s+)?epics/i,
		/podemos\s+avancar\s+para\s+(os\s+)?epics/i,
	],
	epics: [
		/\[avancar:\s*stories\]/i,
		/vamos\s+(para\s+)?(as\s+)?stories/i,
		/vamos\s+(para\s+)?(as\s+)?user\s+stories/i,
		/avanc(ar|ando)\s+para\s+(as\s+)?stories/i,
		/vamos\s+criar\s+(as\s+)?stories/i,
		/podemos\s+avancar\s+para\s+(as\s+)?stories/i,
	],
	stories: [
		/\[avancar:\s*details\]/i,
		/vamos\s+(para\s+)?(o\s+)?detalhamento/i,
		/vamos\s+(para\s+)?(os\s+)?detalhes/i,
		/avanc(ar|ando)\s+para\s+(o\s+)?detalhamento/i,
		/vamos\s+detalhar/i,
		/comecar\s+(o\s+)?detalhamento/i,
		/podemos\s+avancar\s+para\s+(o\s+)?detalhamento/i,
	],
	details: [
		/\[avancar:\s*planning\]/i,
		/vamos\s+(para\s+)?(o\s+)?planning/i,
		/vamos\s+(para\s+)?(o\s+)?sprint\s+planning/i,
		/avanc(ar|ando)\s+para\s+(o\s+)?planning/i,
		/vamos\s+planejar\s+(o\s+)?sprint/i,
		/podemos\s+avancar\s+para\s+(o\s+)?planning/i,
		/hora\s+do\s+(sprint\s+)?planning/i,
	],
	planning: [
		/\[avancar:\s*review\]/i,
		/vamos\s+(para\s+)?(a\s+)?revisao/i,
		/vamos\s+(para\s+)?(a\s+)?review/i,
		/avanc(ar|ando)\s+para\s+(a\s+)?revisao/i,
		/vamos\s+revisar/i,
		/podemos\s+avancar\s+para\s+(a\s+)?revisao/i,
	],
	review: [
		/\[avancar:\s*complete\]/i,
		/planejamento\s+(esta\s+)?completo/i,
		/vamos\s+finalizar/i,
		/podemos\s+finalizar/i,
		/sessao\s+completa/i,
		/concluindo\s+(o\s+)?planejamento/i,
	],
	complete: [], // Step final - não avança
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

	// Reverse messages to chronological order (use spread to avoid mutating original)
	const messagesChronological = [...session.messages].reverse()

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
				// Personas com todos os campos (goals, painPoints)
				personas: (prd.personas ?? []).map((p) => ({
					id: p.id,
					name: p.name,
					description: p.description,
					goals: p.goals,
					painPoints: p.painPoints,
				})),
				// Novos campos para contexto expandido
				successCriteria: prd.successCriteria ?? [],
				userJourneys: prd.userJourneys ?? [],
				outOfScope: prd.outOfScope ?? [],
				mvpSuccessCriteria: prd.mvpSuccessCriteria ?? [],
			}
		}
	}

	// Create session and welcome message in a transaction
	const sessionWithMessages = await db.transaction(async (tx) => {
		const [newSession] = await tx
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
			throw new Error('Failed to create session')
		}

		// Create welcome message from Bob with PRD context
		const welcomeMessage = buildSmWelcomeMessage(data.projectName, data.projectDescription, hasPrd)

		await tx.insert(smMessages).values({
			sessionId: newSession.id,
			role: 'assistant',
			content: welcomeMessage,
			step: 'init',
		})

		// Get session with messages
		return await tx.query.smSessions.findFirst({
			where: eq(smSessions.id, newSession.id),
			with: {
				messages: {
					orderBy: [desc(smMessages.createdAt)],
				},
			},
		})
	})

	if (!sessionWithMessages) {
		return commonErrors.internalError(c, 'Failed to create session')
	}

	return successResponse(
		c,
		{
			...sessionWithMessages,
			messages: [...(sessionWithMessages?.messages ?? [])].reverse(),
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

// Rename session with cascade to linked PRD and Briefing sessions
smRoutes.post(
	'/sessions/:id/rename',
	authMiddleware,
	zValidator('param', SessionIdParamSchema),
	zValidator('json', RenameSessionSchema),
	async (c) => {
		const { userId } = getAuth(c)
		const { id: sessionId } = c.req.valid('param')
		const { projectName: newName } = c.req.valid('json')

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		// Get current SM session to find linked PRD
		const currentSession = await db.query.smSessions.findFirst({
			where: and(eq(smSessions.id, sessionId), eq(smSessions.userId, user.id)),
		})

		if (!currentSession) {
			return commonErrors.notFound(c, 'Session not found')
		}

		// Update SM and cascade to linked sessions in a transaction
		await db.transaction(async (tx) => {
			// Update SM session
			await tx
				.update(smSessions)
				.set({ projectName: newName, updatedAt: new Date() })
				.where(eq(smSessions.id, sessionId))

			// Update linked PRD session if exists
			if (currentSession.prdSessionId) {
				const prdSession = await tx.query.prdSessions.findFirst({
					where: and(
						eq(prdSessions.id, currentSession.prdSessionId),
						eq(prdSessions.userId, user.id)
					),
				})

				if (prdSession) {
					await tx
						.update(prdSessions)
						.set({ projectName: newName, updatedAt: new Date() })
						.where(eq(prdSessions.id, currentSession.prdSessionId))

					// Find linked briefing from PRD's inputDocuments and update it
					const docs = prdSession.inputDocuments as Array<{ path?: string; type?: string }> | null
					const briefingDoc = docs?.find((d) => d.type === 'briefing')
					if (briefingDoc?.path) {
						await tx
							.update(briefingSessions)
							.set({ projectName: newName, updatedAt: new Date() })
							.where(
								and(eq(briefingSessions.id, briefingDoc.path), eq(briefingSessions.userId, user.id))
							)
					}
				}
			}
		})

		return successResponse(c, {
			updated: true,
			projectName: newName,
		})
	}
)

// ============================================
// CHAT ENDPOINT (STREAMING)
// ============================================

smRoutes.post(
	'/chat',
	rateLimiter({ type: 'chat' }),
	authMiddleware,
	zValidator('json', SmChatRequestSchema),
	async (c) => {
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

		// Build epics context - O(1) lookup for story counts
		const storiesCountByEpicId = new Map<string, number>()
		for (const s of session.stories) {
			if (s.epicId) {
				storiesCountByEpicId.set(s.epicId, (storiesCountByEpicId.get(s.epicId) ?? 0) + 1)
			}
		}

		const epicsContext = session.epics.map((e) => ({
			number: e.number,
			title: e.title,
			description: e.description,
			status: e.status,
			storiesCount: storiesCountByEpicId.get(e.id) ?? 0,
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
		const historyMessages = [...session.messages]
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
					model: 'deepseek/deepseek-v3.2',
					temperature: 0.7,
					max_tokens: 16384, // DeepSeek V3 via OpenRouter max output
				})

				// Stream response diretamente ao cliente
				for await (const chunk of generator) {
					fullResponse += chunk
					await stream.writeSSE({
						data: JSON.stringify({ content: chunk }),
					})
				}

				// Extract structured data from AI response BEFORE saving
				const extractedData = extractSmDataFromResponse(fullResponse)

				// Save assistant response, extract data, and update counters atomically
				const cleanedResponse = cleanResponseForDisplay(fullResponse)

				// Auto-detecção de transição de etapa (igual ao PRD)
				const normalizedResponse = fullResponse
					.toLowerCase()
					.normalize('NFD')
					.replace(/[\u0300-\u036f]/g, '')

				const currentPatterns = stepCompletionPatterns[session.currentStep] ?? []
				const shouldAdvance =
					session.currentStep !== 'complete' &&
					currentPatterns.some((pattern) => pattern.test(normalizedResponse))

				let newStep = session.currentStep

				await db.transaction(async (tx) => {
					// Insert assistant message
					await tx.insert(smMessages).values({
						sessionId,
						role: 'assistant',
						content: cleanedResponse,
						step: session.currentStep,
					})

					// Persist extracted epics/stories using batch operations
					if (extractedData) {
						// Map to track epic number -> epic id for story linking
						const epicIdMap = new Map<number, string>()

						// Process epics first (so stories can reference them)
						if (extractedData.epics && extractedData.epics.length > 0) {
							const epicNumbers = extractedData.epics.map((e) => e.number)

							// Batch fetch all existing epics for this session by number
							const existingEpics = await tx.query.smEpics.findMany({
								where: and(eq(smEpics.sessionId, sessionId), inArray(smEpics.number, epicNumbers)),
							})
							const existingEpicsByNumber = new Map(existingEpics.map((e) => [e.number, e]))

							const epicsToInsert: ReturnType<typeof transformEpicForInsert>[] = []

							for (const epicData of extractedData.epics) {
								const existing = existingEpicsByNumber.get(epicData.number)

								if (existing) {
									// Update existing epic
									const isUpdate = extractedData.action === 'update'
									await tx
										.update(smEpics)
										.set({
											title: epicData.title,
											description: epicData.description,
											businessValue: epicData.businessValue,
											priority: epicData.priority ?? (isUpdate ? existing.priority : 'medium'),
											functionalRequirementCodes:
												epicData.functionalRequirementCodes ??
												(isUpdate ? existing.functionalRequirementCodes : []),
											updatedAt: new Date(),
										})
										.where(eq(smEpics.id, existing.id))
									epicIdMap.set(epicData.number, existing.id)
								} else if (extractedData.action === 'create') {
									epicsToInsert.push(transformEpicForInsert(epicData, sessionId))
								}
							}

							// Batch insert all new epics at once
							if (epicsToInsert.length > 0) {
								const insertedEpics = await tx
									.insert(smEpics)
									.values(epicsToInsert)
									.returning({ id: smEpics.id, number: smEpics.number })
								for (const epic of insertedEpics) {
									epicIdMap.set(epic.number, epic.id)
								}
							}
						}

						// Process stories (after epics so we can link them)
						if (extractedData.stories && extractedData.stories.length > 0) {
							// Resolve epic IDs for stories not yet in epicIdMap
							const missingEpicNumbers = [
								...new Set(
									extractedData.stories.map((s) => s.epicNumber).filter((n) => !epicIdMap.has(n))
								),
							]
							if (missingEpicNumbers.length > 0) {
								const foundEpics = await tx.query.smEpics.findMany({
									where: and(
										eq(smEpics.sessionId, sessionId),
										inArray(smEpics.number, missingEpicNumbers)
									),
								})
								for (const epic of foundEpics) {
									epicIdMap.set(epic.number, epic.id)
								}
							}

							// Batch fetch all existing stories for this session
							const storyKeys = extractedData.stories.map((s) => `${s.epicNumber}-${s.storyNumber}`)
							const existingStories = await tx.query.smStories.findMany({
								where: and(
									eq(smStories.sessionId, sessionId),
									inArray(smStories.storyKey, storyKeys)
								),
							})
							const existingStoriesByKey = new Map(existingStories.map((s) => [s.storyKey, s]))

							const storiesToInsert: ReturnType<typeof transformStoryForInsert>[] = []

							for (const storyData of extractedData.stories) {
								const epicId = epicIdMap.get(storyData.epicNumber)
								if (!epicId) {
									smLogger.warn(
										{ epicNumber: storyData.epicNumber, storyNumber: storyData.storyNumber },
										'Skipping story: Epic not found'
									)
									continue
								}

								const storyKey = `${storyData.epicNumber}-${storyData.storyNumber}`
								const existing = existingStoriesByKey.get(storyKey)

								if (existing) {
									// Update existing story
									if (extractedData.action === 'create') {
										await tx
											.update(smStories)
											.set({
												title: storyData.title,
												asA: storyData.asA,
												iWant: storyData.iWant,
												soThat: storyData.soThat,
												priority: storyData.priority ?? existing.priority,
												updatedAt: new Date(),
											})
											.where(eq(smStories.id, existing.id))
									} else {
										const updateData = transformStoryForInsert(storyData, sessionId, epicId)
										await tx
											.update(smStories)
											.set({
												title: updateData.title,
												asA: updateData.asA,
												iWant: updateData.iWant,
												soThat: updateData.soThat,
												acceptanceCriteria: updateData.acceptanceCriteria,
												tasks: updateData.tasks,
												devNotes: updateData.devNotes,
												storyPoints: updateData.storyPoints,
												priority: updateData.priority,
												updatedAt: new Date(),
											})
											.where(eq(smStories.id, existing.id))
									}
								} else if (extractedData.action === 'create') {
									storiesToInsert.push(transformStoryForInsert(storyData, sessionId, epicId))
								}
							}

							// Batch insert all new stories at once
							if (storiesToInsert.length > 0) {
								await tx.insert(smStories).values(storiesToInsert)
							}
						}
					}

					// Update session step if needed
					if (shouldAdvance) {
						const nextStep = getNextStep(session.currentStep)
						if (nextStep) {
							newStep = nextStep
							const stepsCompleted = [...(session.stepsCompleted ?? [])]
							if (!stepsCompleted.includes(session.currentStep)) {
								stepsCompleted.push(session.currentStep)
							}
							await tx
								.update(smSessions)
								.set({
									currentStep: nextStep,
									stepsCompleted,
									...(nextStep === 'complete' && { status: 'completed', completedAt: new Date() }),
									updatedAt: new Date(),
								})
								.where(eq(smSessions.id, sessionId))
						}
					}

					// Update session with totals (fresh counts within same transaction)
					const [updatedEpics, updatedStories] = await Promise.all([
						tx.query.smEpics.findMany({
							where: eq(smEpics.sessionId, sessionId),
						}),
						tx.query.smStories.findMany({
							where: eq(smStories.sessionId, sessionId),
						}),
					])

					await tx
						.update(smSessions)
						.set({
							updatedAt: new Date(),
							totalEpics: updatedEpics.length,
							totalStories: updatedStories.length,
							totalStoryPoints: updatedStories.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0),
						})
						.where(eq(smSessions.id, sessionId))
				})

				// Enviar stepUpdate se houve avanço
				if (newStep !== session.currentStep) {
					await stream.writeSSE({
						data: JSON.stringify({ stepUpdate: newStep }),
					})
				}

				await stream.writeSSE({ data: '[DONE]' })
			} catch (error) {
				const errorDetails =
					error instanceof OpenRouterAPIError
						? JSON.stringify({ message: error.message, code: error.code, status: error.status })
						: JSON.stringify({
								message: error instanceof Error ? error.message : 'Failed to generate response',
								code: 'UNKNOWN',
							})

				smLogger.error({ err: error, sessionId }, 'Chat stream error')

				// Update session state so error is persisted for client recovery
				await db
					.update(smSessions)
					.set({
						generationStatus: 'failed',
						generationError: errorDetails,
						updatedAt: new Date(),
					})
					.where(eq(smSessions.id, sessionId))

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
	}
)

// ============================================
// MESSAGE EDIT ENDPOINT
// ============================================

smRoutes.post(
	'/messages/:messageId/edit',
	authMiddleware,
	zValidator('json', EditSmMessageRequestSchema),
	async (c) => {
		const { userId } = getAuth(c)
		const messageId = c.req.param('messageId')
		const { content } = c.req.valid('json')

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		// 1. Get the message to edit
		const message = await db.query.smMessages.findFirst({
			where: eq(smMessages.id, messageId),
		})

		if (!message) {
			return commonErrors.notFound(c, 'Message not found')
		}

		// 2. Validate it's a user message
		if (message.role !== 'user') {
			return commonErrors.badRequest(c, 'Can only edit user messages')
		}

		// 3. Get session and verify ownership
		const session = await db.query.smSessions.findFirst({
			where: and(eq(smSessions.id, message.sessionId), eq(smSessions.userId, user.id)),
		})

		if (!session) {
			return commonErrors.forbidden(c, 'Access denied')
		}

		const sessionId = message.sessionId
		const editedStep = message.step
		const messageTimestamp = message.createdAt

		// 4-7. Use transaction to ensure atomicity of message edit operations
		await db.transaction(async (tx) => {
			// 4. Delete all messages from this point onwards (inclusive)
			await tx
				.delete(smMessages)
				.where(
					and(eq(smMessages.sessionId, sessionId), gte(smMessages.createdAt, messageTimestamp))
				)

			// 5. Delete epics and stories created after this message
			// First get epics to delete
			const epicsToDelete = await tx.query.smEpics.findMany({
				where: and(eq(smEpics.sessionId, sessionId), gte(smEpics.createdAt, messageTimestamp)),
			})

			// Delete stories for those epics using batch operation
			if (epicsToDelete.length > 0) {
				const epicIds = epicsToDelete.map((e) => e.id)
				await tx.delete(smStories).where(inArray(smStories.epicId, epicIds))

				// Delete the epics
				await tx
					.delete(smEpics)
					.where(and(eq(smEpics.sessionId, sessionId), gte(smEpics.createdAt, messageTimestamp)))
			}

			// Also delete stories created after message timestamp that might belong to older epics
			await tx
				.delete(smStories)
				.where(and(eq(smStories.sessionId, sessionId), gte(smStories.createdAt, messageTimestamp)))

			// 6. Check if we need to rollback the step
			const currentStepIndex = SM_STEPS_ORDER.indexOf(session.currentStep)
			const editedStepIndex = SM_STEPS_ORDER.indexOf(editedStep)

			if (currentStepIndex > editedStepIndex) {
				// Rollback to the edited step
				const newStepsCompleted = (session.stepsCompleted ?? []).filter(
					(s) => SM_STEPS_ORDER.indexOf(s as SmStep) < editedStepIndex
				)

				await tx
					.update(smSessions)
					.set({
						currentStep: editedStep,
						stepsCompleted: newStepsCompleted,
						status: 'active',
						completedAt: null,
						updatedAt: new Date(),
					})
					.where(eq(smSessions.id, sessionId))
			}

			// 7. Insert the new edited user message
			await tx.insert(smMessages).values({
				sessionId,
				role: 'user',
				content,
				step: editedStep,
			})
		})

		// 8. Refresh session data for LLM context
		const updatedSession = await db.query.smSessions.findFirst({
			where: eq(smSessions.id, sessionId),
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

		if (!updatedSession) {
			return commonErrors.internalError(c, 'Failed to refresh session')
		}

		// Build epics context - O(1) lookup for story counts
		const updatedStoriesCountByEpicId = new Map<string, number>()
		for (const s of updatedSession.stories) {
			if (s.epicId) {
				updatedStoriesCountByEpicId.set(
					s.epicId,
					(updatedStoriesCountByEpicId.get(s.epicId) ?? 0) + 1
				)
			}
		}

		const epicsContext = updatedSession.epics.map((e) => ({
			number: e.number,
			title: e.title,
			description: e.description,
			status: e.status,
			storiesCount: updatedStoriesCountByEpicId.get(e.id) ?? 0,
		}))

		// Build stories context
		const storiesContext = updatedSession.stories.map((s) => ({
			storyKey: s.storyKey,
			title: s.title,
			status: s.status,
			storyPoints: s.storyPoints,
		}))

		// 9. Build system prompt with session context
		const systemPrompt = buildSmSystemPrompt(
			{
				projectName: updatedSession.projectName,
				projectDescription: updatedSession.projectDescription,
				prdContext: updatedSession.prdContext ?? undefined,
				sprintConfig: updatedSession.sprintConfig ?? undefined,
				stepsCompleted: updatedSession.stepsCompleted ?? [],
				totalEpics: updatedSession.totalEpics,
				totalStories: updatedSession.totalStories,
				epics: epicsContext,
				stories: storiesContext,
			},
			updatedSession.currentStep,
			undefined
		)

		// Build conversation history
		const historyMessages = [...updatedSession.messages]
			.reverse()
			.filter((m) => m.role !== 'system')
			.map((m) => ({
				role: m.role as 'user' | 'assistant',
				content: m.content,
			}))

		const llmMessages = [{ role: 'system' as const, content: systemPrompt }, ...historyMessages]

		// 10. Stream response
		return streamSSE(c, async (stream) => {
			try {
				const client = getOpenRouterClient()
				let fullResponse = ''

				const generator = client.chatStream({
					messages: llmMessages,
					model: 'deepseek/deepseek-v3.2',
					temperature: 0.7,
					max_tokens: 16384,
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
					step: updatedSession.currentStep,
				})

				// Update session with totals
				await db
					.update(smSessions)
					.set({
						updatedAt: new Date(),
						totalEpics: updatedSession.epics.length,
						totalStories: updatedSession.stories.length,
						totalStoryPoints: updatedSession.stories.reduce(
							(sum, s) => sum + (s.storyPoints ?? 0),
							0
						),
					})
					.where(eq(smSessions.id, sessionId))

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
	}
)

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

		// Use transaction to ensure epic insert and counter update are atomic
		const epic = await db.transaction(async (tx) => {
			const [insertedEpic] = await tx
				.insert(smEpics)
				.values({
					sessionId,
					...data,
				})
				.returning()

			// Update session totals
			await tx
				.update(smSessions)
				.set({
					totalEpics: sql`${smSessions.totalEpics} + 1`,
					updatedAt: new Date(),
				})
				.where(eq(smSessions.id, sessionId))

			return insertedEpic
		})

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

	// Delete epic and update session totals in a transaction
	await db.transaction(async (tx) => {
		await tx.delete(smEpics).where(eq(smEpics.id, epicId))

		// Update session totals
		await tx
			.update(smSessions)
			.set({
				totalEpics: sql`GREATEST(${smSessions.totalEpics} - 1, 0)`,
				updatedAt: new Date(),
			})
			.where(eq(smSessions.id, epic.sessionId))
	})

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

		// Use transaction to ensure story insert and counter update are atomic
		const story = await db.transaction(async (tx) => {
			const [insertedStory] = await tx
				.insert(smStories)
				.values({
					sessionId,
					storyKey,
					...data,
				})
				.returning()

			// Update session totals
			const storyPoints = data.storyPoints ?? 0
			await tx
				.update(smSessions)
				.set({
					totalStories: sql`${smSessions.totalStories} + 1`,
					totalStoryPoints: sql`${smSessions.totalStoryPoints} + ${storyPoints}`,
					updatedAt: new Date(),
				})
				.where(eq(smSessions.id, sessionId))

			return insertedStory
		})

		return successResponse(c, story, 201)
	}
)

// Create multiple stories in batch (parallel)
smRoutes.post(
	'/sessions/:id/stories/batch',
	authMiddleware,
	zValidator('json', CreateSmStoriesBatchSchema),
	async (c) => {
		const { userId } = getAuth(c)
		const sessionId = c.req.param('id')
		const { stories: storiesData } = c.req.valid('json')

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

		// Collect unique epic IDs and verify they all belong to session
		const epicIds = [...new Set(storiesData.map((s) => s.epicId))]
		const epics = await db.query.smEpics.findMany({
			where: and(inArray(smEpics.id, epicIds), eq(smEpics.sessionId, sessionId)),
		})

		if (epics.length !== epicIds.length) {
			return commonErrors.badRequest(c, 'One or more epics not found in this session')
		}

		// Use transaction to ensure all stories are inserted atomically with counter update
		const createdStories = await db.transaction(async (tx) => {
			const storyValues = storiesData.map((data) => ({
				sessionId,
				storyKey: `${data.epicNumber}-${data.storyNumber}`,
				...data,
			}))

			const inserted = await tx.insert(smStories).values(storyValues).returning()

			// Update session totals
			const totalPoints = storiesData.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0)
			await tx
				.update(smSessions)
				.set({
					totalStories: sql`${smSessions.totalStories} + ${storiesData.length}`,
					totalStoryPoints: sql`${smSessions.totalStoryPoints} + ${totalPoints}`,
					updatedAt: new Date(),
				})
				.where(eq(smSessions.id, sessionId))

			return inserted
		})

		return successResponse(c, createdStories, 201)
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

	// Delete story and update session totals in a transaction
	await db.transaction(async (tx) => {
		await tx.delete(smStories).where(eq(smStories.id, storyId))

		// Update session totals
		await tx
			.update(smSessions)
			.set({
				totalStories: sql`GREATEST(${smSessions.totalStories} - 1, 0)`,
				totalStoryPoints: sql`GREATEST(${smSessions.totalStoryPoints} - ${storyPoints}, 0)`,
				updatedAt: new Date(),
			})
			.where(eq(smSessions.id, story.sessionId))
	})

	return successResponse(c, { deleted: true })
})

// ============================================
// ENRICHMENT ENDPOINTS
// ============================================

/**
 * Enrich stories with AC, Tasks, DevNotes extracted from conversation
 * Called before document generation or when accessing backlog
 */
smRoutes.post('/sessions/:id/enrich', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const session = await db.query.smSessions.findFirst({
		where: and(eq(smSessions.id, sessionId), eq(smSessions.userId, user.id)),
		with: {
			stories: {
				columns: { id: true, storyKey: true, title: true },
			},
		},
	})

	if (!session) {
		return commonErrors.notFound(c, 'Session not found')
	}

	if (session.stories.length === 0) {
		return successResponse(c, { enriched: 0, failed: 0, message: 'No stories to enrich' })
	}

	try {
		smLogger.info({ sessionId, storiesCount: session.stories.length }, 'Starting enrichment')
		const result = await enrichStoriesFromConversation(sessionId, session.stories)
		smLogger.info(
			{ sessionId, enriched: result.enriched, failed: result.failed },
			'Enrichment completed'
		)
		return successResponse(c, {
			...result,
			message: `Enriched ${result.enriched} stories`,
		})
	} catch (error) {
		smLogger.error({ err: error, sessionId }, 'Failed to enrich stories')
		return commonErrors.badRequest(c, 'Failed to enrich stories')
	}
})

// ============================================
// DOCUMENT ENDPOINTS
// ============================================

// Generate document from session
smRoutes.post(
	'/sessions/:id/document',
	rateLimiter({ type: 'document' }),
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

		// Check if generation is already in progress
		if (session.generationStatus === 'generating') {
			return commonErrors.badRequest(c, 'Document generation already in progress')
		}

		// Enrich stories with AC, Tasks, DevNotes before generating document
		if (session.stories.length > 0) {
			try {
				smLogger.info(
					{ sessionId, storiesCount: session.stories.length },
					'Enriching stories before document generation'
				)
				await enrichStoriesFromConversation(
					sessionId,
					session.stories.map((s) => ({
						id: s.id,
						storyKey: s.storyKey,
						title: s.title,
					}))
				)

				// Reload stories after enrichment to get updated data
				const enrichedSession = await db.query.smSessions.findFirst({
					where: eq(smSessions.id, sessionId),
					with: {
						epics: { orderBy: [asc(smEpics.number)] },
						stories: { orderBy: [asc(smStories.epicNumber), asc(smStories.storyNumber)] },
					},
				})

				if (enrichedSession) {
					// Update the session object with enriched data
					Object.assign(session, {
						epics: enrichedSession.epics,
						stories: enrichedSession.stories,
					})
				}
				smLogger.info({ sessionId }, 'Stories enriched successfully')
			} catch (error) {
				smLogger.warn(
					{ err: error, sessionId },
					'Failed to enrich stories (continuing with document generation)'
				)
				// Don't fail the document generation if enrichment fails
			}
		}

		// Check if document of this type already exists
		const existingDoc = await db.query.smDocuments.findFirst({
			where: and(eq(smDocuments.sessionId, sessionId), eq(smDocuments.type, docType)),
			orderBy: [desc(smDocuments.version)],
		})
		const nextVersion = existingDoc ? existingDoc.version + 1 : 1

		// Atomic update: mark generation as started only if not already generating
		// This prevents race conditions when multiple requests come in simultaneously
		const updateResult = await db
			.update(smSessions)
			.set({
				generationStatus: 'generating',
				generationStartedAt: new Date(),
				generationError: null,
			})
			.where(and(eq(smSessions.id, sessionId), ne(smSessions.generationStatus, 'generating')))
			.returning({ id: smSessions.id })

		// If no rows were updated, another request already started generation
		if (updateResult.length === 0) {
			return commonErrors.badRequest(c, 'Document generation already in progress')
		}

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
					model: 'deepseek/deepseek-v3.2',
					temperature: 0.5,
					max_tokens: 16384, // DeepSeek V3 via OpenRouter max output
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

				// Also update session + mark generation as completed
				await db
					.update(smSessions)
					.set({
						documentContent: fullDocument,
						documentTitle: docTitles[docType],
						currentStep: 'complete',
						status: 'completed',
						generationStatus: 'completed',
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
				const errorDetails =
					error instanceof OpenRouterAPIError
						? JSON.stringify({ message: error.message, code: error.code, status: error.status })
						: JSON.stringify({
								message: error instanceof Error ? error.message : 'Failed to generate document',
								code: 'UNKNOWN',
							})

				// Mark generation as failed
				await db
					.update(smSessions)
					.set({
						generationStatus: 'failed',
						generationError: errorDetails,
						updatedAt: new Date(),
					})
					.where(eq(smSessions.id, sessionId))

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
