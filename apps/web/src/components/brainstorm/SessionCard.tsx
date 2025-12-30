import type { BrainstormSession, BrainstormStatus, BrainstormStep } from '@repo/shared'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui'
import { ArrowRight, Calendar, Clock } from 'lucide-react'
import { Link } from 'wouter'

interface SessionCardProps {
	session: Pick<
		BrainstormSession,
		| 'id'
		| 'projectName'
		| 'projectDescription'
		| 'status'
		| 'currentStep'
		| 'createdAt'
		| 'updatedAt'
	>
}

const statusLabels: Record<BrainstormStatus, string> = {
	active: 'Em andamento',
	paused: 'Pausado',
	completed: 'Concluido',
	archived: 'Arquivado',
}

const statusColors: Record<BrainstormStatus, string> = {
	active: 'bg-green-500/10 text-green-600 border-green-500/20',
	paused: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
	completed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
	archived: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
}

const stepLabels: Record<BrainstormStep, string> = {
	setup: 'Configuracao',
	technique: 'Selecao de Tecnicas',
	execution: 'Execucao',
	document: 'Documento',
}

function formatDate(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date
	return d.toLocaleDateString('pt-BR', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	})
}

function formatTime(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date
	return d.toLocaleTimeString('pt-BR', {
		hour: '2-digit',
		minute: '2-digit',
	})
}

export function SessionCard({ session }: SessionCardProps) {
	return (
		<Card className="flex h-full flex-col transition-shadow hover:shadow-md">
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-2">
					<CardTitle className="truncate text-lg">{session.projectName}</CardTitle>
					<Badge variant="outline" className={statusColors[session.status]}>
						{statusLabels[session.status]}
					</Badge>
				</div>
				{session.projectDescription && (
					<CardDescription className="mt-1 line-clamp-2">
						{session.projectDescription}
					</CardDescription>
				)}
			</CardHeader>
			<CardContent className="flex flex-1 flex-col">
				<div className="flex flex-1 flex-col gap-3">
					{/* Step indicator */}
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<span className="font-medium">Etapa:</span>
						<span>{stepLabels[session.currentStep]}</span>
					</div>

					{/* Dates */}
					<div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
						<div className="flex items-center gap-1">
							<Calendar className="h-4 w-4" />
							<span>Criado: {formatDate(session.createdAt)}</span>
						</div>
						<div className="flex items-center gap-1">
							<Clock className="h-4 w-4" />
							<span>Atualizado: {formatTime(session.updatedAt)}</span>
						</div>
					</div>

					{/* Spacer to push button to bottom */}
					<div className="flex-1" />

					{/* Action button */}
					<div className="flex justify-end">
						<Button
							asChild
							variant={session.status === 'completed' ? 'outline' : 'default'}
							size="sm"
						>
							<Link href={`/brainstorm/${session.id}`}>
								{session.status === 'completed' ? 'Ver documento' : 'Continuar'}
								<ArrowRight className="ml-2 h-4 w-4" />
							</Link>
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
