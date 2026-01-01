import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Link } from 'wouter'

interface AppleHeaderProps {
	projectName: string
	totalStories: number
	totalPoints: number
	isUpdating?: boolean
	onRefresh: () => void
}

export function AppleHeader({
	projectName,
	totalStories,
	totalPoints,
	isUpdating,
	onRefresh,
}: AppleHeaderProps) {
	return (
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
			</div>
		</header>
	)
}
