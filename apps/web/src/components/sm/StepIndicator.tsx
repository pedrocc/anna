import type { SmStep } from '@repo/shared'
import { cn } from '@repo/ui'
import {
	Check,
	CheckCircle,
	ClipboardList,
	FileText,
	LayoutList,
	ListChecks,
	PlayCircle,
	Rocket,
} from 'lucide-react'

interface StepIndicatorProps {
	currentStep: SmStep
	stepsCompleted: SmStep[]
	hasDocument?: boolean
}

const steps: Array<{
	id: SmStep
	label: string
	shortLabel: string
	icon: typeof Rocket
}> = [
	{ id: 'init', label: 'Inicio', shortLabel: 'Init', icon: Rocket },
	{ id: 'epics', label: 'Epics', shortLabel: 'Epic', icon: LayoutList },
	{ id: 'stories', label: 'Stories', shortLabel: 'Story', icon: FileText },
	{ id: 'details', label: 'Detalhes', shortLabel: 'Det', icon: ListChecks },
	{ id: 'planning', label: 'Planning', shortLabel: 'Plan', icon: ClipboardList },
	{ id: 'review', label: 'Review', shortLabel: 'Rev', icon: PlayCircle },
	{ id: 'complete', label: 'Fim', shortLabel: 'Fim', icon: CheckCircle },
]

const stepOrder: SmStep[] = [
	'init',
	'epics',
	'stories',
	'details',
	'planning',
	'review',
	'complete',
]

export function StepIndicator({ currentStep, stepsCompleted, hasDocument }: StepIndicatorProps) {
	const currentIndex = stepOrder.indexOf(currentStep)

	return (
		<div className="flex items-center justify-center gap-0.5 overflow-x-auto">
			{steps.map((step, index) => {
				const isCompleted =
					stepsCompleted.includes(step.id) || (step.id === 'complete' && hasDocument)
				const isCurrent = step.id === currentStep && !(step.id === 'complete' && hasDocument)
				const Icon = step.icon

				return (
					<div key={step.id} className="flex items-center">
						{/* Step pill */}
						<div
							className={cn(
								'flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-all duration-200',
								isCompleted && 'bg-primary/15 text-primary',
								isCurrent && 'bg-primary text-primary-foreground shadow-sm shadow-primary/25',
								!isCompleted && !isCurrent && 'text-muted-foreground/60'
							)}
							title={step.label}
						>
							<div
								className={cn(
									'flex h-4 w-4 items-center justify-center rounded-full transition-colors',
									isCompleted && 'bg-primary/20',
									isCurrent && 'bg-primary-foreground/20',
									!isCompleted && !isCurrent && 'bg-muted-foreground/10'
								)}
							>
								{isCompleted ? <Check className="h-2.5 w-2.5" /> : <Icon className="h-2.5 w-2.5" />}
							</div>
							<span className="hidden xl:inline">{step.shortLabel}</span>
						</div>

						{/* Connector */}
						{index < steps.length - 1 && (
							<div
								className={cn(
									'mx-0.5 h-px w-1.5 transition-colors lg:w-2',
									index < currentIndex || stepsCompleted.includes(step.id)
										? 'bg-primary/50'
										: 'bg-border'
								)}
							/>
						)}
					</div>
				)
			})}
		</div>
	)
}
