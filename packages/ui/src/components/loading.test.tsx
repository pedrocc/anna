import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { Loading } from './loading.js'

describe('Loading', () => {
	describe('default variant', () => {
		it('renders with default props', () => {
			render(<Loading />)
			const loading = screen.getByRole('status')
			expect(loading).toBeInTheDocument()
			expect(loading).toHaveAttribute('aria-label', 'Carregando...')
		})

		it('renders default text', () => {
			render(<Loading />)
			expect(screen.getByText('Carregando...')).toBeInTheDocument()
		})

		it('renders custom text', () => {
			render(<Loading text="Aguarde..." />)
			expect(screen.getByText('Aguarde...')).toBeInTheDocument()
		})

		it('hides text when showText is false', () => {
			render(<Loading showText={false} />)
			expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
		})
	})

	describe('sizes', () => {
		it('renders with sm size', () => {
			render(<Loading size="sm" />)
			const text = screen.getByText('Carregando...')
			expect(text).toHaveClass('text-xs')
		})

		it('renders with lg size', () => {
			render(<Loading size="lg" />)
			const text = screen.getByText('Carregando...')
			expect(text).toHaveClass('text-lg')
		})
	})

	describe('variants', () => {
		it('renders inline variant', () => {
			render(<Loading variant="inline" data-testid="loading" />)
			const loading = screen.getByTestId('loading')
			expect(loading).toHaveClass('flex-row')
			expect(loading).toHaveClass('gap-2')
		})

		it('renders overlay variant', () => {
			render(<Loading variant="overlay" data-testid="loading" />)
			const loading = screen.getByTestId('loading')
			expect(loading).toHaveClass('fixed')
			expect(loading).toHaveClass('inset-0')
			expect(loading).toHaveClass('z-50')
		})

		it('renders fullscreen variant', () => {
			render(<Loading variant="fullscreen" data-testid="loading" />)
			const loading = screen.getByTestId('loading')
			expect(loading).toHaveClass('min-h-screen')
			expect(loading).toHaveClass('w-full')
		})
	})

	it('has data-slot attribute', () => {
		render(<Loading data-testid="loading" />)
		const loading = screen.getByTestId('loading')
		expect(loading).toHaveAttribute('data-slot', 'loading')
	})

	it('applies custom className', () => {
		render(<Loading className="my-custom-class" data-testid="loading" />)
		const loading = screen.getByTestId('loading')
		expect(loading).toHaveClass('my-custom-class')
	})

	it('contains a spinner', () => {
		render(<Loading />)
		const spinner = document.querySelector('[data-slot="spinner"]')
		expect(spinner).toBeInTheDocument()
	})
})
