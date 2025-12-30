import { useUser } from '@clerk/clerk-react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui'
import {
	ArrowRight,
	Brain,
	FileText,
	Lightbulb,
	MessageCircle,
	Sparkles,
	Target,
	Zap,
} from 'lucide-react'
import { Link } from 'wouter'

const steps = [
	{
		number: '01',
		title: 'Crie seu projeto',
		description:
			'Dê um nome e descreva brevemente o que você quer explorar. Pode ser uma ideia de startup, um problema a resolver ou uma oportunidade a investigar.',
		icon: Target,
	},
	{
		number: '02',
		title: 'Escolha a técnica',
		description:
			'Selecione entre 10 metodologias de brainstorming como SCAMPER, Six Thinking Hats, First Principles e outras técnicas consagradas de criatividade.',
		icon: Brain,
	},
	{
		number: '03',
		title: 'Gere o documento',
		description:
			'Ao final da sessão, Anna compila automaticamente um documento executivo com todas as ideias, insights e próximos passos definidos.',
		icon: FileText,
	},
]

const features = [
	{
		icon: Lightbulb,
		title: '10 Técnicas de Criatividade',
		description:
			'SCAMPER, Six Hats, First Principles, Mind Mapping e mais metodologias comprovadas.',
	},
	{
		icon: MessageCircle,
		title: 'Perguntas Provocativas',
		description:
			'Anna faz as perguntas certas para expandir seu pensamento e revelar novas perspectivas.',
	},
	{
		icon: Zap,
		title: 'Documentação Automática',
		description:
			'Suas ideias são organizadas e documentadas em tempo real, prontas para compartilhar.',
	},
]

export function WelcomePage() {
	const { user } = useUser()
	const firstName = user?.firstName ?? 'Explorador'

	return (
		<div className="welcome-page bg-background">
			{/* Hero Section */}
			<section className="relative overflow-hidden">
				<div className="hero-gradient absolute inset-0 opacity-40" />
				<div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
					<div className="animate-fade-in-up">
						<p className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground">
							Bem-vindo de volta
						</p>
						<h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
							Olá, <span className="text-primary">{firstName}</span>
						</h1>
						<p className="max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
							Anna é sua <strong className="text-foreground">facilitadora de brainstorming</strong>{' '}
							com inteligência artificial. Transforme ideias soltas em projetos estruturados através
							de técnicas criativas e documentação automática.
						</p>
					</div>
				</div>
			</section>

			{/* How it Works */}
			<section className="border-t bg-muted/30">
				<div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
					<div className="mb-16 text-center">
						<Badge variant="outline" className="mb-4">
							<Sparkles className="mr-1.5 h-3 w-3" />
							Simples e Poderoso
						</Badge>
						<h2 className="text-3xl font-bold tracking-tight md:text-4xl">Como funciona</h2>
						<p className="mx-auto mt-4 max-w-xl text-muted-foreground">
							Três passos para transformar suas ideias em documentos executivos
						</p>
					</div>

					<div className="grid gap-8 md:grid-cols-3">
						{steps.map((step, index) => (
							<div
								key={step.number}
								className="group relative"
								style={{ animationDelay: `${index * 100}ms` }}
							>
								{/* Connector line for desktop */}
								{index < steps.length - 1 && (
									<div className="absolute right-0 top-12 hidden h-px w-8 translate-x-full bg-border md:block" />
								)}

								<div className="relative rounded-2xl border bg-card p-8 shadow-sm transition-all duration-300 hover:shadow-md">
									{/* Step number */}
									<div className="mb-6 flex items-center gap-4">
										<span className="text-5xl font-bold text-primary/20">{step.number}</span>
										<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
											<step.icon className="h-6 w-6 text-primary" />
										</div>
									</div>

									<h3 className="mb-3 text-xl font-semibold">{step.title}</h3>
									<p className="leading-relaxed text-muted-foreground">{step.description}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Features */}
			<section className="border-t">
				<div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
					<div className="mb-16 text-center">
						<h2 className="text-3xl font-bold tracking-tight md:text-4xl">Por que usar a Anna?</h2>
						<p className="mx-auto mt-4 max-w-xl text-muted-foreground">
							Ferramentas pensadas para potencializar sua criatividade
						</p>
					</div>

					<div className="grid gap-6 md:grid-cols-3">
						{features.map((feature, index) => (
							<Card
								key={feature.title}
								className="group border-2 border-transparent bg-gradient-to-br from-card to-muted/20 transition-all duration-300 hover:border-primary/20 hover:shadow-lg"
								style={{ animationDelay: `${index * 100}ms` }}
							>
								<CardHeader>
									<div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
										<feature.icon className="h-7 w-7 text-primary" />
									</div>
									<CardTitle className="text-xl">{feature.title}</CardTitle>
								</CardHeader>
								<CardContent>
									<CardDescription className="text-base leading-relaxed">
										{feature.description}
									</CardDescription>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="border-t bg-primary/5">
				<div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
					<div className="mx-auto max-w-2xl text-center">
						<div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
							<Brain className="h-8 w-8 text-primary-foreground" />
						</div>
						<h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
							Pronto para começar?
						</h2>
						<p className="mb-8 text-lg text-muted-foreground">
							Crie sua primeira sessão de brainstorming e descubra novas perspectivas para seus
							projetos.
						</p>
						<Button asChild size="lg" className="h-12 px-8 text-base shadow-lg">
							<Link href="/brainstorm">
								<Sparkles className="mr-2 h-5 w-5" />
								Iniciar Brainstorming
								<ArrowRight className="ml-2 h-5 w-5" />
							</Link>
						</Button>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t py-8">
				<div className="mx-auto max-w-6xl px-6 text-center text-sm text-muted-foreground">
					<p>Anna - Sua facilitadora de brainstorming com IA</p>
					<p className="mt-1 text-xs">Desenvolvida por Masterboi</p>
				</div>
			</footer>
		</div>
	)
}
