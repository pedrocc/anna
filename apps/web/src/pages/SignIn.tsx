import { SignIn } from '@clerk/clerk-react'
import { Card, CardContent } from '@repo/ui'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'wouter'

export function SignInPage() {
	return (
		<div className="dark relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0a0a0f] p-4 text-white">
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

			<div className="relative z-10 mb-8 text-center">
				<Link
					href="/"
					className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
				>
					<ArrowLeft className="h-4 w-4" />
					Voltar
				</Link>
			</div>

			<div className="relative z-10 mb-6 flex items-center gap-4">
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

			<Card className="relative z-10 w-full max-w-md border-0 shadow-xl">
				<CardContent className="flex justify-center p-6">
					<SignIn
						appearance={{
							elements: {
								rootBox: 'w-full',
								card: 'shadow-none p-0 bg-transparent',
								headerTitle: 'text-foreground',
								headerSubtitle: 'text-muted-foreground',
								formButtonPrimary: 'bg-primary hover:bg-primary/90',
								formFieldInput: 'border-input',
								footerActionLink: 'text-primary hover:text-primary/80',
								footer: 'hidden',
							},
						}}
						routing="path"
						path="/sign-in"
						fallbackRedirectUrl="/brainstorm"
					/>
				</CardContent>
			</Card>

		</div>
	)
}
