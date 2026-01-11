import { db, smMessages, smStories } from '@repo/db'
import { asc, eq } from 'drizzle-orm'
import { createLogger } from './logger.js'
import { getOpenRouterClient } from './openrouter.js'
import { buildStoryEnrichmentPrompt } from './sm-prompts.js'

const enrichLogger = createLogger('sm-enrichment')

interface EnrichedStoryData {
	storyKey: string
	acceptanceCriteria: Array<{
		id: string
		description: string
		type: 'given_when_then' | 'simple'
		given?: string
		when?: string
		then?: string
	}>
	tasks: Array<{
		id: string
		description: string
		estimatedHours?: number
		completed: boolean
	}>
	devNotes: {
		architecturePatterns?: string[]
		componentsToTouch?: string[]
		testingRequirements?: string[]
		securityConsiderations?: string[]
		performanceNotes?: string[]
		references?: string[]
	}
}

/**
 * Enriquece stories com AC, Tasks e DevNotes extraídos da conversa
 * Chamado ANTES da geração do documento ou backlog
 */
export async function enrichStoriesFromConversation(
	sessionId: string,
	stories: Array<{ id: string; storyKey: string; title: string }>
): Promise<{ enriched: number; failed: number }> {
	// 1. Buscar todas as mensagens da sessão
	const messages = await db.query.smMessages.findMany({
		where: eq(smMessages.sessionId, sessionId),
		orderBy: [asc(smMessages.createdAt)],
	})

	if (messages.length === 0) {
		enrichLogger.debug({ sessionId }, 'No messages found for session')
		return { enriched: 0, failed: 0 }
	}

	// 2. Montar contexto da conversa
	const conversationText = messages.map((m) => `[${m.role}]: ${m.content}`).join('\n\n')

	enrichLogger.info(
		{ sessionId, messagesCount: messages.length, storiesCount: stories.length },
		'Processing stories'
	)

	// 3. Chamar AI para extrair dados estruturados
	const client = getOpenRouterClient()
	const prompt = buildStoryEnrichmentPrompt(conversationText, stories)

	const response = await client.chat({
		messages: [{ role: 'user', content: prompt }],
		model: 'deepseek/deepseek-chat',
		temperature: 0.3,
		max_tokens: 16000,
	})

	// Extract content from response
	const responseContent = response.choices[0]?.message?.content ?? ''

	// 4. Parsear resposta JSON
	const enrichedData = parseEnrichmentResponse(responseContent)
	enrichLogger.debug({ storiesExtracted: enrichedData.length }, 'Extracted data')

	// 5. Atualizar cada story no banco
	let enriched = 0
	let failed = 0

	for (const data of enrichedData) {
		const story = stories.find((s) => s.storyKey === data.storyKey)
		if (!story) {
			enrichLogger.warn({ storyKey: data.storyKey }, 'Story not found')
			failed++
			continue
		}

		try {
			await db
				.update(smStories)
				.set({
					acceptanceCriteria: data.acceptanceCriteria,
					tasks: data.tasks,
					devNotes: data.devNotes,
					updatedAt: new Date(),
				})
				.where(eq(smStories.id, story.id))
			enriched++
			enrichLogger.debug({ storyKey: data.storyKey }, 'Updated story')
		} catch (error) {
			enrichLogger.error({ err: error, storyKey: data.storyKey }, 'Failed to update story')
			failed++
		}
	}

	return { enriched, failed }
}

function parseEnrichmentResponse(response: string): EnrichedStoryData[] {
	// Extrair JSON do response (pode estar entre ```json...```)
	const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\[[\s\S]*\]/)

	if (!jsonMatch) {
		enrichLogger.error({ responsePreview: response.slice(0, 500) }, 'No JSON found in response')
		return []
	}

	try {
		const jsonStr = jsonMatch[1] || jsonMatch[0]
		const parsed = JSON.parse(jsonStr)

		// Validar estrutura básica
		if (!Array.isArray(parsed)) {
			enrichLogger.error('Response is not an array')
			return []
		}

		return parsed
	} catch (error) {
		enrichLogger.error(
			{ err: error, responsePreview: response.slice(0, 1000) },
			'Failed to parse JSON'
		)
		return []
	}
}
