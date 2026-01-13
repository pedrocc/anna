import { useDraggable } from '@dnd-kit/core'
import { CheckSquare, Code2, ListChecks } from 'lucide-react'
import type { KeyboardEvent, MouseEvent } from 'react'
import type { KanbanStory } from '@/lib/api-client'

interface AppleCardProps {
	story: KanbanStory
	onClick?: (story: KanbanStory) => void
}

const priorityClasses: Record<string, string> = {
	critical: 'apple-priority-critical',
	high: 'apple-priority-high',
	medium: 'apple-priority-medium',
	low: 'apple-priority-low',
}

export function AppleCard({ story, onClick }: AppleCardProps) {
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id: story.id,
	})

	const style = transform
		? {
				transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
				zIndex: 1000,
			}
		: undefined

	const handleClick = (e: MouseEvent) => {
		if (!transform && onClick) {
			e.stopPropagation()
			onClick(story)
		}
	}

	const handleKeyDown = (e: KeyboardEvent) => {
		if ((e.key === 'Enter' || e.key === ' ') && !transform && onClick) {
			e.preventDefault()
			onClick(story)
		}
	}

	const priorityClass = priorityClasses[story.priority] ?? priorityClasses['medium']

	// Check for rich content
	const hasAcceptanceCriteria = story.acceptanceCriteria && story.acceptanceCriteria.length > 0
	const hasTasks = story.tasks && story.tasks.length > 0
	const hasDevNotes =
		story.devNotes && Object.values(story.devNotes).some((v) => Array.isArray(v) && v.length > 0)

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: Drag-and-drop cards require div with dnd-kit attributes
		<div
			ref={setNodeRef}
			style={style}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			className={`apple-card ${isDragging ? 'apple-card-dragging' : ''}`}
			{...listeners}
			{...attributes}
		>
			{/* Header: Priority dot + Story key */}
			<div className="apple-card-header">
				<span className={`apple-priority-dot ${priorityClass}`} />
				<span className="apple-card-key">{story.storyKey}</span>
			</div>

			{/* Title */}
			<h4 className="apple-card-title">{story.title}</h4>

			{/* Footer: Points + Sprint + Rich Content Indicators */}
			<div className="apple-card-meta">
				<div className="flex items-center gap-2">
					{story.storyPoints && <span className="apple-card-points">{story.storyPoints} pts</span>}
				</div>
				<div className="flex items-center gap-2">
					{/* Rich content indicators */}
					{hasAcceptanceCriteria && (
						<span
							className="flex items-center gap-1 text-[11px]"
							style={{ color: 'var(--apple-accent)' }}
							title={`${story.acceptanceCriteria.length} critérios de aceitação`}
						>
							<CheckSquare className="h-3 w-3" />
							<span>{story.acceptanceCriteria.length}</span>
						</span>
					)}
					{hasTasks && (
						<span
							className="flex items-center gap-1 text-[11px]"
							style={{ color: 'var(--apple-accent)' }}
							title={`${story.tasks.length} tasks`}
						>
							<ListChecks className="h-3 w-3" />
							<span>{story.tasks.length}</span>
						</span>
					)}
					{hasDevNotes && (
						<span
							className="flex items-center"
							style={{ color: 'var(--apple-accent)' }}
							title="Tem notas de desenvolvimento"
						>
							<Code2 className="h-3 w-3" />
						</span>
					)}
					{story.targetSprint && (
						<span className="apple-card-sprint">Sprint {story.targetSprint}</span>
					)}
				</div>
			</div>
		</div>
	)
}
