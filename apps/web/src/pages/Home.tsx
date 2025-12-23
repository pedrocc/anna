import { SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/clerk-react'
import { Link } from 'wouter'

export function HomePage() {
	return (
		<div className="py-12 text-center">
			<h1 className="text-4xl font-bold tracking-tight text-gray-900">Welcome to Anna!</h1>
			<p className="mt-4 text-lg text-gray-600">
				A monorepo template with Bun, Hono, React, and more.
			</p>

			<div className="mt-8 flex justify-center gap-4">
				<SignedOut>
					<SignInButton mode="modal">
						<button
							type="button"
							className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
						>
							Sign In
						</button>
					</SignInButton>
					<SignUpButton mode="modal">
						<button
							type="button"
							className="rounded-md border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
						>
							Sign Up
						</button>
					</SignUpButton>
				</SignedOut>
				<SignedIn>
					<Link
						href="/dashboard"
						className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
					>
						Go to Dashboard
					</Link>
				</SignedIn>
			</div>

			<div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
				<div className="rounded-lg bg-white p-6 shadow-sm">
					<h3 className="font-semibold text-gray-900">Bun Runtime</h3>
					<p className="mt-2 text-sm text-gray-600">
						Fast JavaScript runtime, bundler, and package manager all in one.
					</p>
				</div>
				<div className="rounded-lg bg-white p-6 shadow-sm">
					<h3 className="font-semibold text-gray-900">Hono API</h3>
					<p className="mt-2 text-sm text-gray-600">
						Ultrafast web framework for building REST APIs with TypeScript.
					</p>
				</div>
				<div className="rounded-lg bg-white p-6 shadow-sm">
					<h3 className="font-semibold text-gray-900">React 19</h3>
					<p className="mt-2 text-sm text-gray-600">
						Latest React with concurrent features and improved performance.
					</p>
				</div>
			</div>
		</div>
	)
}
