import type { BriefingSession, BriefingStatus, BriefingStep } from '@repo/shared'
import { Calendar, Clock, User } from 'lucide-react'
import { Link } from 'wouter'

interface SessionCardProps {
	session: Pick<
		BriefingSession,
		| 'id'
		| 'projectName'
		| 'projectDescription'
		| 'status'
		| 'currentStep'
		| 'createdAt'
		| 'updatedAt'
		| 'stepsCompleted'
	> & {
		user?: {
			id: string
			name: string | null
		}
	}
}

const statusConfig: Record<BriefingStatus, { label: string; color: string }> = {
	active: { label: 'Em andamento', color: '#f59e0b' },
	paused: { label: 'Pausado', color: '#6b7280' },
	completed: { label: 'Concluido', color: '#22c55e' },
	archived: { label: 'Arquivado', color: '#71717a' },
}

const stepLabels: Record<BriefingStep, string> = {
	init: 'Inicializacao',
	vision: 'Visao',
	users: 'Usuarios',
	metrics: 'Metricas',
	scope: 'Escopo MVP',
	complete: 'Conclusao',
}

function formatDate(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date
	return d.toLocaleDateString('pt-BR', {
		day: '2-digit',
		month: 'short',
	})
}

function formatTime(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date
	return d.toLocaleTimeString('pt-BR', {
		hour: '2-digit',
		minute: '2-digit',
	})
}

function getProgress(stepsCompleted: BriefingStep[], status: BriefingStatus): number {
	// If completed, always show 100%
	if (status === 'completed') return 100
	const totalSteps = 6
	return Math.round((stepsCompleted.length / totalSteps) * 100)
}

export function SessionCard({ session }: SessionCardProps) {
	const status = statusConfig[session.status]
	const progress = getProgress(session.stepsCompleted, session.status)

	return (
		<Link href={`/briefing/${session.id}`}>
			<div className="group h-full cursor-pointer">
				<div className="flex h-full flex-col rounded-xl border border-border bg-white p-6 transition-colors hover:border-primary/30">
					{/* Header */}
					<div className="mb-4 flex items-start justify-between gap-3">
						<h3 className="line-clamp-1 text-lg font-semibold text-foreground">
							{session.projectName}
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
					{session.projectDescription && (
						<p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
							{session.projectDescription}
						</p>
					)}

					{/* Spacer - empurra conteúdo abaixo para o fim do card */}
					<div className="flex-1" />

					{/* Step */}
					<div className="mb-3 flex items-center gap-2">
						<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
							Etapa
						</span>
						<span className="text-sm font-medium text-foreground">
							{stepLabels[session.currentStep]}
						</span>
					</div>

					{/* Progress bar */}
					<div className="mb-4">
						<div className="mb-1 flex items-center justify-between">
							<span className="text-xs text-muted-foreground">Progresso</span>
							<span className="text-xs font-medium text-muted-foreground">{progress}%</span>
						</div>
						<div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
							<div
								className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-amber-500'}`}
								style={{ width: `${progress}%` }}
							/>
						</div>
					</div>

					{/* Footer */}
					<div className="flex items-center gap-4 text-xs text-muted-foreground">
						{session.user?.name && (
							<div className="flex items-center gap-1">
								<User className="h-3.5 w-3.5" />
								<span>{session.user.name}</span>
							</div>
						)}
						<div className="flex items-center gap-1">
							<Calendar className="h-3.5 w-3.5" />
							<span>{formatDate(session.createdAt)}</span>
						</div>
						<div className="flex items-center gap-1">
							<Clock className="h-3.5 w-3.5" />
							<span>{formatTime(session.updatedAt)}</span>
						</div>
					</div>
				</div>
			</div>
		</Link>
	)
}
