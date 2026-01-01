import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
	Badge,
	Button,
	Card,
	CardContent,
	ScrollArea,
	Sheet,
	SheetContent,
} from '@repo/ui'
import {
	Calendar,
	CheckCircle2,
	ChevronRight,
	Circle,
	Clock,
	Eye,
	Layers,
	ListChecks,
	Loader2,
	Pencil,
	Save,
	Target,
	X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api-client'

interface Epic {
	id: string
	number: number
	title: string
	description: string
	status: string
	priority: string
}

interface Story {
	id: string
	storyKey: string
	title: string
	status: string
	priority: string
	storyPoints: number | null
	targetSprint: number | null
	asA?: string
	iWant?: string
	soThat?: string
	epicId?: string
	epicNumber?: number
	storyNumber?: number
}

interface BacklogDocumentViewerProps {
	epics: Epic[]
	stories: Story[]
	onUpdate?: () => void
}

const DEFAULT_PRIORITY = {
	label: 'Media',
	className: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
}

const priorityConfig: Record<string, { label: string; className: string }> = {
	critical: { label: 'Critico', className: 'bg-red-500/15 text-red-600 dark:text-red-400' },
	high: { label: 'Alta', className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400' },
	medium: DEFAULT_PRIORITY,
	low: { label: 'Baixa', className: 'bg-slate-500/15 text-slate-600 dark:text-slate-400' },
}

const statusIcons: Record<string, typeof Circle> = {
	backlog: Circle,
	ready_for_dev: ListChecks,
	in_progress: Clock,
	review: Eye,
	done: CheckCircle2,
}

const statusLabels: Record<string, string> = {
	backlog: 'Backlog',
	ready_for_dev: 'A Fazer',
	in_progress: 'Em Progresso',
	review: 'Em Revisao',
	done: 'Concluido',
}

const STATUSES = [
	{ value: 'backlog', label: 'Backlog' },
	{ value: 'ready_for_dev', label: 'A Fazer' },
	{ value: 'in_progress', label: 'Em Progresso' },
	{ value: 'review', label: 'Em Revisao' },
	{ value: 'done', label: 'Concluido' },
]

const PRIORITIES = [
	{ value: 'critical', label: 'Critico' },
	{ value: 'high', label: 'Alta' },
	{ value: 'medium', label: 'Media' },
	{ value: 'low', label: 'Baixa' },
]

export function BacklogDocumentViewer({ epics, stories, onUpdate }: BacklogDocumentViewerProps) {
	const [expandedEpics, setExpandedEpics] = useState<string[]>(epics.map((e) => e.id))
	const [selectedStory, setSelectedStory] = useState<Story | null>(null)
	const [sheetOpen, setSheetOpen] = useState(false)

	// Group stories by epic
	const storiesByEpic = useMemo(() => {
		const grouped = new Map<string, Story[]>()
		for (const story of stories) {
			const epicId = story.epicId ?? 'unknown'
			if (!grouped.has(epicId)) {
				grouped.set(epicId, [])
			}
			grouped.get(epicId)?.push(story)
		}
		return grouped
	}, [stories])

	// Calculate stats per epic
	const epicStats = useMemo(() => {
		const stats = new Map<
			string,
			{ totalStories: number; totalPoints: number; doneStories: number }
		>()
		for (const epic of epics) {
			const epicStories = storiesByEpic.get(epic.id) ?? []
			stats.set(epic.id, {
				totalStories: epicStories.length,
				totalPoints: epicStories.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0),
				doneStories: epicStories.filter((s) => s.status === 'done').length,
			})
		}
		return stats
	}, [epics, storiesByEpic])

	const handleStoryClick = useCallback((story: Story) => {
		setSelectedStory(story)
		setSheetOpen(true)
	}, [])

	const handleStoryUpdate = useCallback(() => {
		onUpdate?.()
	}, [onUpdate])

	if (epics.length === 0) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-4 py-16">
				<div
					className="flex h-16 w-16 items-center justify-center rounded-2xl"
					style={{ background: 'var(--apple-bg-hover)' }}
				>
					<Layers className="h-8 w-8" style={{ color: 'var(--apple-text-tertiary)' }} />
				</div>
				<div className="text-center">
					<h3 className="text-lg font-semibold" style={{ color: 'var(--apple-text-primary)' }}>
						Nenhum epic definido
					</h3>
					<p className="mt-1 max-w-sm text-sm" style={{ color: 'var(--apple-text-secondary)' }}>
						Converse com o assistente para definir os epics e stories do projeto.
					</p>
				</div>
			</div>
		)
	}

	return (
		<>
			<ScrollArea className="h-full">
				<div className="space-y-4 p-4">
					{/* Summary Header */}
					<div
						className="rounded-xl p-4"
						style={{
							background: 'var(--apple-bg-subtle)',
							border: '1px solid var(--apple-border-subtle)',
						}}
					>
						<div className="flex items-center justify-between">
							<div>
								<h3
									className="text-lg font-semibold"
									style={{ color: 'var(--apple-text-primary)' }}
								>
									Backlog do Projeto
								</h3>
								<p className="text-sm" style={{ color: 'var(--apple-text-secondary)' }}>
									{epics.length} epics · {stories.length} stories ·{' '}
									{stories.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0)} pontos
								</p>
							</div>
							<div className="flex gap-2">
								{Object.entries(
									stories.reduce(
										(acc, s) => {
											acc[s.status] = (acc[s.status] ?? 0) + 1
											return acc
										},
										{} as Record<string, number>
									)
								).map(([status, count]) => (
									<Badge key={status} variant="secondary" className="flex items-center gap-1">
										{(() => {
											const Icon = statusIcons[status] ?? Circle
											return <Icon className="h-3 w-3" />
										})()}
										{count}
									</Badge>
								))}
							</div>
						</div>
					</div>

					{/* Epics Accordion */}
					<Accordion
						type="multiple"
						value={expandedEpics}
						onValueChange={setExpandedEpics}
						className="space-y-3"
					>
						{epics.map((epic) => {
							const epicStoryList = storiesByEpic.get(epic.id) ?? []
							const stats = epicStats.get(epic.id) ?? {
								totalStories: 0,
								totalPoints: 0,
								doneStories: 0,
							}
							const priority = priorityConfig[epic.priority] ?? DEFAULT_PRIORITY
							const progressPercent =
								stats.totalStories > 0
									? Math.round((stats.doneStories / stats.totalStories) * 100)
									: 0

							return (
								<AccordionItem
									key={epic.id}
									value={epic.id}
									className="overflow-hidden rounded-xl border-0"
									style={{
										background: 'var(--apple-bg)',
										border: '1px solid var(--apple-border-subtle)',
									}}
								>
									<AccordionTrigger className="px-5 py-4 hover:no-underline [&[data-state=open]>svg]:rotate-90">
										<div className="flex w-full items-center gap-4">
											{/* Epic Number Badge */}
											<div
												className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold"
												style={{
													background: 'var(--apple-bg-hover)',
													color: 'var(--apple-text-primary)',
												}}
											>
												E{epic.number}
											</div>

											{/* Epic Info */}
											<div className="flex-1 text-left">
												<div className="flex items-center gap-2">
													<h4
														className="text-base font-semibold"
														style={{ color: 'var(--apple-text-primary)' }}
													>
														{epic.title}
													</h4>
													<Badge className={priority.className} variant="secondary">
														{priority.label}
													</Badge>
												</div>
												<p
													className="mt-0.5 line-clamp-1 text-sm"
													style={{ color: 'var(--apple-text-secondary)' }}
												>
													{epic.description}
												</p>
											</div>

											{/* Epic Stats */}
											<div className="flex shrink-0 items-center gap-4 text-sm">
												<div className="flex items-center gap-1.5">
													<ListChecks
														className="h-4 w-4"
														style={{ color: 'var(--apple-text-tertiary)' }}
													/>
													<span style={{ color: 'var(--apple-text-secondary)' }}>
														{stats.totalStories} stories
													</span>
												</div>
												<div className="flex items-center gap-1.5">
													<Target
														className="h-4 w-4"
														style={{ color: 'var(--apple-text-tertiary)' }}
													/>
													<span style={{ color: 'var(--apple-text-secondary)' }}>
														{stats.totalPoints} pts
													</span>
												</div>
												{progressPercent > 0 && (
													<div
														className="h-1.5 w-16 overflow-hidden rounded-full"
														style={{ background: 'var(--apple-border-subtle)' }}
													>
														<div
															className="h-full rounded-full transition-all"
															style={{
																width: `${progressPercent}%`,
																background:
																	progressPercent === 100 ? '#34C759' : 'var(--apple-text-primary)',
															}}
														/>
													</div>
												)}
											</div>

											<ChevronRight
												className="h-5 w-5 shrink-0 transition-transform duration-200"
												style={{ color: 'var(--apple-text-tertiary)' }}
											/>
										</div>
									</AccordionTrigger>

									<AccordionContent className="px-5 pb-4">
										{epicStoryList.length === 0 ? (
											<div
												className="rounded-lg py-6 text-center"
												style={{ background: 'var(--apple-bg-subtle)' }}
											>
												<p className="text-sm" style={{ color: 'var(--apple-text-tertiary)' }}>
													Nenhuma story definida para este epic
												</p>
											</div>
										) : (
											<div className="space-y-2">
												{epicStoryList.map((story) => {
													const StatusIcon = statusIcons[story.status] ?? Circle

													return (
														<Card
															key={story.id}
															className="cursor-pointer border-0 transition-all hover:shadow-md"
															style={{
																background: 'var(--apple-bg-subtle)',
																border: '1px solid var(--apple-border-subtle)',
															}}
															onClick={() => handleStoryClick(story)}
														>
															<CardContent className="p-4">
																<div className="flex items-start gap-3">
																	{/* Story Key */}
																	<div
																		className="shrink-0 rounded-md px-2 py-1 font-mono text-xs font-medium"
																		style={{
																			background: 'var(--apple-bg-hover)',
																			color: 'var(--apple-text-secondary)',
																		}}
																	>
																		{story.storyKey}
																	</div>

																	{/* Story Content */}
																	<div className="min-w-0 flex-1">
																		<h5
																			className="font-medium"
																			style={{ color: 'var(--apple-text-primary)' }}
																		>
																			{story.title}
																		</h5>
																		{(story.asA || story.iWant) && (
																			<p
																				className="mt-1 line-clamp-2 text-sm"
																				style={{ color: 'var(--apple-text-secondary)' }}
																			>
																				{story.asA && `Como ${story.asA}`}
																				{story.iWant && `, eu quero ${story.iWant}`}
																			</p>
																		)}
																	</div>

																	{/* Story Meta */}
																	<div className="flex shrink-0 items-center gap-2">
																		{story.storyPoints && (
																			<Badge variant="secondary" className="text-xs">
																				{story.storyPoints} pts
																			</Badge>
																		)}
																		<div
																			className="flex items-center gap-1 rounded-md px-2 py-1 text-xs"
																			style={{
																				background: 'var(--apple-bg-hover)',
																				color: 'var(--apple-text-secondary)',
																			}}
																		>
																			<StatusIcon className="h-3 w-3" />
																			<span>{statusLabels[story.status] ?? story.status}</span>
																		</div>
																	</div>
																</div>
															</CardContent>
														</Card>
													)
												})}
											</div>
										)}
									</AccordionContent>
								</AccordionItem>
							)
						})}
					</Accordion>
				</div>
			</ScrollArea>

			{/* Story Edit Sheet */}
			<StoryEditSheet
				story={selectedStory}
				open={sheetOpen}
				onOpenChange={setSheetOpen}
				onUpdate={handleStoryUpdate}
			/>
		</>
	)
}

