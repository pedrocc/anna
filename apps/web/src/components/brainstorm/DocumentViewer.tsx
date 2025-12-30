import {
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	Textarea,
} from '@repo/ui'
import { Copy, Download, Edit, Eye, Save } from 'lucide-react'
import { type ChangeEvent, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface DocumentViewerProps {
	content: string
	title?: string
	onSave?: (content: string) => Promise<void>
	isSaving?: boolean
}

export function DocumentViewer({ content, title, onSave, isSaving }: DocumentViewerProps) {
	const [isEditing, setIsEditing] = useState(false)
	const [editedContent, setEditedContent] = useState(content)
	const [activeTab, setActiveTab] = useState<string>('preview')

	const handleSave = async () => {
		if (onSave) {
			await onSave(editedContent)
			setIsEditing(false)
		}
	}

	const handleCopy = async () => {
		await navigator.clipboard.writeText(editedContent)
	}

	const handleDownload = () => {
		const blob = new Blob([editedContent], { type: 'text/markdown' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `${title || 'documento'}.md`
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)
	}

	const handleEdit = () => {
		setIsEditing(true)
		setActiveTab('edit')
	}

	return (
		<Card className="flex h-full flex-col">
			<CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
				<CardTitle className="text-lg">{title || 'Documento'}</CardTitle>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={handleCopy} title="Copiar">
						<Copy className="h-4 w-4" />
					</Button>
					<Button variant="outline" size="sm" onClick={handleDownload} title="Download">
						<Download className="h-4 w-4" />
					</Button>
					{!isEditing ? (
						<Button variant="outline" size="sm" onClick={handleEdit}>
							<Edit className="mr-2 h-4 w-4" />
							Editar
						</Button>
					) : (
						<Button size="sm" onClick={handleSave} disabled={isSaving}>
							<Save className="mr-2 h-4 w-4" />
							{isSaving ? 'Salvando...' : 'Salvar'}
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className="flex-1 overflow-hidden p-0">
				{isEditing ? (
					<Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
						<div className="border-b px-4">
							<TabsList>
								<TabsTrigger value="edit">
									<Edit className="mr-2 h-4 w-4" />
									Editar
								</TabsTrigger>
								<TabsTrigger value="preview">
									<Eye className="mr-2 h-4 w-4" />
									Preview
								</TabsTrigger>
							</TabsList>
						</div>
						<TabsContent value="edit" className="mt-0 flex-1 p-4">
							<Textarea
								value={editedContent}
								onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditedContent(e.target.value)}
								className="h-full min-h-[400px] resize-none font-mono text-sm"
								placeholder="Conteudo do documento em Markdown..."
							/>
						</TabsContent>
						<TabsContent value="preview" className="mt-0 flex-1 overflow-auto p-4">
							<div className="prose prose-sm max-w-none break-words dark:prose-invert">
								<MarkdownRenderer content={editedContent} />
							</div>
						</TabsContent>
					</Tabs>
				) : (
					<div className="h-full overflow-auto p-4">
						<div className="prose prose-sm max-w-none break-words dark:prose-invert">
							<MarkdownRenderer content={content} />
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

function MarkdownRenderer({ content }: { content: string }) {
	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm]}
			components={{
				h1: ({ children }) => (
					<h1 className="mb-4 break-words text-2xl font-bold">{children}</h1>
				),
				h2: ({ children }) => (
					<h2 className="mb-3 mt-6 break-words text-xl font-bold">{children}</h2>
				),
				h3: ({ children }) => (
					<h3 className="mb-2 mt-4 break-words text-lg font-semibold">{children}</h3>
				),
				p: ({ children }) => <p className="mb-3 break-words">{children}</p>,
				ul: ({ children }) => <ul className="mb-3 list-disc pl-6">{children}</ul>,
				ol: ({ children }) => <ol className="mb-3 list-decimal pl-6">{children}</ol>,
				li: ({ children }) => <li className="mb-1 break-words">{children}</li>,
				strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
				em: ({ children }) => <em className="italic">{children}</em>,
				blockquote: ({ children }) => (
					<blockquote className="my-3 border-l-4 border-primary/50 pl-4 italic">
						{children}
					</blockquote>
				),
				code: ({ children }) => (
					<code className="break-all rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
						{children}
					</code>
				),
				pre: ({ children }) => (
					<pre className="my-3 overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-muted p-4">
						{children}
					</pre>
				),
				hr: () => <hr className="my-6 border-border" />,
				// Table support (GFM)
				table: ({ children }) => (
					<div className="my-4 overflow-x-auto">
						<table className="min-w-full border-collapse border border-border">
							{children}
						</table>
					</div>
				),
				thead: ({ children }) => (
					<thead className="bg-muted/50">{children}</thead>
				),
				tbody: ({ children }) => <tbody>{children}</tbody>,
				tr: ({ children }) => (
					<tr className="border-b border-border">{children}</tr>
				),
				th: ({ children }) => (
					<th className="break-words border border-border px-4 py-2 text-left font-semibold">
						{children}
					</th>
				),
				td: ({ children }) => (
					<td className="break-words border border-border px-4 py-2">{children}</td>
				),
				// Links
				a: ({ href, children }) => (
					<a
						href={href}
						target="_blank"
						rel="noopener noreferrer"
						className="break-all text-primary underline hover:text-primary/80"
					>
						{children}
					</a>
				),
			}}
		>
			{content}
		</ReactMarkdown>
	)
}
