import type { BrainstormStep } from '@repo/shared'
import { cn } from '@repo/ui'
import { Check, FileText, Lightbulb, MessageSquare, Settings } from 'lucide-react'

interface StepIndicatorProps {
	currentStep: BrainstormStep
	hasDocument?: boolean
}

const steps: Array<{
	id: BrainstormStep
	label: string
	icon: typeof Settings
}> = [
	{ id: 'setup', label: 'Setup', icon: Settings },
	{ id: 'technique', label: 'Técnicas', icon: Lightbulb },
	{ id: 'execution', label: 'Execução', icon: MessageSquare },
	{ id: 'document', label: 'Documento', icon: FileText },
]

const stepOrder = ['setup', 'technique', 'execution', 'document'] as const

export function StepIndicator({ currentStep, hasDocument }: StepIndicatorProps) {
	const currentIndex = stepOrder.indexOf(currentStep)

	return (
		<div className="flex items-center justify-center gap-1">
			{steps.map((step, index) => {
				// Document step is completed when document exists
				const isCompleted = index < currentIndex || (step.id === 'document' && hasDocument)
				const isCurrent = step.id === currentStep && !(step.id === 'document' && hasDocument)
				const Icon = step.icon

				return (
					<div key={step.id} className="flex items-center">
						{/* Step pill */}
						<div
							className={cn(
								'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200',
								isCompleted && 'bg-primary/15 text-primary',
								isCurrent && 'bg-primary text-primary-foreground shadow-sm shadow-primary/25',
								!isCompleted && !isCurrent && 'text-muted-foreground/60'
							)}
						>
							<div
								className={cn(
									'flex h-6 w-6 items-center justify-center rounded-full transition-colors',
									isCompleted && 'bg-primary/20',
									isCurrent && 'bg-primary-foreground/20',
									!isCompleted && !isCurrent && 'bg-muted-foreground/10'
								)}
							>
								{isCompleted ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
							</div>
							<span className="hidden sm:inline">{step.label}</span>
						</div>

						{/* Connector */}
						{index < steps.length - 1 && (
							<div
								className={cn(
									'mx-2 h-px w-6 transition-colors',
									index < currentIndex ? 'bg-primary/50' : 'bg-border'
								)}
							/>
						)}
					</div>
				)
			})}
		</div>
	)
}