// Story Edit Sheet Component
interface StoryEditSheetProps {
	story: Story | null
	open: boolean
	onOpenChange: (open: boolean) => void
	onUpdate?: () => void
}

function StoryEditSheet({ story, open, onOpenChange, onUpdate }: StoryEditSheetProps) {
	const [isEditing, setIsEditing] = useState(false)
	const [isSaving, setIsSaving] = useState(false)

	// Edit form state
	const [editTitle, setEditTitle] = useState('')
	const [editStatus, setEditStatus] = useState('')
	const [editPriority, setEditPriority] = useState('')
	const [editStoryPoints, setEditStoryPoints] = useState<number | null>(null)
	const [editTargetSprint, setEditTargetSprint] = useState<number | null>(null)
	const [editAsA, setEditAsA] = useState('')
	const [editIWant, setEditIWant] = useState('')
	const [editSoThat, setEditSoThat] = useState('')

	// Reset form when story changes
	useEffect(() => {
		if (story) {
			setEditTitle(story.title)
			setEditStatus(story.status)
			setEditPriority(story.priority)
			setEditStoryPoints(story.storyPoints)
			setEditTargetSprint(story.targetSprint)
			setEditAsA(story.asA || '')
			setEditIWant(story.iWant || '')
			setEditSoThat(story.soThat || '')
		}
	}, [story])

	// Reset editing mode when sheet closes
	useEffect(() => {
		if (!open) {
			setIsEditing(false)
		}
	}, [open])

	const handleSave = useCallback(async () => {
		if (!story) return

		setIsSaving(true)
		try {
			await api.sm.updateStory(story.id, {
				title: editTitle,
				status: editStatus,
				priority: editPriority,
				storyPoints: editStoryPoints,
				targetSprint: editTargetSprint,
				asA: editAsA || undefined,
				iWant: editIWant || undefined,
				soThat: editSoThat || undefined,
			})
			setIsEditing(false)
			onUpdate?.()
		} catch (_error) {
		} finally {
			setIsSaving(false)
		}
	}, [
		story,
		editTitle,
		editStatus,
		editPriority,
		editStoryPoints,
		editTargetSprint,
		editAsA,
		editIWant,
		editSoThat,
		onUpdate,
	])

	const handleCancel = () => {
		if (story) {
			setEditTitle(story.title)
			setEditStatus(story.status)
			setEditPriority(story.priority)
			setEditStoryPoints(story.storyPoints)
			setEditTargetSprint(story.targetSprint)
			setEditAsA(story.asA || '')
			setEditIWant(story.iWant || '')
			setEditSoThat(story.soThat || '')
		}
		setIsEditing(false)
	}

	if (!story) return null

	const priority = priorityConfig[isEditing ? editPriority : story.priority] ?? DEFAULT_PRIORITY
	const StatusIcon = statusIcons[isEditing ? editStatus : story.status] ?? Circle

	const inputStyle = {
		background: 'var(--apple-bg-hover)',
		border: '1px solid var(--apple-border-subtle)',
		borderRadius: '8px',
		padding: '8px 12px',
		fontSize: '14px',
		color: 'var(--apple-text-primary)',
		width: '100%',
	}

	const selectStyle = {
		...inputStyle,
		cursor: 'pointer',
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="!w-[700px] !max-w-[700px] overflow-hidden p-0"
				style={{ background: 'var(--apple-bg)' }}
			>
				{/* Header */}
				<div className="p-8 pb-6" style={{ borderBottom: '1px solid var(--apple-border-subtle)' }}>
					<div className="flex items-start justify-between gap-6">
						<div className="flex-1">
							{/* Story Key + Priority */}
							<div className="mb-4 flex items-center gap-3">
								<span
									className="font-mono text-[13px] font-medium"
									style={{ color: 'var(--apple-text-tertiary)' }}
								>
									{story.storyKey}
								</span>
								{isEditing ? (
									<select
										value={editPriority}
										onChange={(e) => setEditPriority(e.target.value)}
										style={{ ...selectStyle, width: 'auto', padding: '4px 8px', fontSize: '13px' }}
									>
										{PRIORITIES.map((p) => (
											<option key={p.value} value={p.value}>
												{p.label}
											</option>
										))}
									</select>
								) : (
									<Badge className={priority.className} variant="secondary">
										{priority.label}
									</Badge>
								)}
							</div>

							{/* Title */}
							{isEditing ? (
								<input
									type="text"
									value={editTitle}
									onChange={(e) => setEditTitle(e.target.value)}
									style={{ ...inputStyle, fontSize: '20px', fontWeight: 600 }}
									placeholder="Titulo da story"
								/>
							) : (
								<h2
									className="text-[24px] font-semibold leading-tight"
									style={{
										color: 'var(--apple-text-primary)',
										letterSpacing: '-0.02em',
									}}
								>
									{story.title}
								</h2>
							)}
						</div>

						{/* Close button */}
						<button type="button" onClick={() => onOpenChange(false)} className="apple-icon-btn">
							<X className="h-5 w-5" />
						</button>
					</div>

					{/* Meta badges */}
					<div className="mt-6 flex flex-wrap items-center gap-3">
						{isEditing ? (
							<>
								<select
									value={editStatus}
									onChange={(e) => setEditStatus(e.target.value)}
									style={{ ...selectStyle, width: 'auto' }}
								>
									{STATUSES.map((s) => (
										<option key={s.value} value={s.value}>
											{s.label}
										</option>
									))}
								</select>

								<div className="flex items-center gap-2">
									<Target className="h-4 w-4" style={{ color: 'var(--apple-text-secondary)' }} />
									<input
										type="number"
										value={editStoryPoints ?? ''}
										onChange={(e) =>
											setEditStoryPoints(e.target.value ? Number(e.target.value) : null)
										}
										placeholder="Pts"
										style={{ ...inputStyle, width: '70px', padding: '4px 8px' }}
									/>
								</div>

								<div className="flex items-center gap-2">
									<Calendar className="h-4 w-4" style={{ color: 'var(--apple-text-secondary)' }} />
									<input
										type="number"
										value={editTargetSprint ?? ''}
										onChange={(e) =>
											setEditTargetSprint(e.target.value ? Number(e.target.value) : null)
										}
										placeholder="Sprint"
										style={{ ...inputStyle, width: '80px', padding: '4px 8px' }}
									/>
								</div>
							</>
						) : (
							<>
								<div className="apple-badge flex items-center gap-2">
									<StatusIcon className="h-4 w-4" />
									<span>{statusLabels[story.status] ?? 'Backlog'}</span>
								</div>

								{story.storyPoints && (
									<div className="apple-badge flex items-center gap-2">
										<Target className="h-4 w-4" />
										<span>{story.storyPoints} pontos</span>
									</div>
								)}

								{story.targetSprint && (
									<div className="apple-badge flex items-center gap-2">
										<Calendar className="h-4 w-4" />
										<span>Sprint {story.targetSprint}</span>
									</div>
								)}
							</>
						)}
					</div>
				</div>

				{/* Content */}
				<div className="apple-scrollbar flex-1 overflow-y-auto p-8">
					{/* User Story */}
					<div className="mb-8">
						<h3
							className="mb-6 text-[12px] font-semibold uppercase tracking-wide"
							style={{ color: 'var(--apple-text-tertiary)' }}
						>
							User Story
						</h3>

						<div className="space-y-6">
							{/* Como */}
							<div>
								<span
									className="mb-2 block text-[11px] font-semibold uppercase tracking-wide"
									style={{ color: 'var(--apple-text-tertiary)' }}
								>
									Como
								</span>
								{isEditing ? (
									<input
										type="text"
										value={editAsA}
										onChange={(e) => setEditAsA(e.target.value)}
										style={inputStyle}
										placeholder="usuario, administrador, etc."
									/>
								) : (
									<p
										className="text-[15px] leading-relaxed"
										style={{ color: 'var(--apple-text-primary)' }}
									>
										{story.asA || 'usuario'}
									</p>
								)}
							</div>

							{/* Eu quero */}
							<div>
								<span
									className="mb-2 block text-[11px] font-semibold uppercase tracking-wide"
									style={{ color: 'var(--apple-text-tertiary)' }}
								>
									Eu quero
								</span>
								{isEditing ? (
									<textarea
										value={editIWant}
										onChange={(e) => setEditIWant(e.target.value)}
										style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
										placeholder="O que o usuario quer fazer"
									/>
								) : (
									<p
										className="text-[15px] leading-relaxed"
										style={{ color: 'var(--apple-text-primary)' }}
									>
										{story.iWant || '-'}
									</p>
								)}
							</div>

							{/* Para que */}
							<div>
								<span
									className="mb-2 block text-[11px] font-semibold uppercase tracking-wide"
									style={{ color: 'var(--apple-text-tertiary)' }}
								>
									Para que
								</span>
								{isEditing ? (
									<textarea
										value={editSoThat}
										onChange={(e) => setEditSoThat(e.target.value)}
										style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
										placeholder="O beneficio ou resultado esperado"
									/>
								) : (
									<p
										className="text-[15px] leading-relaxed"
										style={{ color: 'var(--apple-text-primary)' }}
									>
										{story.soThat || '-'}
									</p>
								)}
							</div>
						</div>
					</div>

					{/* Divider */}
					<div className="mb-8 h-px w-full" style={{ background: 'var(--apple-border-subtle)' }} />

					{/* Metadata Grid */}
					<div className="grid grid-cols-2 gap-6">
						<div>
							<span
								className="mb-2 block text-[11px] font-semibold uppercase tracking-wide"
								style={{ color: 'var(--apple-text-tertiary)' }}
							>
								Epic
							</span>
							<p
								className="font-mono text-[20px] font-bold"
								style={{ color: 'var(--apple-text-primary)' }}
							>
								E{story.epicNumber ?? story.storyKey?.split('-')[0] ?? '?'}
							</p>
						</div>

						<div>
							<span
								className="mb-2 block text-[11px] font-semibold uppercase tracking-wide"
								style={{ color: 'var(--apple-text-tertiary)' }}
							>
								Story Number
							</span>
							<p
								className="font-mono text-[20px] font-bold"
								style={{ color: 'var(--apple-text-primary)' }}
							>
								#{story.storyNumber ?? story.storyKey?.split('-')[1] ?? '?'}
							</p>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div
					className="flex gap-3 p-6"
					style={{ borderTop: '1px solid var(--apple-border-subtle)' }}
				>
					{isEditing ? (
						<>
							<Button
								variant="outline"
								onClick={handleCancel}
								disabled={isSaving}
								className="flex-1"
							>
								Cancelar
							</Button>
							<Button onClick={handleSave} disabled={isSaving} className="flex-1 gap-2">
								{isSaving ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin" />
										Salvando...
									</>
								) : (
									<>
										<Save className="h-4 w-4" />
										Salvar
									</>
								)}
							</Button>
						</>
					) : (
						<>
							<Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
								Fechar
							</Button>
							<Button onClick={() => setIsEditing(true)} className="flex-1 gap-2">
								<Pencil className="h-4 w-4" />
								Editar Story
							</Button>
						</>
					)}
				</div>
			</SheetContent>
		</Sheet>
	)
}
