import type { BriefingStep } from '@repo/shared'
import { Button, Spinner } from '@repo/ui'
import { ArrowRight, FileText, MessageSquareText, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChatInput } from '../brainstorm/ChatInput'
import { ChatMessage } from '../brainstorm/ChatMessage'

interface BriefingChatInterfaceProps {
	messages: Array<{ id: string; role: string; content: string }>
	onSendMessage: (message: string) => void
	onAdvanceStep: () => void
	onGenerateDocument?: () => void
	isStreaming: boolean
	streamingContent: string
	pendingUserMessage: string | null
	currentStep: BriefingStep
	isAdvancing: boolean
	isGenerating?: boolean
	hasDocuments?: boolean
}

// Labels para cada step
const stepLabels: Record<BriefingStep, string> = {
	init: 'Inicialização',
	vision: 'Visão do Produto',
	users: 'Usuários-Alvo',
	metrics: 'Métricas de Sucesso',
	scope: 'Escopo do MVP',
	complete: 'Conclusão',
}

// Keywords que indicam que a IA está pronta para avançar para a próxima etapa
const TRANSITION_KEYWORDS = [
	// Frases de transição genéricas
	'vamos para a proxima etapa',
	'proxima etapa',
	'avancar para',
	'passemos para',
	'seguir para',
	'proxima fase',
	'proxima camada',
	'proximos passos',
	'proximo passo',
	// Vision -> Users
	'vamos definir os usuarios',
	'quem vai usar',
	'usuarios-alvo',
	'usuarios alvo',
	'personas',
	'perfil do usuario',
	// Users -> Metrics
	'metricas de sucesso',
	'como medir o sucesso',
	'kpis',
	'indicadores',
	'medir sucesso',
	// Metrics -> Scope
	'escopo do mvp',
	'features essenciais',
	'o que entra no mvp',
	'funcionalidades principais',
	'roadmap do mvp',
	'nucleo do produto',
	// Scope -> Complete
	'briefing esta completo',
	'concluimos o briefing',
	'gerar o documento',
	'product brief completo',
	'product brief final',
	'brief final',
	'documentacao disponivel',
]

// Normaliza texto para comparação (lowercase, remove acentos, remove pontuação)
function normalizeText(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // Remove acentos
		.replace(/\*\*/g, '') // Remove markdown bold
		.replace(/[.:,;!?()[\]{}]/g, ' ') // Remove pontuação
		.replace(/\s+/g, ' ') // Normaliza espaços múltiplos
		.trim()
}

