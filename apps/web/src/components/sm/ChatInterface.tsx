import type { SmStep } from '@repo/shared'
import { Button } from '@repo/ui'
import { ArrowRight, MessageSquareText } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChatInput } from '../brainstorm/ChatInput'
import { ChatMessage } from '../brainstorm/ChatMessage'

interface SmChatInterfaceProps {
	messages: Array<{ id: string; role: string; content: string }>
	onSendMessage: (message: string) => void
	onAdvanceStep: () => void
	isStreaming: boolean
	streamingContent: string
	pendingUserMessage: string | null
	currentStep: SmStep
	isAdvancing: boolean
}

// Labels para cada step
const stepLabels: Record<SmStep, string> = {
	init: 'Inicialização',
	epics: 'Definição de Epics',
	stories: 'Criação de Stories',
	details: 'Detalhamento',
	planning: 'Sprint Planning',
	review: 'Revisão',
	complete: 'Conclusão',
}

// Ordem dos steps para determinar próxima etapa
const SM_STEPS_ORDER: SmStep[] = [
	'init',
	'epics',
	'stories',
	'details',
	'planning',
	'review',
	'complete',
]

// Keywords que indicam que a IA está pronta para avançar para a próxima etapa
const TRANSITION_KEYWORDS = [
	// Frases de transição genéricas
	'vamos para a próxima etapa',
	'próxima etapa',
	'avançar para',
	'passemos para',
	'seguir para',
	'próxima fase',
	// Epics
	'vamos definir os epics',
	'agrupamentos lógicos',
	'definir epics',
	'agora os epics',
	// Stories
	'vamos criar as user stories',
	'criar stories',
	'user stories para cada epic',
	'agora as stories',
	// Details
	'vamos detalhar',
	'acceptance criteria',
	'tasks e dev notes',
	'detalhar stories',
	'critérios de aceitação',
	// Planning
	'sprint planning',
	'organizar em sprints',
	'planejar sprints',
	'alocação em sprints',
	// Review
	'revisão final',
	'validar planejamento',
	'vamos fazer uma revisão',
	'checklist de validação',
	// Complete
	'planejamento completo',
	'gerar documentação',
	'vamos gerar',
	'documentação final',
]

// Normaliza texto para comparação (lowercase, remove acentos)
function normalizeText(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/\*\*/g, '')
}

export function ChatInterface({
	messages,
	onSendMessage,
	onAdvanceStep,
	isStreaming,
	streamingContent,
	pendingUserMessage,
	currentStep,
	isAdvancing,
}: SmChatInterfaceProps) {
	const scrollRef = useRef<HTMLDivElement>(null)
	const [isAdjusting, setIsAdjusting] = useState(false)

	// Auto-scroll on new messages, streaming content, or pending message
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollIntoView({ behavior: 'smooth' })
		}
	}, [])

	// Reset adjusting state when step changes
	useEffect(() => {
		setIsAdjusting(false)
	}, [])

	// Detecta se a última mensagem do assistant indica transição de etapa
	const lastAssistantMessage = messages.filter((m) => m.role === 'assistant').at(-1)
	const lastMessage = messages.filter((m) => m.role !== 'system').at(-1)

	const showTransitionButtons = useMemo(() => {
		if (!lastAssistantMessage) return false
		if (isStreaming || pendingUserMessage || isAdjusting) return false
		if (lastMessage?.role !== 'assistant') return false
		if (currentStep === 'complete') return false

		const normalizedContent = normalizeText(lastAssistantMessage.content)
		return TRANSITION_KEYWORDS.some((keyword) => normalizedContent.includes(normalizeText(keyword)))
	}, [lastAssistantMessage, lastMessage, isStreaming, pendingUserMessage, isAdjusting, currentStep])

	const handleAdjust = () => {
		setIsAdjusting(true)
	}

	const handleSendAdjustment = (message: string) => {
		onSendMessage(message)
	}

	const handleAdvance = () => {
		onAdvanceStep()
	}

	// Determina o nome da próxima etapa
	const nextStepName = useMemo(() => {
		const currentIndex = SM_STEPS_ORDER.indexOf(currentStep)
		const nextStep = SM_STEPS_ORDER[currentIndex + 1]
		return nextStep ? stepLabels[nextStep] : null
	}, [currentStep])

	return (
		<div className="flex h-full flex-col">
			{/* Messages area */}
			<div className="min-h-0 flex-1 overflow-y-auto">
				<div className="mx-auto space-y-4 py-4" style={{ maxWidth: '1000px' }}>
					{messages
						.filter((m) => m.role !== 'system')
						.map((msg) => (
							<ChatMessage
								key={msg.id}
								messageRole={msg.role as 'user' | 'assistant'}
								content={msg.content}
							/>
						))}

					{/* Pending user message */}
					{pendingUserMessage && (
						<ChatMessage key="pending-user" messageRole="user" content={pendingUserMessage} />
					)}

					{/* Streaming response */}
					{isStreaming && streamingContent && (
						<ChatMessage messageRole="assistant" content={streamingContent} isStreaming />
					)}

					{/* Transition buttons when AI indicates step is complete */}
					{showTransitionButtons && (
						<div className="flex flex-col items-center gap-3 py-4">
							<p className="text-sm text-muted-foreground">
								Pronto para avançar para <strong>{nextStepName}</strong>?
							</p>
							<div className="flex flex-wrap justify-center gap-2">
								<Button variant="outline" size="default" onClick={handleAdjust}>
									<MessageSquareText className="mr-2 h-4 w-4" />
									Ajustar
								</Button>
								<Button
									variant="default"
									size="default"
									onClick={handleAdvance}
									disabled={isAdvancing}
								>
									<ArrowRight className="mr-2 h-4 w-4" />
									{isAdvancing ? 'Avançando...' : 'Avançar'}
								</Button>
							</div>
						</div>
					)}

					{/* Adjusting mode indicator */}
					{isAdjusting && !isStreaming && !pendingUserMessage && (
						<div className="flex flex-col items-center gap-2 py-4">
							<p className="text-sm text-muted-foreground">
								Digite abaixo o que você gostaria de ajustar em{' '}
								<strong>{stepLabels[currentStep]}</strong>:
							</p>
						</div>
					)}

					<div ref={scrollRef} />
				</div>
			</div>

			{/* Input area */}
			<div className="shrink-0 py-4">
				<div className="mx-auto max-w-2xl">
					{isAdjusting ? (
						<div className="space-y-2">
							<ChatInput
								onSend={handleSendAdjustment}
								disabled={isStreaming}
								placeholder={`Descreva o ajuste que deseja em ${stepLabels[currentStep]}...`}
							/>
							<div className="flex justify-center">
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setIsAdjusting(false)}
									className="text-muted-foreground"
								>
									Cancelar ajuste
								</Button>
							</div>
						</div>
					) : (
						<ChatInput onSend={onSendMessage} disabled={isStreaming} />
					)}
				</div>
			</div>
		</div>
	)
}
