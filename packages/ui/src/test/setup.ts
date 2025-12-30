import { afterEach, expect } from 'bun:test'
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'

declare module 'bun:test' {
	interface Matchers<T> extends TestingLibraryMatchers<typeof expect.stringContaining, T> {}
	interface AsymmetricMatchers extends TestingLibraryMatchers {}
}

expect.extend(matchers)

afterEach(() => {
	cleanup()
})
