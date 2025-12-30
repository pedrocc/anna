import { SignUp } from '@clerk/clerk-react'
import { Card, CardContent } from '@repo/ui'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { Link } from 'wouter'

export function SignUpPage() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
			<div className="mb-8 text-center">
				<Link
					href="/"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
				>
					<ArrowLeft className="h-4 w-4" />
					Voltar
				</Link>
			</div>

			<div className="mb-6 flex items-center gap-2">
				<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
					<Sparkles className="h-5 w-5 text-primary-foreground" />
				</div>
				<span className="text-2xl font-bold">Anna</span>
			</div>

			<Card className="w-full max-w-md border-0 shadow-xl">
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
