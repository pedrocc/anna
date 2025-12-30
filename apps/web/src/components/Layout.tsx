import { RedirectToSignIn, SignedIn, SignedOut } from '@clerk/clerk-react'
import { SidebarProvider } from '@repo/ui'
import type { ReactNode } from 'react'
import { AppSidebar } from './AppSidebar.js'

interface LayoutProps {
	readonly children: ReactNode
}

export function Layout({ children }: LayoutProps) {
	return (
		<>
			{/* Redirecionar para login se não autenticado */}
			<SignedOut>
				<RedirectToSignIn signInFallbackRedirectUrl="/brainstorm" />
			</SignedOut>

			<SignedIn>
				<SidebarProvider>
					<div className="flex min-h-svh w-full">
						<AppSidebar />
						<main className="flex-1 p-4">{children}</main>
					</div>
				</SidebarProvider>
			</SignedIn>
		</>
	)
}
