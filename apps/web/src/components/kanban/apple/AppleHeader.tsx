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
import { ArrowLeft, RefreshCw, Settings, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'wouter'

interface AppleHeaderProps {
	projectName: string
	totalStories: number
	totalPoints: number
	isUpdating?: boolean
	isDeleting?: boolean
	onRefresh: () => void
	onDelete?: () => Promise<void>
}

export function AppleHeader({
	projectName,
	totalStories,
	totalPoints,
	isUpdating,
	isDeleting,
	onRefresh,
	onDelete,
}: AppleHeaderProps) {
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)

	const handleDelete = async () => {
		if (onDelete) {
			await onDelete()
		}
	}

	return (
		<>
			<header className="apple-header">
				<div className="flex items-center gap-4">
					{/* Back Button */}
					<Link href="/kanban" className="apple-back-btn">
						<ArrowLeft className="h-4 w-4" />
						<span>Voltar</span>
					</Link>

					{/* Divider */}
					<div className="h-6 w-px" style={{ background: 'var(--apple-border-subtle)' }} />

					{/* Title & Stats */}
					<div>
						<h1 className="apple-header-title">{projectName}</h1>
						<p className="apple-header-subtitle">
							<span className="font-mono">{totalStories}</span> stories ·{' '}
							<span className="font-mono">{totalPoints}</span> pontos
						</p>
					</div>
				</div>

				{/* Actions */}
				<div className="apple-header-actions">
					{isUpdating && (
						<span
							className="text-[13px] flex items-center gap-2"
							style={{ color: 'var(--apple-text-secondary)' }}
						>
							<RefreshCw className="h-3.5 w-3.5 animate-spin" />
							Salvando...
						</span>
					)}

					<button type="button" onClick={onRefresh} className="apple-icon-btn" title="Atualizar">
						<RefreshCw className="h-4 w-4" />
					</button>

					{onDelete && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button type="button" className="apple-icon-btn" title="Configurações">
									<Settings className="h-4 w-4" />
								</button>
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
					)}
				</div>
			</header>

			{/* Delete confirmation dialog */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent className="border border-border bg-white">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-foreground">Apagar projeto?</AlertDialogTitle>
						<AlertDialogDescription className="text-muted-foreground">
							Tem certeza que deseja apagar o projeto "{projectName}"? Esta ação não pode ser
							desfeita e todos os dados do sprint plan serão perdidos.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={isDeleting}
							className="bg-red-500 text-white hover:bg-red-600"
						>
							{isDeleting ? 'Apagando...' : 'Apagar'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
