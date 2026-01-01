import { useDraggable } from '@dnd-kit/core'
import { Target } from 'lucide-react'
import type { KeyboardEvent, MouseEvent } from 'react'
import type { KanbanStory } from '@/lib/api-client'

interface KanbanCardProps {
	story: KanbanStory
	isDragging?: boolean
	onClick?: (story: KanbanStory) => void
}

const priorityColors: Record<string, string> = {
	critical: 'bg-red-500',
	high: 'bg-orange-500',
	medium: 'bg-yellow-500',
	low: 'bg-slate-400',
}

export function KanbanCard({ story, isDragging, onClick }: KanbanCardProps) {
	const { attributes, listeners, setNodeRef, transform } = useDraggable({
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

	const priorityColor = priorityColors[story.priority] ?? priorityColors['medium']

	return (
		// biome-ignore lint/a11y/useSemanticElements: Drag-and-drop cards need div for layout
		<div
			ref={setNodeRef}
			style={style}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			className={`
				group relative
				cursor-pointer select-none
				rounded-lg
				bg-white
				shadow-sm hover:shadow-md
				border border-slate-200 hover:border-slate-300
				transition-all duration-150
				${isDragging ? 'rotate-2 scale-105 shadow-xl' : ''}
			`}
			{...listeners}
			{...attributes}
		>
			{/* Priority bar */}
			<div className={`absolute top-0 left-0 right-0 h-1 rounded-t-lg ${priorityColor}`} />

			{/* Content */}
			<div className="p-3 pt-3.5">
				{/* Labels row - like Trello */}
				<div className="mb-2 flex flex-wrap gap-1">
					<span className={`h-2 w-10 rounded-full ${priorityColor}`} />
				</div>

				{/* Title */}
				<p className="text-sm text-slate-800 leading-snug mb-2">{story.title}</p>

				{/* Footer */}
				<div className="flex items-center justify-between text-xs text-slate-500">
					<span className="font-mono font-medium">{story.storyKey}</span>

					<div className="flex items-center gap-2">
						{story.storyPoints && (
							<div className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5">
								<Target className="h-3 w-3" />
								<span className="font-medium">{story.storyPoints}</span>
							</div>
						)}
						{story.targetSprint && <span className="text-slate-400">S{story.targetSprint}</span>}
					</div>
				</div>
			</div>
		</div>
	)
}
