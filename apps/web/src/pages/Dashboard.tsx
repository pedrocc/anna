import { ScrollArea } from '@repo/ui'
import {
	ArrowRight,
	ArrowUpRight,
	CheckCircle2,
	ClipboardList,
	Clock,
	FileText,
	FolderKanban,
	FolderOpen,
	TrendingUp,
} from 'lucide-react'
import {
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts'
import { Link } from 'wouter'

// ============================================================================
// Data
// ============================================================================

const stats = [
	{
		title: 'Projetos Ativos',
		value: 12,
		change: '+2',
		icon: FolderOpen,
		accent: '#1d6ce0',
	},
	{
		title: 'Em Andamento',
		value: 8,
		change: '+3',
		icon: Clock,
		accent: '#f59e0b',
	},
	{
		title: 'Concluidos',
		value: 24,
		change: '+5',
		icon: CheckCircle2,
		accent: '#22c55e',
	},
	{
		title: 'Taxa de Conclusao',
		value: '67%',
		change: '+12%',
		icon: TrendingUp,
		accent: '#8b5cf6',
	},
]

const projectsByStatus = [
	{ name: 'Briefing', count: 4 },
	{ name: 'PRD', count: 3 },
	{ name: 'Planejamento', count: 5 },
	{ name: 'Execucao', count: 2 },
	{ name: 'Concluido', count: 8 },
]

const progressData = [
	{ month: 'Jul', projetos: 2, concluidos: 1 },
	{ month: 'Ago', projetos: 4, concluidos: 2 },
	{ month: 'Set', projetos: 6, concluidos: 4 },
	{ month: 'Out', projetos: 8, concluidos: 5 },
	{ month: 'Nov', projetos: 10, concluidos: 7 },
	{ month: 'Dez', projetos: 12, concluidos: 9 },
]

const recentProjects = [
	{
		name: 'App Delivery Sustentavel',
		status: 'Em andamento',
		progress: 65,
		accent: '#1d6ce0',
	},
	{
		name: 'Plataforma E-commerce',
		status: 'Revisao',
		progress: 90,
		accent: '#f59e0b',
	},
	{
		name: 'Sistema de Gestao',
		status: 'Briefing',
		progress: 15,
		accent: '#8b5cf6',
	},
	{
		name: 'App Financeiro',
		status: 'Planejamento',
		progress: 45,
		accent: '#22c55e',
	},
]

const quickActions = [
	{
		title: 'Novo Briefing',
		description: 'Defina o escopo do projeto',
		icon: FileText,
		href: '/briefing',
		accent: '#1d6ce0',
	},
	{
		title: 'Novo PRD',
		description: 'Documente requisitos',
		icon: FolderKanban,
		href: '/pm',
		accent: '#8b5cf6',
	},
	{
		title: 'Novo Planejamento',
		description: 'Crie user stories',
		icon: ClipboardList,
		href: '/requisitos',
		accent: '#22c55e',
	},
]

// ============================================================================
// Components
// ============================================================================

function StatCard({ stat, index }: { stat: (typeof stats)[0]; index: number }) {
	const Icon = stat.icon

	return (
		<div
			className="animate-fade-in"
			style={{
				animationDelay: `${index * 60}ms`,
				animationFillMode: 'forwards',
			}}
		>
			<div className="rounded-xl border border-border bg-white p-6 transition-colors hover:border-primary/30">
				<div className="flex items-start justify-between">
					<div>
						<p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
						<p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{stat.value}</p>
					</div>
					<div
						className="flex h-11 w-11 items-center justify-center rounded-xl"
						style={{
							background: `${stat.accent}15`,
						}}
					>
						<Icon className="h-5 w-5" style={{ color: stat.accent }} />
					</div>
				</div>

				<div className="mt-4 flex items-center gap-1.5">
					<div className="flex items-center gap-0.5 rounded-full bg-green-50 px-2 py-0.5">
						<ArrowUpRight className="h-3.5 w-3.5 text-green-600" />
						<span className="text-xs font-semibold text-green-600">{stat.change}</span>
					</div>
					<span className="text-xs text-muted-foreground">vs mes anterior</span>
				</div>
			</div>
		</div>
	)
}

function QuickActionCard({ action, index }: { action: (typeof quickActions)[0]; index: number }) {
	const Icon = action.icon

	return (
		<Link href={action.href}>
			<div
				className="animate-fade-in group cursor-pointer"
				style={{
					animationDelay: `${(index + 4) * 60}ms`,
					animationFillMode: 'forwards',
				}}
			>
				<div className="rounded-xl border border-border bg-white p-5 transition-colors hover:border-primary/30">
					<div className="flex items-center gap-4">
						<div
							className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
							style={{
								background: `${action.accent}15`,
							}}
						>
							<Icon className="h-5 w-5" style={{ color: action.accent }} />
						</div>
						<div className="flex-1">
							<p className="font-semibold text-foreground">{action.title}</p>
							<p className="text-sm text-muted-foreground">{action.description}</p>
						</div>
						<ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
					</div>
				</div>
			</div>
		</Link>
	)
}

function ChartCard({
	title,
	subtitle,
	children,
	delay,
}: {
	title: string
	subtitle: string
	children: React.ReactNode
	delay: number
}) {
	return (
		<div
			className="animate-fade-in rounded-xl border border-border bg-white"
			style={{
				animationDelay: `${delay}ms`,
				animationFillMode: 'forwards',
			}}
		>
			<div className="p-6">
				<h3 className="text-lg font-semibold text-foreground">{title}</h3>
				<p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
			</div>
			<div className="px-6 pb-6">{children}</div>
		</div>
	)
}

function ProjectCard({ project, index }: { project: (typeof recentProjects)[0]; index: number }) {
	return (
		<div
			className="animate-fade-in flex items-center gap-4 rounded-lg p-4 transition-colors hover:bg-[#f9fafb]"
			style={{
				animationDelay: `${index * 50}ms`,
				animationFillMode: 'forwards',
			}}
		>
			<div className="h-10 w-1 rounded-full" style={{ background: project.accent }} />
			<div className="flex-1">
				<div className="flex items-center gap-3">
					<p className="font-medium text-foreground">{project.name}</p>
					<span
						className="rounded-full px-2 py-0.5 text-xs font-medium"
						style={{
							background: `${project.accent}15`,
							color: project.accent,
						}}
					>
						{project.status}
					</span>
				</div>
				<div className="mt-2 flex items-center gap-3">
					<div className="h-1.5 w-32 overflow-hidden rounded-full bg-border">
						<div
							className="h-full rounded-full transition-all duration-500"
							style={{
								width: `${project.progress}%`,
								background: project.accent,
							}}
						/>
					</div>
					<span className="text-xs font-medium text-muted-foreground">{project.progress}%</span>
				</div>
			</div>
		</div>
	)
}

// Custom tooltip
function CustomTooltip({
	active,
	payload,
	label,
}: {
	active?: boolean
	payload?: Array<{ value: number; name: string; color: string }>
	label?: string
}) {
	if (!active || !payload) return null
	return (
		<div className="rounded-lg border border-border bg-white px-3 py-2 shadow-sm">
			<p className="mb-1 text-sm font-medium text-foreground">{label}</p>
			{payload.map((entry, index) => (
				<p key={index} className="text-sm" style={{ color: entry.color }}>
					{entry.name}: <span className="font-semibold">{entry.value}</span>
				</p>
			))}
		</div>
	)
}

// ============================================================================
// Main Component
// ============================================================================

export function DashboardPage() {
	return (
		<ScrollArea className="h-[calc(100vh-4rem)]">
			<div className="min-h-full bg-[#f9fafb] px-6 py-8 md:px-8">
				<div className="mx-auto max-w-5xl">
					{/* Header */}
					<div className="animate-fade-in mb-8" style={{ animationFillMode: 'forwards' }}>
						<h1
							className="text-3xl font-semibold tracking-tight text-foreground"
							style={{ fontFamily: 'Newsreader, Georgia, serif' }}
						>
							Como estao seus projetos?
						</h1>
						<p className="mt-2 text-lg text-muted-foreground">
							Acompanhe o progresso das suas iniciativas em um so lugar.
						</p>
					</div>

					{/* Stats Grid */}
					<div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{stats.map((stat, index) => (
							<StatCard key={stat.title} stat={stat} index={index} />
						))}
					</div>

					{/* Quick Actions */}
					<div className="mb-8">
						<h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
							Acoes Rapidas
						</h2>
						<div className="grid gap-4 sm:grid-cols-3">
							{quickActions.map((action, index) => (
								<QuickActionCard key={action.title} action={action} index={index} />
							))}
						</div>
					</div>

					{/* Charts Row */}
					<div className="mb-8 grid gap-6 lg:grid-cols-2">
						<ChartCard
							title="Projetos por Status"
							subtitle="Distribuicao atual dos projetos"
							delay={480}
						>
							<ResponsiveContainer width="100%" height={240}>
								<BarChart
									data={projectsByStatus}
									layout="vertical"
									margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
								>
									<CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" />
									<XAxis
										type="number"
										tick={{ fill: '#71717a', fontSize: 12 }}
										axisLine={false}
										tickLine={false}
									/>
									<YAxis
										dataKey="name"
										type="category"
										width={100}
										tick={{ fill: '#3f3f46', fontSize: 12 }}
										axisLine={false}
										tickLine={false}
									/>
									<Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
									<Bar dataKey="count" fill="#1d6ce0" radius={[0, 6, 6, 0]} name="Projetos" />
								</BarChart>
							</ResponsiveContainer>
						</ChartCard>

						<ChartCard
							title="Progresso ao Longo do Tempo"
							subtitle="Projetos iniciados vs concluidos"
							delay={540}
						>
							<ResponsiveContainer width="100%" height={240}>
								<LineChart data={progressData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
									<CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
									<XAxis
										dataKey="month"
										tick={{ fill: '#71717a', fontSize: 12 }}
										axisLine={false}
										tickLine={false}
									/>
									<YAxis
										tick={{ fill: '#71717a', fontSize: 12 }}
										axisLine={false}
										tickLine={false}
									/>
									<Tooltip content={<CustomTooltip />} />
									<Line
										type="monotone"
										dataKey="projetos"
										stroke="#1d6ce0"
										strokeWidth={2}
										dot={{ fill: '#1d6ce0', strokeWidth: 0, r: 4 }}
										activeDot={{ r: 6, fill: '#1d6ce0' }}
										name="Iniciados"
									/>
									<Line
										type="monotone"
										dataKey="concluidos"
										stroke="#22c55e"
										strokeWidth={2}
										dot={{ fill: '#22c55e', strokeWidth: 0, r: 4 }}
										activeDot={{ r: 6, fill: '#22c55e' }}
										name="Concluidos"
									/>
								</LineChart>
							</ResponsiveContainer>
						</ChartCard>
					</div>

					{/* Recent Projects */}
					<div
						className="animate-fade-in rounded-xl border border-border bg-white"
						style={{
							animationDelay: '600ms',
							animationFillMode: 'forwards',
						}}
					>
						<div className="p-6 pb-2">
							<h3 className="text-lg font-semibold text-foreground">Projetos Recentes</h3>
							<p className="mt-1 text-sm text-muted-foreground">Ultimos projetos atualizados</p>
						</div>
						<div className="px-4 pb-4">
							{recentProjects.map((project, index) => (
								<ProjectCard key={project.name} project={project} index={index} />
							))}
						</div>
					</div>
				</div>
			</div>
		</ScrollArea>
	)
}
