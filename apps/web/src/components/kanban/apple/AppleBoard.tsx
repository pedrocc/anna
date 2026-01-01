import type { KanbanEpic, KanbanStory } from '@/lib/api-client'
import { groupStoriesByEpic } from '../EpicGroup'
import { AppleSwimlane } from './AppleSwimlane'

interface AppleBoardProps {
	epics: KanbanEpic[]
	stories: KanbanStory[]
	onStoryClick?: (story: KanbanStory) => void
}

export function AppleBoard({ epics, stories, onStoryClick }: AppleBoardProps) {
	// Group stories by epic
	const epicGroups = groupStoriesByEpic(stories, epics)

	// Sort epics by number
	const sortedGroups = Array.from(epicGroups.values()).sort((a, b) => a.epic.number - b.epic.number)

	if (sortedGroups.length === 0) {
		return (
			<div className="apple-board">
				<div className="apple-empty-state">
					<div className="apple-empty-icon">
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-label="Kanban board"
							role="img"
						>
							<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
							<line x1="9" y1="3" x2="9" y2="21" />
							<line x1="15" y1="3" x2="15" y2="21" />
						</svg>
					</div>
					<h3 className="apple-empty-title">Nenhuma story encontrada</h3>
					<p className="apple-empty-description">
						Ajuste os filtros ou adicione novas stories ao projeto.
					</p>
				</div>
			</div>
		)
	}

	return (
		<div className="apple-board apple-scrollbar">
			{sortedGroups.map((group, index) => (
				<div
					key={group.epic.id}
					className={`animate-apple-fade-in apple-stagger-${Math.min(index + 1, 8)}`}
				>
					<AppleSwimlane epic={group.epic} stories={group.stories} onStoryClick={onStoryClick} />
				</div>
			))}
		</div>
	)
}
