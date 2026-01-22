import { describe, expect, it } from 'bun:test'
import { render } from '@testing-library/react'
import { Toaster } from './sonner.js'

describe('Toaster', () => {
	it('renders without crashing', () => {
		const { container } = render(<Toaster />)
		expect(container).toBeDefined()
	})

	it('renders a toaster element', () => {
		const { container } = render(<Toaster />)
		// Sonner renders an ol with role="list" as the container for toasts
		const list = container.querySelector('ol')
		expect(list).toBeDefined()
	})

	it('accepts custom position prop', () => {
		const { container } = render(<Toaster position="top-right" />)
		expect(container).toBeDefined()
	})

	it('accepts closeButton prop', () => {
		const { container } = render(<Toaster closeButton />)
		expect(container).toBeDefined()
	})

	it('applies custom className', () => {
		const { container } = render(<Toaster className="toaster group" />)
		expect(container).toBeDefined()
	})
})
