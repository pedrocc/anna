import { zValidator } from '@hono/zod-validator'
import { brainstormMessages, brainstormSessions, db, users } from '@repo/db'
import {
	BrainstormChatRequestSchema,
	CreateBrainstormSessionSchema,
	PaginationSchema,
	TECHNIQUES,
	UpdateBrainstormSessionSchema,
	UpdateDocumentSchema,
} from '@repo/shared'
import { and, desc, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import {
	buildDocumentPrompt,
	buildSystemPrompt,
	buildWelcomeMessage,
} from '../lib/brainstorm-prompts.js'
import { getOpenRouterClient, OpenRouterAPIError } from '../lib/openrouter.js'
import { commonErrors, successResponse } from '../lib/response.js'
import { type AuthVariables, authMiddleware, getAuth } from '../middleware/auth.js'

export const brainstormRoutes = new Hono<{ Variables: AuthVariables }>()

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

// List user's brainstorm sessions
brainstormRoutes.get(
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
			db.query.brainstormSessions.findMany({
				where: eq(brainstormSessions.userId, user.id),
				limit,
				offset,
				orderBy: [desc(brainstormSessions.updatedAt)],
			}),
			db
				.select({ count: sql<number>`count(*)` })
				.from(brainstormSessions)
				.where(eq(brainstormSessions.userId, user.id)),
		])

		return successResponse(c, sessions, 200, {
			page,
			limit,
			total: Number(countResult[0]?.count ?? 0),
		})
	}
)

