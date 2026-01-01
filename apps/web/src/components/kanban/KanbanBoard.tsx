import type { KanbanEpic, KanbanStory } from '@/lib/api-client'
import { KanbanCard } from './KanbanCard'
import { KanbanColumn } from './KanbanColumn'

type StoryStatus = KanbanStory['status']

interface KanbanBoardProps {
	epics: KanbanEpic[]
	stories: KanbanStory[]
	columnStats: Record<StoryStatus, number>
	onStoryClick?: (story: KanbanStory) => void
}

const COLUMNS: { id: StoryStatus; label: string }[] = [
	{ id: 'backlog', label: 'Backlog' },
	{ id: 'ready_for_dev', label: 'A Fazer' },
	{ id: 'in_progress', label: 'Em Progresso' },
	{ id: 'review', label: 'Em Revisão' },
	{ id: 'done', label: 'Concluído' },
]

export function KanbanBoard({ stories, columnStats, onStoryClick }: KanbanBoardProps) {
	return (
		<div
			className="flex h-full gap-3 p-4 overflow-x-auto"
			style={{
				background: 'linear-gradient(180deg, #0079bf 0%, #026aa7 100%)',
			}}
		>
			{COLUMNS.map((column) => {
				const columnStories = stories.filter((s) => s.status === column.id)

				return (
					<KanbanColumn
						key={column.id}
						id={column.id}
						status={column.id}
						label={column.label}
						count={columnStats[column.id]}
					>
						{columnStories.map((story, index) => (
							<div
								key={story.id}
								className="animate-card-enter"
								style={{ animationDelay: `${index * 30}ms` }}
							>
								<KanbanCard story={story} onClick={onStoryClick} />
							</div>
						))}
					</KanbanColumn>
				)
			})}
		</div>
	)
}
