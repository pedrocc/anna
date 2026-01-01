import { zValidator } from '@hono/zod-validator'
import {
	brainstormSessions,
	briefingDocuments,
	briefingMessages,
	briefingSessions,
	db,
	users,
} from '@repo/db'
import {
	BriefingChatRequestSchema,
	CreateBriefingDocumentSchema,
	CreateBriefingSessionSchema,
	PaginationSchema,
	UpdateBriefingDocumentSchema,
	UpdateBriefingSessionSchema,
} from '@repo/shared'
import { and, desc, eq, sql } from 'drizzle-orm'
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
import { getOpenRouterClient, OpenRouterAPIError } from '../lib/openrouter.js'
import { commonErrors, successResponse } from '../lib/response.js'
import { type AuthVariables, authMiddleware, getAuth } from '../middleware/auth.js'

export const briefingRoutes = new Hono<{ Variables: AuthVariables }>()

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

	// Reverse messages to chronological order
	const messagesChronological = session.messages.reverse()

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

		// Create session
		const [newSession] = await db
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
			return commonErrors.internalError(c, 'Failed to create session')
		}

		// Create welcome message from Anna
		const welcomeMessage = buildBriefingWelcomeMessage(
			data.projectName,
			data.projectDescription,
			hasBrainstorm
		)

		await db.insert(briefingMessages).values({
			sessionId: newSession.id,
			role: 'assistant',
			content: welcomeMessage,
			step: 'init',
		})

		// Get session with messages
		const sessionWithMessages = await db.query.briefingSessions.findFirst({
			where: eq(briefingSessions.id, newSession.id),
			with: {
				messages: {
					orderBy: [desc(briefingMessages.createdAt)],
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

// ============================================
// CHAT ENDPOINT (STREAMING)
// ============================================

briefingRoutes.post(
	'/chat',
	authMiddleware,
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
				await db.insert(briefingMessages).values({
					sessionId,
					role: 'assistant',
					content: fullResponse,
					step: session.currentStep,
				})

				// Auto-detect step transitions based on Anna's response
				let newStep = session.currentStep
				const newStepsCompleted = [...(session.stepsCompleted ?? [])]

				// Normalize text for comparison (lowercase, remove accents)
				const normalizedResponse = fullResponse
					.toLowerCase()
					.normalize('NFD')
					.replace(/[\u0300-\u036f]/g, '')

				// Check for explicit action to advance step
				if (action === 'advance_step') {
					const nextStep = getNextStep(session.currentStep)
					if (nextStep) {
						newStep = nextStep
						if (!newStepsCompleted.includes(session.currentStep)) {
							newStepsCompleted.push(session.currentStep)
						}
					}
				} else {
					// Auto-detect transitions based on keywords in response
					const transitionKeywords: Record<string, string[]> = {
						vision: [
							'visao do produto',
							'vamos definir a **visao',
							'visao clara',
							'entrando na fase de **visao',
							'proxima etapa e a visao',
						],
						users: [
							'usuarios-alvo',
							'usuarios do produto',
							'vamos definir os **usuarios',
							'entrando na fase de **usuarios',
							'quem vai usar',
							'personas',
						],
						metrics: [
							'metricas de sucesso',
							'como medir o **sucesso',
							'vamos definir como medir',
							'entrando na fase de **metricas',
							'kpis',
						],
						scope: [
							'escopo do mvp',
							'vamos definir o **escopo',
							'entrando na fase de **escopo',
							'features essenciais',
							'o que entra no mvp',
						],
						complete: [
							'briefing esta completo',
							'concluimos o briefing',
							'product brief completo',
							'vamos para a **conclusao',
							'entrando na fase de **conclusao',
							'gerar o documento',
						],
					}

					for (const [targetStep, keywords] of Object.entries(transitionKeywords)) {
						if (keywords.some((kw) => normalizedResponse.includes(kw))) {
							const targetIndex = BRIEFING_STEPS_ORDER.indexOf(targetStep as typeof newStep)
							const currentIndex = BRIEFING_STEPS_ORDER.indexOf(session.currentStep)

							// Only advance if target is next step
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
				} = {
					updatedAt: new Date(),
				}

				if (newStep !== session.currentStep) {
					updateData.currentStep = newStep
					updateData.stepsCompleted = newStepsCompleted
				}

				// Mark as completed if reaching complete step
				if (newStep === 'complete' && session.status !== 'completed') {
					updateData.status = 'completed'
					updateData.completedAt = new Date()
				}

				await db.update(briefingSessions).set(updateData).where(eq(briefingSessions.id, sessionId))

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
					model: 'deepseek/deepseek-chat-v3-0324',
					temperature: 0.5,
					max_tokens: 4096,
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

				// Save to briefing_documents table
				const [newDoc] = await db
					.insert(briefingDocuments)
					.values({
						sessionId,
						type: docType,
						title: docTitles[docType] ?? `Document: ${session.projectName}`,
						content: fullDocument,
						version: nextVersion,
					})
					.returning()

				// Also update session for backward compatibility
				await db
					.update(briefingSessions)
					.set({
						documentContent: fullDocument,
						documentTitle: docTitles[docType],
						currentStep: 'complete',
						status: 'completed',
						completedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(eq(briefingSessions.id, sessionId))

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

	if (!document) {
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

		if (!document) {
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

	if (!document) {
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
