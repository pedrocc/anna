import { SignedIn, SignedOut, useUser } from '@clerk/clerk-react'
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

function HeroSignedIn() {
	const { user } = useUser()
	const firstName = user?.firstName ?? 'Explorador'

	return (
		<div className="text-center">
			<Badge variant="outline" className="mb-8 border-white/20 bg-white/5 px-4 py-1.5 text-white/80">
				<Sparkles className="mr-2 h-3.5 w-3.5" />
				Bem-vindo de volta
			</Badge>
			<h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
				Olá, <span className="text-primary">{firstName}</span>
			</h1>
			<p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/60 md:text-xl">
				Anna é sua facilitadora de brainstorming com IA. Explore técnicas criativas, gere insights
				e crie documentos executivos para seus projetos.
			</p>
			<div className="mt-10 flex flex-wrap justify-center gap-4">
				<Button asChild size="lg" className="h-12 px-6 text-base shadow-lg">
					<Link href="/brainstorm">
						<Sparkles className="mr-2 h-5 w-5" />
						Iniciar Brainstorming
						<ArrowRight className="ml-2 h-5 w-5" />
					</Link>
				</Button>
			</div>
		</div>
	)
}

function HeroSignedOut() {
	return (
		<div className="text-center" style={{ paddingTop: '10vh' }}>
			<h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
				Transforme suas <span className="text-white/50">ideias</span> em projetos
			</h1>
			<p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/60 md:text-xl">
				Anna é sua facilitadora de brainstorming com IA. Explore técnicas criativas, gere insights
				e crie documentos executivos para seus projetos.
			</p>
		</div>
	)
}

export function WelcomePage() {
	return (
		<div className="dark welcome-page relative min-h-screen overflow-hidden bg-[#0a0a0f] text-white">
			{/* Animated background */}
			<div
				className="pointer-events-none absolute inset-0"
				style={{
					background: `
						radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 198, 0.3), transparent),
						radial-gradient(ellipse 60% 40% at 80% 50%, rgba(78, 81, 209, 0.2), transparent),
						radial-gradient(ellipse 50% 30% at 20% 80%, rgba(99, 102, 241, 0.15), transparent)
					`,
				}}
			/>

			{/* Stars/dots animation */}
			<div className="stars-container pointer-events-none absolute inset-0">
				{[...Array(50)].map((_, i) => (
					<div
						key={i}
						className="absolute rounded-full bg-white"
						style={{
							width: Math.random() * 3 + 1 + 'px',
							height: Math.random() * 3 + 1 + 'px',
							left: Math.random() * 100 + '%',
							top: Math.random() * 100 + '%',
							opacity: Math.random() * 0.5 + 0.2,
							animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
							animationDelay: Math.random() * 2 + 's',
						}}
					/>
				))}
			</div>

			{/* CSS for twinkle animation */}
			<style>{`
				@keyframes twinkle {
					0%, 100% { opacity: 0.2; transform: scale(1); }
					50% { opacity: 0.8; transform: scale(1.5); }
				}
			`}</style>

			{/* Header com logo */}
			<header className="relative flex items-center justify-between px-6 py-6 md:px-10 md:py-8">
				<div className="flex items-center gap-4">
					<div
						className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-black"
						style={{ border: '1px solid white' }}
					>
						<img src="/logo.png" alt="Anna Digital" className="h-10 w-10 object-contain" />
					</div>
					<div className="h-10 w-px bg-white/20" />
					<div className="flex flex-col">
						<span className="text-2xl font-bold tracking-tight">
							<span className="text-white">Anna </span>
							<span className="text-white/50">Digital</span>
						</span>
						<span className="text-[10px] font-medium uppercase tracking-widest text-white/40">
							Uma plataforma Masterboi
						</span>
					</div>
				</div>
				<SignedOut>
					<Button asChild size="lg" className="min-w-[160px] px-8 text-base font-semibold" style={{ height: '48px' }}>
						<Link href="/sign-in">
							Entrar
							<ArrowRight className="ml-2 h-5 w-5" />
						</Link>
					</Button>
				</SignedOut>
			</header>

			{/* Conteúdo */}
			<div
				className="relative mx-auto flex max-w-6xl flex-col justify-center px-6 pb-10"
				style={{ minHeight: 'calc(100vh - 100px)' }}
			>
				{/* Hero Section */}
				<div className="animate-fade-in-up">
					<SignedIn>
						<HeroSignedIn />
					</SignedIn>
					<SignedOut>
						<HeroSignedOut />
					</SignedOut>
				</div>

				{/* How it Works */}
				<div className="mt-32">
					<div className="mb-16 text-center">
						<h2 className="text-3xl font-bold tracking-tight md:text-4xl">Como funciona</h2>
						<p className="mx-auto mt-4 max-w-xl text-white/60">
							Três passos para transformar suas ideias em documentos executivos
						</p>
					</div>

					<div className="grid gap-8 md:grid-cols-3">
						{steps.map((step, index) => (
							<div
								key={step.number}
								className="group relative h-full"
								style={{ animationDelay: `${index * 100}ms` }}
							>
								{/* Connector line for desktop */}
								{index < steps.length - 1 && (
									<div className="absolute right-0 top-12 hidden h-px w-8 translate-x-full bg-white/10 md:block" />
								)}

								<div className="relative h-full rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/10">
									{/* Step number */}
									<div className="mb-6 flex items-center gap-4">
										<span className="text-5xl font-bold text-white/10">{step.number}</span>
										<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
											<step.icon className="h-6 w-6 text-primary" />
										</div>
									</div>

									<h3 className="mb-3 text-xl font-semibold">{step.title}</h3>
									<p className="leading-relaxed text-white/60">{step.description}</p>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Features */}
				<div className="mt-32">
					<div className="mb-16 text-center">
						<h2 className="text-3xl font-bold tracking-tight md:text-4xl">Por que usar a Anna?</h2>
						<p className="mx-auto mt-4 max-w-xl text-white/60">
							Ferramentas pensadas para potencializar sua criatividade
						</p>
					</div>

					<div className="grid gap-6 md:grid-cols-3">
						{features.map((feature, index) => (
							<Card
								key={feature.title}
								className="group border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/10"
								style={{ animationDelay: `${index * 100}ms` }}
							>
								<CardHeader>
									<div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 transition-colors group-hover:bg-primary/30">
										<feature.icon className="h-7 w-7 text-primary" />
									</div>
									<CardTitle className="text-xl text-white">{feature.title}</CardTitle>
								</CardHeader>
								<CardContent>
									<CardDescription className="text-base leading-relaxed text-white/60">
										{feature.description}
									</CardDescription>
								</CardContent>
							</Card>
						))}
					</div>
				</div>

				{/* Footer */}
				<footer className="mt-32 pb-8 text-center text-sm text-white/40">
					<p>Anna - Sua facilitadora de brainstorming com IA</p>
				</footer>
			</div>
		</div>
	)
}
