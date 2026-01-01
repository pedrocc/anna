import { Button, ScrollArea } from '@repo/ui'
import {
	ArrowRight,
	ClipboardList,
	FileText,
	FolderKanban,
	Kanban,
	Rocket,
	Target,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { Link } from 'wouter'

// ============================================================================
// Types
// ============================================================================

interface JourneyStep {
	icon: ComponentType<{ className?: string }>
	label: string
	description: string
	href: string
}

// ============================================================================
// Data
// ============================================================================

const journeySteps: JourneyStep[] = [
	{
		icon: FileText,
		label: 'Briefing',
		description: 'Defina o escopo',
		href: '/briefing',
	},
	{
		icon: FolderKanban,
		label: 'PRD',
		description: 'Documente requisitos',
		href: '/pm',
	},
	{
		icon: ClipboardList,
		label: 'Planejamento',
		description: 'Crie user stories',
		href: '/requisitos',
	},
	{
		icon: Kanban,
		label: 'Kanban',
		description: 'Execute sprints',
		href: '/kanban',
	},
]

// ============================================================================
// Components
// ============================================================================

function JourneyTimeline({ steps }: { steps: JourneyStep[] }) {
	return (
		<div className="relative mt-6">
			{/* Connection line */}
			<div className="absolute left-5 top-5 h-[calc(100%-40px)] w-px bg-border" />

			<div className="space-y-3">
				{steps.map((step, index) => {
					const Icon = step.icon
					const isLast = index === steps.length - 1

					return (
						<div key={step.label} className="relative flex items-center gap-4">
							{/* Step node */}
							<div
								className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
									isLast
										? 'bg-primary text-primary-foreground'
										: 'border border-border bg-white text-muted-foreground'
								}`}
							>
								<Icon className="h-4 w-4" />
							</div>

							{/* Content */}
							<div className="flex-1">
								<div className="flex items-center gap-2">
									<span className="font-medium text-foreground">{step.label}</span>
									{isLast && <Rocket className="h-3 w-3 text-primary" />}
								</div>
								<span className="text-sm text-muted-foreground">{step.description}</span>
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}

// ============================================================================
// Main Component
// ============================================================================

export function InicioPage() {
	return (
		<ScrollArea className="h-[calc(100vh-4rem)]">
			<div className="flex min-h-[calc(100vh-4rem)] flex-col bg-[#f9fafb]">
				{/* Hero */}
				<section className="flex flex-1 flex-col px-6 pb-8 pt-20 md:px-8 md:pb-12 md:pt-24">
					<div className="mx-auto max-w-4xl">
						{/* Headline */}
						<div className="animate-fade-in mb-12 text-center">
							<h1
								className="mb-4 text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl"
								style={{ fontFamily: 'Newsreader, Georgia, serif' }}
							>
								Transforme suas ideias em projetos
							</h1>
							<p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
								Da ideia inicial ao produto documentado. Deixe a Anna guiar voce em cada etapa do
								processo.
							</p>
						</div>

						{/* Main Card */}
						<div className="mx-auto max-w-2xl">
							<div className="group flex flex-col rounded-xl border border-border bg-white p-6 transition-colors hover:border-primary/30 md:p-8">
								{/* Header */}
								<div className="mb-6">
									{/* Eyebrow */}
									<div className="mb-4 flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
											<Target className="h-5 w-5 text-primary" />
										</div>
										<span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
											Sua jornada
										</span>
									</div>

									{/* Title */}
									<h3
										className="mb-2 text-2xl font-semibold tracking-tight text-foreground"
										style={{ fontFamily: 'Newsreader, Georgia, serif' }}
									>
										Comece pelo Briefing
									</h3>

									{/* Hook */}
									<p className="text-lg text-primary">Da visao a execucao</p>
								</div>

								{/* Description */}
								<p className="mb-6 leading-relaxed text-muted-foreground">
									Defina o escopo do seu projeto, documente requisitos profissionais, planeje as
									entregas e acompanhe o progresso. A Anna vai te guiar em cada etapa com
									inteligencia artificial.
								</p>

								{/* Persona bullets */}
								<div className="mb-6 rounded-xl bg-[#f9fafb] p-5">
									<span className="mb-3 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
										Ideal para quem
									</span>
									<ul className="space-y-2">
										<li className="flex items-start gap-2 text-sm text-muted-foreground">
											<span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-primary" />
											Tem uma ideia e quer estrutura-la
										</li>
										<li className="flex items-start gap-2 text-sm text-muted-foreground">
											<span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-primary" />
											Precisa de especificacoes profissionais
										</li>
										<li className="flex items-start gap-2 text-sm text-muted-foreground">
											<span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-primary" />
											Quer documentacao clara e organizada
										</li>
										<li className="flex items-start gap-2 text-sm text-muted-foreground">
											<span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-primary" />
											Busca planejamento estruturado de entregas
										</li>
									</ul>
								</div>

								{/* Journey */}
								<div className="mb-6">
									<span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
										Etapas do processo
									</span>
									<JourneyTimeline steps={journeySteps} />
								</div>

								{/* CTA */}
								<Button asChild size="lg" className="w-full gap-2">
									<Link href="/briefing">
										Comecar Briefing
										<ArrowRight className="h-4 w-4" />
									</Link>
								</Button>
							</div>
						</div>
					</div>
				</section>
			</div>
		</ScrollArea>
	)
}
