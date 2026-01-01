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
import {
	ArrowLeft,
	ChevronLeft,
	ClipboardList,
	FileText,
	MessageSquare,
	Settings,
	Trash2,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useLocation, useParams } from 'wouter'
import { DocumentViewer } from '../components/brainstorm'
import { DocumentList } from '../components/briefing'
import { ChatInterface, StepIndicator } from '../components/sm'
import { BacklogDocumentViewer } from '../components/sm/BacklogDocumentViewer'
import { useSmChat, useSmDocument } from '../hooks/useSmChat'
import { api, type SmDocumentFromAPI, useSmSession } from '../lib/api-client'

export function PlanningSessionPage() {
	const { id } = useParams<{ id: string }>()
	const [, navigate] = useLocation()
	const { data: session, error, isLoading, mutate } = useSmSession(id ?? null)
	const [activeTab, setActiveTab] = useState<string>('chat')
	const [isSavingDoc, setIsSavingDoc] = useState(false)
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	const [isAdvancing, setIsAdvancing] = useState(false)
	const [selectedDocument, setSelectedDocument] = useState<SmDocumentFromAPI | null>(null)

	const handleMessageComplete = useCallback(() => {
		mutate()
	}, [mutate])

	const {
		sendMessage,
		isStreaming,
		streamingContent,
		pendingUserMessage,
		error: chatError,
	} = useSmChat({
		sessionId: id ?? '',
		onMessageComplete: handleMessageComplete,
	})

	const { generateDocument, isGenerating } = useSmDocument(id ?? '')

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

	const handleAdvanceStep = async () => {
		if (!id) return
		setIsAdvancing(true)
		try {
			const updated = await api.sm.advanceStep(id)
			await mutate()

			const newStep = updated?.currentStep

			// Se avançou para 'complete', gera o documento automaticamente
			if (newStep === 'complete') {
				setTimeout(() => {
					handleGenerateDocument()
				}, 500)
				return
			}

			const stepMessages: Record<string, string> = {
				epics: 'Vamos definir os epics. Quais agrupamentos de funcionalidades você identifica?',
				stories: 'Vamos criar as user stories. Qual epic vamos detalhar primeiro?',
				details: 'Vamos detalhar as stories com Acceptance Criteria e Tasks.',
				planning: 'Vamos fazer o Sprint Planning. Como organizar as stories em sprints?',
				review: 'Vamos revisar o planejamento. Está tudo correto?',
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
	const showDocumentButton = session.currentStep === 'review' || session.currentStep === 'complete'

	return (
		<div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-[#f9fafb]">
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
								className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50"
								style={{ border: '1px solid #22c55e20' }}
							>
								<ClipboardList className="h-4 w-4 text-green-500" />
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
								disabled={isGenerating}
								variant={hasDocuments ? 'ghost' : 'default'}
								size="sm"
								className="gap-2"
								style={!hasDocuments ? { background: '#22c55e', color: 'white' } : undefined}
							>
								{isGenerating ? (
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
								className="gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-muted-foreground data-[state=active]:border-green-500 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
							>
								<MessageSquare className="h-4 w-4" />
								Chat
							</TabsTrigger>
							<TabsTrigger
								value="document"
								className="gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-muted-foreground data-[state=active]:border-green-500 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
							>
								<FileText className="h-4 w-4" />
								Documentos
								{hasDocuments && (
									<span className="ml-1 rounded-full bg-green-100 px-1.5 text-xs font-medium text-green-600">
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
						isStreaming={isStreaming}
						streamingContent={streamingContent}
						pendingUserMessage={pendingUserMessage}
						currentStep={session.currentStep}
						isAdvancing={isAdvancing}
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
										isSaving={isSavingDoc}
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
