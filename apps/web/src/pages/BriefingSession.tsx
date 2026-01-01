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
import { ArrowLeft, ChevronLeft, FileText, MessageSquare, Settings, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useLocation, useParams } from 'wouter'
import { DocumentViewer } from '../components/brainstorm'
import { ChatInterface, DocumentList, StepIndicator } from '../components/briefing'
import { useBriefingChat, useBriefingDocument } from '../hooks/useBriefingChat'
import { api, type BriefingDocumentFromAPI, useBriefingSession } from '../lib/api-client'

export function BriefingSessionPage() {
	const { id } = useParams<{ id: string }>()
	const [, navigate] = useLocation()
	const { data: session, error, isLoading, mutate } = useBriefingSession(id ?? null)
	const [activeTab, setActiveTab] = useState<string>('chat')
	const [isSavingDoc, setIsSavingDoc] = useState(false)
	const [isDeletingDoc, setIsDeletingDoc] = useState(false)
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	const [isAdvancing, setIsAdvancing] = useState(false)
	const [selectedDocument, setSelectedDocument] = useState<BriefingDocumentFromAPI | null>(null)

	const handleMessageComplete = useCallback(() => {
		mutate()
	}, [mutate])

	const {
		sendMessage,
		isStreaming,
		streamingContent,
		pendingUserMessage,
		error: chatError,
	} = useBriefingChat({
		sessionId: id ?? '',
		onMessageComplete: handleMessageComplete,
	})

	const { generateDocument, isGenerating } = useBriefingDocument(id ?? '')

	const handleGenerateDocument = async () => {
		try {
			await generateDocument()
			await mutate()
			setSelectedDocument(null)
			setActiveTab('document')
		} catch (_err) {}
	}

	const handleSaveDocument = async (content: string) => {
		if (!selectedDocument) return
		setIsSavingDoc(true)
		try {
			await api.briefing.updateDocumentById(selectedDocument.id, { content })
			await mutate()
			setSelectedDocument((prev) => (prev ? { ...prev, content } : null))
		} finally {
			setIsSavingDoc(false)
		}
	}

	const handleDeleteDocument = async () => {
		if (!selectedDocument) return
		setIsDeletingDoc(true)
		try {
			await api.briefing.deleteDocument(selectedDocument.id)
			await mutate()
			setSelectedDocument(null)
		} finally {
			setIsDeletingDoc(false)
		}
	}

	const handleSelectDocument = (doc: BriefingDocumentFromAPI) => {
		setSelectedDocument(doc)
	}

	const handleBackToList = () => {
		setSelectedDocument(null)
	}

	const handleDeleteSession = async () => {
		if (!id) return
		setIsDeleting(true)
		try {
			await api.briefing.deleteSession(id)
			navigate('/briefing')
		} catch (_err) {
			setIsDeleting(false)
		}
	}

	const handleAdvanceStep = async () => {
		if (!id) return
		setIsAdvancing(true)
		try {
			const updated = await api.briefing.advanceStep(id)
			await mutate()

			const newStep = updated?.currentStep

			// Se avançou para 'complete', gera o documento automaticamente
			if (newStep === 'complete') {
				setTimeout(() => {
					handleGenerateDocument()
				}, 500)
				return
			}

			// Envia mensagem automática para Anna iniciar a nova etapa
			const stepMessages: Record<string, string> = {
				vision: 'Vamos definir a visão do produto.',
				users: 'Vamos definir os usuários do produto.',
				metrics: 'Vamos definir as métricas de sucesso.',
				scope: 'Vamos definir o escopo do MVP.',
			}

			const message = newStep ? stepMessages[newStep] : undefined
			if (message) {
				setTimeout(() => {
					sendMessage(message)
				}, 500)
			}
		} catch (_err) {
		} finally {
			setIsAdvancing(false)
		}
	}

	if (isLoading) {
		return (
			<div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-[#f9fafb]">
				<Spinner className="h-8 w-8" />
			</div>
		)
	}

	if (error || !session) {
		return (
			<div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 bg-[#f9fafb]">
				<p className="text-muted-foreground">Erro ao carregar sessão</p>
				<Button asChild variant="outline">
					<Link href="/briefing">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Voltar
					</Link>
				</Button>
			</div>
		)
	}

	const messages = session.messages ?? []
	const documents = session.documents ?? []
	const hasDocuments = documents.length > 0
	const showDocumentButton = session.currentStep === 'scope' || session.currentStep === 'complete'

	return (
		<div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-[#f9fafb]">
			{/* Header */}
			<div className="shrink-0 border-b border-border bg-white px-6 py-4">
				<div className="mx-auto flex max-w-7xl items-center justify-between">
					{/* Left: Back + Title */}
					<div className="flex items-center gap-4">
						<Button asChild variant="ghost" size="icon" className="shrink-0 text-muted-foreground">
							<Link href="/briefing">
								<ArrowLeft className="h-5 w-5" />
							</Link>
						</Button>

						<div className="flex items-center gap-3">
							<div
								className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50"
								style={{ border: '1px solid #1d6ce020' }}
							>
								<FileText className="h-4 w-4 text-primary" />
							</div>
							<div>
								<h1 className="text-lg font-semibold text-foreground">{session.projectName}</h1>
							</div>
						</div>
					</div>

					{/* Center: Step Indicator */}
					<div className="flex-1 px-8">
						<StepIndicator
							currentStep={session.currentStep}
							stepsCompleted={session.stepsCompleted ?? []}
							hasDocument={hasDocuments}
						/>
					</div>

					{/* Right: Actions */}
					<div className="flex items-center gap-2">
						{showDocumentButton && (
							<Button
								onClick={handleGenerateDocument}
								disabled={isGenerating}
								variant={hasDocuments ? 'ghost' : 'default'}
								size="sm"
								className="gap-2"
							>
								{isGenerating ? (
									<>
										<Spinner className="h-4 w-4" />
										Gerando...
									</>
								) : (
									<>
										<FileText className="h-4 w-4" />
										{hasDocuments ? 'Novo Doc' : 'Gerar Doc'}
									</>
								)}
							</Button>
						)}

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" className="text-muted-foreground">
									<Settings className="h-5 w-5" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="border border-border bg-white">
								<DropdownMenuItem
									className="text-red-500 focus:text-red-500"
									onClick={() => setShowDeleteDialog(true)}
								>
									<Trash2 className="mr-2 h-4 w-4" />
									Apagar Projeto
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</div>

			{/* Tabs */}
			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="flex min-h-0 flex-1 flex-col overflow-hidden"
			>
				<div className="shrink-0 border-b border-border bg-white px-6">
					<div className="mx-auto max-w-7xl">
						<TabsList className="h-12 w-fit gap-1 bg-transparent p-0">
							<TabsTrigger
								value="chat"
								className="gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
							>
								<MessageSquare className="h-4 w-4" />
								Chat
							</TabsTrigger>
							<TabsTrigger
								value="document"
								className="gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
							>
								<FileText className="h-4 w-4" />
								Documentos
								{hasDocuments && (
									<span className="ml-1 rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary">
										{documents.length}
									</span>
								)}
							</TabsTrigger>
						</TabsList>
					</div>
				</div>

				<TabsContent
					value="chat"
					className="m-0 min-h-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
				>
					<ChatInterface
						messages={messages}
						onSendMessage={sendMessage}
						onAdvanceStep={handleAdvanceStep}
						onGenerateDocument={handleGenerateDocument}
						isStreaming={isStreaming}
						streamingContent={streamingContent}
						pendingUserMessage={pendingUserMessage}
						currentStep={session.currentStep}
						isAdvancing={isAdvancing}
						isGenerating={isGenerating}
						hasDocuments={hasDocuments}
					/>
				</TabsContent>

				<TabsContent value="document" className="m-0 flex min-h-0 flex-1 flex-col overflow-auto">
					{selectedDocument ? (
						<div className="px-6 pb-4 pt-4">
							<div className="mx-auto max-w-7xl">
								<Button
									variant="ghost"
									size="sm"
									onClick={handleBackToList}
									className="mb-4 text-muted-foreground"
								>
									<ChevronLeft className="mr-1 h-4 w-4" />
									Voltar para lista
								</Button>
								<DocumentViewer
									content={selectedDocument.content}
									title={selectedDocument.title}
									onSave={handleSaveDocument}
									onDelete={handleDeleteDocument}
									isSaving={isSavingDoc}
									isDeleting={isDeletingDoc}
								/>
							</div>
						</div>
					) : (
						<div className="min-h-0 flex-1 overflow-auto px-6 py-6">
							<div className="mx-auto max-w-7xl">
								<DocumentList
									documents={documents}
									selectedDocumentId={null}
									onSelectDocument={handleSelectDocument}
									onGenerateNew={handleGenerateDocument}
									isGenerating={isGenerating}
								/>
							</div>
						</div>
					)}
				</TabsContent>
			</Tabs>

			{/* Error display */}
			{chatError && (
				<div className="border-t border-red-200 bg-red-50 px-4 py-2 text-center text-sm text-red-600">
					{chatError.message}
				</div>
			)}

			{/* Delete confirmation dialog */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent className="border border-border bg-white">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-foreground">Apagar projeto?</AlertDialogTitle>
						<AlertDialogDescription className="text-muted-foreground">
							Esta ação não pode ser desfeita. O projeto "{session.projectName}" e todas as suas
							mensagens serão permanentemente apagados.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteSession}
							disabled={isDeleting}
							className="bg-red-500 text-white hover:bg-red-600"
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
