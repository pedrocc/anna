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
	AlertTriangle,
	ArrowLeft,
	FileText,
	MessageSquare,
	Pencil,
	Settings,
	Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'wouter'
import { DocumentViewer } from '../components/brainstorm'
import { ChatInterface, StepIndicator } from '../components/briefing'
import { useBriefingChat, useBriefingDocument } from '../hooks/useBriefingChat'
import { useMessageEdit } from '../hooks/useMessageEdit'
import { api, useBriefingSession } from '../lib/api-client'

// Timeout em milissegundos para considerar uma geração como abandonada (10 minutos)
const GENERATION_TIMEOUT_MS = 10 * 60 * 1000

export function BriefingSessionPage() {
	const { id } = useParams<{ id: string }>()
	const [, navigate] = useLocation()
	const { data: session, error, isLoading, mutate } = useBriefingSession(id ?? null)
	const [activeTab, setActiveTab] = useState<string>('chat')
	const [isSavingDoc, setIsSavingDoc] = useState(false)
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [showRenameDialog, setShowRenameDialog] = useState(false)
	const [newProjectName, setNewProjectName] = useState('')
	const [isRenaming, setIsRenaming] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	const [initialTabSet, setInitialTabSet] = useState(false)
	const [actionError, setActionError] = useState<string | null>(null)

	// Verifica se a geração está em andamento baseado no status persistido
	const isGenerationInProgress = session?.generationStatus === 'generating'
	const generationFailed = session?.generationStatus === 'failed'

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

	// Set initial tab to documents if document exists
	useEffect(() => {
		if (!initialTabSet && session?.documents && session.documents.length > 0) {
			setActiveTab('document')
			setInitialTabSet(true)
		}
	}, [session?.documents, initialTabSet])

	// Get the single document (first one)
	const document = session?.documents?.[0] ?? null

	// biome-ignore lint/correctness/useExhaustiveDependencies: id ensures callback is recreated when navigating between sessions
	const handleMessageComplete = useCallback(() => {
		mutate()
	}, [id, mutate])

	// biome-ignore lint/correctness/useExhaustiveDependencies: id ensures callback is recreated when navigating between sessions
	const handleStepUpdate = useCallback(() => {
		mutate()
	}, [id, mutate])

	const {
		sendMessage,
		isStreaming,
		streamingContent,
		pendingUserMessage,
		error: chatError,
	} = useBriefingChat({
		sessionId: id ?? '',
		onMessageComplete: handleMessageComplete,
		onStepUpdate: handleStepUpdate,
	})

	const { generateDocument, isGenerating } = useBriefingDocument(id ?? '')

	const {
		editMessage,
		isEditing,
		streamingContent: editStreamingContent,
	} = useMessageEdit({
		module: 'briefing',
		onMessageComplete: handleMessageComplete,
		onStepUpdate: handleStepUpdate,
	})

	const handleEditMessage = useCallback(
		async (messageId: string, content: string) => {
			await editMessage(messageId, content)
		},
		[editMessage]
	)

	const handleGenerateDocument = async () => {
		setActionError(null)
		try {
			await generateDocument()
			await mutate()
			setActiveTab('document')
		} catch (err) {
			console.error('Failed to generate document:', err)
			setActionError('Falha ao gerar documento. Tente novamente.')
		}
	}

	const handleSaveDocument = async (content: string) => {
		if (!document) return
		setIsSavingDoc(true)
		try {
			await api.briefing.updateDocumentById(document.id, { content })
			await mutate()
		} finally {
			setIsSavingDoc(false)
		}
	}

	const handleDeleteSession = async () => {
		if (!id) return
		setIsDeleting(true)
		setActionError(null)
		try {
			await api.briefing.deleteSession(id)
			navigate('/briefing')
		} catch (err) {
			console.error('Failed to delete session:', err)
			setActionError('Falha ao excluir sessão. Tente novamente.')
			setIsDeleting(false)
		}
	}

	const handleRenameSession = async () => {
		if (!id || !newProjectName.trim()) return
		setIsRenaming(true)
		setActionError(null)
		try {
			await api.briefing.renameSession(id, newProjectName.trim())
			await mutate()
			setShowRenameDialog(false)
			setNewProjectName('')
		} catch (err) {
			console.error('Failed to rename session:', err)
			setActionError('Falha ao renomear sessão. Tente novamente.')
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
					<Link href="/briefing">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Voltar
					</Link>
				</Button>
			</div>
		)
	}

	const messages = session.messages ?? []
	const hasDocument = !!document
	const isComplete = session.currentStep === 'complete'
	// Esconde o botão quando já está completo E já tem documento gerado
	const showDocumentButton =
		(session.currentStep === 'scope' || isComplete) && !(isComplete && hasDocument)

	// Combina o estado local (isGenerating) com o estado persistido (isGenerationInProgress)
	// O botão fica desabilitado se qualquer um estiver true
	const isDocumentGenerating = isGenerating || (isGenerationInProgress && !isGenerationTimedOut)

	return (
		<div className="flex h-svh flex-col overflow-hidden bg-[#f9fafb]">
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
							hasDocument={hasDocument}
						/>
					</div>

					{/* Right: Actions */}
					<div className="flex items-center gap-2">
						{showDocumentButton && (
							<Button
								onClick={handleGenerateDocument}
								disabled={isDocumentGenerating}
								variant="ghost"
								size="icon"
								className="text-muted-foreground hover:text-blue-600"
								title={isDocumentGenerating ? 'Gerando documento...' : 'Gerar Documento'}
							>
								{isDocumentGenerating ? (
									<Spinner className="h-5 w-5" />
								) : (
									<FileText className="h-5 w-5" />
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

			{/* Error Alert */}
			{actionError && (
				<div className="shrink-0 border-b border-red-200 bg-red-50 px-6 py-3">
					<div className="mx-auto flex max-w-7xl items-center gap-2 text-sm text-red-700">
						<AlertTriangle className="h-4 w-4" />
						<span>{actionError}</span>
						<button
							type="button"
							onClick={() => setActionError(null)}
							className="ml-auto text-red-500 hover:text-red-700"
						>
							×
						</button>
					</div>
				</div>
			)}

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
								Documento
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
						hasDocuments={hasDocument}
					/>
				</TabsContent>

				<TabsContent value="document" className="m-0 flex min-h-0 flex-1 flex-col overflow-auto">
					{document ? (
						<div className="px-6 pb-4 pt-4">
							<div className="mx-auto max-w-7xl">
								<DocumentViewer
									content={document.content}
									title={document.title}
									onSave={handleSaveDocument}
									isSaving={isSavingDoc}
								/>
							</div>
						</div>
					) : (
						<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
							{generationFailed ? (
								<>
									<AlertTriangle className="h-12 w-12 text-red-500" />
									<p className="text-red-600 font-medium">Falha ao gerar documento</p>
									{session.generationError && (
										<p className="text-sm text-muted-foreground max-w-md text-center">
											{(() => {
												try {
													const parsed = JSON.parse(session.generationError)
													return parsed.message ?? session.generationError
												} catch {
													return session.generationError
												}
											})()}
										</p>
									)}
								</>
							) : isDocumentGenerating ? (
								<>
									<Spinner className="h-12 w-12" />
									<p className="text-muted-foreground">Gerando documento...</p>
									<p className="text-sm text-muted-foreground">Isso pode levar alguns minutos</p>
								</>
							) : (
								<>
									<FileText className="h-12 w-12 text-muted-foreground/50" />
									<p className="text-muted-foreground">Nenhum documento gerado ainda</p>
								</>
							)}
							{(session.currentStep === 'scope' || isComplete) && !isDocumentGenerating && (
								<Button onClick={handleGenerateDocument} className="gap-2">
									<FileText className="h-4 w-4" />
									{generationFailed ? 'Tentar Novamente' : 'Gerar Documento'}
								</Button>
							)}
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
