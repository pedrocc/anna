import { useUser } from '@clerk/clerk-react'
import { Alert, AlertDescription, AlertTitle, Card, CardContent, Loading } from '@repo/ui'
import { StatCard } from '../components/StatCard.js'
import { useCurrentUser } from '../lib/api-client.js'

const stats = [
	{ title: 'Estatísticas', value: 0, description: 'Projetos' },
	{ title: 'Atividade', value: 0, description: 'Ações hoje' },
	{ title: 'Notificações', value: 0, description: 'Não lidas' },
] as const

export function DashboardPage() {
	const { user: clerkUser } = useUser()
	const { data: user, error, isLoading } = useCurrentUser()

	if (isLoading) {
		return (
			<div className="py-8">
				<Loading size="lg" text="Carregando dados..." />
			</div>
		)
	}

	if (error) {
		return (
			<div className="py-8">
				<Alert variant="destructive" className="max-w-md mx-auto">
					<AlertTitle>Erro ao carregar dados do usuário</AlertTitle>
					<AlertDescription>{error.message}</AlertDescription>
				</Alert>
			</div>
		)
	}

	return (
		<div className="py-8">
			<h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
			<Card className="mt-4">
				<CardContent className="pt-6">
					<p className="text-muted-foreground">
						Bem-vindo,{' '}
						<span className="font-medium text-foreground">
							{user?.name ?? clerkUser?.firstName ?? 'Usuário'}
						</span>
						{/**/}!
					</p>
					{user ? (
						<>
							<p className="mt-2 text-sm text-muted-foreground">E-mail: {user.email}</p>
							<p className="text-sm text-muted-foreground">Função: {user.role}</p>
						</>
					) : (
						<p className="mt-2 text-sm text-muted-foreground">
							Sua conta ainda não foi sincronizada com o banco de dados.
						</p>
					)}
				</CardContent>
			</Card>

			<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{stats.map((stat) => (
					<StatCard key={stat.title} {...stat} />
				))}
			</div>
		</div>
	)
}
