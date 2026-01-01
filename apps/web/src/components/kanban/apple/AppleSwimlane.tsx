import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { KanbanEpic, KanbanStory } from '@/lib/api-client'
import { AppleCard } from './AppleCard'
import { AppleColumn } from './AppleColumn'

type StoryStatus = 'backlog' | 'ready_for_dev' | 'in_progress' | 'review' | 'done'

interface AppleSwimlaneProps {
	epic: KanbanEpic
	stories: KanbanStory[]
	onStoryClick?: (story: KanbanStory) => void
	defaultExpanded?: boolean
}

const STATUSES: { id: StoryStatus; label: string }[] = [
	{ id: 'backlog', label: 'Backlog' },
	{ id: 'ready_for_dev', label: 'A Fazer' },
	{ id: 'in_progress', label: 'Em Progresso' },
	{ id: 'review', label: 'Em Revisão' },
	{ id: 'done', label: 'Concluído' },
]

export function AppleSwimlane({
	epic,
	stories,
	onStoryClick,
	defaultExpanded = true,
}: AppleSwimlaneProps) {
	const [isExpanded, setIsExpanded] = useState(defaultExpanded)

	const totalPoints = stories.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0)

	// Group stories by status for column counts
	const getStoriesByStatus = (status: StoryStatus) => stories.filter((s) => s.status === status)

	return (
		<div className="apple-swimlane animate-apple-fade-in">
			{/* Swimlane Header */}
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="apple-swimlane-header w-full"
			>
				<div className="flex items-center gap-3">
					{/* Chevron */}
					<ChevronDown
						className={`h-4 w-4 transition-transform duration-200 ${
							isExpanded ? '' : '-rotate-90'
						}`}
						style={{ color: 'var(--apple-text-tertiary)' }}
					/>

					{/* Epic Badge */}
					<span className="apple-epic-badge">E{epic.number}</span>

					{/* Epic Title */}
					<span
						className="text-[17px] font-semibold"
						style={{ color: 'var(--apple-text-primary)', letterSpacing: '-0.01em' }}
					>
						{epic.title}
					</span>
				</div>

				{/* Stats */}
				<div
					className="flex items-center gap-4 text-[13px]"
					style={{ color: 'var(--apple-text-secondary)' }}
				>
					<span>{stories.length} stories</span>
					<span className="apple-badge">{totalPoints} pts</span>
				</div>
			</button>

			{/* Columns Container */}
			<div
				className={`apple-swimlane-content ${
					isExpanded ? 'apple-swimlane-expanded' : 'apple-swimlane-collapsed'
				}`}
			>
				<div className="flex gap-1 p-4 overflow-x-auto apple-scrollbar">
					{STATUSES.map((status) => {
						const columnStories = getStoriesByStatus(status.id)
						return (
							<AppleColumn
								key={`${epic.id}-${status.id}`}
								id={`${epic.id}-${status.id}`}
								status={status.id}
								label={status.label}
								count={columnStories.length}
							>
								{columnStories.map((story, index) => (
									<div
										key={story.id}
										className={`animate-apple-fade-in apple-stagger-${Math.min(index + 1, 8)}`}
									>
										<AppleCard story={story} onClick={onStoryClick} />
									</div>
								))}
							</AppleColumn>
						)
					})}
				</div>
			</div>
		</div>
	)
}
