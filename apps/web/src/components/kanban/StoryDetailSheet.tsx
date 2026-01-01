import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@repo/ui'
import {
	Calendar,
	CheckCircle2,
	Circle,
	Clock,
	Eye,
	Loader2,
	Pencil,
	Save,
	Target,
	X,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api, type KanbanStory } from '@/lib/api-client'

interface StoryDetailSheetProps {
	story: KanbanStory | null
	open: boolean
	onOpenChange: (open: boolean) => void
	onUpdate?: () => void
}

const priorityConfig: Record<string, { label: string; class: string }> = {
	critical: { label: 'Crítico', class: 'apple-priority-critical' },
	high: { label: 'Alta', class: 'apple-priority-high' },
	medium: { label: 'Média', class: 'apple-priority-medium' },
	low: { label: 'Baixa', class: 'apple-priority-low' },
}

const statusConfig: Record<string, { label: string; icon: typeof Circle }> = {
	backlog: { label: 'Backlog', icon: Circle },
	ready_for_dev: { label: 'A Fazer', icon: Circle },
	in_progress: { label: 'Em Progresso', icon: Clock },
	review: { label: 'Em Revisão', icon: Eye },
	done: { label: 'Concluído', icon: CheckCircle2 },
}

const STATUSES = [
	{ value: 'backlog', label: 'Backlog' },
	{ value: 'ready_for_dev', label: 'A Fazer' },
	{ value: 'in_progress', label: 'Em Progresso' },
	{ value: 'review', label: 'Em Revisão' },
	{ value: 'done', label: 'Concluído' },
]

const PRIORITIES = [
	{ value: 'critical', label: 'Crítico' },
	{ value: 'high', label: 'Alta' },
	{ value: 'medium', label: 'Média' },
	{ value: 'low', label: 'Baixa' },
]

export function StoryDetailSheet({ story, open, onOpenChange, onUpdate }: StoryDetailSheetProps) {
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

	const priority =
		priorityConfig[isEditing ? editPriority : story.priority] ?? priorityConfig['medium']
	const status = statusConfig[isEditing ? editStatus : story.status] ?? statusConfig['backlog']
	const StatusIcon = status?.icon ?? Circle

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
				className="!w-[700px] !max-w-[700px] p-0 overflow-hidden"
				style={{ background: 'var(--apple-bg)' }}
			>
				<SheetTitle className="sr-only">{story.title}</SheetTitle>
				<SheetDescription className="sr-only">Detalhes da story {story.storyKey}</SheetDescription>

				{/* Header */}
				<div className="p-8 pb-6" style={{ borderBottom: '1px solid var(--apple-border-subtle)' }}>
					<div className="flex items-start justify-between gap-6">
						<div className="flex-1">
							{/* Story Key + Priority */}
							<div className="flex items-center gap-3 mb-4">
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
									<div className="flex items-center gap-2">
										<span
											className={`apple-priority-dot ${priority?.class ?? 'apple-priority-medium'}`}
										/>
										<span
											className="text-[13px] font-medium"
											style={{ color: 'var(--apple-text-secondary)' }}
										>
											{priority?.label ?? 'Média'}
										</span>
									</div>
								)}
							</div>

							{/* Title */}
							{isEditing ? (
								<input
									type="text"
									value={editTitle}
									onChange={(e) => setEditTitle(e.target.value)}
									style={{ ...inputStyle, fontSize: '20px', fontWeight: 600 }}
									placeholder="Título da story"
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
					<div className="flex flex-wrap items-center gap-3 mt-6">
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
									<span>{status?.label ?? 'Backlog'}</span>
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
				<div className="flex-1 overflow-y-auto p-8 apple-scrollbar">
					{/* User Story */}
					<div className="mb-8">
						<h3
							className="text-[12px] font-semibold uppercase tracking-wide mb-6"
							style={{ color: 'var(--apple-text-tertiary)' }}
						>
							User Story
						</h3>

						<div className="space-y-6">
							{/* Como */}
							<div>
								<span
									className="text-[11px] font-semibold uppercase tracking-wide block mb-2"
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
										placeholder="usuário, administrador, etc."
									/>
								) : (
									<p
										className="text-[15px] leading-relaxed"
										style={{ color: 'var(--apple-text-primary)' }}
									>
										{story.asA || 'usuário'}
									</p>
								)}
							</div>

							{/* Eu quero */}
							<div>
								<span
									className="text-[11px] font-semibold uppercase tracking-wide block mb-2"
									style={{ color: 'var(--apple-text-tertiary)' }}
								>
									Eu quero
								</span>
								{isEditing ? (
									<textarea
										value={editIWant}
										onChange={(e) => setEditIWant(e.target.value)}
										style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
										placeholder="O que o usuário quer fazer"
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
									className="text-[11px] font-semibold uppercase tracking-wide block mb-2"
									style={{ color: 'var(--apple-text-tertiary)' }}
								>
									Para que
								</span>
								{isEditing ? (
									<textarea
										value={editSoThat}
										onChange={(e) => setEditSoThat(e.target.value)}
										style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
										placeholder="O benefício ou resultado esperado"
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
					<div className="h-px w-full mb-8" style={{ background: 'var(--apple-border-subtle)' }} />

					{/* Metadata Grid */}
					<div className="grid grid-cols-2 gap-6">
						<div>
							<span
								className="text-[11px] font-semibold uppercase tracking-wide block mb-2"
								style={{ color: 'var(--apple-text-tertiary)' }}
							>
								Epic
							</span>
							<p
								className="font-mono text-[20px] font-bold"
								style={{ color: 'var(--apple-text-primary)' }}
							>
								E{story.epicNumber}
							</p>
						</div>

						<div>
							<span
								className="text-[11px] font-semibold uppercase tracking-wide block mb-2"
								style={{ color: 'var(--apple-text-tertiary)' }}
							>
								Story Number
							</span>
							<p
								className="font-mono text-[20px] font-bold"
								style={{ color: 'var(--apple-text-primary)' }}
							>
								#{story.storyNumber}
							</p>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div
					className="p-6 flex gap-3"
					style={{ borderTop: '1px solid var(--apple-border-subtle)' }}
				>
					{isEditing ? (
						<>
							<button
								type="button"
								onClick={handleCancel}
								disabled={isSaving}
								className="apple-filter-pill flex-1 justify-center"
							>
								Cancelar
							</button>
							<button
								type="button"
								onClick={handleSave}
								disabled={isSaving}
								className="apple-filter-pill apple-filter-pill-active flex-1 justify-center gap-2"
							>
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
							</button>
						</>
					) : (
						<>
							<button
								type="button"
								onClick={() => onOpenChange(false)}
								className="apple-filter-pill flex-1 justify-center"
							>
								Fechar
							</button>
							<button
								type="button"
								onClick={() => setIsEditing(true)}
								className="apple-filter-pill apple-filter-pill-active flex-1 justify-center gap-2"
							>
								<Pencil className="h-4 w-4" />
								Editar Story
							</button>
						</>
					)}
				</div>
			</SheetContent>
		</Sheet>
	)
}
