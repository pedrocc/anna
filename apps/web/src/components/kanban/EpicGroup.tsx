import { Badge } from '@repo/ui'
import { ChevronDown, LayoutList } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import type { KanbanEpic, KanbanStory } from '@/lib/api-client'

interface EpicGroupProps {
	epic: KanbanEpic
	count: number
	children: ReactNode
	defaultExpanded?: boolean
}

export function EpicGroup({ epic, count, children, defaultExpanded = true }: EpicGroupProps) {
	const [isExpanded, setIsExpanded] = useState(defaultExpanded)

	if (count === 0) return null

	return (
		<div className="mb-3">
			{/* Epic Header */}
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className={`
					group/epic
					flex w-full items-center gap-2
					rounded-lg
					px-2 py-1.5
					text-left
					transition-all duration-200
					hover:bg-white/[0.04]
				`}
			>
				{/* Chevron */}
				<ChevronDown
					className={`
						h-3.5 w-3.5 text-muted-foreground/60
						transition-transform duration-200
						${isExpanded ? '' : '-rotate-90'}
					`}
				/>

				{/* Epic Icon */}
				<div
					className={`
						flex h-5 w-5 items-center justify-center
						rounded
						bg-primary/10 ring-1 ring-primary/20
						transition-all duration-200
						group-hover/epic:bg-primary/15
						group-hover/epic:ring-primary/30
					`}
				>
					<LayoutList className="h-3 w-3 text-primary/80" />
				</div>

				{/* Epic Number & Title */}
				<div className="flex min-w-0 flex-1 items-center gap-1.5">
					<span className="font-mono text-[10px] font-bold text-primary/70">E{epic.number}</span>
					<span className="truncate text-xs font-medium text-foreground/70">{epic.title}</span>
				</div>

				{/* Count Badge */}
				<Badge
					variant="secondary"
					className={`
						bg-white/[0.06] text-[10px] font-mono font-semibold
						px-1.5 py-0
						text-muted-foreground
						ring-1 ring-white/[0.08]
					`}
				>
					{count}
				</Badge>
			</button>

			{/* Stories Container */}
			<div
				className={`
					overflow-hidden
					transition-all duration-300 ease-out
					${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
				`}
			>
				<div className="mt-1.5 space-y-2 pl-2">{children}</div>
			</div>
		</div>
	)
}

// Helper to group stories by epic
export function groupStoriesByEpic(
	stories: KanbanStory[],
	epics: KanbanEpic[]
): Map<string, { epic: KanbanEpic; stories: KanbanStory[] }> {
	const groups = new Map<string, { epic: KanbanEpic; stories: KanbanStory[] }>()

	// Initialize with all epics
	for (const epic of epics) {
		groups.set(epic.id, { epic, stories: [] })
	}

	// Add stories to their epic groups
	for (const story of stories) {
		const group = groups.get(story.epicId)
		if (group) {
			group.stories.push(story)
		}
	}

	// Remove empty groups
	for (const [id, group] of groups) {
		if (group.stories.length === 0) {
			groups.delete(id)
		}
	}

	return groups
}
