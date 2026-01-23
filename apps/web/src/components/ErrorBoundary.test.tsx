import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary.js'

function ThrowError({ message }: { message: string }): never {
	throw new Error(message)
}

function ValidComponent() {
	return <div>Conteudo valido</div>
}

describe('ErrorBoundary', () => {
	let consoleSpy: ReturnType<typeof spyOn>

	beforeEach(() => {
		cleanup()
		consoleSpy = spyOn(console, 'error').mockImplementation(() => {})
	})

	afterEach(() => {
		consoleSpy.mockRestore()
	})

	it('renders children when no error occurs', () => {
		render(
			<ErrorBoundary>
				<ValidComponent />
			</ErrorBoundary>
		)
		expect(screen.getByText('Conteudo valido')).toBeInTheDocument()
	})

	it('renders error UI when an error is thrown', () => {
		render(
			<ErrorBoundary>
				<ThrowError message="Test error" />
			</ErrorBoundary>
		)
		expect(screen.getByText('Algo deu errado')).toBeInTheDocument()
	})

	it('displays the error message', () => {
		render(
			<ErrorBoundary>
				<ThrowError message="Mensagem de erro customizada" />
			</ErrorBoundary>
		)
		expect(screen.getByText('Mensagem de erro customizada')).toBeInTheDocument()
	})

	it('renders reload button', () => {
		render(
			<ErrorBoundary>
				<ThrowError message="Test error" />
			</ErrorBoundary>
		)
		expect(screen.getByRole('button', { name: 'Recarregar página' })).toBeInTheDocument()
	})

	it('renders home button', () => {
		render(
			<ErrorBoundary>
				<ThrowError message="Test error" />
			</ErrorBoundary>
		)
		expect(screen.getByRole('button', { name: 'Voltar ao início' })).toBeInTheDocument()
	})

	it('logs error to console', () => {
		render(
			<ErrorBoundary>
				<ThrowError message="Console log test" />
			</ErrorBoundary>
		)
		expect(consoleSpy).toHaveBeenCalled()
	})

	it('renders error icon', () => {
		const { container } = render(
			<ErrorBoundary>
				<ThrowError message="Test error" />
			</ErrorBoundary>
		)
		const icon = container.querySelector('svg.text-destructive')
		expect(icon).toBeInTheDocument()
	})

	it('displays error message from Error constructor', () => {
		const ThrowEmptyError = () => {
			throw new Error('Empty error for testing')
		}

		render(
			<ErrorBoundary>
				<ThrowEmptyError />
			</ErrorBoundary>
		)
		expect(screen.getByText('Empty error for testing')).toBeInTheDocument()
	})
})
