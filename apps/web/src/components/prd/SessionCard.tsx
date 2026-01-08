import type { PrdSession, PrdStatus, PrdStep } from '@repo/shared'
import { Calendar, Clock } from 'lucide-react'
import { Link } from 'wouter'

interface SessionCardProps {
	session: Pick<
		PrdSession,
		| 'id'
		| 'projectName'
		| 'projectDescription'
		| 'status'
		| 'currentStep'
		| 'createdAt'
		| 'updatedAt'
		| 'stepsCompleted'
		| 'projectType'
		| 'domain'
	>
}

const statusConfig: Record<PrdStatus, { label: string; color: string }> = {
	active: { label: 'Em andamento', color: '#f59e0b' },
	paused: { label: 'Pausado', color: '#6b7280' },
	completed: { label: 'Concluido', color: '#22c55e' },
	archived: { label: 'Arquivado', color: '#71717a' },
}

const stepLabels: Record<PrdStep, string> = {
	init: 'Inicializacao',
	discovery: 'Descoberta',
	success: 'Criterios de Sucesso',
	journeys: 'Jornadas',
	domain: 'Dominio',
	innovation: 'Inovacao',
	project_type: 'Tipo de Projeto',
	scoping: 'Escopo MVP',
	functional: 'Requisitos Funcionais',
	nonfunctional: 'Requisitos Nao-Funcionais',
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

function getProgress(stepsCompleted: PrdStep[], currentStep: PrdStep, sessionStatus: PrdStatus): number {
	// Se o status é completed ou o step atual é complete, sempre 100%
	if (sessionStatus === 'completed' || currentStep === 'complete') {
		return 100
	}
	const totalSteps = 11
	return Math.round((stepsCompleted.length / totalSteps) * 100)
}

export function SessionCard({ session }: SessionCardProps) {
	const status = statusConfig[session.status]
	const progress = getProgress(session.stepsCompleted, session.currentStep, session.status)

	return (
		<Link href={`/pm/${session.id}`}>
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
						<p className="mb-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
							{session.projectDescription}
						</p>
					)}

					{/* Tags */}
					{(session.projectType || session.domain) && (
						<div className="mb-3 flex flex-wrap gap-1.5">
							{session.projectType && (
								<span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-600">
									{session.projectType.replace('_', ' ')}
								</span>
							)}
							{session.domain && (
								<span className="rounded-md bg-[#f9fafb] px-2 py-0.5 text-xs text-muted-foreground">
									{session.domain}
								</span>
							)}
						</div>
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
