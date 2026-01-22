import { zValidator } from '@hono/zod-validator'
import {
	briefingDocuments,
	briefingSessions,
	db,
	prdDocuments,
	prdMessages,
	prdSessions,
	smSessions,
} from '@repo/db'
import type { PrdStep } from '@repo/shared'
import {
	CreatePrdDocumentSchema,
	CreatePrdSessionSchema,
	EditPrdMessageRequestSchema,
	PaginationSchema,
	PrdChatRequestSchema,
	RenameSessionSchema,
	UpdatePrdDocumentSchema,
	UpdatePrdSessionSchema,
} from '@repo/shared'
import { and, desc, eq, gte, ne, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { getUserByClerkId } from '../lib/helpers.js'
import { createLogger } from '../lib/logger.js'
import { getOpenRouterClient, OpenRouterAPIError } from '../lib/openrouter.js'

const prdLogger = createLogger('prd')

import {
	buildBriefingAnalysisPrompt,
	buildExtractionPrompt,
	buildPrdDocumentPrompt,
	buildPrdSystemPrompt,
	buildPrdWelcomeMessage,
	getNextStep,
	getStepInfo,
	PRD_STEPS_ORDER,
} from '../lib/prd-prompts.js'
import { commonErrors, successResponse } from '../lib/response.js'
import { type AuthVariables, authMiddleware, getAuth } from '../middleware/auth.js'
import { rateLimiter } from '../middleware/rate-limiter.js'

export const prdRoutes = new Hono<{ Variables: AuthVariables }>()

// Step completion patterns for auto-detection (seguindo padrão do Briefing)
// Patterns são testados contra resposta normalizada (lowercase, sem acentos)
// IMPORTANTE: Os patterns devem estar alinhados com as frases de transição definidas em prd-prompts.ts
const stepCompletionPatterns: Record<PrdStep, RegExp[]> = {
	init: [
		/vamos\s+(para|comecar|iniciar)\s+(a\s+)?descoberta/i,
		/avanc(ar|ando)\s+para\s+descoberta/i,
		/proxim[ao]\s+(etapa|passo).*descoberta/i,
		/fase\s+discovery/i,
		/etapa\s+de\s+descoberta/i,
	],
	discovery: [
		/vamos\s+(para|definir)\s+(os\s+)?criterios\s+de\s+sucesso/i,
		/avanc(ar|ando)\s+para\s+(criterios|sucesso)/i,
		/proxim[ao]\s+(etapa|passo).*sucesso/i,
		/criterios\s+de\s+sucesso\s*\(step\s*3\)/i,
		/step\s*3.*sucesso/i,
		/agora\s+vamos\s+definir\s+(os\s+)?criterios\s+de\s+sucesso/i,
	],
	success: [
		/vamos\s+(para\s+)?(mapear\s+)?(as\s+)?jornadas/i,
		/avanc(ar|ando)\s+para\s+jornadas/i,
		/proxim[ao]\s+(etapa|passo).*jornadas/i,
		/mapeamento\s+de\s+(usuarios|jornadas)/i,
		/step\s*4.*jornadas/i,
		/agora\s+vamos\s+mapear\s+(as\s+)?jornadas/i,
	],
	journeys: [
		/vamos\s+(para\s+)?(explorar\s+)?(os\s+)?requisitos\s+de\s+dominio/i,
		/avanc(ar|ando)\s+para\s+dominio/i,
		/proxim[ao]\s+(etapa|passo).*dominio/i,
		/podemos\s+pular.*dominio/i,
		/exploracao\s+de\s+dominio/i,
		/step\s*5.*dominio/i,
		/precisamos\s+explorar\s+requisitos\s+(especificos\s+)?(do\s+)?dominio/i,
	],
	domain: [
		/vamos\s+(para\s+)?(verificar\s+)?(se\s+ha\s+)?inovacao/i,
		/avanc(ar|ando)\s+para\s+inovacao/i,
		/proxim[ao]\s+etapa.*inovacao/i,
		/descoberta\s+de\s+inovacao/i,
		/step\s*6.*inovacao/i,
		/requisitos\s+de\s+dominio\s+documentados/i,
		/agora\s+(vamos\s+)?(para\s+)?inovacao/i,
	],
	innovation: [
		/deep\s+dive\s+(no\s+)?tipo\s+de\s+projeto/i,
		/avanc(ar|ando)\s+para\s+(project.?type|tipo)/i,
		/vamos\s+(para\s+)?(o\s+)?tipo\s+de\s+projeto/i,
		/detalhes\s+tecnicos/i,
		/step\s*7.*tipo/i,
		/inovacoes\s+mapeadas/i,
		/agora\s+vamos\s+(fazer\s+)?(um\s+)?deep\s+dive/i,
	],
	project_type: [
		/vamos\s+(para\s+)?(definir\s+)?(o\s+)?escopo/i,
		/avanc(ar|ando)\s+para\s+escopo/i,
		/proxim[ao]\s+(etapa|passo).*escopo/i,
		/mvp\s+e\s+priorizacao/i,
		/step\s*8.*escopo/i,
		/detalhes\s+tecnicos\s+documentados/i,
		/agora\s+vamos\s+definir\s+(o\s+)?escopo\s+mvp/i,
	],
	scoping: [
		/vamos\s+(para\s+)?(sintetizar\s+)?(os\s+)?requisitos\s+funcionais/i,
		/avanc(ar|ando)\s+para\s+(funcionais|requisitos)/i,
		/requisitos\s+funcionais\s*\(fr/i,
		/step\s*9.*funcionais/i,
		/escopo\s+definido/i,
		/agora\s+vamos\s+sintetizar\s+(os\s+)?requisitos\s+funcionais/i,
	],
	functional: [
		/vamos\s+(para\s+)?(os\s+)?requisitos\s+nao.?funcionais/i,
		/avanc(ar|ando)\s+para\s+nao.?funcionais/i,
		/requisitos\s+nao.?funcionais\s*\(nfr/i,
		/step\s*10.*nao.?funcionais/i,
		/requisitos\s+funcionais\s+definidos/i,
		/agora\s+(os\s+)?requisitos\s+nao.?funcionais/i,
	],
	nonfunctional: [
		/prd\s+(esta\s+)?(quase\s+)?completo/i,
		/vamos\s+para\s+(a\s+)?conclusao/i,
		/todas\s+(as\s+)?etapas\s+(foram\s+)?concluidas/i,
		/step\s*11.*conclusao/i,
		/documento\s+concluido/i,
		/pronto\s+para\s+validacao/i,
	],
	complete: [],
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

	// Reverse messages to chronological order (use spread to avoid mutating original)
	const messagesChronological = [...session.messages].reverse()

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

		// Briefing is optional - fetch if provided
		let briefing: typeof briefingSessions.$inferSelect | undefined
		let briefingContent: string | null = null

		if (data.briefingSessionId) {
			briefing = await db.query.briefingSessions.findFirst({
				where: and(
					eq(briefingSessions.id, data.briefingSessionId),
					eq(briefingSessions.userId, user.id)
				),
			})

			if (!briefing) {
				return commonErrors.notFound(c, 'Briefing session not found')
			}

			if (briefing.status !== 'completed') {
				return commonErrors.badRequest(c, 'Briefing must be completed before creating a PRD')
			}

			// Get the latest document from the briefing
			const latestDocument = await db.query.briefingDocuments.findFirst({
				where: eq(briefingDocuments.sessionId, data.briefingSessionId),
				orderBy: [desc(briefingDocuments.version)],
			})

			// Use document content or fallback to session documentContent
			briefingContent = latestDocument?.content ?? briefing.documentContent

			if (!briefingContent) {
				return commonErrors.badRequest(
					c,
					'Briefing does not have a generated document. Please generate the document first.'
				)
			}
		}

		// Generate AI analysis first if briefing is provided (before transaction)
		let annaAnalysis = ''
		if (briefingContent) {
			const openRouter = getOpenRouterClient()
			const analysisPrompt = buildBriefingAnalysisPrompt(briefingContent, data.projectName)

			try {
				const response = await openRouter.chat({
					model: 'deepseek/deepseek-chat-v3-0324',
					messages: [
						{ role: 'system', content: analysisPrompt.systemPrompt },
						{ role: 'user', content: analysisPrompt.userPrompt },
					],
					temperature: 0.7,
					max_tokens: 4096,
				})
				annaAnalysis = response.choices[0]?.message?.content ?? ''
			} catch {
				// Fallback message if AI generation fails
				annaAnalysis = `Recebi o briefing do projeto **"${data.projectName}"**. Vou analisar o documento e preparar as proximas etapas do PRD.

Com base no briefing, vamos avancar para a etapa de **Descoberta**. Me conte: qual e o tipo de projeto que estamos construindo? (API, Mobile App, SaaS, etc.)`
			}
		}

		// Create session and messages in a transaction
		const sessionWithMessages = await db.transaction(async (tx) => {
			const [newSession] = await tx
				.insert(prdSessions)
				.values({
					userId: user.id,
					projectName: data.projectName,
					projectDescription: data.projectDescription,
					inputDocuments: briefing
						? [
								{
									name: briefing.projectName,
									path: data.briefingSessionId ?? '',
									type: 'briefing' as const,
									loadedAt: new Date().toISOString(),
								},
							]
						: [],
				})
				.returning()

			if (!newSession) {
				throw new Error('Failed to create session')
			}

			// 1. Create welcome message from Anna
			const welcomeMessage = buildPrdWelcomeMessage(
				data.projectName,
				data.projectDescription,
				!!briefingContent
			)

			await tx.insert(prdMessages).values({
				sessionId: newSession.id,
				role: 'assistant',
				content: welcomeMessage,
				step: 'init',
			})

			// If briefing is provided, add its content and AI analysis
			if (briefingContent) {
				// 2. Insert briefing document as user message
				await tx.insert(prdMessages).values({
					sessionId: newSession.id,
					role: 'user',
					content: `**Documento do Briefing:**\n\n${briefingContent}`,
					step: 'init',
				})

				// 3. Insert Anna's analysis
				await tx.insert(prdMessages).values({
					sessionId: newSession.id,
					role: 'assistant',
					content: annaAnalysis,
					step: 'init',
				})
			}

			// Get session with messages
			return await tx.query.prdSessions.findFirst({
				where: eq(prdSessions.id, newSession.id),
				with: {
					messages: {
						orderBy: [desc(prdMessages.createdAt)],
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

// Rename session with cascade to linked Briefing and SM sessions
prdRoutes.post(
	'/sessions/:id/rename',
	authMiddleware,
	zValidator('json', RenameSessionSchema),
	async (c) => {
		const { userId } = getAuth(c)
		const sessionId = c.req.param('id')
		const { projectName: newName } = c.req.valid('json')

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		// Get current PRD session to find linked briefing
		const currentSession = await db.query.prdSessions.findFirst({
			where: and(eq(prdSessions.id, sessionId), eq(prdSessions.userId, user.id)),
		})

		if (!currentSession) {
			return commonErrors.notFound(c, 'Session not found')
		}

		// Update PRD and cascade to linked sessions in a transaction
		await db.transaction(async (tx) => {
			// Update PRD session
			await tx
				.update(prdSessions)
				.set({ projectName: newName, updatedAt: new Date() })
				.where(eq(prdSessions.id, sessionId))

			// Find linked briefing from inputDocuments and update it
			const docs = currentSession.inputDocuments as Array<{ path?: string; type?: string }> | null
			const briefingDoc = docs?.find((d) => d.type === 'briefing')
			if (briefingDoc?.path) {
				await tx
					.update(briefingSessions)
					.set({ projectName: newName, updatedAt: new Date() })
					.where(
						and(eq(briefingSessions.id, briefingDoc.path), eq(briefingSessions.userId, user.id))
					)
			}

			// Update all SM sessions linked to this PRD
			await tx
				.update(smSessions)
				.set({ projectName: newName, updatedAt: new Date() })
				.where(and(eq(smSessions.prdSessionId, sessionId), eq(smSessions.userId, user.id)))
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

prdRoutes.post(
	'/chat',
	rateLimiter({ type: 'chat' }),
	authMiddleware,
	zValidator('json', PrdChatRequestSchema),
	async (c) => {
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
				await db.insert(prdMessages).values({
					sessionId,
					role: 'assistant',
					content: fullResponse,
					step: session.currentStep,
				})

				// Auto-advance step based on AI response content (padrão Briefing)
				const normalizedResponse = fullResponse
					.toLowerCase()
					.normalize('NFD')
					.replace(/[\u0300-\u036f]/g, '')

				const currentPatterns = stepCompletionPatterns[session.currentStep] ?? []
				const shouldAdvance =
					session.currentStep !== 'complete' &&
					currentPatterns.some((pattern) => pattern.test(normalizedResponse))

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
							.update(prdSessions)
							.set({
								currentStep: nextStep,
								stepsCompleted,
								...(nextStep === 'complete' && { status: 'completed', completedAt: new Date() }),
								updatedAt: new Date(),
							})
							.where(eq(prdSessions.id, sessionId))
					}
				}

				// Update session timestamp if no step change
				if (!shouldAdvance) {
					await db
						.update(prdSessions)
						.set({ updatedAt: new Date() })
						.where(eq(prdSessions.id, sessionId))
				}

				// Send step update event if step changed
				if (newStep !== session.currentStep) {
					await stream.writeSSE({
						data: JSON.stringify({ stepUpdate: newStep }),
					})
				}

				await stream.writeSSE({ data: '[DONE]' })
			} catch (error) {
				const errorMessage =
					error instanceof OpenRouterAPIError ? error.message : 'Failed to generate response'

				prdLogger.error({ err: error, sessionId }, 'Chat stream error')

				// Update session state so error is persisted for client recovery
				await db
					.update(prdSessions)
					.set({
						generationStatus: 'failed',
						generationError: errorMessage,
						updatedAt: new Date(),
					})
					.where(eq(prdSessions.id, sessionId))

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

prdRoutes.post(
	'/messages/:messageId/edit',
	authMiddleware,
	zValidator('json', EditPrdMessageRequestSchema),
	async (c) => {
		const { userId } = getAuth(c)
		const messageId = c.req.param('messageId')
		const { content } = c.req.valid('json')

		const user = await getUserByClerkId(userId)
		if (!user) {
			return commonErrors.notFound(c, 'User not found')
		}

		// 1. Get the message to edit
		const message = await db.query.prdMessages.findFirst({
			where: eq(prdMessages.id, messageId),
		})

		if (!message) {
			return commonErrors.notFound(c, 'Message not found')
		}

		// 2. Validate it's a user message
		if (message.role !== 'user') {
			return commonErrors.badRequest(c, 'Can only edit user messages')
		}

		// 3. Get session and verify ownership
		const session = await db.query.prdSessions.findFirst({
			where: and(eq(prdSessions.id, message.sessionId), eq(prdSessions.userId, user.id)),
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
				.delete(prdMessages)
				.where(
					and(eq(prdMessages.sessionId, sessionId), gte(prdMessages.createdAt, messageTimestamp))
				)

			// 5. Check if we need to rollback the step
			const currentStepIndex = PRD_STEPS_ORDER.indexOf(session.currentStep)
			const editedStepIndex = PRD_STEPS_ORDER.indexOf(editedStep)

			if (currentStepIndex > editedStepIndex) {
				// Rollback to the edited step
				const newStepsCompleted = (session.stepsCompleted ?? []).filter(
					(s) => PRD_STEPS_ORDER.indexOf(s as PrdStep) < editedStepIndex
				)

				await tx
					.update(prdSessions)
					.set({
						currentStep: editedStep,
						stepsCompleted: newStepsCompleted,
						status: 'active',
						completedAt: null,
						updatedAt: new Date(),
					})
					.where(eq(prdSessions.id, sessionId))
			}

			// 6. Insert the new edited user message
			await tx.insert(prdMessages).values({
				sessionId,
				role: 'user',
				content,
				step: editedStep,
			})
		})

		// 7. Refresh session data for LLM context
		const updatedSession = await db.query.prdSessions.findFirst({
			where: eq(prdSessions.id, sessionId),
			with: {
				messages: {
					orderBy: [desc(prdMessages.createdAt)],
					limit: 50,
				},
			},
		})

		if (!updatedSession) {
			return commonErrors.internalError(c, 'Failed to refresh session')
		}

		// 8. Build system prompt with session context
		const systemPrompt = buildPrdSystemPrompt(
			{
				projectName: updatedSession.projectName,
				projectDescription: updatedSession.projectDescription,
				projectType: updatedSession.projectType,
				domain: updatedSession.domain,
				domainComplexity: updatedSession.domainComplexity,
				executiveSummary: updatedSession.executiveSummary,
				differentiators: updatedSession.differentiators ?? [],
				successCriteria: updatedSession.successCriteria ?? [],
				personas: updatedSession.personas ?? [],
				userJourneys: updatedSession.userJourneys ?? [],
				domainConcerns: updatedSession.domainConcerns ?? [],
				regulatoryRequirements: updatedSession.regulatoryRequirements ?? [],
				skipDomainStep: updatedSession.skipDomainStep,
				innovations: updatedSession.innovations ?? [],
				skipInnovationStep: updatedSession.skipInnovationStep,
				projectTypeDetails: updatedSession.projectTypeDetails ?? {},
				projectTypeQuestions: updatedSession.projectTypeQuestions ?? {},
				features: updatedSession.features ?? [],
				outOfScope: updatedSession.outOfScope ?? [],
				mvpSuccessCriteria: updatedSession.mvpSuccessCriteria ?? [],
				functionalRequirements: updatedSession.functionalRequirements ?? [],
				nonFunctionalRequirements: updatedSession.nonFunctionalRequirements ?? [],
				stepsCompleted: updatedSession.stepsCompleted ?? [],
				inputDocuments: updatedSession.inputDocuments ?? [],
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
				await db.insert(prdMessages).values({
					sessionId,
					role: 'assistant',
					content: fullResponse,
					step: updatedSession.currentStep,
				})

				// Auto-advance step based on AI response content (padrão Briefing)
				const normalizedResponse = fullResponse
					.toLowerCase()
					.normalize('NFD')
					.replace(/[\u0300-\u036f]/g, '')

				const currentPatterns = stepCompletionPatterns[updatedSession.currentStep] ?? []
				const shouldAdvance =
					updatedSession.currentStep !== 'complete' &&
					currentPatterns.some((pattern) => pattern.test(normalizedResponse))

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
							.update(prdSessions)
							.set({
								currentStep: nextStep,
								stepsCompleted,
								...(nextStep === 'complete' && { status: 'completed', completedAt: new Date() }),
								updatedAt: new Date(),
							})
							.where(eq(prdSessions.id, sessionId))
					}
				}

				// Update session timestamp if no step change
				if (!shouldAdvance) {
					await db
						.update(prdSessions)
						.set({ updatedAt: new Date() })
						.where(eq(prdSessions.id, sessionId))
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
prdRoutes.post(
	'/sessions/:id/document',
	rateLimiter({ type: 'document' }),
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

		// Get session with all data and messages
		const session = await db.query.prdSessions.findFirst({
			where: and(eq(prdSessions.id, sessionId), eq(prdSessions.userId, user.id)),
			with: {
				messages: {
					orderBy: [desc(prdMessages.createdAt)],
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

		// Get messages in chronological order for document generation
		const messagesChronological = [...(session.messages ?? [])].reverse()

		// Check if document of this type already exists - get latest version
		const existingDoc = await db.query.prdDocuments.findFirst({
			where: and(eq(prdDocuments.sessionId, sessionId), eq(prdDocuments.type, docType)),
			orderBy: [desc(prdDocuments.version)],
		})
		const nextVersion = existingDoc ? existingDoc.version + 1 : 1

		// Atomic update: mark generation as started only if not already generating
		// This prevents race conditions when multiple requests come in simultaneously
		const updateResult = await db
			.update(prdSessions)
			.set({
				generationStatus: 'generating',
				generationStartedAt: new Date(),
				generationError: null,
			})
			.where(and(eq(prdSessions.id, sessionId), ne(prdSessions.generationStatus, 'generating')))
			.returning({ id: prdSessions.id })

		// If no rows were updated, another request already started generation
		if (updateResult.length === 0) {
			return commonErrors.badRequest(c, 'Document generation already in progress')
		}

		// Stream document generation
		prdLogger.info(
			{ sessionId, messagesCount: messagesChronological.length },
			'Starting document generation'
		)

		return streamSSE(c, async (stream) => {
			prdLogger.debug({ sessionId }, 'SSE stream started')
			try {
				const client = getOpenRouterClient()
				let fullDocument = ''

				const prompt = buildPrdDocumentPrompt(
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
						innovations: session.innovations ?? [],
						projectTypeDetails: session.projectTypeDetails ?? {},
						projectTypeQuestions: session.projectTypeQuestions ?? {},
						features: session.features ?? [],
						outOfScope: session.outOfScope ?? [],
						mvpSuccessCriteria: session.mvpSuccessCriteria ?? [],
						functionalRequirements: session.functionalRequirements ?? [],
						nonFunctionalRequirements: session.nonFunctionalRequirements ?? [],
					},
					messagesChronological.map((m) => ({ role: m.role, content: m.content })),
					user.name
				)

				prdLogger.debug({ sessionId, promptLength: prompt.length }, 'Calling OpenRouter')

				const generator = client.chatStream({
					messages: [{ role: 'user', content: prompt }],
					model: 'deepseek/deepseek-v3.2',
					temperature: 0.5,
					max_tokens: 16384, // DeepSeek V3 via OpenRouter max output for comprehensive PRD documents
				})

				prdLogger.debug({ sessionId }, 'Generator created, starting iteration')
				let chunkCount = 0
				for await (const chunk of generator) {
					chunkCount++
					fullDocument += chunk
					await stream.writeSSE({
						data: JSON.stringify({ content: chunk }),
					})
				}
				prdLogger.debug(
					{ sessionId, chunkCount, documentLength: fullDocument.length },
					'Stream loop finished'
				)

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

				// Also update session + mark generation as completed
				await db
					.update(prdSessions)
					.set({
						documentContent: fullDocument,
						documentTitle: docTitles[docType],
						currentStep: 'complete',
						status: 'completed',
						generationStatus: 'completed',
						completedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(eq(prdSessions.id, sessionId))

				// Extract structured data from document (non-blocking)
				try {
					prdLogger.debug({ sessionId }, 'Starting structured data extraction')
					const extractionPrompt = buildExtractionPrompt(fullDocument)

					const extractionResponse = await client.chat({
						messages: [
							{
								role: 'system',
								content:
									'Você é um especialista em análise de documentos PRD. Extraia dados estruturados em JSON válido. Responda APENAS com JSON, sem explicações.',
							},
							{ role: 'user', content: extractionPrompt },
						],
						model: 'deepseek/deepseek-chat', // Modelo mais barato para extração
						temperature: 0.1, // Baixa temperatura para output consistente
						max_tokens: 8192,
					})

					const jsonContent = extractionResponse.choices[0]?.message?.content
					if (jsonContent) {
						// Tentar parsear o JSON (pode ter markdown wrapper)
						let cleanJson = jsonContent.trim()
						// Remover possíveis wrappers de markdown
						if (cleanJson.startsWith('```json')) {
							cleanJson = cleanJson.slice(7)
						} else if (cleanJson.startsWith('```')) {
							cleanJson = cleanJson.slice(3)
						}
						if (cleanJson.endsWith('```')) {
							cleanJson = cleanJson.slice(0, -3)
						}
						cleanJson = cleanJson.trim()

						const extractedData = JSON.parse(cleanJson)
						prdLogger.info(
							{
								sessionId,
								features: extractedData.features?.length ?? 0,
								frs: extractedData.functionalRequirements?.length ?? 0,
								personas: extractedData.personas?.length ?? 0,
							},
							'Extraction successful'
						)

						// Update session with structured data
						await db
							.update(prdSessions)
							.set({
								executiveSummary: extractedData.executiveSummary ?? null,
								personas: extractedData.personas ?? [],
								features: extractedData.features ?? [],
								functionalRequirements: extractedData.functionalRequirements ?? [],
								nonFunctionalRequirements: extractedData.nonFunctionalRequirements ?? [],
								successCriteria: extractedData.successCriteria ?? [],
								outOfScope: extractedData.outOfScope ?? [],
								mvpSuccessCriteria: extractedData.mvpSuccessCriteria ?? [],
								userJourneys: extractedData.userJourneys ?? [],
								updatedAt: new Date(),
							})
							.where(eq(prdSessions.id, sessionId))

						prdLogger.debug({ sessionId }, 'Structured data saved to database')
					}
				} catch (extractionError) {
					// Log but don't fail - extraction is optional
					prdLogger.warn({ err: extractionError, sessionId }, 'Extraction failed (non-critical)')
				}

				await stream.writeSSE({
					data: JSON.stringify({
						done: true,
						document: newDoc,
					}),
				})
				prdLogger.info(
					{ sessionId, chunkCount, documentLength: fullDocument.length },
					'Stream complete'
				)
				await stream.writeSSE({ data: '[DONE]' })
			} catch (error) {
				prdLogger.error({ err: error, sessionId }, 'Document generation error')
				const errorMessage =
					error instanceof OpenRouterAPIError ? error.message : 'Failed to generate document'

				// Mark generation as failed
				await db
					.update(prdSessions)
					.set({
						generationStatus: 'failed',
						generationError: errorMessage,
						updatedAt: new Date(),
					})
					.where(eq(prdSessions.id, sessionId))

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
	const skipFlags: Record<string, Record<string, boolean>> = {
		domain: { skipDomainStep: true },
		innovation: { skipInnovationStep: true },
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
