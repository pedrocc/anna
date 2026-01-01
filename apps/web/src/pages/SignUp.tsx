import { SignUp } from '@clerk/clerk-react'
import { Card, CardContent } from '@repo/ui'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'wouter'

export function SignUpPage() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-[#f9fafb] p-4">
			<div className="mb-8 text-center">
				<Link
					href="/"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="h-4 w-4" />
					Voltar
				</Link>
			</div>

			<div className="mb-8 flex items-center gap-3">
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
			</div>

			<Card className="w-full max-w-md border border-border bg-white shadow-sm">
				<CardContent className="flex justify-center p-6">
					<SignUp
						appearance={{
							elements: {
								rootBox: 'w-full',
								card: 'shadow-none p-0 bg-transparent',
								headerTitle: 'text-foreground',
								headerSubtitle: 'text-muted-foreground',
								formButtonPrimary: 'bg-primary hover:bg-primary/90',
								formFieldInput: 'border-input',
								footerActionLink: 'text-primary hover:text-primary/80',
							},
						}}
						routing="path"
						path="/sign-up"
						signInUrl="/sign-in"
						fallbackRedirectUrl="/brainstorm"
					/>
				</CardContent>
			</Card>

			<p className="mt-6 text-center text-sm text-muted-foreground">
				Ja tem uma conta?{' '}
				<Link href="/sign-in" className="font-medium text-primary hover:underline">
					Entrar
				</Link>
			</p>
		</div>
	)
}
