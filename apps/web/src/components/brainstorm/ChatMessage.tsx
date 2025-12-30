import { Avatar, AvatarFallback, cn } from '@repo/ui'
import { Bot, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export interface ChatMessageProps {
	messageRole: 'user' | 'assistant' | 'system'
	content: string
	isStreaming?: boolean
}

export function ChatMessage({ messageRole, content, isStreaming }: ChatMessageProps) {
	const isUser = messageRole === 'user'

	return (
		<div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
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

			<div
				className={cn(
					'max-w-[80%] rounded-lg px-4 py-3',
					isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
				)}
			>
				<div className={cn('prose prose-sm max-w-none', isUser && 'prose-invert')}>
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
						{content}
					</ReactMarkdown>
				</div>
				{isStreaming && <span className="mt-1 inline-block h-4 w-1 animate-pulse bg-current" />}
			</div>
		</div>
	)
}
