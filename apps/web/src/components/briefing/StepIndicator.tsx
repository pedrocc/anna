import type { BriefingStep } from '@repo/shared'
import { cn } from '@repo/ui'
import { Check, CheckCircle, Eye, FileText, Rocket, Target, Users } from 'lucide-react'

interface StepIndicatorProps {
	currentStep: BriefingStep
	stepsCompleted: BriefingStep[]
	hasDocument?: boolean
}

const steps: Array<{
	id: BriefingStep
	label: string
	icon: typeof Eye
}> = [
	{ id: 'init', label: 'Inicio', icon: Rocket },
	{ id: 'vision', label: 'Visao', icon: Eye },
	{ id: 'users', label: 'Usuarios', icon: Users },
	{ id: 'metrics', label: 'Metricas', icon: Target },
	{ id: 'scope', label: 'Escopo', icon: FileText },
	{ id: 'complete', label: 'Concluir', icon: CheckCircle },
]

const stepOrder: BriefingStep[] = ['init', 'vision', 'users', 'metrics', 'scope', 'complete']

export function StepIndicator({ currentStep, stepsCompleted, hasDocument }: StepIndicatorProps) {
	const currentIndex = stepOrder.indexOf(currentStep)

	return (
		<div className="flex items-center justify-center gap-0.5">
			{steps.map((step, index) => {
				// Step is completed if it's in stepsCompleted array or if complete step has document
				const isCompleted =
					stepsCompleted.includes(step.id) || (step.id === 'complete' && hasDocument)
				const isCurrent = step.id === currentStep && !(step.id === 'complete' && hasDocument)
				const Icon = step.icon

				return (
					<div key={step.id} className="flex items-center">
						{/* Step pill */}
						<div
							className={cn(
								'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200',
								isCompleted && 'bg-primary/15 text-primary',
								isCurrent && 'bg-primary text-primary-foreground shadow-sm shadow-primary/25',
								!isCompleted && !isCurrent && 'text-muted-foreground/60'
							)}
						>
							<div
								className={cn(
									'flex h-5 w-5 items-center justify-center rounded-full transition-colors',
									isCompleted && 'bg-primary/20',
									isCurrent && 'bg-primary-foreground/20',
									!isCompleted && !isCurrent && 'bg-muted-foreground/10'
								)}
							>
								{isCompleted ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
							</div>
							<span className="hidden lg:inline">{step.label}</span>
						</div>

						{/* Connector */}
						{index < steps.length - 1 && (
							<div
								className={cn(
									'mx-1 h-px w-3 transition-colors lg:w-4',
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
