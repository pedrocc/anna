import { zValidator } from '@hono/zod-validator'
import { briefingSessions, db, prdDocuments, prdMessages, prdSessions, users } from '@repo/db'
import {
	CreatePrdDocumentSchema,
	CreatePrdSessionSchema,
	PaginationSchema,
	PrdChatRequestSchema,
	UpdatePrdDocumentSchema,
	UpdatePrdSessionSchema,
} from '@repo/shared'
import { and, desc, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { getOpenRouterClient, OpenRouterAPIError } from '../lib/openrouter.js'
import {
	buildPrdDocumentPrompt,
	buildPrdSystemPrompt,
	buildPrdWelcomeMessage,
	getNextStep,
	getStepInfo,
	PRD_STEPS_ORDER,
	shouldSkipStep,
} from '../lib/prd-prompts.js'
import { commonErrors, successResponse } from '../lib/response.js'
import { type AuthVariables, authMiddleware, getAuth } from '../middleware/auth.js'

export const prdRoutes = new Hono<{ Variables: AuthVariables }>()

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

// List user's PRD sessions
prdRoutes.get('/sessions', authMiddleware, zValidator('query', PaginationSchema), async (c) => {
	const { userId } = getAuth(c)
	const { page, limit } = c.req.valid('query')
	const offset = (page - 1) * limit

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const [sessions, countResult] = await Promise.all([
		db.query.prdSessions.findMany({
			where: eq(prdSessions.userId, user.id),
			limit,
			offset,
			orderBy: [desc(prdSessions.updatedAt)],
		}),
		db
			.select({ count: sql<number>`count(*)` })
			.from(prdSessions)
			.where(eq(prdSessions.userId, user.id)),
	])

	return successResponse(c, sessions, 200, {
		page,
		limit,
		total: Number(countResult[0]?.count ?? 0),
	})
})

// Get single session with messages and documents
prdRoutes.get('/sessions/:id', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const session = await db.query.prdSessions.findFirst({
		where: and(eq(prdSessions.id, sessionId), eq(prdSessions.userId, user.id)),
		with: {
			messages: {
				orderBy: [desc(prdMessages.createdAt)],
				limit: 100,
			},
			documents: {
				orderBy: [desc(prdDocuments.createdAt)],
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
prdRoutes.post(
	'/sessions',
	authMiddleware,
	zValidator('json', CreatePrdSessionSchema),
	async (c) => {
		const { userId } = getAuth(c)
		const data = c.req.valid('json')

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		// Check for linked briefing session
		let hasBriefing = false
		if (data.briefingSessionId) {
			const briefing = await db.query.briefingSessions.findFirst({
				where: and(
					eq(briefingSessions.id, data.briefingSessionId),
					eq(briefingSessions.userId, user.id)
				),
			})
			hasBriefing = !!briefing
		}

		// Create session
		const [newSession] = await db
			.insert(prdSessions)
			.values({
				userId: user.id,
				projectName: data.projectName,
				projectDescription: data.projectDescription,
				inputDocuments: data.briefingSessionId
					? [
							{
								name: 'Briefing Session',
								path: data.briefingSessionId,
								type: 'briefing' as const,
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
		const welcomeMessage = buildPrdWelcomeMessage(
			data.projectName,
			data.projectDescription,
			hasBriefing
		)

		await db.insert(prdMessages).values({
			sessionId: newSession.id,
			role: 'assistant',
			content: welcomeMessage,
			step: 'init',
		})

		// Get session with messages
		const sessionWithMessages = await db.query.prdSessions.findFirst({
			where: eq(prdSessions.id, newSession.id),
			with: {
				messages: {
					orderBy: [desc(prdMessages.createdAt)],
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
prdRoutes.patch(
	'/sessions/:id',
	authMiddleware,
	zValidator('json', UpdatePrdSessionSchema),
	async (c) => {
		const { userId } = getAuth(c)
		const sessionId = c.req.param('id')
		const data = c.req.valid('json')

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		const [session] = await db
			.update(prdSessions)
			.set({ ...data, updatedAt: new Date() })
			.where(and(eq(prdSessions.id, sessionId), eq(prdSessions.userId, user.id)))
			.returning()

		if (!session) {
			return commonErrors.notFound(c, 'Session not found')
		}

		return successResponse(c, session)
	}
)

// Delete session
prdRoutes.delete('/sessions/:id', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const [deleted] = await db
		.delete(prdSessions)
		.where(and(eq(prdSessions.id, sessionId), eq(prdSessions.userId, user.id)))
		.returning()

	if (!deleted) {
		return commonErrors.notFound(c, 'Session not found')
	}

	return successResponse(c, { deleted: true })
})

// ============================================
// CHAT ENDPOINT (STREAMING)
// ============================================

prdRoutes.post('/chat', authMiddleware, zValidator('json', PrdChatRequestSchema), async (c) => {
	const { userId } = getAuth(c)
	const { sessionId, message, action } = c.req.valid('json')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	// Get session with messages
	const session = await db.query.prdSessions.findFirst({
		where: and(eq(prdSessions.id, sessionId), eq(prdSessions.userId, user.id)),
		with: {
			messages: {
				orderBy: [desc(prdMessages.createdAt)],
				limit: 50, // Last 50 messages for context
			},
		},
	})

	if (!session) {
		return commonErrors.notFound(c, 'Session not found')
	}

	// Save user message
	await db.insert(prdMessages).values({
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
	const systemPrompt = buildPrdSystemPrompt(
		{
			projectName: session.projectName,
			projectDescription: session.projectDescription,
			projectType: session.projectType,
			domain: session.domain,
			domainComplexity: session.domainComplexity,
			executiveSummary: session.executiveSummary,
			differentiators: session.differentiators ?? [],
			successCriteria: session.successCriteria ?? [],
			personas: session.personas ?? [],
			userJourneys: session.userJourneys ?? [],
			domainConcerns: session.domainConcerns ?? [],
			regulatoryRequirements: session.regulatoryRequirements ?? [],
			skipDomainStep: session.skipDomainStep,
			innovations: session.innovations ?? [],
			skipInnovationStep: session.skipInnovationStep,
			projectTypeDetails: session.projectTypeDetails ?? {},
			projectTypeQuestions: session.projectTypeQuestions ?? {},
			features: session.features ?? [],
			outOfScope: session.outOfScope ?? [],
			mvpSuccessCriteria: session.mvpSuccessCriteria ?? [],
			functionalRequirements: session.functionalRequirements ?? [],
			nonFunctionalRequirements: session.nonFunctionalRequirements ?? [],
			stepsCompleted: session.stepsCompleted ?? [],
			inputDocuments: session.inputDocuments ?? [],
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
			await db.insert(prdMessages).values({
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

			// Check for explicit action to advance or skip step
			if (action === 'advance_step' || action === 'skip_step') {
				const skipOptional = action === 'skip_step'
				const nextStep = getNextStep(session.currentStep, skipOptional)
				if (nextStep) {
					newStep = nextStep
					if (!newStepsCompleted.includes(session.currentStep)) {
						newStepsCompleted.push(session.currentStep)
					}
				}
			} else {
				// Auto-detect transitions based on keywords in response
				const transitionKeywords: Record<string, string[]> = {
					discovery: [
						'vamos para a **descoberta',
						'classificar o projeto',
						'descoberta de projeto',
						'tipo de projeto',
					],
					success: [
						'criterios de sucesso',
						'vamos definir os **criterios',
						'como medir sucesso',
						'criterios de **sucesso',
					],
					journeys: [
						'jornadas de usuario',
						'mapeamento de usuarios',
						'vamos mapear as **jornadas',
						'personas e jornadas',
					],
					domain: [
						'explorar requisitos especificos do dominio',
						'requisitos de dominio',
						'domain-especifica',
						'exploracao de dominio',
					],
					innovation: [
						'descoberta de inovacao',
						'aspectos inovadores',
						'vamos verificar se ha **inovacao',
						'inovacao a explorar',
					],
					project_type: [
						'deep dive',
						'project-type especifico',
						'detalhes tecnicos',
						'vamos fazer um **deep dive',
					],
					scoping: [
						'escopo mvp',
						'priorizacao de features',
						'vamos definir o **escopo',
						'mvp e priorizacao',
					],
					functional: [
						'requisitos funcionais',
						'sintese de requisitos',
						'vamos sintetizar os **requisitos funcionais',
						'fr-',
					],
					nonfunctional: [
						'requisitos nao-funcionais',
						'atributos de qualidade',
						'vamos para os **requisitos nao-funcionais',
						'nfr-',
					],
					complete: [
						'prd esta completo',
						'concluimos o prd',
						'vamos para a **conclusao',
						'gerar o documento',
						'prd completo',
					],
				}

				for (const [targetStep, keywords] of Object.entries(transitionKeywords)) {
					if (keywords.some((kw) => normalizedResponse.includes(kw))) {
						const targetIndex = PRD_STEPS_ORDER.indexOf(targetStep as typeof newStep)
						const currentIndex = PRD_STEPS_ORDER.indexOf(session.currentStep)

						// Only advance if target is next step (or skipping optional)
						if (targetIndex === currentIndex + 1) {
							if (!newStepsCompleted.includes(session.currentStep)) {
								newStepsCompleted.push(session.currentStep)
							}
							newStep = targetStep as typeof newStep
							break
						}
						// Allow skipping optional steps
						if (targetIndex > currentIndex + 1) {
							const skippedStep = PRD_STEPS_ORDER[currentIndex + 1]
							if (skippedStep && shouldSkipStep(skippedStep, session)) {
								if (!newStepsCompleted.includes(session.currentStep)) {
									newStepsCompleted.push(session.currentStep)
								}
								newStep = targetStep as typeof newStep
								break
							}
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

			await db.update(prdSessions).set(updateData).where(eq(prdSessions.id, sessionId))

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
// DOCUMENT ENDPOINTS
// ============================================

// Generate document from session
prdRoutes.post(
	'/sessions/:id/document',
	authMiddleware,
	zValidator('json', CreatePrdDocumentSchema.optional()),
	async (c) => {
		const { userId } = getAuth(c)
		const sessionId = c.req.param('id')
		const body = c.req.valid('json')
		const docType = body?.type ?? 'prd_full'

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		// Get session with all data
		const session = await db.query.prdSessions.findFirst({
			where: and(eq(prdSessions.id, sessionId), eq(prdSessions.userId, user.id)),
		})

		if (!session) {
			return commonErrors.notFound(c, 'Session not found')
		}

		// Check if document of this type already exists - get latest version
		const existingDoc = await db.query.prdDocuments.findFirst({
			where: and(eq(prdDocuments.sessionId, sessionId), eq(prdDocuments.type, docType)),
			orderBy: [desc(prdDocuments.version)],
		})
		const nextVersion = existingDoc ? existingDoc.version + 1 : 1

		// Stream document generation
		return streamSSE(c, async (stream) => {
			try {
				const client = getOpenRouterClient()
				let fullDocument = ''

				const prompt = buildPrdDocumentPrompt({
					projectName: session.projectName,
					projectDescription: session.projectDescription,
					projectType: session.projectType,
					domain: session.domain,
					domainComplexity: session.domainComplexity,
					executiveSummary: session.executiveSummary,
					differentiators: session.differentiators ?? [],
					successCriteria: session.successCriteria ?? [],
					personas: session.personas ?? [],
					userJourneys: session.userJourneys ?? [],
					domainConcerns: session.domainConcerns ?? [],
					regulatoryRequirements: session.regulatoryRequirements ?? [],
					innovations: session.innovations ?? [],
					projectTypeDetails: session.projectTypeDetails ?? {},
					projectTypeQuestions: session.projectTypeQuestions ?? {},
					features: session.features ?? [],
					outOfScope: session.outOfScope ?? [],
					mvpSuccessCriteria: session.mvpSuccessCriteria ?? [],
					functionalRequirements: session.functionalRequirements ?? [],
					nonFunctionalRequirements: session.nonFunctionalRequirements ?? [],
				})

				const generator = client.chatStream({
					messages: [{ role: 'user', content: prompt }],
					model: 'deepseek/deepseek-chat-v3-0324',
					temperature: 0.5,
					max_tokens: 8192, // PRD needs more tokens
				})

				for await (const chunk of generator) {
					fullDocument += chunk
					await stream.writeSSE({
						data: JSON.stringify({ content: chunk }),
					})
				}

				// Define title based on document type
				const docTitles: Record<string, string> = {
					prd_full: `PRD: ${session.projectName}`,
					executive_summary: `Executive Summary: ${session.projectName}`,
					functional_requirements: `Functional Requirements: ${session.projectName}`,
					nonfunctional_requirements: `Non-Functional Requirements: ${session.projectName}`,
					user_journeys: `User Journeys: ${session.projectName}`,
					mvp_scope: `MVP Scope: ${session.projectName}`,
					custom: body?.title ?? `Custom Document: ${session.projectName}`,
				}

				// Save to prd_documents table
				const [newDoc] = await db
					.insert(prdDocuments)
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
					.update(prdSessions)
					.set({
						documentContent: fullDocument,
						documentTitle: docTitles[docType],
						currentStep: 'complete',
						status: 'completed',
						completedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(eq(prdSessions.id, sessionId))

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
prdRoutes.get('/sessions/:id/documents', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	// Verify session belongs to user
	const session = await db.query.prdSessions.findFirst({
		where: and(eq(prdSessions.id, sessionId), eq(prdSessions.userId, user.id)),
	})

	if (!session) {
		return commonErrors.notFound(c, 'Session not found')
	}

	const documents = await db.query.prdDocuments.findMany({
		where: eq(prdDocuments.sessionId, sessionId),
		orderBy: [desc(prdDocuments.createdAt)],
	})

	return successResponse(c, documents)
})

// Get a specific document
prdRoutes.get('/documents/:id', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const documentId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const document = await db.query.prdDocuments.findFirst({
		where: eq(prdDocuments.id, documentId),
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
prdRoutes.patch(
	'/documents/:id',
	authMiddleware,
	zValidator('json', UpdatePrdDocumentSchema),
	async (c) => {
		const { userId } = getAuth(c)
		const documentId = c.req.param('id')
		const { content, title } = c.req.valid('json')

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		// Get document with session
		const document = await db.query.prdDocuments.findFirst({
			where: eq(prdDocuments.id, documentId),
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
			.update(prdDocuments)
			.set({
				content,
				...(title && { title }),
				updatedAt: new Date(),
			})
			.where(eq(prdDocuments.id, documentId))
			.returning()

		return successResponse(c, updated)
	}
)

// Delete a specific document
prdRoutes.delete('/documents/:id', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const documentId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	// Get document with session
	const document = await db.query.prdDocuments.findFirst({
		where: eq(prdDocuments.id, documentId),
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

	await db.delete(prdDocuments).where(eq(prdDocuments.id, documentId))

	return successResponse(c, { deleted: true })
})

// ============================================
// UTILITY ENDPOINTS
// ============================================

// Get step info
prdRoutes.get('/steps', authMiddleware, async (c) => {
	const steps = PRD_STEPS_ORDER.map((step) => ({
		id: step,
		...getStepInfo(step),
	}))
	return successResponse(c, steps)
})

// Advance to next step
prdRoutes.post('/sessions/:id/advance', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const session = await db.query.prdSessions.findFirst({
		where: and(eq(prdSessions.id, sessionId), eq(prdSessions.userId, user.id)),
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
		.update(prdSessions)
		.set({
			currentStep: nextStep,
			stepsCompleted,
			...(isCompleted && { status: 'completed', completedAt: new Date() }),
			updatedAt: new Date(),
		})
		.where(eq(prdSessions.id, sessionId))
		.returning()

	return successResponse(c, updated)
})

// Skip optional step
prdRoutes.post('/sessions/:id/skip', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const session = await db.query.prdSessions.findFirst({
		where: and(eq(prdSessions.id, sessionId), eq(prdSessions.userId, user.id)),
	})

	if (!session) {
		return commonErrors.notFound(c, 'Session not found')
	}

	// Check if current step is optional
	const stepInfo = getStepInfo(session.currentStep)
	if (!stepInfo.optional) {
		return commonErrors.badRequest(c, 'Current step is not optional')
	}

	// Determine next step (skipping current)
	const nextStep = getNextStep(session.currentStep, true)

	if (!nextStep) {
		return commonErrors.badRequest(c, 'No next step available')
	}

	// Update skip flag based on current step
	const skipFlags: Record<string, Record<string, string>> = {
		domain: { skipDomainStep: 'true' },
		innovation: { skipInnovationStep: 'true' },
	}

	// Update steps completed
	const stepsCompleted = [...(session.stepsCompleted ?? [])]
	if (!stepsCompleted.includes(session.currentStep)) {
		stepsCompleted.push(session.currentStep)
	}

	const [updated] = await db
		.update(prdSessions)
		.set({
			currentStep: nextStep,
			stepsCompleted,
			...(skipFlags[session.currentStep] ?? {}),
			updatedAt: new Date(),
		})
		.where(eq(prdSessions.id, sessionId))
		.returning()

	return successResponse(c, updated)
})

// Complete session
prdRoutes.post('/sessions/:id/complete', authMiddleware, async (c) => {
	const { userId } = getAuth(c)
	const sessionId = c.req.param('id')

	const user = await getUserByClerkId(userId)
	if (!user) {
		return commonErrors.notFound(c, 'User not found')
	}

	const [session] = await db
		.update(prdSessions)
		.set({
			status: 'completed',
			completedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(and(eq(prdSessions.id, sessionId), eq(prdSessions.userId, user.id)))
		.returning()

	if (!session) {
		return commonErrors.notFound(c, 'Session not found')
	}

	return successResponse(c, session)
})
