import { Button, Textarea } from '@repo/ui'
import { Loader2, Send } from 'lucide-react'
import { type ChangeEvent, type KeyboardEvent, useRef, useState } from 'react'

interface ChatInputProps {
	onSend: (message: string) => void
	disabled?: boolean
	placeholder?: string
}

export function ChatInput({
	onSend,
	disabled,
	placeholder = 'Digite sua mensagem...',
}: ChatInputProps) {
	const [input, setInput] = useState('')
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const handleSubmit = () => {
		const trimmed = input.trim()
		if (trimmed && !disabled) {
			onSend(trimmed)
			setInput('')
			// Manter foco no textarea após enviar
			setTimeout(() => {
				textareaRef.current?.focus()
			}, 0)
		}
	}

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSubmit()
		}
	}

	return (
		<div className="flex gap-2">
			<Textarea
				ref={textareaRef}
				value={input}
				onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				disabled={disabled}
				className="min-h-[60px] resize-none"
				rows={2}
			/>
			<Button
				type="button"
				size="icon"
				onClick={handleSubmit}
				disabled={disabled || !input.trim()}
				className="h-[60px] w-[60px] shrink-0"
			>
				{disabled ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
			</Button>
		</div>
	)
}
