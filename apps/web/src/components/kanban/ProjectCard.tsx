import { ArrowRight, Calendar, FileText, LayoutList, Target } from 'lucide-react'
import { Link } from 'wouter'
import type { KanbanProject } from '@/lib/api-client'

interface ProjectCardProps {
	project: KanbanProject
}

const statusConfig: Record<string, { label: string; color: string }> = {
	active: { label: 'Em andamento', color: '#22c55e' },
	paused: { label: 'Pausado', color: '#f59e0b' },
	completed: { label: 'Concluido', color: '#1d6ce0' },
	archived: { label: 'Arquivado', color: '#71717a' },
}

function formatDate(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date
	return d.toLocaleDateString('pt-BR', {
		day: '2-digit',
		month: 'short',
	})
}

export function ProjectCard({ project }: ProjectCardProps) {
	const status = statusConfig[project.status] ?? { label: 'Em andamento', color: '#22c55e' }

	return (
		<Link href={`/kanban/${project.id}`}>
			<div className="group h-full cursor-pointer">
				<div className="flex h-full flex-col rounded-xl border border-border bg-white p-6 transition-colors hover:border-primary/30">
					{/* Header */}
					<div className="mb-4 flex items-start justify-between gap-3">
						<h3 className="line-clamp-1 text-lg font-semibold text-foreground">
							{project.projectName}
						</h3>
						<span
							className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
							style={{
								background: `${status.color}15`,
								color: status.color,
							}}
						>
							{status.label}
						</span>
					</div>

					{/* Description */}
					{project.projectDescription && (
						<p className="mb-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
							{project.projectDescription}
						</p>
					)}

					{/* Stats badges */}
					<div className="mb-4 flex flex-wrap gap-1.5">
						<span className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
							<LayoutList className="h-3 w-3" />
							{project.totalEpics} epics
						</span>
						<span className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
							<FileText className="h-3 w-3" />
							{project.totalStories} stories
						</span>
						<span className="flex items-center gap-1 rounded-md bg-[#f9fafb] px-2 py-0.5 text-xs font-medium text-muted-foreground">
							<Target className="h-3 w-3" />
							{project.totalStoryPoints} pts
						</span>
					</div>

					{/* Spacer */}
					<div className="flex-1" />

					{/* Footer */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-1 text-xs text-muted-foreground">
							<Calendar className="h-3.5 w-3.5" />
							<span>Atualizado: {formatDate(project.updatedAt)}</span>
						</div>

						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f9fafb] transition-transform group-hover:translate-x-1">
							<ArrowRight className="h-4 w-4 text-muted-foreground" />
						</div>
					</div>
				</div>
			</div>
		</Link>
	)
}
