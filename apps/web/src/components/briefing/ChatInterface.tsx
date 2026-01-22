import type { BriefingStep } from '@repo/shared'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	Button,
	Spinner,
	Textarea,
} from '@repo/ui'
import { AlertTriangle, FileText, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ChatInput } from '../brainstorm/ChatInput'
import { ChatMessage } from '../brainstorm/ChatMessage'

interface BriefingChatInterfaceProps {
	messages: Array<{ id: string; role: string; content: string }>
	onSendMessage: (message: string) => void
	onGenerateDocument?: () => void
	onEditMessage?: (messageId: string, content: string) => void
	isStreaming: boolean
	streamingContent: string
	pendingUserMessage: string | null
	currentStep: BriefingStep
	isGenerating?: boolean
	isEditing?: boolean
	editStreamingContent?: string
	hasDocuments?: boolean
	error?: Error | null
	onClearError?: () => void
}

export function ChatInterface({
	messages,
	onSendMessage,
	onGenerateDocument,
	onEditMessage,
	isStreaming,
	streamingContent,
	pendingUserMessage,
	currentStep,
	isGenerating,
	isEditing,
	editStreamingContent,
	hasDocuments,
	error,
	onClearError,
}: BriefingChatInterfaceProps) {
	const scrollRef = useRef<HTMLDivElement>(null)

	// Edit state
	const [editDialogOpen, setEditDialogOpen] = useState(false)
	const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
	const [editContent, setEditContent] = useState('')
	const [activeEditMessageId, setActiveEditMessageId] = useState<string | null>(null)

	// Auto-scroll on new messages
	// biome-ignore lint/correctness/useExhaustiveDependencies: messages.length triggers scroll on new messages
	useEffect(() => {
		const scrollTarget = scrollRef.current
		if (!scrollTarget) return

		const rafId = requestAnimationFrame(() => {
			scrollTarget.scrollIntoView({ behavior: 'smooth' })
		})

		return () => cancelAnimationFrame(rafId)
	}, [messages.length])

	// Clear activeEditMessageId when editing is complete
	useEffect(() => {
		if (!isEditing && activeEditMessageId) {
			setActiveEditMessageId(null)
		}
	}, [isEditing, activeEditMessageId])

	// Edit handlers
	const handleEditClick = (messageId: string) => {
		const message = messages.find((m) => m.id === messageId)
		if (message) {
			setEditingMessageId(messageId)
			setEditContent(message.content)
			setEditDialogOpen(true)
		}
	}

	const handleConfirmEdit = () => {
		if (editingMessageId && onEditMessage && editContent.trim()) {
			// Store the message ID for filtering before clearing dialog state
			setActiveEditMessageId(editingMessageId)
			onEditMessage(editingMessageId, editContent.trim())
			setEditDialogOpen(false)
			setEditingMessageId(null)
			setEditContent('')
		}
	}

	const handleCancelEdit = () => {
		setEditDialogOpen(false)
		setEditingMessageId(null)
		setEditContent('')
	}

	// Calculate messages that will be deleted
	const messagesToDelete = editingMessageId
		? messages.filter((m) => {
				const editIndex = messages.findIndex((msg) => msg.id === editingMessageId)
				const msgIndex = messages.findIndex((msg) => msg.id === m.id)
				return msgIndex > editIndex
			}).length
		: 0

	const isBusy = isStreaming || isEditing

	// Get all non-system messages, filtering out messages after the one being edited
	const visibleMessages = messages.filter((m) => {
		if (m.role === 'system') return false
		// If we're actively editing, only show messages up to and including the edited one
		if (activeEditMessageId && isEditing) {
			const editIndex = messages.findIndex((msg) => msg.id === activeEditMessageId)
			const msgIndex = messages.findIndex((msg) => msg.id === m.id)
			return msgIndex <= editIndex
		}
		return true
	})

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			{/* Messages area */}
			<div className="min-h-0 flex-1 overflow-y-auto">
				<div className="mx-auto space-y-4 py-4" style={{ maxWidth: '1000px' }}>
					{visibleMessages.map((msg) => (
						<ChatMessage
							key={msg.id}
							messageRole={msg.role as 'user' | 'assistant'}
							content={msg.content}
							messageId={msg.id}
							onEdit={handleEditClick}
							isEditable={!!onEditMessage}
							editDisabled={isBusy}
						/>
					))}

					{/* Pending user message (shown immediately while waiting for response) */}
					{pendingUserMessage && (
						<ChatMessage key="pending-user" messageRole="user" content={pendingUserMessage} />
					)}

					{/* Thinking indicator (shows while waiting for first token) */}
					{(isStreaming || isEditing) && !streamingContent && !editStreamingContent && (
						<div className="flex gap-3">
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
								<Spinner className="h-4 w-4" />
							</div>
							<div className="flex items-center rounded-lg bg-muted px-4 py-3">
								<span className="text-sm text-muted-foreground">Pensando...</span>
							</div>
						</div>
					)}

					{/* Edit Streaming Response */}
					{isEditing && editStreamingContent && (
						<ChatMessage messageRole="assistant" content={editStreamingContent} isStreaming />
					)}

					{/* Streaming response */}
					{isStreaming && streamingContent && (
						<ChatMessage messageRole="assistant" content={streamingContent} isStreaming />
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

			{/* Error banner */}
			{error && (
				<div className="shrink-0 border-t border-red-200 bg-red-50 px-4 py-2.5">
					<div className="mx-auto flex items-center gap-2" style={{ maxWidth: '1000px' }}>
						<AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
						<span className="flex-1 text-sm text-red-700">{error.message}</span>
						{onClearError && (
							<button
								type="button"
								onClick={onClearError}
								className="shrink-0 rounded p-0.5 text-red-400 hover:text-red-600"
								aria-label="Fechar erro"
							>
								<X className="h-4 w-4" />
							</button>
						)}
					</div>
				</div>
			)}

			{/* Fixed Chat Input at bottom (visible until complete) */}
			{currentStep !== 'complete' && (
				<div className="shrink-0 border-t border-border bg-white p-4">
					<div className="mx-auto" style={{ maxWidth: '1000px' }}>
						<ChatInput
							onSend={onSendMessage}
							disabled={isBusy}
							placeholder="Digite sua mensagem..."
						/>
					</div>
				</div>
			)}

			{/* Edit Confirmation Dialog */}
			<AlertDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<AlertDialogContent className="max-w-2xl">
					<AlertDialogHeader>
						<AlertDialogTitle>Editar mensagem</AlertDialogTitle>
						<AlertDialogDescription>
							{messagesToDelete > 0
								? `Esta ação irá deletar ${messagesToDelete} mensagem${messagesToDelete > 1 ? 's' : ''} subsequente${messagesToDelete > 1 ? 's' : ''} e regenerar a conversa a partir deste ponto.`
								: 'Edite sua mensagem abaixo. A resposta será regenerada.'}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<Textarea
						value={editContent}
						onChange={(e) => setEditContent(e.target.value)}
						className="min-h-[150px] resize-none"
						placeholder="Digite sua mensagem..."
					/>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleCancelEdit}>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={handleConfirmEdit} disabled={!editContent.trim()}>
							Enviar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
