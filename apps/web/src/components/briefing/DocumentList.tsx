import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '@repo/ui'
import { Calendar, FileText, RefreshCw } from 'lucide-react'
import type { BriefingDocumentFromAPI } from '../../lib/api-client'

interface DocumentListProps {
	documents: BriefingDocumentFromAPI[]
	selectedDocumentId: string | null
	onSelectDocument: (doc: BriefingDocumentFromAPI) => void
	onGenerateNew: () => void
	isGenerating: boolean
}

const documentTypeLabels: Record<string, string> = {
	product_brief: 'Product Brief',
	executive_summary: 'Resumo Executivo',
	vision_statement: 'Statement de Visao',
	user_personas: 'Personas',
	metrics_dashboard: 'Metricas',
	mvp_scope: 'Escopo MVP',
	custom: 'Documento Customizado',
}

const documentTypeColors: Record<string, string> = {
	product_brief: 'bg-primary/10 text-primary',
	executive_summary: 'bg-blue-500/10 text-blue-500',
	vision_statement: 'bg-purple-500/10 text-purple-500',
	user_personas: 'bg-green-500/10 text-green-500',
	metrics_dashboard: 'bg-orange-500/10 text-orange-500',
	mvp_scope: 'bg-cyan-500/10 text-cyan-500',
	custom: 'bg-muted text-muted-foreground',
}

function formatDate(dateString: string) {
	const date = new Date(dateString)
	return date.toLocaleDateString('pt-BR', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

export function DocumentList({
	documents,
	selectedDocumentId,
	onSelectDocument,
	onGenerateNew,
	isGenerating,
}: DocumentListProps) {
	if (documents.length === 0) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-4">
				<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
					<FileText className="h-8 w-8 text-muted-foreground" />
				</div>
				<div className="text-center">
					<h3 className="font-medium">Nenhum documento gerado</h3>
					<p className="mt-1 text-sm text-muted-foreground">
						Clique no botao abaixo para gerar seu primeiro documento
					</p>
				</div>
				<Button onClick={onGenerateNew} disabled={isGenerating}>
					{isGenerating ? (
						<>
							<Spinner className="mr-2 h-4 w-4" />
							Gerando...
						</>
					) : (
						<>
							<FileText className="mr-2 h-4 w-4" />
							Gerar Documento
						</>
					)}
				</Button>
			</div>
		)
	}

	return (
		<div className="flex h-full flex-col gap-4">
			{/* Header with generate button */}
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">Documentos ({documents.length})</h3>
				<Button onClick={onGenerateNew} disabled={isGenerating} variant="outline" size="sm">
					{isGenerating ? (
						<>
							<Spinner className="mr-2 h-4 w-4" />
							Gerando...
						</>
					) : (
						<>
							<RefreshCw className="mr-2 h-4 w-4" />
							Gerar Nova Versao
						</>
					)}
				</Button>
			</div>

			{/* Document list */}
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{documents.map((doc) => (
					<Card
						key={doc.id}
						className={`cursor-pointer transition-all hover:border-primary/50 ${
							selectedDocumentId === doc.id ? 'border-primary ring-1 ring-primary' : ''
						}`}
						onClick={() => onSelectDocument(doc)}
					>
						<CardHeader className="pb-2">
							<div className="flex items-start justify-between gap-2">
								<Badge
									variant="secondary"
									className={`${documentTypeColors[doc.type] ?? documentTypeColors['custom']} shrink-0`}
								>
									{documentTypeLabels[doc.type] ?? doc.type}
								</Badge>
								{doc.version > 1 && (
									<Badge variant="outline" className="shrink-0 text-xs">
										v{doc.version}
									</Badge>
								)}
							</div>
							<CardTitle className="line-clamp-2 text-base">{doc.title}</CardTitle>
						</CardHeader>
						<CardContent className="pt-0">
							<div className="flex items-center gap-1 text-xs text-muted-foreground">
								<Calendar className="h-3 w-3" />
								{formatDate(doc.createdAt)}
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	)
}
