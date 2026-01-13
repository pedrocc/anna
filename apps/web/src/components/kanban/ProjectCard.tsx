import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@repo/ui'
import {
	ArrowRight,
	Calendar,
	FileText,
	LayoutList,
	MoreVertical,
	Target,
	Trash2,
} from 'lucide-react'
import type { MouseEvent } from 'react'
import { useState } from 'react'
import { Link } from 'wouter'
import { api, type KanbanProject } from '@/lib/api-client'

interface ProjectCardProps {
	project: KanbanProject
	onDeleted?: () => void
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

export function ProjectCard({ project, onDeleted }: ProjectCardProps) {
	const status = statusConfig[project.status] ?? { label: 'Em andamento', color: '#22c55e' }
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)

	const handleDelete = async () => {
		setIsDeleting(true)
		try {
			await api.sm.deleteSession(project.id)
			onDeleted?.()
		} catch (error) {
			console.error('Failed to delete project:', error)
		} finally {
			setIsDeleting(false)
			setShowDeleteDialog(false)
		}
	}

	return (
		<>
			<div className="group relative h-full">
				{/* Dropdown menu no canto superior direito */}
				<div className="absolute right-2 top-2 z-10">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								onClick={(e) => e.preventDefault()}
								className="flex h-7 w-7 items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
							>
								<MoreVertical className="h-4 w-4 text-muted-foreground" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onClick={(e: MouseEvent) => {
									e.preventDefault()
									setShowDeleteDialog(true)
								}}
							>
								<Trash2 className="mr-2 h-4 w-4" />
								Excluir projeto
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<Link href={`/kanban/${project.id}`}>
					<div className="h-full cursor-pointer">
						<div className="flex h-full flex-col rounded-xl border border-border bg-white p-6 transition-colors hover:border-primary/30">
							{/* Header */}
							<div className="mb-4 flex items-start justify-between gap-3 pr-8">
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
			</div>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir projeto</AlertDialogTitle>
						<AlertDialogDescription>
							Tem certeza que deseja excluir o projeto "{project.projectName}"? Esta ação não pode
							ser desfeita e todos os dados do sprint plan serão perdidos.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? 'Excluindo...' : 'Excluir'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
