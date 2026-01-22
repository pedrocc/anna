import { RedirectToSignIn, SignedIn, SignedOut, useUser } from '@clerk/clerk-react'
import { SidebarProvider } from '@repo/ui'
import { type ReactNode, useEffect, useRef } from 'react'
import { api } from '../lib/api-client'
import { AppSidebar } from './AppSidebar.js'

interface LayoutProps {
	readonly children: ReactNode
}

export function UserSync() {
	const { user, isLoaded } = useUser()
	const syncedUserId = useRef<string | null>(null)
	const isSyncing = useRef(false)

	useEffect(() => {
		if (!isLoaded || !user || isSyncing.current || syncedUserId.current === user.id) {
			return
		}

		const fullName = user.fullName || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
		if (!fullName) {
			return
		}

		isSyncing.current = true
		api.users
			.syncName(fullName)
			.then(() => {
				syncedUserId.current = user.id
			})
			.catch(() => {
				// Don't mark as synced on failure, allowing retry on next effect
			})
			.finally(() => {
				isSyncing.current = false
			})
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
