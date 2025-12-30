import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarTrigger,
} from '@repo/ui'
import { Home, Lightbulb, Settings } from 'lucide-react'
import type { ComponentType } from 'react'
import { Link, useLocation } from 'wouter'

interface MenuItem {
	readonly title: string
	readonly href: string
	readonly icon: ComponentType<{ className?: string }>
}

const menuItems: MenuItem[] = [
	{ title: 'Home', href: '/', icon: Home },
	{ title: 'Brainstorm', href: '/brainstorm', icon: Lightbulb },
	{ title: 'Settings', href: '/settings', icon: Settings },
]

export function AppSidebar() {
	const [location] = useLocation()

	const isActive = (href: string) => {
		if (href === '/') {
			return location === '/'
		}
		return location.startsWith(href)
	}

	return (
		<Sidebar
			collapsible="icon"
			style={{ top: 'var(--header-height)', height: 'calc(100svh - var(--header-height))' }}
		>
			<SidebarContent className="p-2">
				<SidebarGroup className="p-0">
					<SidebarGroupContent>
						<SidebarMenu>
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
											<SidebarTrigger className="sidebar-trigger text-muted-foreground" />
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
		</Sidebar>
	)
}
