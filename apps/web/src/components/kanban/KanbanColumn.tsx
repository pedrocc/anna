import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'

type StoryStatus = 'backlog' | 'ready_for_dev' | 'in_progress' | 'review' | 'done'

interface KanbanColumnProps {
	id: string
	status: StoryStatus
	label: string
	count: number
	children?: ReactNode
}

const statusColors: Record<StoryStatus, string> = {
	backlog: 'bg-slate-100',
	ready_for_dev: 'bg-blue-50',
	in_progress: 'bg-amber-50',
	review: 'bg-violet-50',
	done: 'bg-emerald-50',
}

export function KanbanColumn({ id, status, label, count, children }: KanbanColumnProps) {
	const { setNodeRef, isOver } = useDroppable({ id })
	const bgColor = statusColors[status]

	return (
		<div
			className={`
				flex w-[272px] shrink-0 flex-col
				rounded-xl
				${bgColor}
				${isOver ? 'ring-2 ring-primary ring-offset-2' : ''}
				transition-all duration-200
			`}
		>
			{/* Header */}
			<div className="flex items-center justify-between px-3 py-2.5">
				<h3 className="text-sm font-semibold text-slate-700">{label}</h3>
				<span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-200/80 px-1.5 text-xs font-medium text-slate-600">
					{count}
				</span>
			</div>

			{/* Cards Container */}
			<div
				ref={setNodeRef}
				className={`
					flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2
					min-h-[100px]
					${isOver ? 'bg-primary/5' : ''}
				`}
			>
				<div className="flex flex-col gap-2">{children}</div>

				{/* Drop indicator */}
				{isOver && <div className="mt-2 h-1 rounded-full bg-primary/40 animate-pulse" />}
			</div>

			{/* Add card button */}
			<button
				type="button"
				className="mx-2 mb-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-200/50 transition-colors"
			>
				<span className="text-lg leading-none">+</span>
				<span>Adicionar card</span>
			</button>
		</div>
	)
}
