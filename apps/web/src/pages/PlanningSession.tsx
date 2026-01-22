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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	Input,
	Label,
	Spinner,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@repo/ui'
import {
	ArrowLeft,
	ChevronLeft,
	ClipboardList,
	FileText,
	MessageSquare,
	Pencil,
	Settings,
	Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'wouter'
import { DocumentViewer } from '../components/brainstorm'
import { DocumentList } from '../components/briefing'
import { ChatInterface, StepIndicator } from '../components/sm'
import { BacklogDocumentViewer } from '../components/sm/BacklogDocumentViewer'
import { useMessageEdit } from '../hooks/useMessageEdit'
import { useSmChat, useSmDocument } from '../hooks/useSmChat'
import { api, type SmDocumentFromAPI, useSmSession } from '../lib/api-client'

// Timeout em milissegundos para considerar uma geração como abandonada (10 minutos)
const GENERATION_TIMEOUT_MS = 10 * 60 * 1000

export function PlanningSessionPage() {
	const { id } = useParams<{ id: string }>()
	const [, navigate] = useLocation()
	const { data: session, error, isLoading, mutate } = useSmSession(id ?? null)
	const [activeTab, setActiveTab] = useState<string>('chat')
	const [isSavingDoc, setIsSavingDoc] = useState(false)
	const [isDeletingDoc, setIsDeletingDoc] = useState(false)
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [showRenameDialog, setShowRenameDialog] = useState(false)
	const [newProjectName, setNewProjectName] = useState('')
	const [isRenaming, setIsRenaming] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	const [selectedDocument, setSelectedDocument] = useState<SmDocumentFromAPI | null>(null)
	const [initialTabSet, setInitialTabSet] = useState(false)

	// Verifica se a geração está em andamento baseado no status persistido
	const isGenerationInProgress = session?.generationStatus === 'generating'
	const _generationFailed = session?.generationStatus === 'failed'

	// Verifica se a geração excedeu o timeout (abandonada)
	const isGenerationTimedOut =
		isGenerationInProgress &&
		session?.generationStartedAt &&
		Date.now() - new Date(session.generationStartedAt).getTime() > GENERATION_TIMEOUT_MS

	// Polling para atualizar a sessão enquanto a geração está em andamento
	useEffect(() => {
		if (!isGenerationInProgress || isGenerationTimedOut) return

		const interval = setInterval(() => {
			mutate()
		}, 3000) // Polling a cada 3 segundos

		return () => clearInterval(interval)
	}, [isGenerationInProgress, isGenerationTimedOut, mutate])

	// Set initial tab to documents if documents exist
	useEffect(() => {
		if (!initialTabSet && session?.documents && session.documents.length > 0) {
			setActiveTab('document')
			setInitialTabSet(true)
		}
	}, [session?.documents, initialTabSet])

	const handleMessageComplete = useCallback(() => {
		mutate()
	}, [mutate])

	const { generateDocument, isGenerating } = useSmDocument(id ?? '')

	// biome-ignore lint/correctness/useExhaustiveDependencies: id ensures callback is recreated when navigating between sessions
	const handleStepUpdate = useCallback(
		(newStep: string) => {
			mutate()
			// Se avançou para 'complete', gera o documento automaticamente
			if (newStep === 'complete') {
				setTimeout(() => {
					generateDocument().then(() => {
						mutate()
						setSelectedDocument(null)
						setActiveTab('document')
					})
				}, 500)
			}
		},
		[id, mutate, generateDocument]
	)

	const {
		sendMessage,
		isStreaming,
		streamingContent,
		pendingUserMessage,
		error: chatError,
		clearError: clearChatError,
	} = useSmChat({
		sessionId: id ?? '',
		onMessageComplete: handleMessageComplete,
		onStepUpdate: handleStepUpdate,
	})

	const {
		editMessage,
		isEditing,
		streamingContent: editStreamingContent,
	} = useMessageEdit({
		module: 'sm',
		onMessageComplete: handleMessageComplete,
	})

	const handleEditMessage = useCallback(
		async (messageId: string, content: string) => {
			await editMessage(messageId, content)
		},
		[editMessage]
	)

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
			await api.sm.updateDocumentById(selectedDocument.id, { content })
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
			await api.sm.deleteDocumentById(selectedDocument.id)
			await mutate()
			setSelectedDocument(null)
		} finally {
			setIsDeletingDoc(false)
		}
	}

	const handleSelectDocument = (doc: SmDocumentFromAPI) => {
		setSelectedDocument(doc)
	}

	const handleBackToList = () => {
		setSelectedDocument(null)
	}

	const handleDeleteSession = async () => {
		if (!id) return
		setIsDeleting(true)
		try {
			await api.sm.deleteSession(id)
			navigate('/requisitos')
		} catch (_err) {
			setIsDeleting(false)
		}
	}

	const handleRenameSession = async () => {
		if (!id || !newProjectName.trim()) return
		setIsRenaming(true)
		try {
			await api.sm.renameSession(id, newProjectName.trim())
			await mutate()
			setShowRenameDialog(false)
			setNewProjectName('')
		} catch (_err) {
		} finally {
			setIsRenaming(false)
		}
	}

	const openRenameDialog = () => {
		setNewProjectName(session?.projectName ?? '')
		setShowRenameDialog(true)
	}

	if (isLoading) {
		return (
			<div className="flex h-svh items-center justify-center bg-[#f9fafb]">
				<Spinner className="h-8 w-8" />
			</div>
		)
	}

	if (error || !session) {
		return (
			<div className="flex h-svh flex-col items-center justify-center gap-4 bg-[#f9fafb]">
				<p className="text-muted-foreground">Erro ao carregar sessão</p>
				<Button asChild variant="outline">
					<Link href="/requisitos">
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
	const isComplete = session.currentStep === 'complete'
	// Esconde o botão quando já está completo E já tem documento gerado
	const showDocumentButton =
		(session.currentStep === 'review' || isComplete) && !(isComplete && hasDocuments)

	// Combina o estado local (isGenerating) com o estado persistido (isGenerationInProgress)
	const isDocumentGenerating = isGenerating || (isGenerationInProgress && !isGenerationTimedOut)

	return (
		<div className="flex h-svh flex-col overflow-hidden bg-[#f9fafb]">
			{/* Header */}
			<div className="shrink-0 border-b border-border bg-white px-6 py-4">
				<div className="mx-auto flex max-w-7xl items-center justify-between">
					{/* Left: Back + Title */}
					<div className="flex items-center gap-4">
						<Button asChild variant="ghost" size="icon" className="shrink-0 text-muted-foreground">
							<Link href="/requisitos">
								<ArrowLeft className="h-5 w-5" />
							</Link>
						</Button>

						<div className="flex items-center gap-3">
							<div
								className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50"
								style={{ border: '1px solid #1d6ce020' }}
							>
								<ClipboardList className="h-4 w-4 text-primary" />
							</div>
							<div>
								<h1 className="text-lg font-semibold text-foreground">{session.projectName}</h1>
							</div>
						</div>
					</div>

					{/* Center: Step Indicator */}
					<div className="flex-1 overflow-x-auto px-8">
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
								disabled={isDocumentGenerating}
								variant={hasDocuments ? 'ghost' : 'default'}
								size="sm"
								className="gap-2"
							>
								{isDocumentGenerating ? (
									<>
										<Spinner className="h-4 w-4" />
										Gerando...
									</>
								) : (
									<>
										<FileText className="h-4 w-4" />
										{hasDocuments ? 'Novo Doc' : 'Gerar Backlog'}
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
								<DropdownMenuItem onClick={openRenameDialog}>
									<Pencil className="mr-2 h-4 w-4" />
									Renomear Projeto
								</DropdownMenuItem>
								<DropdownMenuSeparator />
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
						onGenerateDocument={handleGenerateDocument}
						onEditMessage={handleEditMessage}
						isStreaming={isStreaming}
						streamingContent={streamingContent}
						pendingUserMessage={pendingUserMessage}
						currentStep={session.currentStep}
						isGenerating={isDocumentGenerating}
						isEditing={isEditing}
						editStreamingContent={editStreamingContent}
						hasDocuments={hasDocuments}
						error={chatError}
						onClearError={clearChatError}
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
								{selectedDocument.type === 'full_planning' ||
								selectedDocument.type === 'sprint_backlog' ? (
									<BacklogDocumentViewer
										epics={session.epics ?? []}
										stories={(session.stories ?? []).map((s) => ({
											...s,
											asA: s.asA ?? undefined,
											iWant: s.iWant ?? undefined,
											soThat: s.soThat ?? undefined,
											epicId: session.epics?.find(
												(e) => e.number === Number.parseInt(s.storyKey.split('-')[0] ?? '0', 10)
											)?.id,
											epicNumber: Number.parseInt(s.storyKey.split('-')[0] ?? '0', 10),
											storyNumber: Number.parseInt(s.storyKey.split('-')[1] ?? '0', 10),
										}))}
										onUpdate={() => mutate()}
									/>
								) : (
									<DocumentViewer
										content={selectedDocument.content}
										title={selectedDocument.title}
										onSave={handleSaveDocument}
										onDelete={handleDeleteDocument}
										isSaving={isSavingDoc}
										isDeleting={isDeletingDoc}
									/>
								)}
							</div>
						</div>
					) : (
						<div className="min-h-0 flex-1 overflow-auto px-6 py-6">
							<div className="mx-auto max-w-7xl">
								<DocumentList
									documents={
										documents as unknown as Parameters<typeof DocumentList>[0]['documents']
									}
									selectedDocumentId={null}
									onSelectDocument={
										handleSelectDocument as Parameters<typeof DocumentList>[0]['onSelectDocument']
									}
									onGenerateNew={handleGenerateDocument}
									isGenerating={isDocumentGenerating}
								/>
							</div>
						</div>
					)}
				</TabsContent>
			</Tabs>

			{/* Rename dialog */}
			<Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
				<DialogContent className="border border-border bg-white">
					<DialogHeader>
						<DialogTitle className="text-foreground">Renomear Projeto</DialogTitle>
						<DialogDescription className="text-muted-foreground">
							O nome será atualizado em todos os módulos vinculados (Briefing, PRD e Planejamento).
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="projectName" className="text-foreground">
								Nome do Projeto
							</Label>
							<Input
								id="projectName"
								value={newProjectName}
								onChange={(e) => setNewProjectName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter' && newProjectName.trim() && !isRenaming) {
										e.preventDefault()
										handleRenameSession()
									}
								}}
								placeholder="Nome do projeto"
								className="border-border"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowRenameDialog(false)}
							disabled={isRenaming}
						>
							Cancelar
						</Button>
						<Button onClick={handleRenameSession} disabled={!newProjectName.trim() || isRenaming}>
							{isRenaming ? (
								<>
									<Spinner className="mr-2 h-4 w-4" />
									Salvando...
								</>
							) : (
								'Salvar'
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete confirmation dialog */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent className="border border-border bg-white">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-foreground">Apagar projeto?</AlertDialogTitle>
						<AlertDialogDescription className="text-muted-foreground">
							Esta ação não pode ser desfeita. O projeto "{session.projectName}" e todos os epics,
							stories e documentos serão permanentemente apagados.
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
