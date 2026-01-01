import { SignedIn, SignedOut, useUser } from '@clerk/clerk-react'
import { Button } from '@repo/ui'
import {
	ArrowRight,
	CheckCircle2,
	ClipboardList,
	FileText,
	FolderKanban,
	Kanban,
	Lightbulb,
	Sparkles,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'wouter'

// Hook to detect if we're on desktop
function useIsDesktop() {
	const [isDesktop, setIsDesktop] = useState(false)

	useEffect(() => {
		const checkWidth = () => setIsDesktop(window.innerWidth >= 768)
		checkWidth()
		window.addEventListener('resize', checkWidth)
		return () => window.removeEventListener('resize', checkWidth)
	}, [])

	return isDesktop
}

// ============================================================================
// Data
// ============================================================================

const journeySteps = [
	{
		icon: Lightbulb,
		title: 'Brainstorm',
		description: 'Explore ideias com IA usando tecnicas como SCAMPER e Six Thinking Hats',
	},
	{
		icon: FileText,
		title: 'Briefing',
		description: 'Defina escopo, objetivos e publico-alvo do seu projeto',
	},
	{
		icon: FolderKanban,
		title: 'PRD',
		description: 'Documente requisitos funcionais e nao-funcionais',
	},
	{
		icon: ClipboardList,
		title: 'Planejamento',
		description: 'Crie user stories e organize em epicos',
	},
	{
		icon: Kanban,
		title: 'Kanban',
		description: 'Execute sprints e acompanhe o progresso',
	},
]

const benefits = [
	'Documentos profissionais gerados automaticamente',
	'Metodologias de brainstorming estruturadas',
	'Projetos com escopo bem definido',
	'Do conceito ao Kanban em minutos',
]

// ============================================================================
// Components
// ============================================================================

function Header() {
	return (
		<header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 md:px-8 md:py-8">
			<Link href="/" className="flex items-center gap-3 hover:no-underline">
				<div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-border bg-white">
					<img src="/logo.png" alt="Anna Digital" className="h-9 w-9 object-contain" />
				</div>
				<div className="flex flex-col">
					<span className="text-xl font-semibold tracking-tight text-foreground">
						Anna <span className="text-muted-foreground">Digital</span>
					</span>
					<span className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground">
						Uma plataforma Masterboi
					</span>
				</div>
			</Link>

			<SignedOut>
				<Button asChild className="px-5">
					<Link href="/sign-in">
						Entrar
						<ArrowRight className="ml-2 h-4 w-4" />
					</Link>
				</Button>
			</SignedOut>

			<SignedIn>
				<Button asChild className="px-5">
					<Link href="/inicio">
						Entrar
						<ArrowRight className="ml-2 h-4 w-4" />
					</Link>
				</Button>
			</SignedIn>
		</header>
	)
}

function HeroSection() {
	const { user } = useUser()
	const firstName = user?.firstName

	return (
		<section className="mx-auto max-w-4xl px-6 pb-20 pt-12 text-center md:px-8 md:pb-28 md:pt-20">
			<div
				className="animate-fade-in opacity-0"
				style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
			>
				<SignedIn>
					<p className="mb-4 text-lg text-muted-foreground">Ola, {firstName}</p>
				</SignedIn>

				<h1
					className="mb-6 text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl"
					style={{ fontFamily: 'Newsreader, Georgia, serif' }}
				>
					Transforme suas ideias em projetos
				</h1>

				<p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
					Anna e sua facilitadora com IA que guia voce do brainstorming ate o documento executivo,
					passando por briefing, PRD e planejamento.
				</p>
			</div>
		</section>
	)
}

function JourneySection() {
	const isDesktop = useIsDesktop()

	return (
		<section id="jornada" className="bg-[#f9fafb] py-20 md:py-28">
			<div className="mx-auto max-w-5xl px-6 md:px-8">
				<div
					className="animate-fade-in mb-16 text-center opacity-0"
					style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
				>
					<h2
						className="mb-4 text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
						style={{ fontFamily: 'Newsreader, Georgia, serif' }}
					>
						Uma jornada completa de produto
					</h2>
					<p className="mx-auto max-w-xl text-lg text-muted-foreground">
						Da ideia inicial ao backlog pronto para desenvolvimento
					</p>
				</div>

				{/* Journey Timeline */}
				<div className="relative">
					{/* Central vertical line - desktop only */}
					{isDesktop && (
						<div
							className="absolute top-0 h-full w-px bg-border"
							style={{ left: '50%', transform: 'translateX(-50%)' }}
						/>
					)}

					<div
						style={{ display: 'flex', flexDirection: 'column', gap: isDesktop ? '64px' : '24px' }}
					>
						{journeySteps.map((step, index) => {
							const Icon = step.icon
							const isLeft = index % 2 === 0

							return (
								<div
									key={step.title}
									className="animate-fade-in relative opacity-0"
									style={{
										animationDelay: `${200 + index * 100}ms`,
										animationFillMode: 'forwards',
									}}
								>
									{isDesktop ? (
										/* Desktop Layout - Zigzag */
										<div
											style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
										>
											{/* Left Side */}
											<div
												style={{
													width: 'calc(50% - 40px)',
													display: 'flex',
													justifyContent: 'flex-end',
												}}
											>
												{isLeft && (
													<div className="max-w-sm rounded-xl border border-border bg-white p-6 text-right transition-colors hover:border-primary/30">
														<div className="mb-3 flex flex-row-reverse items-center gap-3">
															<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
																<Icon className="h-5 w-5 text-primary" />
															</div>
															<h3 className="text-lg font-semibold text-foreground">
																{step.title}
															</h3>
														</div>
														<p className="text-muted-foreground">{step.description}</p>
													</div>
												)}
											</div>

											{/* Center Node */}
											<div
												className="relative z-10 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border-2 border-primary bg-white text-lg font-bold text-primary"
												style={{ margin: '0 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
											>
												{String(index + 1).padStart(2, '0')}
											</div>

											{/* Right Side */}
											<div
												style={{
													width: 'calc(50% - 40px)',
													display: 'flex',
													justifyContent: 'flex-start',
												}}
											>
												{!isLeft && (
													<div className="max-w-sm rounded-xl border border-border bg-white p-6 text-left transition-colors hover:border-primary/30">
														<div className="mb-3 flex items-center gap-3">
															<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
																<Icon className="h-5 w-5 text-primary" />
															</div>
															<h3 className="text-lg font-semibold text-foreground">
																{step.title}
															</h3>
														</div>
														<p className="text-muted-foreground">{step.description}</p>
													</div>
												)}
											</div>
										</div>
									) : (
										/* Mobile Layout */
										<div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
											{/* Node */}
											<div className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-primary bg-white text-sm font-bold text-primary">
												{String(index + 1).padStart(2, '0')}
											</div>

											{/* Card */}
											<div className="flex-1 rounded-xl border border-border bg-white p-5">
												<div className="mb-2 flex items-center gap-3">
													<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
														<Icon className="h-4 w-4 text-primary" />
													</div>
													<h3 className="font-semibold text-foreground">{step.title}</h3>
												</div>
												<p className="text-sm text-muted-foreground">{step.description}</p>
											</div>
										</div>
									)}
								</div>
							)
						})}
					</div>
				</div>
			</div>
		</section>
	)
}

function BenefitsSection() {
	return (
		<section className="py-20 md:py-28">
			<div className="mx-auto max-w-5xl px-6 md:px-8">
				<div className="grid gap-12 md:grid-cols-2 md:items-center">
					{/* Left - Text */}
					<div
						className="animate-fade-in opacity-0"
						style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
					>
						<h2
							className="mb-6 text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
							style={{ fontFamily: 'Newsreader, Georgia, serif' }}
						>
							Tudo que voce precisa para tirar projetos do papel
						</h2>
						<p className="mb-8 text-lg text-muted-foreground">
							Anna combina inteligencia artificial com metodologias consagradas de produto para
							acelerar seu processo criativo.
						</p>

						<ul className="space-y-4">
							{benefits.map((benefit, i) => (
								<li
									key={i}
									className="flex items-start gap-3 text-foreground"
									style={{
										animationDelay: `${200 + i * 50}ms`,
									}}
								>
									<CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
									{benefit}
								</li>
							))}
						</ul>
					</div>

					{/* Right - Visual */}
					<div
						className="animate-fade-in opacity-0"
						style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
					>
						<div className="rounded-2xl border border-border bg-[#f9fafb] p-8">
							<div className="mb-6 flex items-center gap-4">
								<div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
									<Sparkles className="h-7 w-7 text-primary" />
								</div>
								<div>
									<p className="font-semibold text-foreground">Anna AI</p>
									<p className="text-sm text-muted-foreground">Sua facilitadora de produto</p>
								</div>
							</div>
							<div className="space-y-3">
								<div className="rounded-lg bg-white p-4 text-sm text-muted-foreground">
									"Vamos estruturar sua ideia. Me conte mais sobre o problema que voce quer
									resolver..."
								</div>
								<div className="rounded-lg bg-primary/5 p-4 text-sm text-foreground">
									"Quero criar um app de delivery sustentavel para pequenos produtores locais"
								</div>
								<div className="rounded-lg bg-white p-4 text-sm text-muted-foreground">
									"Otimo! Vou te guiar pelo processo de brainstorming usando a tecnica SCAMPER para
									explorar diferentes angulos..."
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}

function CTASection() {
	return (
		<section className="bg-[#f9fafb] py-20 md:py-28">
			<div className="mx-auto max-w-3xl px-6 text-center md:px-8">
				<div
					className="animate-fade-in opacity-0"
					style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
				>
					<h2
						className="mb-6 text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
						style={{ fontFamily: 'Newsreader, Georgia, serif' }}
					>
						Pronto para comecar?
					</h2>
					<p className="mb-10 text-lg text-muted-foreground">
						Entre e transforme suas ideias em projetos estruturados.
					</p>

					<SignedOut>
						<Button asChild size="lg" className="h-12 px-8 text-base">
							<Link href="/sign-in">
								Entrar
								<ArrowRight className="ml-2 h-5 w-5" />
							</Link>
						</Button>
					</SignedOut>

					<SignedIn>
						<Button asChild size="lg" className="h-12 px-8 text-base">
							<Link href="/inicio">
								Acessar meus projetos
								<ArrowRight className="ml-2 h-5 w-5" />
							</Link>
						</Button>
					</SignedIn>
				</div>
			</div>
		</section>
	)
}

function Footer() {
	return (
		<footer className="border-t border-border bg-white py-8">
			<div className="mx-auto max-w-6xl px-6 md:px-8">
				<div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
					<p>Anna Digital — Uma plataforma Masterboi</p>
					<p>© {new Date().getFullYear()} Todos os direitos reservados</p>
				</div>
			</div>
		</footer>
	)
}

// ============================================================================
// Main Component
// ============================================================================

export function WelcomePage() {
	return (
		<div className="min-h-screen bg-white text-foreground">
			<Header />
			<main>
				<HeroSection />
				<JourneySection />
				<BenefitsSection />
				<CTASection />
			</main>
			<Footer />
		</div>
	)
}
