import { useDraggable } from '@dnd-kit/core'
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

	return (
		// biome-ignore lint/a11y/useSemanticElements: Drag-and-drop cards need div for layout
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

			{/* Footer: Points + Sprint */}
			<div className="apple-card-meta">
				<div className="flex items-center gap-2">
					{story.storyPoints && <span className="apple-card-points">{story.storyPoints} pts</span>}
				</div>
				{story.targetSprint && (
					<span className="apple-card-sprint">Sprint {story.targetSprint}</span>
				)}
			</div>
		</div>
	)
}
