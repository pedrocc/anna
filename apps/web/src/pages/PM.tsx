import { useAuth } from '@clerk/clerk-react'
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	Input,
	Label,
	ScrollArea,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Spinner,
	Textarea,
} from '@repo/ui'
import { CheckCircle2, Clock, FolderKanban, FolderOpen, Plus, Search, Sparkles } from 'lucide-react'
import { type ChangeEvent, type KeyboardEvent, useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { SessionCard } from '../components/prd'
import { useBriefingSessions, usePrdSessions } from '../lib/api-client'

declare const __API_URL__: string | undefined
const API_URL = __API_URL__ ?? 'http://localhost:3000'

export function PMPage() {
	const { getToken } = useAuth()
	const [, navigate] = useLocation()
	const { data, error, isLoading, mutate } = usePrdSessions()
	const { data: briefingSessions } = useBriefingSessions()
	const [isCreating, setIsCreating] = useState(false)
	const [dialogOpen, setDialogOpen] = useState(false)
	const [projectName, setProjectName] = useState('')
	const [projectDescription, setProjectDescription] = useState('')
	const [selectedBriefing, setSelectedBriefing] = useState<string>('')
	const [searchQuery, setSearchQuery] = useState('')

	const sessions = data ?? []
	const availableBriefings = briefingSessions ?? []

	const filteredSessions = useMemo(() => {
		if (!searchQuery.trim()) return sessions
		const query = searchQuery.toLowerCase()
		return sessions.filter(
			(session) =>
				session.projectName.toLowerCase().includes(query) ||
				session.projectDescription?.toLowerCase().includes(query)
		)
	}, [sessions, searchQuery])

	// Stats
	const stats = useMemo(() => {
		const active = sessions.filter((s) => s.status === 'active').length
		const completed = sessions.filter((s) => s.status === 'completed').length
		return { total: sessions.length, active, completed }
	}, [sessions])

	const handleCreateSession = async () => {
		if (!projectName.trim()) return

		setIsCreating(true)
		try {
			const token = await getToken()
			const response = await fetch(`${API_URL}/api/v1/prd/sessions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					projectName: projectName.trim(),
					projectDescription: projectDescription.trim() || undefined,
					briefingSessionId:
						selectedBriefing && selectedBriefing !== 'none' ? selectedBriefing : undefined,
				}),
			})

			if (!response.ok) {
				throw new Error('Failed to create session')
			}

			const result = await response.json()
			setDialogOpen(false)
			setProjectName('')
			setProjectDescription('')
			setSelectedBriefing('')
			mutate()

			navigate(`/pm/${result.data.id}`)
		} catch (_err) {
		} finally {
			setIsCreating(false)
		}
	}

	if (isLoading) {
		return (
			<div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-[#f9fafb]">
				<Spinner className="h-8 w-8" />
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 bg-[#f9fafb]">
				<p className="text-muted-foreground">Erro ao carregar sessoes</p>
				<Button onClick={() => mutate()}>Tentar novamente</Button>
			</div>
		)
	}

	return (
		<ScrollArea className="h-[calc(100vh-4rem)]">
			<div className="min-h-full bg-[#f9fafb] px-6 py-8 md:px-8">
				<div className="mx-auto max-w-5xl">
					{/* Header */}
					<div
						className="animate-fade-in mb-8 flex items-start justify-between"
						style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
					>
						<div>
							<h1
								className="mb-2 text-3xl font-semibold tracking-tight text-foreground"
								style={{ fontFamily: 'Newsreader, Georgia, serif' }}
							>
								Quais sao os requisitos?
							</h1>
							<p className="text-lg text-muted-foreground">
								Documente o que precisa ser construido com PRDs profissionais.
							</p>
						</div>

						<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
							<DialogTrigger asChild>
								<Button size="lg" className="gap-2">
									<Plus className="h-5 w-5" />
									Novo PRD
								</Button>
							</DialogTrigger>
							<DialogContent className="border border-border bg-white">
								<DialogHeader>
									<DialogTitle className="text-xl font-semibold text-foreground">
										Novo PRD
									</DialogTitle>
									<DialogDescription className="text-muted-foreground">
										Crie um PRD completo para documentar os requisitos do seu projeto.
									</DialogDescription>
								</DialogHeader>

								<div className="grid gap-4 py-4">
									<div className="grid gap-2">
										<Label htmlFor="name" className="text-foreground">
											Nome do Projeto *
										</Label>
										<Input
											id="name"
											value={projectName}
											onChange={(e: ChangeEvent<HTMLInputElement>) =>
												setProjectName(e.target.value)
											}
											onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
												if (e.key === 'Enter' && projectName.trim() && !isCreating) {
													e.preventDefault()
													handleCreateSession()
												}
											}}
											placeholder="Ex: Plataforma de Gestao de Pedidos"
											className="border-border"
										/>
									</div>
									<div className="grid gap-2">
										<Label htmlFor="description" className="text-foreground">
											Descricao (opcional)
										</Label>
										<Textarea
											id="description"
											value={projectDescription}
											onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
												setProjectDescription(e.target.value)
											}
											placeholder="Descreva brevemente o que voce quer construir..."
											rows={3}
											className="border-border"
										/>
									</div>
									{availableBriefings.length > 0 && (
										<div className="grid gap-2">
											<Label htmlFor="briefing" className="text-foreground">
												Vincular a um Briefing (opcional)
											</Label>
											<Select value={selectedBriefing} onValueChange={setSelectedBriefing}>
												<SelectTrigger className="border-border">
													<SelectValue placeholder="Selecione um briefing..." />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="none">Nenhum</SelectItem>
													{availableBriefings.map((b) => (
														<SelectItem key={b.id} value={b.id}>
															{b.projectName}
															{b.status === 'completed' && ' ✓'}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<p className="text-xs text-muted-foreground">
												O conteudo do briefing sera usado como contexto para o PRD.
											</p>
										</div>
									)}
								</div>

								<DialogFooter>
									<Button variant="outline" onClick={() => setDialogOpen(false)}>
										Cancelar
									</Button>
									<Button
										onClick={handleCreateSession}
										disabled={!projectName.trim() || isCreating}
										className="gap-2"
									>
										{isCreating ? (
											<>
												<Spinner className="h-4 w-4" />
												Criando...
											</>
										) : (
											<>
												<FolderKanban className="h-4 w-4" />
												Iniciar PRD
											</>
										)}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</div>

					{/* Stats - only show when there are sessions */}
					{sessions.length > 0 && (
						<div className="mb-8 grid gap-4 sm:grid-cols-3">
							<div
								className="animate-fade-in rounded-xl border border-border bg-white p-5 transition-colors hover:border-primary/30"
								style={{ animationDelay: '60ms', animationFillMode: 'forwards' }}
							>
								<div className="flex items-center gap-4">
									<div
										className="flex h-11 w-11 items-center justify-center rounded-xl"
										style={{ background: '#AF52DE15' }}
									>
										<FolderOpen className="h-5 w-5" style={{ color: '#AF52DE' }} />
									</div>
									<div>
										<p className="text-2xl font-bold text-foreground">{stats.total}</p>
										<p className="text-sm text-muted-foreground">Total de PRDs</p>
									</div>
								</div>
							</div>

							<div
								className="animate-fade-in rounded-xl border border-border bg-white p-5 transition-colors hover:border-primary/30"
								style={{ animationDelay: '120ms', animationFillMode: 'forwards' }}
							>
								<div className="flex items-center gap-4">
									<div
										className="flex h-11 w-11 items-center justify-center rounded-xl"
										style={{ background: '#f59e0b15' }}
									>
										<Clock className="h-5 w-5" style={{ color: '#f59e0b' }} />
									</div>
									<div>
										<p className="text-2xl font-bold text-foreground">{stats.active}</p>
										<p className="text-sm text-muted-foreground">Em Andamento</p>
									</div>
								</div>
							</div>

							<div
								className="animate-fade-in rounded-xl border border-border bg-white p-5 transition-colors hover:border-primary/30"
								style={{ animationDelay: '180ms', animationFillMode: 'forwards' }}
							>
								<div className="flex items-center gap-4">
									<div
										className="flex h-11 w-11 items-center justify-center rounded-xl"
										style={{ background: '#22c55e15' }}
									>
										<CheckCircle2 className="h-5 w-5" style={{ color: '#22c55e' }} />
									</div>
									<div>
										<p className="text-2xl font-bold text-foreground">{stats.completed}</p>
										<p className="text-sm text-muted-foreground">Concluidos</p>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Search + Sessions */}
					{sessions.length > 0 ? (
						<>
							{/* Section Header with Search */}
							<div
								className="animate-fade-in mb-6 flex items-center justify-between"
								style={{ animationDelay: '240ms', animationFillMode: 'forwards' }}
							>
								<h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
									Seus PRDs
								</h2>
								<div className="relative w-72">
									<Search
										className="pointer-events-none absolute h-4 w-4 text-muted-foreground/60"
										style={{ left: '14px', top: '50%', transform: 'translateY(-50%)' }}
									/>
									<input
										type="text"
										value={searchQuery}
										onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
										placeholder="Buscar projetos..."
										style={{ paddingLeft: '42px' }}
										className="h-9 w-full rounded-lg border border-border bg-white pr-4 text-sm shadow-sm outline-none transition-shadow placeholder:text-muted-foreground/60 focus:border-primary focus:shadow-md"
									/>
								</div>
							</div>

							{/* Grid or No Results */}
							{filteredSessions.length === 0 && searchQuery ? (
								<div
									className="animate-fade-in flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white py-16"
									style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
								>
									<Search className="mb-4 h-10 w-10 text-muted-foreground/40" />
									<h3 className="mb-1 text-lg font-semibold text-foreground">Nenhum resultado</h3>
									<p className="text-sm text-muted-foreground">
										Nenhum projeto corresponde a "{searchQuery}"
									</p>
								</div>
							) : (
								<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
									{filteredSessions.map((session, index) => (
										<div
											key={session.id}
											className="animate-fade-in"
											style={{
												animationDelay: `${300 + index * 50}ms`,
												animationFillMode: 'forwards',
											}}
										>
											<SessionCard session={session} />
										</div>
									))}
								</div>
							)}
						</>
					) : (
						/* Empty State */
						<div
							className="animate-fade-in"
							style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
						>
							<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white py-16 text-center">
								<div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100">
									<Sparkles className="h-8 w-8 text-purple-500" />
								</div>
								<h2 className="mb-2 text-xl font-semibold text-foreground">
									Comece seu primeiro PRD
								</h2>
								<p className="mx-auto mb-6 max-w-md text-muted-foreground">
									Um PRD bem estruturado documenta os requisitos do seu produto. A Anna vai guiar
									você em cada etapa.
								</p>
								<Button onClick={() => setDialogOpen(true)} size="lg" className="gap-2">
									<Plus className="h-5 w-5" />
									Criar PRD
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>
		</ScrollArea>
	)
}
