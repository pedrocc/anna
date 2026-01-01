import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'

type StoryStatus = 'backlog' | 'ready_for_dev' | 'in_progress' | 'review' | 'done'

interface AppleColumnProps {
	id: string
	status: StoryStatus
	label: string
	count: number
	children?: ReactNode
}

const STATUS_LABELS: Record<StoryStatus, string> = {
	backlog: 'Backlog',
	ready_for_dev: 'A Fazer',
	in_progress: 'Em Progresso',
	review: 'Em Revisão',
	done: 'Concluído',
}

export function AppleColumn({ id, status, label, count, children }: AppleColumnProps) {
	const { setNodeRef, isOver } = useDroppable({ id })

	return (
		<div className={`apple-column ${isOver ? 'apple-column-over' : ''}`}>
			{/* Column Header */}
			<div className="apple-column-header">
				<span className="apple-column-title">{label || STATUS_LABELS[status]}</span>
				<span className="apple-column-count">{count}</span>
			</div>

			{/* Cards Container */}
			<div ref={setNodeRef} className="apple-column-body">
				{children}
			</div>
		</div>
	)
}
