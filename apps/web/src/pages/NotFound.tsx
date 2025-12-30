import { Button } from '@repo/ui'
import { Link } from 'wouter'

export function NotFoundPage() {
	return (
		<div className="py-12 text-center">
			<h1 className="text-6xl font-bold text-foreground">404</h1>
			<p className="mt-4 text-xl text-muted-foreground">Página não encontrada</p>
			<p className="mt-2 text-muted-foreground/70">A página que você procura não existe.</p>
			<div className="mt-8">
				<Button asChild>
					<Link href="/">Voltar ao início</Link>
				</Button>
			</div>
		</div>
	)
}
