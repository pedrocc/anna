import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui'

interface StatCardProps {
	readonly title: string
	readonly value: number | string
	readonly description: string
}

export function StatCard({ title, value, description }: StatCardProps) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-base font-semibold">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-3xl font-bold text-primary">{value}</p>
				<p className="text-sm text-muted-foreground">{description}</p>
			</CardContent>
		</Card>
	)
}
