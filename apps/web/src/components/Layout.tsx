import { RedirectToSignIn, SignedIn, SignedOut, useUser } from '@clerk/clerk-react'
import { SidebarProvider } from '@repo/ui'
import { type ReactNode, useEffect, useRef } from 'react'
import { api } from '../lib/api-client'
import { AppSidebar } from './AppSidebar.js'

interface LayoutProps {
	readonly children: ReactNode
}

function UserSync() {
	const { user, isLoaded } = useUser()
	const hasSynced = useRef(false)

	useEffect(() => {
		if (isLoaded && user && !hasSynced.current) {
			const fullName = user.fullName || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
			if (fullName) {
				hasSynced.current = true
				// Sync user name to our database
				api.users.syncName(fullName).catch(() => {
					// Silently fail - not critical
				})
			}
		}
	}, [isLoaded, user])

	return null
}

export function Layout({ children }: LayoutProps) {
	return (
		<>
			{/* Redirecionar para login se não autenticado */}
			<SignedOut>
				<RedirectToSignIn signInFallbackRedirectUrl="/inicio" />
			</SignedOut>

			<SignedIn>
				<UserSync />
				<SidebarProvider>
					<div className="flex min-h-svh w-full">
						<AppSidebar />
						<main className="relative flex-1 bg-[#f9fafb]">{children}</main>
					</div>
				</SidebarProvider>
			</SignedIn>
		</>
	)
}
