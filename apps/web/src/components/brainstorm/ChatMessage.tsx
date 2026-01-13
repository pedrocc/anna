import { Avatar, AvatarFallback, Button, cn } from '@repo/ui'
import { Bot, Check, Copy, Pencil, User } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export interface ChatMessageProps {
	messageRole: 'user' | 'assistant' | 'system'
	content: string
	isStreaming?: boolean
	messageId?: string
	onEdit?: (messageId: string) => void
	isEditable?: boolean
	editDisabled?: boolean
}

// Clean up content: remove code fences and fix formatting issues
function cleanMarkdownContent(text: string): string {
	let cleanContent = text.trim()

	// Remove ALL markdown/json code fences anywhere in the content
	// This handles cases where the model wraps parts of the response in code fences
	cleanContent = cleanContent.replace(/```(?:markdown|md|json)?\s*\n/gi, '')
	cleanContent = cleanContent.replace(/\n```\s*/g, '\n')
	cleanContent = cleanContent.replace(/^```(?:json)?\s*/gi, '')

	// Remove leading indentation that causes code blocks (4+ spaces at start of lines)
	// But preserve intentional list indentation (2 spaces)
	const lines = cleanContent.split('\n')
	const cleanedLines = lines.map((line) => {
		// If line starts with 4+ spaces and is not empty, remove extra indentation
		// Keep 2 spaces for nested lists
		const match = /^( {4,})(.*)$/.exec(line)
		if (match?.[2] !== undefined) {
			// Check if it's a list item continuation
			const content = match[2]
			if (content.startsWith('- ') || content.startsWith('* ') || /^\d+\./.test(content)) {
				return `  ${content}` // Keep as nested list
			}
			return content // Remove all leading spaces
		}
		return line
	})

	return cleanedLines.join('\n')
}

export function ChatMessage({
	messageRole,
	content,
	isStreaming,
	messageId,
	onEdit,
	isEditable = false,
	editDisabled = false,
}: ChatMessageProps) {
	const isUser = messageRole === 'user'
	// For user messages, just trim whitespace. For assistant, clean markdown artifacts.
	const cleanedContent = isUser ? content.trim() : cleanMarkdownContent(content)
	const showEditButton = isUser && isEditable && messageId && onEdit && !editDisabled
	const [copied, setCopied] = useState(false)

	const handleCopy = async () => {
		await navigator.clipboard.writeText(content)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<div className={cn('group flex w-full gap-3', isUser && 'flex-row-reverse')}>
			<Avatar className="h-8 w-8 shrink-0">
				{isUser ? (
					<AvatarFallback className="bg-primary text-primary-foreground">
						<User className="h-4 w-4" />
					</AvatarFallback>
				) : (
					<AvatarFallback className="bg-muted">
						<Bot className="h-4 w-4" />
					</AvatarFallback>
				)}
			</Avatar>

			<div className={cn('flex items-start gap-2', isUser && 'flex-row-reverse')}>
				<div
					className={cn(
						'rounded-lg px-4 py-3',
						isUser
							? 'inline-block max-w-[85%] bg-primary text-primary-foreground'
							: 'flex-1 bg-muted'
					)}
				>
					{isUser ? (
						// User messages: render as plain text
						<p className="text-sm whitespace-pre-wrap">{cleanedContent}</p>
					) : (
						// Assistant messages: render with markdown
						<>
							<div className="prose prose-sm max-w-none">
								<ReactMarkdown
									remarkPlugins={[remarkGfm]}
									components={{
										// Style markdown elements
										p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
										ul: ({ children }) => <ul className="mb-2 list-disc pl-4">{children}</ul>,
										ol: ({ children }) => <ol className="mb-2 list-decimal pl-4">{children}</ol>,
										li: ({ children }) => <li className="mb-1">{children}</li>,
										strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
										em: ({ children }) => <em className="italic">{children}</em>,
										code: ({ children }) => (
											<code className="rounded bg-black/10 px-1 py-0.5 text-sm dark:bg-white/10">
												{children}
											</code>
										),
										h1: ({ children }) => <h1 className="mb-2 text-lg font-bold">{children}</h1>,
										h2: ({ children }) => <h2 className="mb-2 text-base font-bold">{children}</h2>,
										h3: ({ children }) => <h3 className="mb-2 text-sm font-bold">{children}</h3>,
										// Horizontal rule - just spacing, no visible line
										hr: () => <div className="my-3" />,
										// Table elements
										table: ({ children }) => (
											<div className="my-2 overflow-x-auto">
												<table className="min-w-full border-collapse text-sm">{children}</table>
											</div>
										),
										thead: ({ children }) => <thead className="border-b">{children}</thead>,
										tbody: ({ children }) => <tbody>{children}</tbody>,
										tr: ({ children }) => <tr className="border-b last:border-0">{children}</tr>,
										th: ({ children }) => (
											<th className="px-3 py-2 text-left font-semibold">{children}</th>
										),
										td: ({ children }) => <td className="px-3 py-2">{children}</td>,
									}}
								>
									{cleanedContent}
								</ReactMarkdown>
							</div>
							{/* Copy button - appears on hover */}
							{!isStreaming && (
								<button
									type="button"
									onClick={handleCopy}
									className="mt-2 flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
									title="Copiar texto"
								>
									{copied ? (
										<>
											<Check className="h-3 w-3" />
											<span>Copiado!</span>
										</>
									) : (
										<>
											<Copy className="h-3 w-3" />
											<span>Copiar</span>
										</>
									)}
								</button>
							)}
						</>
					)}
					{isStreaming && <span className="mt-1 inline-block h-4 w-1 animate-pulse bg-current" />}
				</div>

				{showEditButton && (
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
						onClick={() => onEdit(messageId)}
						title="Editar mensagem"
					>
						<Pencil className="h-3.5 w-3.5" />
					</Button>
				)}
			</div>
		</div>
	)
}
