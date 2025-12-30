import type { BrainstormStep } from '@repo/shared'
import { Button, Card, CardContent } from '@repo/ui'
import { ThumbsUp } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { ChatInput } from './ChatInput'
import { ChatMessage } from './ChatMessage'

interface ChatInterfaceProps {
	messages: Array<{ id: string; role: string; content: string }>
	onSendMessage: (message: string) => void
	isStreaming: boolean
	streamingContent: string
	pendingUserMessage: string | null
	currentStep?: BrainstormStep
}

export function ChatInterface({
	messages,
	onSendMessage,
	isStreaming,
	streamingContent,
	pendingUserMessage,
	currentStep,
}: ChatInterfaceProps) {
	const scrollRef = useRef<HTMLDivElement>(null)

	// Auto-scroll on new messages
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollIntoView({ behavior: 'smooth' })
		}
	}, [messages, streamingContent, pendingUserMessage])

	// Show action buttons during technique or execution phase when not streaming
	const showActionButtons = (currentStep === 'technique' || currentStep === 'execution') && !isStreaming && !pendingUserMessage && messages.length > 0

	return (
		<Card className="flex h-full flex-col overflow-hidden">
			<CardContent className="flex min-h-0 flex-1 flex-col p-0">
				{/* Messages area */}
				<div className="min-h-0 flex-1 overflow-y-auto p-4">
					<div className="space-y-4">
						{messages
							.filter((m) => m.role !== 'system')
							.map((msg) => (
								<ChatMessage
									key={msg.id}
									messageRole={msg.role as 'user' | 'assistant'}
									content={msg.content}
								/>
							))}

						{/* Pending user message (shown immediately while waiting for response) */}
						{pendingUserMessage && (
							<ChatMessage
								key="pending-user"
								messageRole="user"
								content={pendingUserMessage}
							/>
						)}

						{/* Streaming response */}
						{isStreaming && streamingContent && (
							<ChatMessage messageRole="assistant" content={streamingContent} isStreaming />
						)}

						{/* Action button for technique phase */}
						{showActionButtons && (
							<div className="flex justify-center py-2">
								<Button
									variant="default"
									size="sm"
									onClick={() => onSendMessage('Estou satisfeito, vamos seguir em frente')}
								>
									<ThumbsUp className="mr-2 h-4 w-4" />
									Estou satisfeito
								</Button>
							</div>
						)}

						<div ref={scrollRef} />
					</div>
				</div>

				{/* Input area */}
				<div className="shrink-0 border-t p-4">
					<ChatInput onSend={onSendMessage} disabled={isStreaming} />
				</div>
			</CardContent>
		</Card>
	)
}
