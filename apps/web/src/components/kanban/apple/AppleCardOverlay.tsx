import type { KanbanStory } from '@/lib/api-client'

interface AppleCardOverlayProps {
	story: KanbanStory
}

const priorityClasses: Record<string, string> = {
	critical: 'apple-priority-critical',
	high: 'apple-priority-high',
	medium: 'apple-priority-medium',
	low: 'apple-priority-low',
}

export function AppleCardOverlay({ story }: AppleCardOverlayProps) {
	const priorityClass = priorityClasses[story.priority] ?? priorityClasses['medium']

	return (
		<div className="apple-drag-overlay">
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
