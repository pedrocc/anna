import { RedirectToSignIn, SignedIn, SignedOut, SignOutButton, useUser } from '@clerk/clerk-react'
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	SidebarProvider,
	useSidebar,
} from '@repo/ui'
import { LogOut, Menu, Settings, Sparkles, User } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'wouter'
import { AppSidebar } from './AppSidebar.js'
import { ModeToggle } from './ModeToggle.js'

interface LayoutProps {
	readonly children: ReactNode
}

function MobileMenuButton() {
	const { toggleSidebar } = useSidebar()
	return (
		<Button variant="ghost" size="icon" className="size-8 md:hidden" onClick={toggleSidebar}>
			<Menu className="size-4" />
			<span className="sr-only">Menu</span>
		</Button>
	)
}

function HeaderLeft() {
	return (
		<div className="flex items-center gap-3">
			<MobileMenuButton />
			<Link href="/brainstorm" className="flex items-center gap-3">
				<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
					<Sparkles className="size-4" />
				</div>
				<span className="font-semibold">Anna</span>
			</Link>
		</div>
	)
}

function UserMenu() {
	const { user } = useUser()

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
					aria-label="Menu do usuario"
					aria-haspopup="menu"
				>
					<Avatar className="size-8">
						<AvatarImage src={user?.imageUrl} alt={user?.fullName ?? 'Usuario'} />
						<AvatarFallback>
							<User className="size-4" />
							<span className="sr-only">Usuario</span>
						</AvatarFallback>
					</Avatar>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-1">
						<p className="text-sm font-medium leading-none">{user?.fullName}</p>
						<p className="text-xs leading-none text-muted-foreground">
							{user?.primaryEmailAddress?.emailAddress}
						</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link href="/settings">
						<Settings className="mr-2 size-4" />
						<span>Configuracoes</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<SignOutButton>
					<DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
						<LogOut className="mr-2 size-4" />
						<span>Sair</span>
					</DropdownMenuItem>
				</SignOutButton>
			</DropdownMenuContent>
		</DropdownMenu>
	)
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
					<div className="flex min-h-svh w-full flex-col">
						{/* Top bar - spans full width */}
						<header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b bg-background pl-2 pr-4 md:px-4">
							<HeaderLeft />
							<div className="flex items-center gap-2">
								<ModeToggle />
								<UserMenu />
							</div>
						</header>

						{/* Content area with sidebar */}
						<div className="flex flex-1">
							<AppSidebar />
							<main className="flex-1 p-4">{children}</main>
						</div>
					</div>
				</SidebarProvider>
			</SignedIn>
		</>
	)
}
