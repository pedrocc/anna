import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	Spinner,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	Textarea,
} from '@repo/ui'
import {
	AlignmentType,
	BorderStyle,
	Document,
	HeadingLevel,
	Packer,
	Paragraph,
	Table,
	TableCell,
	TableRow,
	TextRun,
	WidthType,
} from 'docx'
import { saveAs } from 'file-saver'
import html2pdf from 'html2pdf.js'
import { Copy, Download, Edit, Eye, FileText, FileTextIcon, Save, Trash2 } from 'lucide-react'
import { type ChangeEvent, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface DocumentViewerProps {
	content: string
	title?: string
	onSave?: (content: string) => Promise<void>
	onDelete?: () => Promise<void>
	isSaving?: boolean
	isDeleting?: boolean
}

export function DocumentViewer({
	content,
	title,
	onSave,
	onDelete,
	isSaving,
	isDeleting,
}: DocumentViewerProps) {
	const [isEditing, setIsEditing] = useState(false)
	const [editedContent, setEditedContent] = useState(content)
	const [activeTab, setActiveTab] = useState<string>('preview')
	const [isExportingPdf, setIsExportingPdf] = useState(false)
	const [isExportingWord, setIsExportingWord] = useState(false)
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const contentRef = useRef<HTMLDivElement>(null)

	const handleSave = async () => {
		if (onSave) {
			await onSave(editedContent)
			setIsEditing(false)
		}
	}

	const handleCopy = async () => {
		await navigator.clipboard.writeText(editedContent)
	}

	const handleDownloadMarkdown = () => {
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

	const handleDownloadPdf = async () => {
		if (!contentRef.current) return

		setIsExportingPdf(true)
		try {
			const element = contentRef.current
			const opt: Record<string, unknown> = {
				margin: [15, 15, 15, 15],
				filename: `${title || 'documento'}.pdf`,
				image: { type: 'jpeg', quality: 0.98 },
				html2canvas: { scale: 2, useCORS: true },
				jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
			}

			await html2pdf().set(opt).from(element).save()
		} finally {
			setIsExportingPdf(false)
		}
	}

	const handleDownloadWord = async () => {
		setIsExportingWord(true)
		try {
			let contentToExport = isEditing ? editedContent : content
			// Remove code fences that may wrap the content
			contentToExport = contentToExport.replace(/^```(?:markdown|md)?\s*\n/i, '')
			contentToExport = contentToExport.replace(/\n```\s*$/g, '')
			const paragraphs = markdownToDocxParagraphs(contentToExport)

			const doc = new Document({
				sections: [
					{
						properties: {},
						children: paragraphs,
					},
				],
			})

			const blob = await Packer.toBlob(doc)
			saveAs(blob, `${title || 'documento'}.docx`)
		} finally {
			setIsExportingWord(false)
		}
	}

	const handleEdit = () => {
		setIsEditing(true)
		setActiveTab('edit')
	}

	const handleDelete = async () => {
		if (onDelete) {
			await onDelete()
			setShowDeleteDialog(false)
		}
	}

	const documentTitle = title || 'Documento'

	return (
		<div className="flex min-h-0 flex-1 flex-col bg-white">
			{/* Header */}
			<div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
				<h2 className="text-lg font-semibold text-foreground">{documentTitle}</h2>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={handleCopy} title="Copiar conteúdo">
						<Copy className="h-4 w-4" />
					</Button>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm" disabled={isExportingPdf || isExportingWord}>
								{isExportingPdf || isExportingWord ? (
									<Spinner className="h-4 w-4" />
								) : (
									<Download className="h-4 w-4" />
								)}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="border border-border bg-white">
							<DropdownMenuItem onClick={handleDownloadPdf} disabled={isExportingPdf}>
								<FileText className="mr-2 h-4 w-4" />
								Baixar como PDF
							</DropdownMenuItem>
							<DropdownMenuItem onClick={handleDownloadWord} disabled={isExportingWord}>
								<FileTextIcon className="mr-2 h-4 w-4" />
								Baixar como Word
							</DropdownMenuItem>
							<DropdownMenuItem onClick={handleDownloadMarkdown}>
								<Download className="mr-2 h-4 w-4" />
								Baixar como Markdown
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

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

					{onDelete && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowDeleteDialog(true)}
							className="text-destructive hover:bg-destructive/10 hover:text-destructive"
							title="Apagar documento"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					)}
				</div>
			</div>

			{/* Content */}
			<div className="flex min-h-0 flex-1 flex-col">
				{isEditing ? (
					<Tabs
						value={activeTab}
						onValueChange={setActiveTab}
						className="flex min-h-0 flex-1 flex-col overflow-hidden"
					>
						<div className="border-b border-border px-6">
							<TabsList className="h-12 bg-transparent p-0">
								<TabsTrigger
									value="edit"
									className="gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
								>
									<Edit className="h-4 w-4" />
									Editar
								</TabsTrigger>
								<TabsTrigger
									value="preview"
									className="gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
								>
									<Eye className="h-4 w-4" />
									Preview
								</TabsTrigger>
							</TabsList>
						</div>
						<TabsContent value="edit" className="m-0 min-h-0 flex-1 overflow-hidden p-6">
							<Textarea
								value={editedContent}
								onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditedContent(e.target.value)}
								className="h-full min-h-[400px] resize-none font-mono text-sm"
								placeholder="Conteúdo do documento em Markdown..."
							/>
						</TabsContent>
						<TabsContent value="preview" className="m-0 min-h-0 flex-1 overflow-auto">
							<div className="mx-auto max-w-4xl px-6 py-8">
								<div ref={contentRef} className="document-content">
									<MarkdownRenderer content={editedContent} />
								</div>
							</div>
						</TabsContent>
					</Tabs>
				) : (
					<div className="min-h-0 flex-1 overflow-auto">
						<div className="mx-auto max-w-4xl px-6 py-8">
							<div ref={contentRef} className="document-content">
								<MarkdownRenderer content={content} />
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Delete confirmation dialog */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent className="border border-border bg-white">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-foreground">Apagar documento?</AlertDialogTitle>
						<AlertDialogDescription className="text-muted-foreground">
							Esta ação não pode ser desfeita. O documento "{documentTitle}" será permanentemente
							apagado.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={isDeleting}
							className="bg-red-500 text-white hover:bg-red-600"
						>
							{isDeleting ? (
								<>
									<Spinner className="mr-2 h-4 w-4" />
									Apagando...
								</>
							) : (
								'Apagar'
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}

// Helper function to convert markdown to docx elements (paragraphs and tables)
function markdownToDocxParagraphs(markdown: string): (Paragraph | Table)[] {
	const elements: (Paragraph | Table)[] = []
	const lines = markdown.split('\n')

	let listItems: string[] = []
	let tableLines: string[] = []

	const flushList = () => {
		if (listItems.length > 0) {
			for (const item of listItems) {
				elements.push(
					new Paragraph({
						bullet: { level: 0 },
						children: parseInlineMarkdown(item),
						spacing: { after: 100 },
					})
				)
			}
			listItems = []
		}
	}

	const flushTable = () => {
		if (tableLines.length > 0) {
			const table = parseMarkdownTable(tableLines)
			if (table) {
				elements.push(table)
			}
			tableLines = []
		}
	}

	for (const line of lines) {
		// Check if line is part of a table (starts with |)
		if (line.trim().startsWith('|')) {
			flushList()
			tableLines.push(line)
			continue
		}

		// If we were building a table and this line doesn't start with |, flush the table
		if (tableLines.length > 0) {
			flushTable()
		}

		// Skip empty lines but flush lists first
		if (line.trim() === '') {
			flushList()
			continue
		}

		// Horizontal rule - render as spacing only (no visible line)
		if (/^(-{3,}|_{3,}|\*{3,})$/.test(line)) {
			flushList()
			elements.push(
				new Paragraph({
					children: [],
					spacing: { before: 200, after: 200 },
				})
			)
			continue
		}

		// Headers
		const h1Match = /^# (.+)$/.exec(line)
		if (h1Match?.[1]) {
			flushList()
			elements.push(
				new Paragraph({
					heading: HeadingLevel.HEADING_1,
					children: [new TextRun({ text: h1Match[1], bold: true, size: 48 })],
					spacing: { before: 400, after: 200 },
				})
			)
			continue
		}

		const h2Match = /^## (.+)$/.exec(line)
		if (h2Match?.[1]) {
			flushList()
			elements.push(
				new Paragraph({
					heading: HeadingLevel.HEADING_2,
					children: [new TextRun({ text: h2Match[1], bold: true, size: 36 })],
					spacing: { before: 300, after: 150 },
				})
			)
			continue
		}

		const h3Match = /^### (.+)$/.exec(line)
		if (h3Match?.[1]) {
			flushList()
			elements.push(
				new Paragraph({
					heading: HeadingLevel.HEADING_3,
					children: [new TextRun({ text: h3Match[1], bold: true, size: 28 })],
					spacing: { before: 200, after: 100 },
				})
			)
			continue
		}

		const h4Match = /^#### (.+)$/.exec(line)
		if (h4Match?.[1]) {
			flushList()
			elements.push(
				new Paragraph({
					heading: HeadingLevel.HEADING_4,
					children: [new TextRun({ text: h4Match[1], bold: true, size: 24 })],
					spacing: { before: 150, after: 100 },
				})
			)
			continue
		}

		// List items (- or *)
		const listMatch = /^[-*]\s+(.+)$/.exec(line)
		if (listMatch?.[1]) {
			listItems.push(listMatch[1])
			continue
		}

		// Numbered list items
		const numberedListMatch = /^\d+\.\s+(.+)$/.exec(line)
		if (numberedListMatch?.[1]) {
			flushList()
			elements.push(
				new Paragraph({
					children: parseInlineMarkdown(`• ${numberedListMatch[1]}`),
					spacing: { after: 100 },
					indent: { left: 360 },
				})
			)
			continue
		}

		// Blockquote
		const blockquoteMatch = /^>\s*(.+)$/.exec(line)
		if (blockquoteMatch?.[1]) {
			flushList()
			elements.push(
				new Paragraph({
					children: [new TextRun({ text: blockquoteMatch[1], italics: true, color: '666666' })],
					indent: { left: 720 },
					spacing: { before: 100, after: 100 },
				})
			)
			continue
		}

		// Italic text line (for signatures like *Product Brief gerado por...*)
		const italicLineMatch = /^\*([^*]+)\*$/.exec(line)
		if (italicLineMatch?.[1]) {
			flushList()
			elements.push(
				new Paragraph({
					children: [
						new TextRun({ text: italicLineMatch[1], italics: true, color: '888888', size: 20 }),
					],
					alignment: AlignmentType.CENTER,
					spacing: { before: 300, after: 100 },
				})
			)
			continue
		}

		// Regular paragraph
		flushList()
		elements.push(
			new Paragraph({
				children: parseInlineMarkdown(line),
				spacing: { after: 150 },
			})
		)
	}

	// Flush any remaining list items or table
	flushList()
	flushTable()

	return elements
}

// Parse markdown table into docx Table
function parseMarkdownTable(lines: string[]): Table | null {
	if (lines.length < 2) return null

	// Parse table rows
	const parseRow = (line: string): string[] => {
		return line
			.split('|')
			.map((cell) => cell.trim())
			.filter(
				(cell, index, arr) => (index > 0 && index < arr.length - 1) || (arr.length === 2 && cell)
			) // Remove empty first/last from split
	}

	const rows: string[][] = []
	let headerRow: string[] | null = null

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]?.trim() ?? ''

		// Skip separator row (|---|---|---|)
		if (/^\|[-:\s|]+\|$/.test(line) || /^[-:\s|]+$/.test(line)) {
			continue
		}

		const cells = parseRow(line)
		if (cells.length > 0) {
			if (headerRow === null) {
				headerRow = cells
			} else {
				rows.push(cells)
			}
		}
	}

	if (!headerRow || headerRow.length === 0) return null

	const columnCount = headerRow.length

	// Create border style
	const borderStyle = {
		style: BorderStyle.SINGLE,
		size: 1,
		color: 'CCCCCC',
	}

	// Create header row
	const tableHeaderRow = new TableRow({
		children: headerRow.map(
			(cell) =>
				new TableCell({
					children: [
						new Paragraph({
							children: [new TextRun({ text: cell, bold: true, size: 22 })],
						}),
					],
					shading: { fill: 'F5F5F5' },
					borders: {
						top: borderStyle,
						bottom: borderStyle,
						left: borderStyle,
						right: borderStyle,
					},
				})
		),
	})

	// Create data rows
	const tableDataRows = rows.map(
		(row) =>
			new TableRow({
				children: Array.from(
					{ length: columnCount },
					(_, i) =>
						new TableCell({
							children: [
								new Paragraph({
									children: parseInlineMarkdown(row[i] || ''),
								}),
							],
							borders: {
								top: borderStyle,
								bottom: borderStyle,
								left: borderStyle,
								right: borderStyle,
							},
						})
				),
			})
	)

	return new Table({
		width: {
			size: 100,
			type: WidthType.PERCENTAGE,
		},
		rows: [tableHeaderRow, ...tableDataRows],
	})
}

// Parse inline markdown (bold, italic, code)
function parseInlineMarkdown(text: string): TextRun[] {
	const runs: TextRun[] = []
	let remaining = text

	while (remaining.length > 0) {
		// Bold: **text**
		const boldMatch = /^(.*?)\*\*(.+?)\*\*(.*)$/.exec(remaining)
		if (boldMatch?.[1] !== undefined && boldMatch[2] && boldMatch[3] !== undefined) {
			if (boldMatch[1]) {
				runs.push(new TextRun({ text: boldMatch[1] }))
			}
			runs.push(new TextRun({ text: boldMatch[2], bold: true }))
			remaining = boldMatch[3]
			continue
		}

		// Italic: *text* (single asterisk)
		const italicMatch = /^(.*?)\*([^*]+)\*(.*)$/.exec(remaining)
		if (italicMatch?.[1] !== undefined && italicMatch[2] && italicMatch[3] !== undefined) {
			if (italicMatch[1]) {
				runs.push(new TextRun({ text: italicMatch[1] }))
			}
			runs.push(new TextRun({ text: italicMatch[2], italics: true }))
			remaining = italicMatch[3]
			continue
		}

		// Code: `text`
		const codeMatch = /^(.*?)`([^`]+)`(.*)$/.exec(remaining)
		if (codeMatch?.[1] !== undefined && codeMatch[2] && codeMatch[3] !== undefined) {
			if (codeMatch[1]) {
				runs.push(new TextRun({ text: codeMatch[1] }))
			}
			runs.push(new TextRun({ text: codeMatch[2], font: 'Courier New' }))
			remaining = codeMatch[3]
			continue
		}

		// No more inline formatting found
		runs.push(new TextRun({ text: remaining }))
		break
	}

	return runs
}

function MarkdownRenderer({ content }: { content: string }) {
	if (!content) return null

	// Clean up content: remove code fences if the entire content is wrapped in them
	let cleanContent = content.trim()

	// Check if content starts with code fence (```markdown, ```md, or just ```)
	const codeFenceMatch = cleanContent.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/i)
	if (codeFenceMatch?.[1]) {
		cleanContent = codeFenceMatch[1].trim()
	}

	// Also handle case where only opening fence exists (model didn't close it)
	if (
		cleanContent.startsWith('```markdown\n') ||
		cleanContent.startsWith('```md\n') ||
		cleanContent.startsWith('```\n')
	) {
		cleanContent = cleanContent.replace(/^```(?:markdown|md)?\n/, '')
		// Remove closing fence if present at the end
		cleanContent = cleanContent.replace(/\n```\s*$/, '')
	}

	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm]}
			components={{
				h1: ({ children }) => (
					<h1
						className="mb-6 break-words text-3xl font-bold tracking-tight text-foreground"
						style={{ fontFamily: 'Newsreader, Georgia, serif' }}
					>
						{children}
					</h1>
				),
				h2: ({ children }) => (
					<h2
						className="mb-4 mt-10 break-words border-b border-border pb-2 text-2xl font-semibold text-foreground"
						style={{ fontFamily: 'Newsreader, Georgia, serif' }}
					>
						{children}
					</h2>
				),
				h3: ({ children }) => (
					<h3 className="mb-3 mt-8 break-words text-xl font-semibold text-foreground">
						{children}
					</h3>
				),
				h4: ({ children }) => (
					<h4 className="mb-2 mt-6 break-words text-lg font-semibold text-foreground">
						{children}
					</h4>
				),
				p: ({ children }) => (
					<p className="mb-4 break-words leading-relaxed text-foreground">{children}</p>
				),
				ul: ({ children }) => (
					<ul className="mb-4 list-disc space-y-2 pl-6 text-foreground">{children}</ul>
				),
				ol: ({ children }) => (
					<ol className="mb-4 list-decimal space-y-2 pl-6 text-foreground">{children}</ol>
				),
				li: ({ children }) => <li className="break-words leading-relaxed">{children}</li>,
				strong: ({ children }) => (
					<strong className="font-semibold text-foreground">{children}</strong>
				),
				em: ({ children }) => <em className="italic">{children}</em>,
				blockquote: ({ children }) => (
					<blockquote className="my-6 border-l-4 border-primary bg-primary/5 py-3 pl-4 pr-4 italic text-muted-foreground">
						{children}
					</blockquote>
				),
				code: ({ children }) => (
					<code className="break-all rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
						{children}
					</code>
				),
				pre: ({ children }) => (
					<pre className="my-4 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-[#1e1e1e] p-4 text-sm text-gray-100">
						{children}
					</pre>
				),
				hr: () => <div className="my-6" />,
				// Table support (GFM)
				table: ({ children }) => (
					<div className="my-6 overflow-x-auto rounded-lg border border-border">
						<table className="min-w-full">{children}</table>
					</div>
				),
				thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
				tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
				tr: ({ children }) => <tr>{children}</tr>,
				th: ({ children }) => (
					<th className="break-words px-4 py-3 text-left text-sm font-semibold text-foreground">
						{children}
					</th>
				),
				td: ({ children }) => (
					<td className="break-words px-4 py-3 text-sm text-foreground">{children}</td>
				),
				// Links
				a: ({ href, children }) => (
					<a
						href={href}
						target="_blank"
						rel="noopener noreferrer"
						className="break-all text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
					>
						{children}
					</a>
				),
			}}
		>
			{cleanContent}
		</ReactMarkdown>
	)
}
