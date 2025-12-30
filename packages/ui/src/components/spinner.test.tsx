import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { Spinner } from './spinner.js'

describe('Spinner', () => {
	it('renders with default size', () => {
		render(<Spinner data-testid="spinner" />)
		const spinner = screen.getByTestId('spinner')
		expect(spinner).toBeInTheDocument()
		expect(spinner).toHaveClass('size-6')
	})

	it('renders with sm size', () => {
		render(<Spinner size="sm" data-testid="spinner" />)
		const spinner = screen.getByTestId('spinner')
		expect(spinner).toHaveClass('size-4')
	})

	it('renders with lg size', () => {
		render(<Spinner size="lg" data-testid="spinner" />)
		const spinner = screen.getByTestId('spinner')
		expect(spinner).toHaveClass('size-8')
	})

	it('renders with xl size', () => {
		render(<Spinner size="xl" data-testid="spinner" />)
		const spinner = screen.getByTestId('spinner')
		expect(spinner).toHaveClass('size-12')
	})

	it('applies custom className', () => {
		render(<Spinner className="text-primary" data-testid="spinner" />)
		const spinner = screen.getByTestId('spinner')
		expect(spinner).toHaveClass('text-primary')
	})

	it('has animate-spin class for animation', () => {
		render(<Spinner data-testid="spinner" />)
		const spinner = screen.getByTestId('spinner')
		expect(spinner).toHaveClass('animate-spin')
	})

	it('has data-slot attribute', () => {
		render(<Spinner data-testid="spinner" />)
		const spinner = screen.getByTestId('spinner')
		expect(spinner).toHaveAttribute('data-slot', 'spinner')
	})
})
