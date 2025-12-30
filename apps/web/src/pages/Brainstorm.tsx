import { useAuth } from '@clerk/clerk-react'
import {
	Button,
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	Input,
	Label,
	Spinner,
	Textarea,
} from '@repo/ui'
import { Lightbulb, Plus } from 'lucide-react'
import { type ChangeEvent, useState } from 'react'
import { useLocation } from 'wouter'
import { SessionCard } from '../components/brainstorm'
import { useBrainstormSessions } from '../lib/api-client'

declare const __API_URL__: string | undefined
const API_URL = __API_URL__ ?? 'http://localhost:3000'

export function BrainstormPage() {
	const { getToken } = useAuth()
	const [, navigate] = useLocation()
	const { data, error, isLoading, mutate } = useBrainstormSessions()
	const [isCreating, setIsCreating] = useState(false)
	const [dialogOpen, setDialogOpen] = useState(false)
	const [projectName, setProjectName] = useState('')
	const [projectDescription, setProjectDescription] = useState('')

	const handleCreateSession = async () => {
		if (!projectName.trim()) return

		setIsCreating(true)
		try {
			const token = await getToken()
			const response = await fetch(`${API_URL}/api/v1/brainstorm/sessions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					projectName: projectName.trim(),
					projectDescription: projectDescription.trim() || undefined,
				}),
			})

			if (!response.ok) {
				throw new Error('Failed to create session')
			}

			const result = await response.json()
			setDialogOpen(false)
			setProjectName('')
			setProjectDescription('')
			mutate()

			// Navigate to the new session
			navigate(`/brainstorm/${result.data.id}`)
		} catch (_err) {
		} finally {
			setIsCreating(false)
		}
	}

	if (isLoading) {
		return (
			<div className="flex h-[50vh] items-center justify-center">
				<Spinner className="h-8 w-8" />
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex h-[50vh] flex-col items-center justify-center gap-4">
				<p className="text-destructive">Erro ao carregar sessoes</p>
				<Button onClick={() => mutate()}>Tentar novamente</Button>
			</div>
		)
	}

	const sessions = data ?? []

	return (
		<div className="container py-6">
			<div className="mb-8 flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Brainstorm</h1>
					<p className="mt-1 text-muted-foreground">
						Crie e gerencie suas sessoes de brainstorming
					</p>
				</div>

				<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
					<DialogTrigger asChild>
						<Button>
							<Plus className="mr-2 h-4 w-4" />
							Novo Projeto
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Novo Projeto de Brainstorm</DialogTitle>
							<DialogDescription>
								Inicie uma nova sessao de brainstorming para explorar ideias.
							</DialogDescription>
						</DialogHeader>

						<div className="grid gap-4 py-4">
							<div className="grid gap-2">
								<Label htmlFor="name">Nome do Projeto *</Label>
								<Input
									id="name"
									value={projectName}
									onChange={(e: ChangeEvent<HTMLInputElement>) => setProjectName(e.target.value)}
									placeholder="Ex: App de Delivery Sustentavel"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="description">Descricao (opcional)</Label>
								<Textarea
									id="description"
									value={projectDescription}
									onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
										setProjectDescription(e.target.value)
									}
									placeholder="Descreva brevemente o que voce quer alcancar..."
									rows={3}
								/>
							</div>
						</div>

						<DialogFooter>
							<Button variant="outline" onClick={() => setDialogOpen(false)}>
								Cancelar
							</Button>
							<Button onClick={handleCreateSession} disabled={!projectName.trim() || isCreating}>
								{isCreating ? (
									<>
										<Spinner className="mr-2 h-4 w-4" />
										Criando...
									</>
								) : (
									<>
										<Lightbulb className="mr-2 h-4 w-4" />
										Iniciar Brainstorm
									</>
								)}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			{sessions.length === 0 ? (
				<Card className="border-dashed">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
							<Lightbulb className="h-8 w-8 text-primary" />
						</div>
						<CardTitle>Nenhuma sessão ainda</CardTitle>
						<CardDescription>
							Clique em "Novo Projeto" para criar sua primeira sessão de brainstorming.
						</CardDescription>
					</CardHeader>
				</Card>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{sessions.map((session) => (
						<SessionCard key={session.id} session={session} />
					))}
				</div>
			)}
		</div>
	)
}
