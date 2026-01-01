import { Badge } from '@repo/ui'
import { Archive, CheckCircle2, CircleDashed, Clock, Eye, type LucideIcon } from 'lucide-react'

type StoryStatus = 'backlog' | 'ready_for_dev' | 'in_progress' | 'review' | 'done'

interface ColumnHeaderProps {
	status: StoryStatus
	label: string
	count: number
}

const statusConfig: Record<
	StoryStatus,
	{
		icon: LucideIcon
		gradient: string
		border: string
		text: string
		badge: string
		glow: string
	}
> = {
	backlog: {
		icon: Archive,
		gradient: 'from-slate-500/10 via-slate-500/5 to-transparent',
		border: 'border-b-slate-500',
		text: 'text-slate-400',
		badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
		glow: '',
	},
	ready_for_dev: {
		icon: CircleDashed,
		gradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
		border: 'border-b-blue-500',
		text: 'text-blue-400',
		badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
		glow: 'shadow-blue-500/10',
	},
	in_progress: {
		icon: Clock,
		gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
		border: 'border-b-amber-500',
		text: 'text-amber-400',
		badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
		glow: 'shadow-amber-500/10',
	},
	review: {
		icon: Eye,
		gradient: 'from-violet-500/10 via-violet-500/5 to-transparent',
		border: 'border-b-violet-500',
		text: 'text-violet-400',
		badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
		glow: 'shadow-violet-500/10',
	},
	done: {
		icon: CheckCircle2,
		gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
		border: 'border-b-emerald-500',
		text: 'text-emerald-400',
		badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
		glow: 'shadow-emerald-500/10',
	},
}

export function ColumnHeader({ status, label, count }: ColumnHeaderProps) {
	const config = statusConfig[status]
	const Icon = config.icon

	return (
		<div
			className={`
				sticky top-0 z-10
				flex items-center justify-between gap-3
				px-4 py-3
				bg-gradient-to-b ${config.gradient}
				backdrop-blur-xl
				border-b-2 ${config.border}
				transition-all duration-300
			`}
		>
			<div className="flex items-center gap-2.5">
				<div
					className={`
						flex h-7 w-7 items-center justify-center
						rounded-lg
						bg-white/5 ring-1 ring-white/10
						${config.text}
						transition-transform duration-200
						group-hover:scale-110
					`}
				>
					<Icon className="h-4 w-4" strokeWidth={2} />
				</div>
				<span className={`text-sm font-semibold tracking-tight ${config.text}`}>{label}</span>
			</div>

			<Badge
				variant="outline"
				className={`
					${config.badge}
					font-mono text-xs font-bold tabular-nums
					px-2 py-0.5
					border
					shadow-sm ${config.glow}
				`}
			>
				{count}
			</Badge>
		</div>
	)
}
