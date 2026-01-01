import { Button, ScrollArea, Spinner } from '@repo/ui'
import { FolderOpen, Layers, ListTodo, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'wouter'
import { ProjectCard } from '../components/kanban/ProjectCard'
import { useKanbanProjects } from '../lib/api-client'

export function KanbanPage() {
	const { data, error, isLoading, mutate } = useKanbanProjects()
	const projects = data ?? []

	// Stats
	const stats = useMemo(() => {
		const totalStories = projects.reduce((acc, p) => acc + (p.totalStories || 0), 0)
		return { total: projects.length, totalStories }
	}, [projects])

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
				<p className="text-muted-foreground">Erro ao carregar projetos</p>
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
						className="animate-fade-in mb-8"
						style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
					>
						<h1
							className="mb-2 text-3xl font-semibold tracking-tight text-foreground"
							style={{ fontFamily: 'Newsreader, Georgia, serif' }}
						>
							O que precisa ser feito agora?
						</h1>
						<p className="text-lg text-muted-foreground">
							Gerencie suas tarefas em andamento com boards visuais.
						</p>
					</div>

					{/* Stats - only show when there are projects */}
					{projects.length > 0 && (
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
										<p className="text-sm text-muted-foreground">Projetos Ativos</p>
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
										<ListTodo className="h-5 w-5" style={{ color: '#f59e0b' }} />
									</div>
									<div>
										<p className="text-2xl font-bold text-foreground">{stats.totalStories}</p>
										<p className="text-sm text-muted-foreground">Total de Stories</p>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Projects */}
					{projects.length > 0 ? (
						<>
							{/* Section Header */}
							<div
								className="animate-fade-in mb-6"
								style={{ animationDelay: '240ms', animationFillMode: 'forwards' }}
							>
								<h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
									Seus Projetos
								</h2>
							</div>

							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{projects.map((project, index) => (
									<div
										key={project.id}
										className="animate-fade-in"
										style={{
											animationDelay: `${300 + index * 50}ms`,
											animationFillMode: 'forwards',
										}}
									>
										<ProjectCard project={project} />
									</div>
								))}
							</div>
						</>
					) : (
						/* Empty State */
						<div
							className="animate-fade-in"
							style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
						>
							<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white py-16 text-center">
								<div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
									<Sparkles className="h-8 w-8 text-primary" />
								</div>
								<h2 className="mb-2 text-xl font-semibold text-foreground">
									Nenhum projeto com stories
								</h2>
								<p className="mx-auto mb-6 max-w-md text-muted-foreground">
									Crie user stories no <strong>Planejamento</strong> para visualizá-las aqui no
									Kanban. Quando um projeto tiver stories, ele aparecerá automaticamente nesta
									lista.
								</p>
								<Button asChild size="lg" className="gap-2">
									<Link href="/requisitos">
										<Layers className="h-5 w-5" />
										Ir para Planejamento
									</Link>
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>
		</ScrollArea>
	)
}
