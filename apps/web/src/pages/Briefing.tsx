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
	Spinner,
	Textarea,
} from '@repo/ui'
import {
	CheckCircle2,
	Clock,
	FileText,
	FolderOpen,
	Plus,
	Search,
	Sparkles,
	Target,
	Users,
} from 'lucide-react'
import { type ChangeEvent, type KeyboardEvent, useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { SessionCard } from '../components/briefing'
import { useBriefingSessions } from '../lib/api-client'

declare const __API_URL__: string | undefined
const API_URL = __API_URL__ ?? 'http://localhost:3000'

const features = [
	{
		title: 'Visao do Produto',
		description: 'Defina o proposito e diferencial',
		icon: Target,
		accent: '#1d6ce0',
	},
	{
		title: 'Publico-Alvo',
		description: 'Identifique usuarios e personas',
		icon: Users,
		accent: '#8b5cf6',
	},
	{
		title: 'Metricas de Sucesso',
		description: 'Estabeleca KPIs e objetivos',
		icon: CheckCircle2,
		accent: '#22c55e',
	},
]

export function BriefingPage() {
	const { getToken } = useAuth()
	const [, navigate] = useLocation()
	const { data, error, isLoading, mutate } = useBriefingSessions()
	const [isCreating, setIsCreating] = useState(false)
	const [dialogOpen, setDialogOpen] = useState(false)
	const [projectName, setProjectName] = useState('')
	const [projectDescription, setProjectDescription] = useState('')
	const [searchQuery, setSearchQuery] = useState('')

	const sessions = data ?? []

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
			const response = await fetch(`${API_URL}/api/v1/briefing/sessions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					projectName: projectName.trim(),
					projectDescription: projectDescription.trim() || undefined,
				}),
			})

			if (!response.ok) {
				throw new Error('Failed to create session')
			}

			const result = await response.json()
			setDialogOpen(false)
			setProjectName('')
			setProjectDescription('')
			mutate()

			navigate(`/briefing/${result.data.id}`)
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
					<div className="animate-fade-in mb-8" style={{ animationFillMode: 'forwards' }}>
						<div className="flex items-start justify-between">
							<div>
								<h1
									className="mb-2 text-3xl font-semibold tracking-tight text-foreground"
									style={{ fontFamily: 'Newsreader, Georgia, serif' }}
								>
									O que esse projeto precisa resolver?
								</h1>
								<p className="text-lg text-muted-foreground">
									Defina o escopo e objetivos do seu produto com Product Briefs.
								</p>
							</div>

							<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
								<DialogTrigger asChild>
									<Button size="lg" className="gap-2">
										<Plus className="h-5 w-5" />
										Novo Briefing
									</Button>
								</DialogTrigger>
								<DialogContent className="border border-border bg-white">
									<DialogHeader>
										<DialogTitle className="text-xl font-semibold text-foreground">
											Novo Product Brief
										</DialogTitle>
										<DialogDescription className="text-muted-foreground">
											Crie um Product Brief para estruturar a visao do seu projeto.
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
													<FileText className="h-4 w-4" />
													Iniciar Briefing
												</>
											)}
										</Button>
									</DialogFooter>
								</DialogContent>
							</Dialog>
						</div>
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
										style={{ background: '#1d6ce015' }}
									>
										<FolderOpen className="h-5 w-5" style={{ color: '#1d6ce0' }} />
									</div>
									<div>
										<p className="text-2xl font-bold text-foreground">{stats.total}</p>
										<p className="text-sm text-muted-foreground">Total de Briefings</p>
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
									Seus Briefings
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
							{/* Features */}
							<div className="mb-8">
								<h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
									O que voce pode definir
								</h2>
								<div className="grid gap-4 sm:grid-cols-3">
									{features.map((feature, index) => {
										const Icon = feature.icon
										return (
											<div
												key={feature.title}
												className="animate-fade-in rounded-xl border border-border bg-white p-5 transition-colors hover:border-primary/30"
												style={{
													animationDelay: `${150 + index * 60}ms`,
													animationFillMode: 'forwards',
												}}
											>
												<div className="flex items-start gap-4">
													<div
														className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
														style={{ background: `${feature.accent}15` }}
													>
														<Icon className="h-5 w-5" style={{ color: feature.accent }} />
													</div>
													<div>
														<p className="font-semibold text-foreground">{feature.title}</p>
														<p className="mt-0.5 text-sm text-muted-foreground">
															{feature.description}
														</p>
													</div>
												</div>
											</div>
										)
									})}
								</div>
							</div>

							{/* CTA Card */}
							<div
								className="animate-fade-in rounded-xl border border-dashed border-border bg-white py-16 text-center"
								style={{ animationDelay: '350ms', animationFillMode: 'forwards' }}
							>
								<div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
									<Sparkles className="h-8 w-8 text-primary" />
								</div>
								<h2 className="mb-2 text-xl font-semibold text-foreground">
									Comece seu primeiro briefing
								</h2>
								<p className="mx-auto mb-6 max-w-md text-muted-foreground">
									Um Product Brief bem estruturado e o primeiro passo para um projeto de sucesso. A
									Anna vai guiar voce em cada etapa.
								</p>
								<Button onClick={() => setDialogOpen(true)} size="lg" className="gap-2">
									<Plus className="h-5 w-5" />
									Criar Briefing
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>
		</ScrollArea>
	)
}
