import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui'
import { Filter } from 'lucide-react'
import type { KanbanEpic } from '@/lib/api-client'

interface KanbanFiltersProps {
	epics: KanbanEpic[]
	sprints: (number | null)[]
	selectedEpic: string
	selectedSprint: string
	selectedPriority: string
	onEpicChange: (value: string) => void
	onSprintChange: (value: string) => void
	onPriorityChange: (value: string) => void
}

const priorityLabels: Record<string, string> = {
	critical: 'Critico',
	high: 'Alta',
	medium: 'Media',
	low: 'Baixa',
}

export function KanbanFilters({
	epics,
	sprints,
	selectedEpic,
	selectedSprint,
	selectedPriority,
	onEpicChange,
	onSprintChange,
	onPriorityChange,
}: KanbanFiltersProps) {
	const hasFilters =
		selectedEpic !== 'all' || selectedSprint !== 'all' || selectedPriority !== 'all'

	return (
		<div className="flex flex-wrap items-center gap-3">
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<Filter className="h-4 w-4" />
				<span>Filtros:</span>
			</div>

			{/* Epic Filter */}
			<Select value={selectedEpic} onValueChange={onEpicChange}>
				<SelectTrigger className="h-8 w-[180px] bg-white/5">
					<SelectValue placeholder="Todos os Epics" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Todos os Epics</SelectItem>
					{epics.map((epic) => (
						<SelectItem key={epic.id} value={epic.id}>
							Epic {epic.number}: {epic.title}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Sprint Filter */}
			{sprints.length > 0 && (
				<Select value={selectedSprint} onValueChange={onSprintChange}>
					<SelectTrigger className="h-8 w-[140px] bg-white/5">
						<SelectValue placeholder="Todos os Sprints" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todos os Sprints</SelectItem>
						{sprints.map((sprint) => (
							<SelectItem key={sprint ?? 'null'} value={String(sprint)}>
								Sprint {sprint}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}

			{/* Priority Filter */}
			<Select value={selectedPriority} onValueChange={onPriorityChange}>
				<SelectTrigger className="h-8 w-[140px] bg-white/5">
					<SelectValue placeholder="Prioridade" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Todas</SelectItem>
					{Object.entries(priorityLabels).map(([key, label]) => (
						<SelectItem key={key} value={key}>
							{label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{hasFilters && (
				<button
					type="button"
					onClick={() => {
						onEpicChange('all')
						onSprintChange('all')
						onPriorityChange('all')
					}}
					className="text-xs text-muted-foreground hover:text-foreground"
				>
					Limpar filtros
				</button>
			)}
		</div>
	)
}
