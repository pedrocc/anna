import { Archive, CheckCircle2, CircleDashed, Clock, Eye, type LucideIcon } from 'lucide-react'

type StoryStatus = 'backlog' | 'ready_for_dev' | 'in_progress' | 'review' | 'done'

interface EmptyColumnProps {
	status: StoryStatus
}

const statusConfig: Record<
	StoryStatus,
	{
		icon: LucideIcon
		title: string
		description: string
		color: string
	}
> = {
	backlog: {
		icon: Archive,
		title: 'Backlog vazio',
		description: 'Nenhuma story aguardando',
		color: 'text-slate-500',
	},
	ready_for_dev: {
		icon: CircleDashed,
		title: 'Pronto para dev',
		description: 'Mova stories do backlog',
		color: 'text-blue-500',
	},
	in_progress: {
		icon: Clock,
		title: 'Nada em progresso',
		description: 'Comece uma nova story',
		color: 'text-amber-500',
	},
	review: {
		icon: Eye,
		title: 'Sem reviews',
		description: 'Tudo revisado',
		color: 'text-violet-500',
	},
	done: {
		icon: CheckCircle2,
		title: 'Nada concluido',
		description: 'Complete sua primeira story',
		color: 'text-emerald-500',
	},
}

export function EmptyColumn({ status }: EmptyColumnProps) {
	const config = statusConfig[status]
	const Icon = config.icon

	return (
		<div
			className={`
				flex flex-col items-center justify-center
				py-12 px-4
				animate-fade-in
			`}
		>
			{/* Icon with animated border */}
			<div
				className={`
					relative
					flex h-14 w-14 items-center justify-center
					rounded-xl
					bg-white/[0.03]
					ring-1 ring-white/[0.06]
					mb-4
				`}
			>
				{/* Animated dashed border */}
				<div
					className={`
						absolute inset-0 rounded-xl
						border-2 border-dashed ${config.color}/30
						animate-spin-slow
					`}
					style={{ animationDuration: '20s' }}
				/>
				<Icon className={`h-6 w-6 ${config.color}/60`} strokeWidth={1.5} />
			</div>

			{/* Text */}
			<p className="text-sm font-medium text-foreground/50">{config.title}</p>
			<p className="mt-1 text-xs text-muted-foreground/50">{config.description}</p>
		</div>
	)
}
