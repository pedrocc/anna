import { Badge } from '@repo/ui'
import { AlertTriangle, ArrowDown, ArrowUp, Flame } from 'lucide-react'

type Priority = 'critical' | 'high' | 'medium' | 'low'

interface PriorityIndicatorProps {
	priority: Priority
	showLabel?: boolean
	size?: 'sm' | 'md'
}

const priorityConfig: Record<
	Priority,
	{
		label: string
		icon: typeof Flame
		badge: string
		glow: string
		animate: string
	}
> = {
	critical: {
		label: 'Critico',
		icon: Flame,
		badge: 'bg-red-500/25 text-red-300 border-red-500/50 shadow-red-500/30',
		glow: 'shadow-lg shadow-red-500/20',
		animate: 'animate-pulse',
	},
	high: {
		label: 'Alta',
		icon: ArrowUp,
		badge: 'bg-orange-500/25 text-orange-300 border-orange-500/50',
		glow: '',
		animate: '',
	},
	medium: {
		label: 'Media',
		icon: AlertTriangle,
		badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
		glow: '',
		animate: '',
	},
	low: {
		label: 'Baixa',
		icon: ArrowDown,
		badge: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
		glow: '',
		animate: '',
	},
}

export function PriorityIndicator({
	priority,
	showLabel = true,
	size = 'sm',
}: PriorityIndicatorProps) {
	const config = priorityConfig[priority]
	const Icon = config.icon

	const sizeClasses = size === 'sm' ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs'

	const iconSize = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'

	return (
		<Badge
			variant="outline"
			className={`
				${config.badge}
				${config.glow}
				${sizeClasses}
				font-medium
				border
				flex items-center gap-1
				transition-all duration-200
			`}
		>
			<Icon className={`${iconSize} ${config.animate}`} strokeWidth={2.5} />
			{showLabel && <span>{config.label}</span>}
		</Badge>
	)
}

export function getPriorityBorderColor(priority: Priority): string {
	const colors: Record<Priority, string> = {
		critical: 'border-l-red-500',
		high: 'border-l-orange-500',
		medium: 'border-l-yellow-500',
		low: 'border-l-slate-500',
	}
	return colors[priority]
}

export function getPriorityGlow(priority: Priority): string {
	const glows: Record<Priority, string> = {
		critical: 'shadow-red-500/20',
		high: 'shadow-orange-500/10',
		medium: '',
		low: '',
	}
	return glows[priority]
}
