import type { PrdStep } from '@repo/shared'
import { cn } from '@repo/ui'
import {
	Check,
	CheckCircle,
	Code,
	Compass,
	FileText,
	Lightbulb,
	ListChecks,
	Rocket,
	Scale,
	Shield,
	Target,
	Users,
} from 'lucide-react'

interface StepIndicatorProps {
	currentStep: PrdStep
	stepsCompleted: PrdStep[]
	hasDocument?: boolean
}

const steps: Array<{
	id: PrdStep
	label: string
	shortLabel: string
	icon: typeof Rocket
	optional?: boolean
}> = [
	{ id: 'init', label: 'Inicio', shortLabel: 'Init', icon: Rocket },
	{ id: 'discovery', label: 'Descoberta', shortLabel: 'Disc', icon: Compass },
	{ id: 'success', label: 'Sucesso', shortLabel: 'Suc', icon: Target },
	{ id: 'journeys', label: 'Jornadas', shortLabel: 'Jorn', icon: Users },
	{ id: 'domain', label: 'Dominio', shortLabel: 'Dom', icon: Shield, optional: true },
	{ id: 'innovation', label: 'Inovacao', shortLabel: 'Inov', icon: Lightbulb, optional: true },
	{ id: 'project_type', label: 'Tipo', shortLabel: 'Tipo', icon: Code },
	{ id: 'scoping', label: 'Escopo', shortLabel: 'Esc', icon: Scale },
	{ id: 'functional', label: 'FR', shortLabel: 'FR', icon: ListChecks },
	{ id: 'nonfunctional', label: 'NFR', shortLabel: 'NFR', icon: FileText },
	{ id: 'complete', label: 'Fim', shortLabel: 'Fim', icon: CheckCircle },
]

const stepOrder: PrdStep[] = [
	'init',
	'discovery',
	'success',
	'journeys',
	'domain',
	'innovation',
	'project_type',
	'scoping',
	'functional',
	'nonfunctional',
	'complete',
]

export function StepIndicator({ currentStep, stepsCompleted, hasDocument }: StepIndicatorProps) {
	const currentIndex = stepOrder.indexOf(currentStep)

	return (
		<div className="flex items-center justify-center gap-0.5 overflow-x-auto">
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
								'flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-all duration-200',
								isCompleted && 'bg-primary/15 text-primary',
								isCurrent && 'bg-primary text-primary-foreground shadow-sm shadow-primary/25',
								!isCompleted && !isCurrent && 'text-muted-foreground/60',
								step.optional && !isCompleted && !isCurrent && 'opacity-60'
							)}
							title={step.label + (step.optional ? ' (opcional)' : '')}
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
