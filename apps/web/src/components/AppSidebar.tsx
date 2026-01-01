import { SignOutButton, useUser } from '@clerk/clerk-react'
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarTrigger,
	useSidebar,
} from '@repo/ui'
import {
	ClipboardList,
	FileText,
	FolderKanban,
	Home,
	Kanban,
	LayoutDashboard,
	LogOut,
	User,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { Link, useLocation } from 'wouter'

interface MenuItem {
	readonly title: string
	readonly href: string
	readonly icon: ComponentType<{ className?: string }>
}

// Basecamp-inspired navigation labels (question-driven)
const menuItems: MenuItem[] = [
	{ title: 'Onde comecar?', href: '/inicio', icon: Home },
	{ title: 'Visao geral', href: '/dashboard', icon: LayoutDashboard },
	{ title: 'Definir escopo', href: '/briefing', icon: FileText },
	{ title: 'Requisitos do produto', href: '/pm', icon: FolderKanban },
	{ title: 'Planejar entregas', href: '/requisitos', icon: ClipboardList },
	{ title: 'Acompanhar tarefas', href: '/kanban', icon: Kanban },
]

function SidebarLogo() {
	const { state } = useSidebar()
	const isCollapsed = state === 'collapsed'
	const size = isCollapsed ? 32 : 50

	return (
		<SidebarMenuItem>
			<Link
				href="/"
				className="flex items-center gap-3 rounded-md px-2 py-3 hover:bg-sidebar-accent"
			>
				<img
					src="/logo.png"
					alt="Anna Digital"
					className="shrink-0 rounded-xl object-contain"
					style={{ width: size, height: size, minWidth: size, minHeight: size }}
				/>
				{!isCollapsed && (
					<div className="flex flex-col">
						<span className="text-2xl font-bold leading-tight tracking-tight">
							<span>Anna </span>
							<span className="text-muted-foreground">Digital</span>
						</span>
						<span className="text-[8px] font-medium uppercase tracking-wider text-muted-foreground">
							Uma plataforma Masterboi
						</span>
					</div>
				)}
			</Link>
		</SidebarMenuItem>
	)
}

export function AppSidebar() {
	const [location] = useLocation()
	const { user } = useUser()

	const isActive = (href: string) => {
		if (href === '/dashboard') {
			return location === '/dashboard'
		}
		return location.startsWith(href)
	}

	return (
		<Sidebar collapsible="icon">
			<SidebarContent className="p-2">
				<SidebarGroup className="p-0">
					<SidebarGroupContent>
						<SidebarMenu>
							{/* Logo */}
							<SidebarLogo />

							{/* Divider */}
							<div className="my-2 h-px bg-border group-data-[collapsible=icon]:hidden" />

							{menuItems.map((item, index) => (
								<SidebarMenuItem key={item.title}>
									{index === 0 ? (
										<div className="sidebar-toggle-row flex w-full items-center">
											<SidebarMenuButton
												asChild
												tooltip={item.title}
												className="flex-1"
												isActive={isActive(item.href)}
											>
												<Link href={item.href}>
													<item.icon className="size-4" />
													<span>{item.title}</span>
												</Link>
											</SidebarMenuButton>
											<SidebarTrigger className="sidebar-trigger text-muted-foreground group-data-[collapsible=icon]:hidden" />
										</div>
									) : (
										<SidebarMenuButton asChild tooltip={item.title} isActive={isActive(item.href)}>
											<Link href={item.href}>
												<item.icon className="size-4" />
												<span>{item.title}</span>
											</Link>
										</SidebarMenuButton>
									)}
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="p-2">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="flex w-full items-center gap-2 rounded-md p-1.5 hover:bg-sidebar-accent"
						>
							<Avatar className="size-7">
								<AvatarImage src={user?.imageUrl} alt={user?.fullName ?? 'Usuario'} />
								<AvatarFallback>
									<User className="size-3.5" />
								</AvatarFallback>
							</Avatar>
							<span className="truncate text-sm group-data-[collapsible=icon]:hidden">
								{user?.firstName ?? 'Usuario'}
							</span>
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent side="top" align="start" className="w-56">
						<DropdownMenuLabel className="font-normal">
							<div className="flex flex-col space-y-1">
								<p className="text-sm font-medium leading-none">{user?.fullName}</p>
								<p className="text-xs leading-none text-muted-foreground">
									{user?.primaryEmailAddress?.emailAddress}
								</p>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<SignOutButton>
							<DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
								<LogOut className="mr-2 size-4" />
								<span>Sair</span>
							</DropdownMenuItem>
						</SignOutButton>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarFooter>
		</Sidebar>
	)
}