export function ChatInterface({
	messages,
	onSendMessage,
	onAdvanceStep,
	onGenerateDocument,
	isStreaming,
	streamingContent,
	pendingUserMessage,
	currentStep,
	isAdvancing,
	isGenerating,
	hasDocuments,
}: BriefingChatInterfaceProps) {
	const scrollRef = useRef<HTMLDivElement>(null)
	const [isAdjusting, setIsAdjusting] = useState(false)
	const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null)
	const lastAdvancedMessageIdRef = useRef<string | null>(null)
	const isInitialMountRef = useRef(true)
	const initialMessageCountRef = useRef(messages.length)

	// Auto-scroll on new messages, streaming content, or pending message
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollIntoView({ behavior: 'smooth' })
		}
	}, [])

	// Reset adjusting state when step changes
	useEffect(() => {
		setIsAdjusting(false)
		setAutoAdvanceCountdown(null)
	}, [])

	// Detecta se a última mensagem do assistant indica transição de etapa
	const lastAssistantMessage = messages.filter((m) => m.role === 'assistant').at(-1)
	const lastMessage = messages.filter((m) => m.role !== 'system').at(-1)

	const shouldShowTransition = useMemo(() => {
		if (!lastAssistantMessage) return false
		if (isStreaming || pendingUserMessage || isAdjusting) return false
		if (lastMessage?.role !== 'assistant') return false
		if (currentStep === 'complete') return false

		const normalizedContent = normalizeText(lastAssistantMessage.content)
		return TRANSITION_KEYWORDS.some((keyword) => normalizedContent.includes(normalizeText(keyword)))
	}, [lastAssistantMessage, lastMessage, isStreaming, pendingUserMessage, isAdjusting, currentStep])

	// Auto-advance countdown when transition is detected
	useEffect(() => {
		if (!shouldShowTransition || !lastAssistantMessage) {
			setAutoAdvanceCountdown(null)
			return
		}

		// Só inicia countdown se for uma mensagem nova (não processada antes)
		if (lastAdvancedMessageIdRef.current === lastAssistantMessage.id) {
			return
		}

		// Não auto-avançar no mount inicial - só quando houver novas mensagens
		if (isInitialMountRef.current) {
			// Marca a mensagem atual como já processada para não avançar
			lastAdvancedMessageIdRef.current = lastAssistantMessage.id
			isInitialMountRef.current = false
			return
		}

		// Só ativa se houver mais mensagens do que quando o componente montou
		if (messages.length <= initialMessageCountRef.current) {
			return
		}

		// Inicia countdown de 5 segundos
		setAutoAdvanceCountdown(5)

		const interval = setInterval(() => {
			setAutoAdvanceCountdown((prev) => {
				if (prev === null || prev <= 1) {
					clearInterval(interval)
					return null
				}
				return prev - 1
			})
		}, 1000)

		return () => clearInterval(interval)
	}, [shouldShowTransition, lastAssistantMessage?.id, messages.length, lastAssistantMessage])

	// Auto-advance quando countdown chega a 0
	useEffect(() => {
		if (autoAdvanceCountdown === null && shouldShowTransition && lastAssistantMessage) {
			// Marca como processado para não repetir
			if (lastAdvancedMessageIdRef.current !== lastAssistantMessage.id) {
				lastAdvancedMessageIdRef.current = lastAssistantMessage.id
				onAdvanceStep()
			}
		}
	}, [autoAdvanceCountdown, shouldShowTransition, lastAssistantMessage, onAdvanceStep])

	const showTransitionButtons = shouldShowTransition && autoAdvanceCountdown !== null

	const handleAdjust = () => {
		// Cancela o auto-advance e marca como já processado
		if (lastAssistantMessage) {
			lastAdvancedMessageIdRef.current = lastAssistantMessage.id
		}
		setAutoAdvanceCountdown(null)
		setIsAdjusting(true)
	}

	const handleSendAdjustment = (message: string) => {
		onSendMessage(message)
	}

	const handleAdvance = () => {
		// Marca como processado para não repetir
		if (lastAssistantMessage) {
			lastAdvancedMessageIdRef.current = lastAssistantMessage.id
		}
		setAutoAdvanceCountdown(null)
		onAdvanceStep()
	}

	// Determina o nome da próxima etapa
	const nextStepName = useMemo(() => {
		const steps: BriefingStep[] = ['init', 'vision', 'users', 'metrics', 'scope', 'complete']
		const currentIndex = steps.indexOf(currentStep)
		const nextStep = steps[currentIndex + 1]
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
							<div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
									{autoAdvanceCountdown}
								</div>
								<p className="text-sm font-medium text-primary">
									Avançando para <strong>{nextStepName}</strong>...
								</p>
							</div>
							<div className="flex gap-3">
								<Button variant="outline" size="default" onClick={handleAdjust}>
									<MessageSquareText className="mr-2 h-4 w-4" />
									Espera, quero ajustar
								</Button>
								<Button
									variant="default"
									size="default"
									onClick={handleAdvance}
									disabled={isAdvancing}
								>
									<ArrowRight className="mr-2 h-4 w-4" />
									{isAdvancing ? 'Avançando...' : 'Avançar agora'}
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

					{/* Generate Document button when briefing is complete */}
					{currentStep === 'complete' &&
						onGenerateDocument &&
						!isStreaming &&
						!pendingUserMessage && (
							<div className="flex flex-col items-center gap-4 py-8">
								<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
									<Sparkles className="h-8 w-8 text-primary" />
								</div>
								<div className="text-center">
									<h3 className="text-lg font-semibold text-foreground">Briefing Completo!</h3>
									<p className="mt-1 max-w-md text-sm text-muted-foreground">
										Todas as etapas foram concluídas. Agora você pode gerar o documento do Product
										Brief com todas as informações coletadas.
									</p>
								</div>
								<Button
									size="lg"
									onClick={onGenerateDocument}
									disabled={isGenerating}
									className="gap-2"
								>
									{isGenerating ? (
										<>
											<Spinner className="h-4 w-4" />
											Gerando documento...
										</>
									) : (
										<>
											<FileText className="h-5 w-5" />
											{hasDocuments ? 'Gerar Novo Documento' : 'Gerar Product Brief'}
										</>
									)}
								</Button>
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
