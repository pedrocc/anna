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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	Spinner,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@repo/ui'
import { ArrowLeft, ArrowRight, FileText, MessageSquare, Settings, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useLocation, useParams } from 'wouter'
import { ChatInterface, DocumentViewer, StepIndicator } from '../components/brainstorm'
import { useBrainstormChat, useBrainstormDocument } from '../hooks/useBrainstormChat'
import { api, useBrainstormSession } from '../lib/api-client'

export function BrainstormSessionPage() {
	const { id } = useParams<{ id: string }>()
	const [, navigate] = useLocation()
	const { data: session, error, isLoading, mutate } = useBrainstormSession(id ?? null)
	const [activeTab, setActiveTab] = useState<string>('chat')
	const [isSavingDoc, setIsSavingDoc] = useState(false)
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	const [isAdvancing, setIsAdvancing] = useState(false)

	const handleMessageComplete = useCallback(() => {
		mutate()
	}, [mutate])

	const {
		sendMessage,
		isStreaming,
		streamingContent,
		pendingUserMessage,
		error: chatError,
	} = useBrainstormChat({
		sessionId: id ?? '',
		onMessageComplete: handleMessageComplete,
	})

	const { generateDocument, isGenerating } = useBrainstormDocument(id ?? '')

	const handleGenerateDocument = async () => {
		try {
			await generateDocument()
			await mutate()
			setActiveTab('document')
		} catch (err) {
			console.error('Error generating document:', err)
		}
	}

	const handleSaveDocument = async (content: string) => {
		if (!id) return
		setIsSavingDoc(true)
		try {
			await api.brainstorm.updateDocument(id, { content })
			await mutate()
		} finally {
			setIsSavingDoc(false)
		}
	}

	const handleDeleteSession = async () => {
		if (!id) return
		setIsDeleting(true)
		try {
			await api.brainstorm.deleteSession(id)
			navigate('/brainstorm')
		} catch (err) {
			console.error('Error deleting session:', err)
			setIsDeleting(false)
		}
	}

	const handleAdvanceStep = async () => {
		if (!id) return
		setIsAdvancing(true)
		try {
			const updated = await api.brainstorm.advanceStep(id)
			await mutate()

			// Envia mensagem automática para Anna iniciar a nova etapa
			const stepMessages: Record<string, string> = {
				technique: 'Vamos para a seleção de técnicas. Quais você recomenda?',
				execution: 'Vamos começar a execução do brainstorming!',
				document: 'Vamos organizar as ideias e preparar o documento.',
			}

			const newStep = updated?.currentStep
			const message = newStep ? stepMessages[newStep] : undefined
			if (message) {
				// Pequeno delay para garantir que o mutate terminou
				setTimeout(() => {
					sendMessage(message)
				}, 500)
			}
		} catch (err) {
			console.error('Error advancing step:', err)
		} finally {
			setIsAdvancing(false)
		}
	}

	if (isLoading) {
		return (
			<div className="flex h-[50vh] items-center justify-center">
				<Spinner className="h-8 w-8" />
			</div>
		)
	}

	if (error || !session) {
		return (
			<div className="flex h-[50vh] flex-col items-center justify-center gap-4">
				<p className="text-destructive">Erro ao carregar sessao</p>
				<Button asChild variant="outline">
					<Link href="/brainstorm">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Voltar
					</Link>
				</Button>
			</div>
		)
	}

	const messages = session.messages ?? []
	const hasDocument = Boolean(session.documentContent)
	const showDocumentButton =
		session.currentStep === 'execution' || session.currentStep === 'document'

	return (
		<div className="flex h-[calc(100vh-4rem)] flex-col">
			{/* Main content area with tabs */}
			<div className="min-h-0 flex-1 overflow-hidden">
				<div className="container flex h-full flex-col py-4">
					<Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
						{/* All controls in one line */}
						<div className="mb-4 flex shrink-0 items-center gap-3">
							{/* Back button */}
							<Button asChild variant="ghost" size="icon" className="shrink-0">
								<Link href="/brainstorm">
									<ArrowLeft className="h-5 w-5" />
								</Link>
							</Button>

							<TabsList className="w-fit shrink-0">
								<TabsTrigger value="chat">
									<MessageSquare className="mr-2 h-4 w-4" />
									Chat
								</TabsTrigger>
								<TabsTrigger value="document" disabled={!hasDocument}>
									<FileText className="mr-2 h-4 w-4" />
									Documento
									{!hasDocument && (
										<span className="ml-2 text-xs text-muted-foreground">(vazio)</span>
									)}
								</TabsTrigger>
							</TabsList>

							{/* Document button */}
							{showDocumentButton && (
								<Button
									onClick={handleGenerateDocument}
									disabled={isGenerating}
									variant={hasDocument ? 'outline' : 'default'}
									size="sm"
									className="shrink-0"
								>
									{isGenerating ? (
										<>
											<Spinner className="mr-2 h-4 w-4" />
											Gerando...
										</>
									) : (
										<>
											<FileText className="mr-2 h-4 w-4" />
											{hasDocument ? 'Regerar' : 'Gerar Documento'}
										</>
									)}
								</Button>
							)}

							{/* Step indicator */}
							<div className="max-w-lg flex-1">
								<StepIndicator currentStep={session.currentStep} hasDocument={hasDocument} />
							</div>

							{/* Advance button */}
							{session.currentStep !== 'document' && (
								<Button
									onClick={handleAdvanceStep}
									disabled={isAdvancing || isStreaming}
									variant="outline"
									size="sm"
									className="shrink-0"
								>
									{isAdvancing ? (
										<>
											<Spinner className="mr-2 h-4 w-4" />
											Avançando...
										</>
									) : (
										<>
											Avançar
											<ArrowRight className="ml-2 h-4 w-4" />
										</>
									)}
								</Button>
							)}

							{/* Settings menu */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon" className="shrink-0">
										<Settings className="h-5 w-5" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										className="text-destructive focus:text-destructive"
										onClick={() => setShowDeleteDialog(true)}
									>
										<Trash2 className="mr-2 h-4 w-4" />
										Apagar Projeto
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>

						<TabsContent value="chat" className="mt-0 min-h-0 flex-1">
							<ChatInterface
								messages={messages}
								onSendMessage={sendMessage}
								isStreaming={isStreaming}
								streamingContent={streamingContent}
								pendingUserMessage={pendingUserMessage}
								currentStep={session.currentStep}
							/>
						</TabsContent>

						<TabsContent value="document" className="mt-0 min-h-0 flex-1">
							{hasDocument && (
								<DocumentViewer
									content={session.documentContent ?? ''}
									title={session.documentTitle ?? `Brainstorm: ${session.projectName}`}
									onSave={handleSaveDocument}
									isSaving={isSavingDoc}
								/>
							)}
						</TabsContent>
					</Tabs>
				</div>
			</div>

			{/* Error display */}
			{chatError && (
				<div className="border-t bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
					{chatError.message}
				</div>
			)}

			{/* Delete confirmation dialog */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Apagar projeto?</AlertDialogTitle>
						<AlertDialogDescription>
							Esta ação não pode ser desfeita. O projeto "{session.projectName}" e todas as suas
							mensagens serão permanentemente apagados.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteSession}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? (
								<>
									<Spinner className="mr-2 h-4 w-4" />
									Apagando...
								</>
							) : (
								'Apagar'
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
