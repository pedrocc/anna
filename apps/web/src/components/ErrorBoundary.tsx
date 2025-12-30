import { AlertTriangle, Button } from '@repo/ui'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
	children: ReactNode
}

interface ErrorBoundaryState {
	hasError: boolean
	error?: Error
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props)
		this.state = { hasError: false, error: undefined }
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error }
	}

	override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		// biome-ignore lint/suspicious/noConsole: Error logging is appropriate in ErrorBoundary
		console.error('Error caught by boundary:', error, errorInfo)
	}

	override render() {
		if (this.state.hasError) {
			return (
				<div className="min-h-screen flex items-center justify-center bg-background">
					<div className="max-w-md w-full bg-card shadow-lg rounded-lg p-8 text-center border border-border">
						<div className="mb-6">
							<AlertTriangle className="mx-auto size-12 text-destructive" aria-hidden="true" />
						</div>
						<h1 className="text-2xl font-bold text-foreground mb-4">Algo deu errado</h1>
						<p className="text-muted-foreground mb-6">
							{this.state.error?.message ||
								'Ocorreu um erro inesperado. Por favor, tente novamente.'}
						</p>
						<div className="space-y-3">
							<Button className="w-full" onClick={() => globalThis.location.reload()}>
								Recarregar página
							</Button>
							<Button
								variant="secondary"
								className="w-full"
								onClick={() => {
									globalThis.location.href = '/'
								}}
							>
								Voltar ao início
							</Button>
						</div>
					</div>
				</div>
			)
		}

		return this.props.children
	}
}
