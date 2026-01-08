import {
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core'
import { Spinner } from '@repo/ui'
import { LayoutGrid } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useLocation, useParams } from 'wouter'
import { AppleBoard, AppleCardOverlay, AppleFilters, AppleHeader } from '../components/kanban/apple'
import { StoryDetailSheet } from '../components/kanban/StoryDetailSheet'
import { api, type KanbanStory, useKanbanBoard } from '../lib/api-client'

type StoryStatus = KanbanStory['status']

export function KanbanBoardPage() {
	const params = useParams<{ id: string }>()
	const sessionId = params.id ?? null
	const [, navigate] = useLocation()
	const { data, error, isLoading, mutate } = useKanbanBoard(sessionId)

	// Filter state
	const [selectedEpic, setSelectedEpic] = useState<string>('all')
	const [selectedSprint, setSelectedSprint] = useState<string>('all')
	const [selectedPriority, setSelectedPriority] = useState<string>('all')

	// Drag state
	const [activeStory, setActiveStory] = useState<KanbanStory | null>(null)
	const [isUpdating, setIsUpdating] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)

	// Story detail sheet state
	const [selectedStory, setSelectedStory] = useState<KanbanStory | null>(null)
	const [sheetOpen, setSheetOpen] = useState(false)

	const handleDelete = useCallback(async () => {
		if (!sessionId) return
		setIsDeleting(true)
		try {
			await api.sm.deleteSession(sessionId)
			navigate('/kanban')
		} catch (error) {
			console.error('Failed to delete project:', error)
			setIsDeleting(false)
		}
	}, [sessionId, navigate])

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		})
	)

	const handleStoryClick = useCallback((story: KanbanStory) => {
		setSelectedStory(story)
		setSheetOpen(true)
	}, [])

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const { active } = event
			const story = data?.stories.find((s) => s.id === active.id)
			if (story) {
				setActiveStory(story)
			}
		},
		[data?.stories]
	)

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const { active, over } = event
			setActiveStory(null)

			if (!over || !data) return

			const storyId = active.id as string
			// Parse droppable ID: "epicId-status"
			const droppableId = over.id as string
			const lastDashIndex = droppableId.lastIndexOf('-')
			const newStatus = droppableId.substring(lastDashIndex + 1) as StoryStatus

			// Validate that the status is valid
			const validStatuses: StoryStatus[] = [
				'backlog',
				'ready_for_dev',
				'in_progress',
				'review',
				'done',
			]
			if (!validStatuses.includes(newStatus)) return

			const story = data.stories.find((s) => s.id === storyId)
			if (!story || story.status === newStatus) return

			// Optimistic update
			const previousData = data
			mutate(
				{
					...data,
					stories: data.stories.map((s) => (s.id === storyId ? { ...s, status: newStatus } : s)),
					columnStats: {
						...data.columnStats,
						[story.status]: data.columnStats[story.status] - 1,
						[newStatus]: data.columnStats[newStatus] + 1,
					},
				},
				false
			)

			setIsUpdating(true)
			try {
				await api.sm.updateStory(storyId, { status: newStatus })
				mutate()
			} catch (_err) {
				// Rollback on error
				mutate(previousData, false)
			} finally {
				setIsUpdating(false)
			}
		},
		[data, mutate]
	)

	// Filter stories
	const filteredStories =
		data?.stories.filter((story) => {
			if (selectedEpic !== 'all' && story.epicId !== selectedEpic) return false
			if (selectedSprint !== 'all' && String(story.targetSprint) !== selectedSprint) return false
			if (selectedPriority !== 'all' && story.priority !== selectedPriority) return false
			return true
		}) ?? []

	// Filter epics based on selected epic filter
	const filteredEpics =
		selectedEpic === 'all'
			? (data?.epics ?? [])
			: (data?.epics.filter((e) => e.id === selectedEpic) ?? [])

	if (isLoading) {
		return (
			<div
				className="flex h-[60vh] flex-col items-center justify-center gap-3"
				style={{ background: 'var(--apple-bg)' }}
			>
				<Spinner className="h-8 w-8" style={{ color: 'var(--apple-text-tertiary)' }} />
				<p style={{ color: 'var(--apple-text-secondary)', fontSize: '14px' }}>
					Carregando board...
				</p>
			</div>
		)
	}

	if (error || !data) {
		return (
			<div
				className="flex h-[60vh] flex-col items-center justify-center gap-4"
				style={{ background: 'var(--apple-bg)' }}
			>
				<div className="apple-empty-icon">
					<LayoutGrid className="h-6 w-6" />
				</div>
				<p style={{ color: 'var(--apple-priority-critical)', fontSize: '14px' }}>
					Erro ao carregar o board
				</p>
				<button type="button" onClick={() => mutate()} className="apple-filter-pill">
					Tentar novamente
				</button>
			</div>
		)
	}

	return (
		<div className="flex h-[calc(100vh-4rem)] flex-col" style={{ background: 'var(--apple-bg)' }}>
			{/* Header */}
			<AppleHeader
				projectName={data.session.projectName}
				totalStories={data.session.totalStories}
				totalPoints={data.session.totalStoryPoints}
				isUpdating={isUpdating}
				isDeleting={isDeleting}
				onRefresh={() => mutate()}
				onDelete={handleDelete}
			/>

			{/* Filters */}
			<div
				className="flex-shrink-0 px-8 py-4"
				style={{
					background: 'var(--apple-bg)',
					borderBottom: '1px solid var(--apple-border-subtle)',
				}}
			>
				<AppleFilters
					epics={data.epics}
					sprints={data.filters.sprints.filter((s): s is number => s !== null)}
					selectedEpic={selectedEpic}
					selectedSprint={selectedSprint}
					selectedPriority={selectedPriority}
					onEpicChange={setSelectedEpic}
					onSprintChange={setSelectedSprint}
					onPriorityChange={setSelectedPriority}
				/>
			</div>

			{/* Board */}
			<div className="flex-1 overflow-auto">
				<DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
					<AppleBoard
						epics={filteredEpics}
						stories={filteredStories}
						onStoryClick={handleStoryClick}
					/>
					<DragOverlay dropAnimation={null}>
						{activeStory ? <AppleCardOverlay story={activeStory} /> : null}
					</DragOverlay>
				</DndContext>
			</div>

			{/* Story Detail Sheet */}
			<StoryDetailSheet
				story={selectedStory}
				open={sheetOpen}
				onOpenChange={setSheetOpen}
				onUpdate={() => mutate()}
			/>
		</div>
	)
}
