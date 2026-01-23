import { zValidator } from '@hono/zod-validator'
import {
	brainstormSessions,
	briefingDocuments,
	briefingMessages,
	briefingSessions,
	db,
	prdSessions,
	smSessions,
} from '@repo/db'
import type { BriefingStep } from '@repo/shared'
import {
	BriefingChatRequestSchema,
	CreateBriefingDocumentSchema,
	CreateBriefingSessionSchema,
	EditBriefingMessageRequestSchema,
	PaginationSchema,
	RenameSessionSchema,
	SessionIdParamSchema,
	UpdateBriefingDocumentSchema,
	UpdateBriefingSessionSchema,
} from '@repo/shared'
import { and, desc, eq, gte, ne, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import {
	BRIEFING_STEPS_ORDER,
	buildBriefingDocumentPrompt,
	buildBriefingSystemPrompt,
	buildBriefingWelcomeMessage,
	getNextStep,
	getStepInfo,
} from '../lib/briefing-prompts.js'
import { getUserByClerkId } from '../lib/helpers.js'
import { createLogger } from '../lib/logger.js'
import { getOpenRouterClient, OpenRouterAPIError } from '../lib/openrouter.js'
import { commonErrors, successResponse } from '../lib/response.js'

const briefingLogger = createLogger('briefing')

import { type AuthVariables, authMiddleware, getAuth } from '../middleware/auth.js'
import { rateLimiter, userKeyExtractor } from '../middleware/rate-limiter.js'

export const briefingRoutes = new Hono<{ Variables: AuthVariables }>()

// ============================================
// SESSION CRUD ENDPOINTS
// ============================================

// List user's briefing sessions
briefingRoutes.get(
	'/sessions',
	authMiddleware,
	zValidator('query', PaginationSchema),
	async (c) => {
		const { userId } = getAuth(c)
		const { page, limit } = c.req.valid('query')
		const offset = (page - 1) * limit

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		const [sessions, countResult] = await Promise.all([
			db.query.briefingSessions.findMany({
				where: eq(briefingSessions.userId, user.id),
				limit,
				offset,
				orderBy: [desc(briefingSessions.updatedAt)],
				with: {
					user: {
						columns: {
							id: true,
							name: true,
						},
					},
				},
			}),
			db
				.select({ count: sql<number>`count(*)` })
				.from(briefingSessions)
				.where(eq(briefingSessions.userId, user.id)),
		])

		return successResponse(c, sessions, 200, {
			page,
			limit,
			total: Number(countResult[0]?.count ?? 0),
		})
	}
)

// Get single session with messages and documents
briefingRoutes.get('/sessions/:id', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const session = await db.query.briefingSessions.findFirst({
		where: and(eq(briefingSessions.id, sessionId), eq(briefingSessions.userId, user.id)),
		with: {
			messages: {
				orderBy: [desc(briefingMessages.createdAt)],
				limit: 100,
			},
			documents: {
				orderBy: [desc(briefingDocuments.createdAt)],
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
briefingRoutes.post(
	'/sessions',
	authMiddleware,
	zValidator('json', CreateBriefingSessionSchema),
	async (c) => {
		const { userId } = getAuth(c)
		const data = c.req.valid('json')

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		// Check for linked brainstorm session
		let hasBrainstorm = false
		if (data.brainstormSessionId) {
			const brainstorm = await db.query.brainstormSessions.findFirst({
				where: and(
					eq(brainstormSessions.id, data.brainstormSessionId),
					eq(brainstormSessions.userId, user.id)
				),
			})
			hasBrainstorm = !!brainstorm
		}

		// Create session and welcome message in a transaction
		const sessionWithMessages = await db.transaction(async (tx) => {
			const [newSession] = await tx
				.insert(briefingSessions)
				.values({
					userId: user.id,
					projectName: data.projectName,
					projectDescription: data.projectDescription,
					inputDocuments: data.brainstormSessionId
						? [
								{
									name: 'Brainstorm Session',
									path: data.brainstormSessionId,
									type: 'brainstorm' as const,
									loadedAt: new Date().toISOString(),
								},
							]
						: [],
				})
				.returning()

			if (!newSession) {
				throw new Error('Failed to create session')
			}

			// Create welcome message from Anna
			const welcomeMessage = buildBriefingWelcomeMessage(
				data.projectName,
				data.projectDescription,
				hasBrainstorm
			)

			await tx.insert(briefingMessages).values({
				sessionId: newSession.id,
				role: 'assistant',
				content: welcomeMessage,
				step: 'init',
			})

			// Get session with messages
			return await tx.query.briefingSessions.findFirst({
				where: eq(briefingSessions.id, newSession.id),
				with: {
					messages: {
						orderBy: [desc(briefingMessages.createdAt)],
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
	}
)

// Update session
briefingRoutes.patch(
	'/sessions/:id',
	authMiddleware,
	zValidator('json', UpdateBriefingSessionSchema),
	async (c) => {
		const { userId } = getAuth(c)
		const sessionId = c.req.param('id')
		const data = c.req.valid('json')

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		const [session] = await db
			.update(briefingSessions)
			.set({ ...data, updatedAt: new Date() })
			.where(and(eq(briefingSessions.id, sessionId), eq(briefingSessions.userId, user.id)))
			.returning()

		if (!session) {
			return commonErrors.notFound(c, 'Session not found')
		}

		return successResponse(c, session)
	}
)

// Delete session
briefingRoutes.delete('/sessions/:id', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const [deleted] = await db
		.delete(briefingSessions)
		.where(and(eq(briefingSessions.id, sessionId), eq(briefingSessions.userId, user.id)))
		.returning()

	if (!deleted) {
		return commonErrors.notFound(c, 'Session not found')
	}

	return successResponse(c, { deleted: true })
})

// Rename session with cascade to linked PRD and SM sessions
briefingRoutes.post(
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

		// Update briefing session and cascade to linked sessions in a transaction
		const result = await db.transaction(async (tx) => {
			const [updated] = await tx
				.update(briefingSessions)
				.set({ projectName: newName, updatedAt: new Date() })
				.where(and(eq(briefingSessions.id, sessionId), eq(briefingSessions.userId, user.id)))
				.returning()

			if (!updated) {
				return null
			}

			// Find all PRD sessions that reference this briefing in inputDocuments
			const allPrdSessions = await tx.query.prdSessions.findMany({
				where: eq(prdSessions.userId, user.id),
			})

			const linkedPrdIds: string[] = []
			for (const prd of allPrdSessions) {
				const docs = prd.inputDocuments as Array<{ path?: string; type?: string }> | null
				if (docs?.some((d) => d.path === sessionId && d.type === 'briefing')) {
					linkedPrdIds.push(prd.id)
					// Update PRD project name
					await tx
						.update(prdSessions)
						.set({ projectName: newName, updatedAt: new Date() })
						.where(eq(prdSessions.id, prd.id))
				}
			}

			// Update all SM sessions linked to those PRDs
			if (linkedPrdIds.length > 0) {
				for (const prdId of linkedPrdIds) {
					await tx
						.update(smSessions)
						.set({ projectName: newName, updatedAt: new Date() })
						.where(and(eq(smSessions.prdSessionId, prdId), eq(smSessions.userId, user.id)))
				}
			}

			return { updated, linkedPrdIds }
		})

		if (!result) {
			return commonErrors.notFound(c, 'Session not found')
		}

		return successResponse(c, {
			updated: true,
			projectName: newName,
			linkedPrds: result.linkedPrdIds.length,
		})
	}
)

// ============================================
// CHAT ENDPOINT (STREAMING)
// ============================================

briefingRoutes.post(
	'/chat',
	authMiddleware,
	rateLimiter({ type: 'chat', keyExtractor: userKeyExtractor }),
	zValidator('json', BriefingChatRequestSchema),
	async (c) => {
		const { userId } = getAuth(c)
		const { sessionId, message, action } = c.req.valid('json')

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		// Get session with messages
		const session = await db.query.briefingSessions.findFirst({
			where: and(eq(briefingSessions.id, sessionId), eq(briefingSessions.userId, user.id)),
			with: {
				messages: {
					orderBy: [desc(briefingMessages.createdAt)],
					limit: 50, // Last 50 messages for context
				},
			},
		})

		if (!session) {
			return commonErrors.notFound(c, 'Session not found')
		}

		// Save user message
		await db.insert(briefingMessages).values({
			sessionId,
			role: 'user',
			content: message,
			step: session.currentStep,
		})

		// Determine mode based on action
		let mode: 'advanced_elicitation' | 'party_mode' | undefined
		if (action === 'advanced_elicitation') mode = 'advanced_elicitation'
		if (action === 'party_mode') mode = 'party_mode'

		// Build system prompt with session context
		const systemPrompt = buildBriefingSystemPrompt(
			{
				projectName: session.projectName,
				projectDescription: session.projectDescription,
				problemStatement: session.problemStatement,
				problemImpact: session.problemImpact,
				existingSolutionsGaps: session.existingSolutionsGaps,
				proposedSolution: session.proposedSolution,
				keyDifferentiators: session.keyDifferentiators ?? [],
				primaryUsers: session.primaryUsers ?? [],
				secondaryUsers: session.secondaryUsers ?? [],
				userJourneys: session.userJourneys ?? [],
				successMetrics: session.successMetrics ?? [],
				businessObjectives: session.businessObjectives ?? [],
				kpis: session.kpis ?? [],
				mvpFeatures: session.mvpFeatures ?? [],
				outOfScope: session.outOfScope ?? [],
				mvpSuccessCriteria: session.mvpSuccessCriteria ?? [],
				futureVision: session.futureVision,
				stepsCompleted: session.stepsCompleted ?? [],
			},
			session.currentStep,
			mode
		)

		// Build conversation history (reverse to chronological, then map)
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

				for await (const chunk of generator) {
					fullResponse += chunk
					await stream.writeSSE({
						data: JSON.stringify({ content: chunk }),
					})
				}

				// Save assistant response
				await db.insert(briefingMessages).values({
					sessionId,
					role: 'assistant',
					content: fullResponse,
					step: session.currentStep,
				})

				// Auto-advance step based on mandatory markers
				// Marcadores obrigatórios de transição - a IA DEVE usar esses marcadores exatos
				const stepCompletionPatterns: Record<string, RegExp[]> = {
					init: [
						/\[AVANÇAR:\s*VISION\]/i,
						/\[AVANCAR:\s*VISION\]/i,
						/vamos\s+(para\s+)?(a\s+)?vis[aã]o/i,
						/vamos\s+\w+\s+(a\s+)?vis[aã]o/i,
						/avanc(ar|ando)\s+para\s+(a\s+)?vis[aã]o/i,
					],
					vision: [
						/\[AVANÇAR:\s*USERS\]/i,
						/\[AVANCAR:\s*USERS\]/i,
						/vamos\s+(para\s+)?(os\s+)?usu[aá]rios/i,
						/vamos\s+\w+\s+(os\s+)?usu[aá]rios/i,
						/avanc(ar|ando)\s+para\s+(os\s+)?usu[aá]rios/i,
						/usu[aá]rios\s+valid(ados|adas)/i,
					],
					users: [
						/\[AVANÇAR:\s*METRICS\]/i,
						/\[AVANCAR:\s*METRICS\]/i,
						/vamos\s+(para\s+)?(as\s+)?m[eé]tricas/i,
						/vamos\s+\w+\s+(as\s+)?m[eé]tricas/i,
						/avanc(ar|ando)\s+para\s+(as\s+)?m[eé]tricas/i,
					],
					metrics: [
						/\[AVANÇAR:\s*SCOPE\]/i,
						/\[AVANCAR:\s*SCOPE\]/i,
						/vamos\s+(para\s+)?(o\s+)?escopo/i,
						/vamos\s+\w+\s+(o\s+)?escopo/i,
						/avanc(ar|ando)\s+para\s+(o\s+)?escopo/i,
					],
					scope: [
						/\[AVANÇAR:\s*COMPLETE\]/i,
						/\[AVANCAR:\s*COMPLETE\]/i,
						/briefing\s+(est[aá]\s+)?completo/i,
						/vamos\s+finalizar/i,
						/podemos\s+finalizar/i,
					],
				}

				const currentPatterns = stepCompletionPatterns[session.currentStep] ?? []
				const shouldAdvance =
					session.currentStep !== 'complete' &&
					currentPatterns.some((pattern) => pattern.test(fullResponse))

				// Debug log
				briefingLogger.debug(
					{
						sessionId,
						currentStep: session.currentStep,
						shouldAdvance,
					},
					'Step transition check'
				)

				let newStep = session.currentStep
				if (shouldAdvance) {
					const nextStep = getNextStep(session.currentStep)
					if (nextStep) {
						newStep = nextStep
						const stepsCompleted = [...(session.stepsCompleted ?? [])]
						if (!stepsCompleted.includes(session.currentStep)) {
							stepsCompleted.push(session.currentStep)
						}
						await db
							.update(briefingSessions)
							.set({
								currentStep: nextStep,
								stepsCompleted,
								...(nextStep === 'complete' && { status: 'completed', completedAt: new Date() }),
								updatedAt: new Date(),
							})
							.where(eq(briefingSessions.id, sessionId))
					}
				}

				// Update session timestamp if no step change
				if (!shouldAdvance) {
					await db
						.update(briefingSessions)
						.set({ updatedAt: new Date() })
						.where(eq(briefingSessions.id, sessionId))
				}

				// Send step update event if step changed
				if (newStep !== session.currentStep) {
					await stream.writeSSE({
						data: JSON.stringify({ stepUpdate: newStep }),
					})
				}

				await stream.writeSSE({ data: '[DONE]' })
			} catch (error) {
				const errorDetails =
					error instanceof OpenRouterAPIError
						? { message: error.message, code: error.code, status: error.status }
						: {
								message: error instanceof Error ? error.message : 'Failed to generate response',
								code: 'UNKNOWN' as const,
							}

				briefingLogger.error({ err: error, sessionId }, 'Chat stream error')

				// Update session state so error is persisted for client recovery
				await db
					.update(briefingSessions)
					.set({
						generationStatus: 'failed',
						generationError: errorDetails,
						updatedAt: new Date(),
					})
					.where(eq(briefingSessions.id, sessionId))

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

briefingRoutes.post(
	'/messages/:messageId/edit',
	authMiddleware,
	rateLimiter({ type: 'chat', keyExtractor: userKeyExtractor }),
	zValidator('json', EditBriefingMessageRequestSchema),
	async (c) => {
		const { userId } = getAuth(c)
		const messageId = c.req.param('messageId')
		const { content } = c.req.valid('json')

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		// 1. Get the message to edit
		const message = await db.query.briefingMessages.findFirst({
			where: eq(briefingMessages.id, messageId),
		})

		if (!message) {
			return commonErrors.notFound(c, 'Message not found')
		}

		// 2. Validate it's a user message
		if (message.role !== 'user') {
			return commonErrors.badRequest(c, 'Can only edit user messages')
		}

		// 3. Get session and verify ownership
		const session = await db.query.briefingSessions.findFirst({
			where: and(eq(briefingSessions.id, message.sessionId), eq(briefingSessions.userId, user.id)),
		})

		if (!session) {
			return commonErrors.forbidden(c, 'Access denied')
		}

		const sessionId = message.sessionId
		const editedStep = message.step
		const messageTimestamp = message.createdAt

		// 4-6. Use transaction to ensure atomicity of message edit operations
		await db.transaction(async (tx) => {
			// 4. Delete all messages from this point onwards (inclusive)
			await tx
				.delete(briefingMessages)
				.where(
					and(
						eq(briefingMessages.sessionId, sessionId),
						gte(briefingMessages.createdAt, messageTimestamp)
					)
				)

			// 5. Check if we need to rollback the step
			const currentStepIndex = BRIEFING_STEPS_ORDER.indexOf(session.currentStep)
			const editedStepIndex = BRIEFING_STEPS_ORDER.indexOf(editedStep)

			if (currentStepIndex > editedStepIndex) {
				// Rollback to the edited step
				const newStepsCompleted = (session.stepsCompleted ?? []).filter(
					(s) => BRIEFING_STEPS_ORDER.indexOf(s as BriefingStep) < editedStepIndex
				)

				await tx
					.update(briefingSessions)
					.set({
						currentStep: editedStep,
						stepsCompleted: newStepsCompleted,
						status: 'active',
						completedAt: null,
						updatedAt: new Date(),
					})
					.where(eq(briefingSessions.id, sessionId))
			}

			// 6. Insert the new edited user message
			await tx.insert(briefingMessages).values({
				sessionId,
				role: 'user',
				content,
				step: editedStep,
			})
		})

		// 7. Refresh session data for LLM context
		const updatedSession = await db.query.briefingSessions.findFirst({
			where: eq(briefingSessions.id, sessionId),
			with: {
				messages: {
					orderBy: [desc(briefingMessages.createdAt)],
					limit: 50,
				},
			},
		})

		if (!updatedSession) {
			return commonErrors.internalError(c, 'Failed to refresh session')
		}

		// 8. Build system prompt with session context
		const systemPrompt = buildBriefingSystemPrompt(
			{
				projectName: updatedSession.projectName,
				projectDescription: updatedSession.projectDescription,
				problemStatement: updatedSession.problemStatement,
				problemImpact: updatedSession.problemImpact,
				existingSolutionsGaps: updatedSession.existingSolutionsGaps,
				proposedSolution: updatedSession.proposedSolution,
				keyDifferentiators: updatedSession.keyDifferentiators ?? [],
				primaryUsers: updatedSession.primaryUsers ?? [],
				secondaryUsers: updatedSession.secondaryUsers ?? [],
				userJourneys: updatedSession.userJourneys ?? [],
				successMetrics: updatedSession.successMetrics ?? [],
				businessObjectives: updatedSession.businessObjectives ?? [],
				kpis: updatedSession.kpis ?? [],
				mvpFeatures: updatedSession.mvpFeatures ?? [],
				outOfScope: updatedSession.outOfScope ?? [],
				mvpSuccessCriteria: updatedSession.mvpSuccessCriteria ?? [],
				futureVision: updatedSession.futureVision,
				stepsCompleted: updatedSession.stepsCompleted ?? [],
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

		// 9. Stream response
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
				await db.insert(briefingMessages).values({
					sessionId,
					role: 'assistant',
					content: fullResponse,
					step: updatedSession.currentStep,
				})

				// Auto-advance step based on mandatory markers
				// Marcadores obrigatórios de transição - a IA DEVE usar esses marcadores exatos
				const stepCompletionPatterns: Record<string, RegExp[]> = {
					init: [
						/\[AVANÇAR:\s*VISION\]/i,
						/\[AVANCAR:\s*VISION\]/i,
						/vamos\s+(para\s+)?(a\s+)?vis[aã]o/i,
						/vamos\s+\w+\s+(a\s+)?vis[aã]o/i,
						/avanc(ar|ando)\s+para\s+(a\s+)?vis[aã]o/i,
					],
					vision: [
						/\[AVANÇAR:\s*USERS\]/i,
						/\[AVANCAR:\s*USERS\]/i,
						/vamos\s+(para\s+)?(os\s+)?usu[aá]rios/i,
						/vamos\s+\w+\s+(os\s+)?usu[aá]rios/i,
						/avanc(ar|ando)\s+para\s+(os\s+)?usu[aá]rios/i,
						/usu[aá]rios\s+valid(ados|adas)/i,
					],
					users: [
						/\[AVANÇAR:\s*METRICS\]/i,
						/\[AVANCAR:\s*METRICS\]/i,
						/vamos\s+(para\s+)?(as\s+)?m[eé]tricas/i,
						/vamos\s+\w+\s+(as\s+)?m[eé]tricas/i,
						/avanc(ar|ando)\s+para\s+(as\s+)?m[eé]tricas/i,
					],
					metrics: [
						/\[AVANÇAR:\s*SCOPE\]/i,
						/\[AVANCAR:\s*SCOPE\]/i,
						/vamos\s+(para\s+)?(o\s+)?escopo/i,
						/vamos\s+\w+\s+(o\s+)?escopo/i,
						/avanc(ar|ando)\s+para\s+(o\s+)?escopo/i,
					],
					scope: [
						/\[AVANÇAR:\s*COMPLETE\]/i,
						/\[AVANCAR:\s*COMPLETE\]/i,
						/briefing\s+(est[aá]\s+)?completo/i,
						/vamos\s+finalizar/i,
						/podemos\s+finalizar/i,
					],
				}

				const currentPatterns = stepCompletionPatterns[updatedSession.currentStep] ?? []
				const shouldAdvance =
					updatedSession.currentStep !== 'complete' &&
					currentPatterns.some((pattern) => pattern.test(fullResponse))

				let newStep = updatedSession.currentStep
				if (shouldAdvance) {
					const nextStep = getNextStep(updatedSession.currentStep)
					if (nextStep) {
						newStep = nextStep
						const stepsCompleted = [...(updatedSession.stepsCompleted ?? [])]
						if (!stepsCompleted.includes(updatedSession.currentStep)) {
							stepsCompleted.push(updatedSession.currentStep)
						}
						await db
							.update(briefingSessions)
							.set({
								currentStep: nextStep,
								stepsCompleted,
								...(nextStep === 'complete' && { status: 'completed', completedAt: new Date() }),
								updatedAt: new Date(),
							})
							.where(eq(briefingSessions.id, sessionId))
					}
				}

				// Update session timestamp if no step change
				if (!shouldAdvance) {
					await db
						.update(briefingSessions)
						.set({ updatedAt: new Date() })
						.where(eq(briefingSessions.id, sessionId))
				}

				// Send step update event if step changed
				if (newStep !== updatedSession.currentStep) {
					await stream.writeSSE({
						data: JSON.stringify({ stepUpdate: newStep }),
					})
				}

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
// DOCUMENT ENDPOINTS
// ============================================

// Generate document from session
briefingRoutes.post(
	'/sessions/:id/document',
	authMiddleware,
	rateLimiter({ type: 'document', keyExtractor: userKeyExtractor }),
	zValidator('json', CreateBriefingDocumentSchema.optional()),
	async (c) => {
		const { userId } = getAuth(c)
		const sessionId = c.req.param('id')
		const body = c.req.valid('json')
		const docType = body?.type ?? 'product_brief'

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		// Get session with all data
		const session = await db.query.briefingSessions.findFirst({
			where: and(eq(briefingSessions.id, sessionId), eq(briefingSessions.userId, user.id)),
		})

		if (!session) {
			return commonErrors.notFound(c, 'Session not found')
		}

		// Check if generation is already in progress
		if (session.generationStatus === 'generating') {
			return commonErrors.badRequest(c, 'Document generation already in progress')
		}

		// Get all messages from the session to use as context for document generation
		const messages = await db.query.briefingMessages.findMany({
			where: eq(briefingMessages.sessionId, sessionId),
			orderBy: [briefingMessages.createdAt],
			columns: {
				role: true,
				content: true,
			},
		})

		// Check if document of this type already exists - get latest version
		const existingDoc = await db.query.briefingDocuments.findFirst({
			where: and(eq(briefingDocuments.sessionId, sessionId), eq(briefingDocuments.type, docType)),
			orderBy: [desc(briefingDocuments.version)],
		})
		const nextVersion = existingDoc ? existingDoc.version + 1 : 1

		// Atomic update: mark generation as started only if not already generating
		// This prevents race conditions when multiple requests come in simultaneously
		const updateResult = await db
			.update(briefingSessions)
			.set({
				generationStatus: 'generating',
				generationStartedAt: new Date(),
				generationError: null,
			})
			.where(
				and(eq(briefingSessions.id, sessionId), ne(briefingSessions.generationStatus, 'generating'))
			)
			.returning({ id: briefingSessions.id })

		// If no rows were updated, another request already started generation
		if (updateResult.length === 0) {
			return commonErrors.badRequest(c, 'Document generation already in progress')
		}

		// Stream document generation
		return streamSSE(c, async (stream) => {
			try {
				const client = getOpenRouterClient()
				let fullDocument = ''

				const prompt = buildBriefingDocumentPrompt(
					{
						projectName: session.projectName,
						projectDescription: session.projectDescription,
						problemStatement: session.problemStatement,
						problemImpact: session.problemImpact,
						existingSolutionsGaps: session.existingSolutionsGaps,
						proposedSolution: session.proposedSolution,
						keyDifferentiators: session.keyDifferentiators ?? [],
						primaryUsers: session.primaryUsers ?? [],
						secondaryUsers: session.secondaryUsers ?? [],
						userJourneys: session.userJourneys ?? [],
						successMetrics: session.successMetrics ?? [],
						businessObjectives: session.businessObjectives ?? [],
						kpis: session.kpis ?? [],
						mvpFeatures: session.mvpFeatures ?? [],
						outOfScope: session.outOfScope ?? [],
						mvpSuccessCriteria: session.mvpSuccessCriteria ?? [],
						futureVision: session.futureVision,
					},
					{
						messages,
						authorName: user.name,
					}
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
					product_brief: `Product Brief: ${session.projectName}`,
					executive_summary: `Executive Summary: ${session.projectName}`,
					vision_statement: `Vision Statement: ${session.projectName}`,
					user_personas: `User Personas: ${session.projectName}`,
					metrics_dashboard: `Metrics Dashboard: ${session.projectName}`,
					mvp_scope: `MVP Scope: ${session.projectName}`,
					custom: body?.title ?? `Custom Document: ${session.projectName}`,
				}

				// Save to briefing_documents table (upsert - only one document per session)
				let savedDoc: typeof briefingDocuments.$inferSelect | undefined
				if (existingDoc) {
					// Update existing document
					const [updated] = await db
						.update(briefingDocuments)
						.set({
							title: docTitles[docType] ?? `Document: ${session.projectName}`,
							content: fullDocument,
							version: nextVersion,
							updatedAt: new Date(),
						})
						.where(eq(briefingDocuments.id, existingDoc.id))
						.returning()
					savedDoc = updated
				} else {
					// Create new document
					const [created] = await db
						.insert(briefingDocuments)
						.values({
							sessionId,
							type: docType,
							title: docTitles[docType] ?? `Document: ${session.projectName}`,
							content: fullDocument,
							version: 1,
						})
						.returning()
					savedDoc = created
				}

				// Also update session for backward compatibility + mark generation as completed
				await db
					.update(briefingSessions)
					.set({
						documentContent: fullDocument,
						documentTitle: docTitles[docType],
						currentStep: 'complete',
						status: 'completed',
						generationStatus: 'completed',
						completedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(eq(briefingSessions.id, sessionId))

				await stream.writeSSE({
					data: JSON.stringify({
						done: true,
						document: savedDoc,
					}),
				})
				await stream.writeSSE({ data: '[DONE]' })
			} catch (error) {
				const errorDetails =
					error instanceof OpenRouterAPIError
						? { message: error.message, code: error.code, status: error.status }
						: {
								message: error instanceof Error ? error.message : 'Failed to generate document',
								code: 'UNKNOWN' as const,
							}

				// Mark generation as failed
				await db
					.update(briefingSessions)
					.set({
						generationStatus: 'failed',
						generationError: errorDetails,
						updatedAt: new Date(),
					})
					.where(eq(briefingSessions.id, sessionId))

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
briefingRoutes.get('/sessions/:id/documents', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	// Verify session belongs to user
	const session = await db.query.briefingSessions.findFirst({
		where: and(eq(briefingSessions.id, sessionId), eq(briefingSessions.userId, user.id)),
	})

	if (!session) {
		return commonErrors.notFound(c, 'Session not found')
	}

	const documents = await db.query.briefingDocuments.findMany({
		where: eq(briefingDocuments.sessionId, sessionId),
		orderBy: [desc(briefingDocuments.createdAt)],
	})

	return successResponse(c, documents)
})

// Get a specific document
briefingRoutes.get('/documents/:id', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const documentId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const document = await db.query.briefingDocuments.findFirst({
		where: eq(briefingDocuments.id, documentId),
		with: {
			session: true,
		},
	})

	if (!document || !document.session) {
		return commonErrors.notFound(c, 'Document not found')
	}

	// Verify document belongs to user
	if (document.session.userId !== user.id) {
		return commonErrors.forbidden(c, 'Access denied')
	}

	return successResponse(c, document)
})

// Update a specific document
briefingRoutes.patch(
	'/documents/:id',
	authMiddleware,
	zValidator('json', UpdateBriefingDocumentSchema),
	async (c) => {
		const { userId } = getAuth(c)
		const documentId = c.req.param('id')
		const { content, title } = c.req.valid('json')

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		// Get document with session
		const document = await db.query.briefingDocuments.findFirst({
			where: eq(briefingDocuments.id, documentId),
			with: {
				session: true,
			},
		})

		if (!document || !document.session) {
			return commonErrors.notFound(c, 'Document not found')
		}

		// Verify document belongs to user
		if (document.session.userId !== user.id) {
			return commonErrors.forbidden(c, 'Access denied')
		}

		const [updated] = await db
			.update(briefingDocuments)
			.set({
				content,
				...(title && { title }),
				updatedAt: new Date(),
			})
			.where(eq(briefingDocuments.id, documentId))
			.returning()

		return successResponse(c, updated)
	}
)

// Delete a specific document
briefingRoutes.delete('/documents/:id', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const documentId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	// Get document with session
	const document = await db.query.briefingDocuments.findFirst({
		where: eq(briefingDocuments.id, documentId),
		with: {
			session: true,
		},
	})

	if (!document || !document.session) {
		return commonErrors.notFound(c, 'Document not found')
	}

	// Verify document belongs to user
	if (document.session.userId !== user.id) {
		return commonErrors.forbidden(c, 'Access denied')
	}

	await db.delete(briefingDocuments).where(eq(briefingDocuments.id, documentId))

	return successResponse(c, { deleted: true })
})

// Update document content (legacy - updates session)
briefingRoutes.patch(
	'/sessions/:id/document',
	authMiddleware,
	zValidator('json', UpdateBriefingDocumentSchema),
	async (c) => {
		const { userId } = getAuth(c)
		const sessionId = c.req.param('id')
		const { content, title, executiveSummary } = c.req.valid('json')

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		const [session] = await db
			.update(briefingSessions)
			.set({
				documentContent: content,
				...(title && { documentTitle: title }),
				...(executiveSummary && { executiveSummary }),
				updatedAt: new Date(),
			})
			.where(and(eq(briefingSessions.id, sessionId), eq(briefingSessions.userId, user.id)))
			.returning()

		if (!session) {
			return commonErrors.notFound(c, 'Session not found')
		}

		return successResponse(c, session)
	}
)

// ============================================
// UTILITY ENDPOINTS
// ============================================

// Get step info
briefingRoutes.get('/steps', authMiddleware, async (c) => {
	const steps = BRIEFING_STEPS_ORDER.map((step) => ({
		id: step,
		...getStepInfo(step),
	}))
	return successResponse(c, steps)
})

// Advance to next step
briefingRoutes.post('/sessions/:id/advance', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const session = await db.query.briefingSessions.findFirst({
		where: and(eq(briefingSessions.id, sessionId), eq(briefingSessions.userId, user.id)),
	})

	if (!session) {
		return commonErrors.notFound(c, 'Session not found')
	}

	// Determine next step
	const nextStep = getNextStep(session.currentStep)

	if (!nextStep) {
		return commonErrors.badRequest(c, 'Already at final step')
	}

	// Update steps completed
	const stepsCompleted = [...(session.stepsCompleted ?? [])]
	if (!stepsCompleted.includes(session.currentStep)) {
		stepsCompleted.push(session.currentStep)
	}

	// Mark as completed when reaching complete step
	const isCompleted = nextStep === 'complete'

	const [updated] = await db
		.update(briefingSessions)
		.set({
			currentStep: nextStep,
			stepsCompleted,
			...(isCompleted && { status: 'completed', completedAt: new Date() }),
			updatedAt: new Date(),
		})
		.where(eq(briefingSessions.id, sessionId))
		.returning()

	return successResponse(c, updated)
})

// Complete session
briefingRoutes.post('/sessions/:id/complete', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const [session] = await db
		.update(briefingSessions)
		.set({
			status: 'completed',
			completedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(and(eq(briefingSessions.id, sessionId), eq(briefingSessions.userId, user.id)))
		.returning()

	if (!session) {
		return commonErrors.notFound(c, 'Session not found')
	}

	return successResponse(c, session)
})
