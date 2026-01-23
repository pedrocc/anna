import { beforeEach, describe, expect, it } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { Button } from './button.js'

describe('Button', () => {
	beforeEach(() => {
		cleanup()
		document.body.innerHTML = ''
	})

	describe('type attribute', () => {
		it('defaults to type="button"', () => {
			render(<Button>Click</Button>)
			const button = screen.getByRole('button')
			expect(button).toHaveAttribute('type', 'button')
		})

		it('allows overriding type to "submit"', () => {
			render(<Button type="submit">Submit</Button>)
			const button = screen.getByRole('button')
			expect(button).toHaveAttribute('type', 'submit')
		})

		it('allows overriding type to "reset"', () => {
			render(<Button type="reset">Reset</Button>)
			const button = screen.getByRole('button')
			expect(button).toHaveAttribute('type', 'reset')
		})

		it('does not pass type when asChild is true', () => {
			render(
				<Button asChild>
					<a href="/test">Link</a>
				</Button>
			)
			const link = screen.getByRole('link')
			expect(link).not.toHaveAttribute('type')
		})

		it('does not pass explicit type when asChild is true', () => {
			render(
				<Button asChild type="submit">
					<a href="/test">Link</a>
				</Button>
			)
			const link = screen.getByRole('link')
			expect(link).not.toHaveAttribute('type')
		})
	})

	describe('data attributes', () => {
		it('has data-slot="button"', () => {
			render(<Button>Click</Button>)
			const button = screen.getByRole('button')
			expect(button).toHaveAttribute('data-slot', 'button')
		})

		it('has data-variant attribute', () => {
			render(<Button variant="destructive">Click</Button>)
			const button = screen.getByRole('button')
			expect(button).toHaveAttribute('data-variant', 'destructive')
		})

		it('has data-size attribute', () => {
			render(<Button size="sm">Click</Button>)
			const button = screen.getByRole('button')
			expect(button).toHaveAttribute('data-size', 'sm')
		})
	})

	describe('asChild', () => {
		it('renders as child element when asChild is true', () => {
			render(
				<Button asChild>
					<a href="/test">Link</a>
				</Button>
			)
			const link = screen.getByRole('link')
			expect(link).toBeInTheDocument()
			expect(link).toHaveAttribute('href', '/test')
		})

		it('renders as button element by default', () => {
			render(<Button>Click</Button>)
			const button = screen.getByRole('button')
			expect(button.tagName).toBe('BUTTON')
		})
	})
})
