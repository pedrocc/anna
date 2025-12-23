import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import type { ReactNode } from 'react'
import { Link } from 'wouter'

interface LayoutProps {
	readonly children: ReactNode
}

export function Layout({ children }: LayoutProps) {
	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white shadow-sm">
				<nav className="mx-auto flex max-w-7xl items-center justify-between p-4">
					<Link href="/" className="text-xl font-bold text-gray-900 hover:text-primary">
						Anna
					</Link>

					<div className="flex items-center gap-4">
						<SignedIn>
							<Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
								Dashboard
							</Link>
							<UserButton afterSignOutUrl="/" />
						</SignedIn>
						<SignedOut>
							<SignInButton mode="modal">
								<button
									type="button"
									className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
								>
									Sign In
								</button>
							</SignInButton>
						</SignedOut>
					</div>
				</nav>
			</header>

			<main className="mx-auto max-w-7xl p-4">{children}</main>
		</div>
	)
}
