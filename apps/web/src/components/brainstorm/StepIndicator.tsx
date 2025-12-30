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
	{ id: 'technique', label: 'Tecnicas', icon: Lightbulb },
	{ id: 'execution', label: 'Execucao', icon: MessageSquare },
	{ id: 'document', label: 'Documento', icon: FileText },
]

const stepOrder = ['setup', 'technique', 'execution', 'document'] as const

export function StepIndicator({ currentStep, hasDocument }: StepIndicatorProps) {
	const currentIndex = stepOrder.indexOf(currentStep)

	return (
		<div className="flex items-center justify-between">
			{steps.map((step, index) => {
				// Document step is completed when document exists
				const isCompleted =
					index < currentIndex || (step.id === 'document' && hasDocument)
				const isCurrent = step.id === currentStep && !(step.id === 'document' && hasDocument)
				const Icon = step.icon

				return (
					<div key={step.id} className="flex flex-1 items-center">
						{/* Step circle */}
						<div
							className={cn(
								'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
								isCompleted && 'border-primary bg-primary text-primary-foreground',
								isCurrent && 'border-primary bg-background text-primary',
								!isCompleted &&
									!isCurrent &&
									'border-muted-foreground/30 bg-background text-muted-foreground/50'
							)}
						>
							{isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
						</div>

						{/* Step label */}
						<span
							className={cn(
								'ml-2 text-sm font-medium',
								isCurrent && 'text-primary',
								!isCurrent && 'text-muted-foreground'
							)}
						>
							{step.label}
						</span>

						{/* Connector line */}
						{index < steps.length - 1 && (
							<div
								className={cn(
									'mx-4 h-0.5 flex-1',
									index < currentIndex ? 'bg-primary' : 'bg-muted-foreground/30'
								)}
							/>
						)}
					</div>
				)
			})}
		</div>
	)
}
