import { Layers, Target, Zap } from 'lucide-react'
import type { KanbanEpic } from '@/lib/api-client'

interface AppleFiltersProps {
	epics: KanbanEpic[]
	sprints: number[]
	selectedEpic: string
	selectedSprint: string
	selectedPriority: string
	onEpicChange: (value: string) => void
	onSprintChange: (value: string) => void
	onPriorityChange: (value: string) => void
}

const PRIORITIES = [
	{ value: 'critical', label: 'Crítica' },
	{ value: 'high', label: 'Alta' },
	{ value: 'medium', label: 'Média' },
	{ value: 'low', label: 'Baixa' },
]

export function AppleFilters({
	epics,
	sprints,
	selectedEpic,
	selectedSprint,
	selectedPriority,
	onEpicChange,
	onSprintChange,
	onPriorityChange,
}: AppleFiltersProps) {
	const hasActiveFilters =
		selectedEpic !== 'all' || selectedSprint !== 'all' || selectedPriority !== 'all'

	const clearAllFilters = () => {
		onEpicChange('all')
		onSprintChange('all')
		onPriorityChange('all')
	}

	return (
		<div className="apple-filter-bar">
			{/* Epic Pills */}
			<button
				type="button"
				onClick={() => onEpicChange('all')}
				className={`apple-filter-pill ${selectedEpic === 'all' ? 'apple-filter-pill-active' : ''}`}
			>
				<Layers className="h-3.5 w-3.5" />
				<span>Todos Epics</span>
			</button>

			{epics.slice(0, 3).map((epic) => (
				<button
					key={epic.id}
					type="button"
					onClick={() => onEpicChange(selectedEpic === epic.id ? 'all' : epic.id)}
					className={`apple-filter-pill ${selectedEpic === epic.id ? 'apple-filter-pill-active' : ''}`}
				>
					<span>E{epic.number}</span>
				</button>
			))}

			{/* Divider */}
			<div className="h-5 w-px mx-1" style={{ background: 'var(--apple-border-subtle)' }} />

			{/* Sprint Pills */}
			<button
				type="button"
				onClick={() => onSprintChange('all')}
				className={`apple-filter-pill ${selectedSprint === 'all' ? 'apple-filter-pill-active' : ''}`}
			>
				<Target className="h-3.5 w-3.5" />
				<span>Sprints</span>
			</button>

			{sprints.slice(0, 3).map((sprint) => (
				<button
					key={sprint}
					type="button"
					onClick={() => onSprintChange(selectedSprint === String(sprint) ? 'all' : String(sprint))}
					className={`apple-filter-pill ${selectedSprint === String(sprint) ? 'apple-filter-pill-active' : ''}`}
				>
					<span>S{sprint}</span>
				</button>
			))}

			{/* Divider */}
			<div className="h-5 w-px mx-1" style={{ background: 'var(--apple-border-subtle)' }} />

			{/* Priority Pills */}
			<button
				type="button"
				onClick={() => onPriorityChange('all')}
				className={`apple-filter-pill ${selectedPriority === 'all' ? 'apple-filter-pill-active' : ''}`}
			>
				<Zap className="h-3.5 w-3.5" />
				<span>Prioridade</span>
			</button>

			{PRIORITIES.map((priority) => (
				<button
					key={priority.value}
					type="button"
					onClick={() =>
						onPriorityChange(selectedPriority === priority.value ? 'all' : priority.value)
					}
					className={`apple-filter-pill ${selectedPriority === priority.value ? 'apple-filter-pill-active' : ''}`}
				>
					<span>{priority.label}</span>
				</button>
			))}

			{/* Clear All */}
			{hasActiveFilters && (
				<button type="button" onClick={clearAllFilters} className="apple-filter-clear">
					Limpar filtros
				</button>
			)}
		</div>
	)
}