// Get single session with messages
brainstormRoutes.get('/sessions/:id', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const session = await db.query.brainstormSessions.findFirst({
		where: and(eq(brainstormSessions.id, sessionId), eq(brainstormSessions.userId, user.id)),
		with: {
			messages: {
				orderBy: [desc(brainstormMessages.createdAt)],
				limit: 100,
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
brainstormRoutes.post(
	'/sessions',
	authMiddleware,
	zValidator('json', CreateBrainstormSessionSchema),
	async (c) => {
		const { userId } = getAuth(c)
		const data = c.req.valid('json')

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		// Create session
		const [newSession] = await db
			.insert(brainstormSessions)
			.values({
				userId: user.id,
				projectName: data.projectName,
				projectDescription: data.projectDescription,
			})
			.returning()

		if (!newSession) {
			return commonErrors.internalError(c, 'Failed to create session')
		}

		// Create welcome message from Anna
		const welcomeMessage = buildWelcomeMessage(data.projectName, data.projectDescription)

		await db.insert(brainstormMessages).values({
			sessionId: newSession.id,
			role: 'assistant',
			content: welcomeMessage,
			step: 'setup',
		})

		// Get session with messages
		const sessionWithMessages = await db.query.brainstormSessions.findFirst({
			where: eq(brainstormSessions.id, newSession.id),
			with: {
				messages: {
					orderBy: [desc(brainstormMessages.createdAt)],
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
	}
)

// Update session
brainstormRoutes.patch(
	'/sessions/:id',
	authMiddleware,
	zValidator('json', UpdateBrainstormSessionSchema),
	async (c) => {
		const { userId } = getAuth(c)
		const sessionId = c.req.param('id')
		const data = c.req.valid('json')

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		const [session] = await db
			.update(brainstormSessions)
			.set({ ...data, updatedAt: new Date() })
			.where(and(eq(brainstormSessions.id, sessionId), eq(brainstormSessions.userId, user.id)))
			.returning()

		if (!session) {
			return commonErrors.notFound(c, 'Session not found')
		}

		return successResponse(c, session)
	}
)

// Delete session
brainstormRoutes.delete('/sessions/:id', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const [deleted] = await db
		.delete(brainstormSessions)
		.where(and(eq(brainstormSessions.id, sessionId), eq(brainstormSessions.userId, user.id)))
		.returning()

	if (!deleted) {
		return commonErrors.notFound(c, 'Session not found')
	}

	return successResponse(c, { deleted: true })
})

// ============================================
// CHAT ENDPOINT (STREAMING)
// ============================================

brainstormRoutes.post(
	'/chat',
	authMiddleware,
	zValidator('json', BrainstormChatRequestSchema),
	async (c) => {
		const { userId } = getAuth(c)
		const { sessionId, message } = c.req.valid('json')

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		// Get session with messages
		const session = await db.query.brainstormSessions.findFirst({
			where: and(eq(brainstormSessions.id, sessionId), eq(brainstormSessions.userId, user.id)),
			with: {
				messages: {
					orderBy: [desc(brainstormMessages.createdAt)],
					limit: 30, // Last 30 messages for context
				},
			},
		})

		if (!session) {
			return commonErrors.notFound(c, 'Session not found')
		}

		// Build messages array for LLM
		type TechniqueType =
			| 'scamper'
			| 'what_if'
			| 'six_hats'
			| 'five_whys'
			| 'mind_mapping'
			| 'analogical'
			| 'first_principles'
			| 'yes_and'
			| 'future_self'
			| 'reversal'

		const currentTechnique =
			(session.selectedTechniques?.[session.currentTechniqueIndex ?? 0] as TechniqueType) ?? null

		// Save user message
		await db.insert(brainstormMessages).values({
			sessionId,
			role: 'user',
			content: message,
			step: session.currentStep,
			technique: currentTechnique,
		})

		const systemPrompt = buildSystemPrompt(
			session.projectName,
			session.projectDescription ?? '',
			session.currentStep,
			currentTechnique
		)

		// Build conversation history (reverse to chronological, then map)
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
					temperature: 0.8,
					max_tokens: 2048,
				})

				for await (const chunk of generator) {
					fullResponse += chunk
					await stream.writeSSE({
						data: JSON.stringify({ content: chunk }),
					})
				}

				// Save assistant response
				await db.insert(brainstormMessages).values({
					sessionId,
					role: 'assistant',
					content: fullResponse,
					step: session.currentStep,
					technique: currentTechnique,
				})

				// Auto-detect step transitions based on Anna's response
				let newStep = session.currentStep

				// Normalize text for comparison (lowercase, remove accents)
				const normalizedResponse = fullResponse
					.toLowerCase()
					.normalize('NFD')
					.replace(/[\u0300-\u036f]/g, '')

				// Transition from setup to technique when Anna mentions the technique phase
				if (
					session.currentStep === 'setup' &&
					(normalizedResponse.includes('fase de **tecnicas') ||
						normalizedResponse.includes('fase de tecnicas') ||
						normalizedResponse.includes('tecnicas de brainstorming') ||
						normalizedResponse.includes('tecnica escolhida') ||
						normalizedResponse.includes('primeira pergunta criativa') ||
						normalizedResponse.includes('vamos para a fase') ||
						normalizedResponse.includes('resumo executivo') ||
						normalizedResponse.includes('tecnica recomendada'))
				) {
					newStep = 'technique'
				}

				// Transition from technique to execution when user is satisfied or Anna mentions execution phase
				if (
					session.currentStep === 'technique' &&
					(normalizedResponse.includes('fase de **execucao') ||
						normalizedResponse.includes('fase de execucao') ||
						normalizedResponse.includes('vamos comecar a execucao') ||
						normalizedResponse.includes('vamos para execucao') ||
						normalizedResponse.includes('entrando na fase de **execucao') ||
						normalizedResponse.includes('entrando na fase de execucao') ||
						normalizedResponse.includes('vamos seguir em frente') ||
						normalizedResponse.includes('proxima etapa') ||
						normalizedResponse.includes('proximo passo'))
				) {
					newStep = 'execution'
				}

				// Transition from execution to document when user is satisfied
				if (
					session.currentStep === 'execution' &&
					(normalizedResponse.includes('fase de **documento') ||
						normalizedResponse.includes('fase de documento') ||
						normalizedResponse.includes('vamos gerar o documento') ||
						normalizedResponse.includes('vamos criar o documento') ||
						normalizedResponse.includes('preparar o documento') ||
						normalizedResponse.includes('vamos seguir em frente') ||
						normalizedResponse.includes('proxima etapa') ||
						normalizedResponse.includes('proximo passo') ||
						normalizedResponse.includes('finalizar'))
				) {
					newStep = 'document'
				}

				// Update session timestamp and step if changed
				await db
					.update(brainstormSessions)
					.set({
						updatedAt: new Date(),
						...(newStep !== session.currentStep && { currentStep: newStep }),
					})
					.where(eq(brainstormSessions.id, sessionId))

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
brainstormRoutes.post('/sessions/:id/document', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	// Get session WITH messages for document generation
	const session = await db.query.brainstormSessions.findFirst({
		where: and(eq(brainstormSessions.id, sessionId), eq(brainstormSessions.userId, user.id)),
		with: {
			messages: {
				orderBy: [desc(brainstormMessages.createdAt)],
				limit: 100,
			},
		},
	})

	if (!session) {
		return commonErrors.notFound(c, 'Session not found')
	}

	// Build conversation history for document generation
	const conversationHistory = session.messages
		.reverse()
		.filter((m) => m.role !== 'system')
		.map((m) => `**${m.role === 'user' ? 'Usuário' : 'Anna'}:** ${m.content}`)
		.join('\n\n')

	// Stream document generation
	return streamSSE(c, async (stream) => {
		try {
			const client = getOpenRouterClient()
			let fullDocument = ''

			const prompt = buildDocumentPrompt(
				session.projectName,
				session.projectDescription ?? '',
				session.ideas ?? [],
				session.selectedTechniques ?? [],
				conversationHistory
			)

			const generator = client.chatStream({
				messages: [{ role: 'user', content: prompt }],
				model: 'deepseek/deepseek-chat-v3-0324',
				temperature: 0.6,
				max_tokens: 4096,
			})

			for await (const chunk of generator) {
				fullDocument += chunk
				await stream.writeSSE({
					data: JSON.stringify({ content: chunk }),
				})
			}

			// Save document to session and mark as completed
			await db
				.update(brainstormSessions)
				.set({
					documentContent: fullDocument,
					documentTitle: `Brainstorm: ${session.projectName}`,
					currentStep: 'document',
					status: 'completed',
					completedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(brainstormSessions.id, sessionId))

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
})

// Update document content
brainstormRoutes.patch(
	'/sessions/:id/document',
	authMiddleware,
	zValidator('json', UpdateDocumentSchema),
	async (c) => {
		const { userId } = getAuth(c)
		const sessionId = c.req.param('id')
		const { content, title } = c.req.valid('json')

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		const [session] = await db
			.update(brainstormSessions)
			.set({
				documentContent: content,
				...(title && { documentTitle: title }),
				updatedAt: new Date(),
			})
			.where(and(eq(brainstormSessions.id, sessionId), eq(brainstormSessions.userId, user.id)))
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

// Get available techniques
brainstormRoutes.get('/techniques', authMiddleware, async (c) => {
	return successResponse(c, TECHNIQUES)
})

// Update session step
brainstormRoutes.post('/sessions/:id/advance', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const session = await db.query.brainstormSessions.findFirst({
		where: and(eq(brainstormSessions.id, sessionId), eq(brainstormSessions.userId, user.id)),
	})

	if (!session) {
		return commonErrors.notFound(c, 'Session not found')
	}

	// Determine next step
	const stepOrder = ['setup', 'technique', 'execution', 'document'] as const
	const currentIndex = stepOrder.indexOf(session.currentStep)
	const nextStep = stepOrder[Math.min(currentIndex + 1, stepOrder.length - 1)]

	// Mark as completed when reaching document step
	const isCompleted = nextStep === 'document'

	const [updated] = await db
		.update(brainstormSessions)
		.set({
			currentStep: nextStep,
			...(isCompleted && { status: 'completed', completedAt: new Date() }),
			updatedAt: new Date(),
		})
		.where(eq(brainstormSessions.id, sessionId))
		.returning()

	return successResponse(c, updated)
})

// Complete session
brainstormRoutes.post('/sessions/:id/complete', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const [session] = await db
		.update(brainstormSessions)
		.set({
			status: 'completed',
			completedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(and(eq(brainstormSessions.id, sessionId), eq(brainstormSessions.userId, user.id)))
		.returning()

	if (!session) {
		return commonErrors.notFound(c, 'Session not found')
	}

	return successResponse(c, session)
})
