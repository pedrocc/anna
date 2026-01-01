import type { PrdStep } from '@repo/shared'
import { Button } from '@repo/ui'
import { ArrowRight, MessageSquareText, SkipForward } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChatInput } from '../brainstorm/ChatInput'
import { ChatMessage } from '../brainstorm/ChatMessage'

interface PrdChatInterfaceProps {
	messages: Array<{ id: string; role: string; content: string }>
	onSendMessage: (message: string) => void
	onAdvanceStep: () => void
	onSkipStep?: () => void
	isStreaming: boolean
	streamingContent: string
	pendingUserMessage: string | null
	currentStep: PrdStep
	isAdvancing: boolean
}

// Steps opcionais que podem ser pulados
const OPTIONAL_STEPS: PrdStep[] = ['domain', 'innovation']

// Labels para cada step
const stepLabels: Record<PrdStep, string> = {
	init: 'Inicialização',
	discovery: 'Descoberta',
	success: 'Critérios de Sucesso',
	journeys: 'Jornadas de Usuário',
	domain: 'Requisitos de Domínio',
	innovation: 'Inovação',
	project_type: 'Tipo de Projeto',
	scoping: 'Escopo do MVP',
	functional: 'Requisitos Funcionais',
	nonfunctional: 'Requisitos Não-Funcionais',
	complete: 'Conclusão',
}

// Ordem dos steps para determinar próxima etapa
const PRD_STEPS_ORDER: PrdStep[] = [
	'init',
	'discovery',
	'success',
	'journeys',
	'domain',
	'innovation',
	'project_type',
	'scoping',
	'functional',
	'nonfunctional',
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
	// Discovery
	'vamos para a descoberta',
	'classificar o projeto',
	'descoberta de projeto',
	// Success
	'critérios de sucesso',
	'métricas de sucesso',
	'indicadores de sucesso',
	'como medir o sucesso',
	// Journeys
	'jornadas de usuário',
	'jornadas do usuário',
	'fluxos de usuário',
	'user journeys',
	// Domain
	'requisitos de domínio',
	'regras de negócio',
	'requisitos do domínio',
	// Innovation
	'inovação',
	'diferenciais',
	'funcionalidades inovadoras',
	// Project Type
	'tipo de projeto',
	'classificação do projeto',
	// Scoping
	'escopo do mvp',
	'funcionalidades essenciais',
	'o que entra no mvp',
	// Functional
	'requisitos funcionais',
	'funcionalidades do sistema',
	'fr-',
	// Non-functional
	'requisitos não-funcionais',
	'atributos de qualidade',
	'nfr-',
	// Complete
	'prd está completo',
	'concluímos o prd',
	'gerar o documento',
	'prd completo',
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
	onSkipStep,
	isStreaming,
	streamingContent,
	pendingUserMessage,
	currentStep,
	isAdvancing,
}: PrdChatInterfaceProps) {
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

	// Verifica se o step atual é opcional
	const isOptionalStep = OPTIONAL_STEPS.includes(currentStep)

	const handleAdjust = () => {
		setIsAdjusting(true)
	}

	const handleSendAdjustment = (message: string) => {
		onSendMessage(message)
	}

	const handleAdvance = () => {
		onAdvanceStep()
	}

	const handleSkipStep = () => {
		if (onSkipStep) {
			onSkipStep()
		}
	}

	// Determina o nome da próxima etapa
	const nextStepName = useMemo(() => {
		const currentIndex = PRD_STEPS_ORDER.indexOf(currentStep)
		const nextStep = PRD_STEPS_ORDER[currentIndex + 1]
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

					{/* Pending user message (shown immediately while waiting for response) */}
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
								{isOptionalStep && onSkipStep && (
									<Button variant="ghost" size="default" onClick={handleSkipStep}>
										<SkipForward className="mr-2 h-4 w-4" />
										Pular etapa
									</Button>
								)}
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
							{isOptionalStep && (
								<p className="text-xs text-muted-foreground/70">
									Esta etapa é opcional e pode ser pulada se não for relevante para seu projeto.
								</p>
							)}
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
