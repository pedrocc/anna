import { Target, Zap } from 'lucide-react'
import type { KanbanStory } from '@/lib/api-client'
import { getPriorityBorderColor, PriorityIndicator } from './PriorityIndicator'

interface CardDragOverlayProps {
	story: KanbanStory
}

export function CardDragOverlay({ story }: CardDragOverlayProps) {
	const priorityBorder = getPriorityBorderColor(story.priority)

	return (
		<div
			className={`
				pointer-events-none
				w-[280px]
				rotate-3 scale-105
				rounded-xl
				border-l-4 ${priorityBorder}
				bg-gradient-to-br from-white/[0.12] via-white/[0.06] to-black/20
				border border-primary/30
				backdrop-blur-md
				p-3.5
				shadow-2xl shadow-black/50
				ring-2 ring-primary/50
			`}
		>
			{/* Animated gradient border */}
			<div
				className={`
					pointer-events-none absolute -inset-px rounded-xl
					bg-gradient-to-r from-primary/40 via-primary/20 to-primary/40
					animate-pulse
					opacity-60
				`}
			/>

			{/* Noise texture */}
			<div
				className="pointer-events-none absolute inset-0 rounded-xl opacity-[0.02]"
				style={{
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
				}}
			/>

			{/* Header Row */}
			<div className="relative mb-2.5 flex items-start justify-between gap-2">
				<div className="flex items-center gap-1.5">
					<span
						className={`
							font-mono text-[11px] font-bold tracking-tight
							${story.priority === 'critical' ? 'text-red-400' : 'text-primary'}
						`}
					>
						{story.storyKey}
					</span>
					{story.priority === 'critical' && (
						<Zap className="h-3 w-3 animate-pulse text-red-400" fill="currentColor" />
					)}
				</div>
				<PriorityIndicator priority={story.priority} size="sm" />
			</div>

			{/* Title */}
			<h4 className="relative mb-3 line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
				{story.title}
			</h4>

			{/* Footer Row */}
			<div className="relative flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					{story.storyPoints ? (
						<div
							className={`
								flex items-center gap-1
								rounded-md
								bg-white/10 px-1.5 py-0.5
								ring-1 ring-white/20
							`}
						>
							<Target className="h-3 w-3 text-primary" />
							<span className="font-mono text-[11px] font-semibold text-white/80">
								{story.storyPoints}
							</span>
						</div>
					) : null}
				</div>

				{story.targetSprint && (
					<span className="font-mono text-[10px] font-medium text-white/60">
						S{story.targetSprint}
					</span>
				)}
			</div>

			{/* Floating glow effect */}
			<div
				className={`
					pointer-events-none absolute -inset-4 -z-10
					rounded-2xl
					bg-primary/10
					blur-xl
				`}
			/>
		</div>
	)
}
