/**
 * SSE (Server-Sent Events) Parser Utility
 *
 * Handles parsing of SSE stream data with JSON payloads.
 * Designed to handle incomplete chunks gracefully during streaming.
 */

export interface SSEParseResult {
	content: string | null
	stepUpdate: string | null
	error: Error | null
	done: boolean
}

/**
 * Parse a single SSE data line.
 *
 * @param line - A single line from the SSE stream (should start with "data: ")
 * @returns Parsed result with content, stepUpdate, error, or done flag
 * @throws Re-throws non-SyntaxError exceptions from JSON.parse
 */
export function parseSSELine(line: string): SSEParseResult {
	const trimmed = line.trim()

	// Empty lines or non-data lines
	if (!trimmed || !trimmed.startsWith('data: ')) {
		return { content: null, stepUpdate: null, error: null, done: false }
	}

	const data = trimmed.slice(6) // Remove 'data: ' prefix

	// Check for stream completion
	if (data === '[DONE]') {
		return { content: null, stepUpdate: null, error: null, done: true }
	}

	try {
		const parsed = JSON.parse(data)

		// Check for error in stream
		if (parsed.error) {
			return {
				content: null,
				stepUpdate: null,
				error: new Error(parsed.error.message || 'Unknown stream error'),
				done: false,
			}
		}

		return {
			content: parsed.content || null,
			stepUpdate: parsed.stepUpdate || null,
			error: null,
			done: false,
		}
	} catch (parseError) {
		// Ignore JSON parse errors for incomplete chunks (expected during streaming)
		if (parseError instanceof SyntaxError) {
			return { content: null, stepUpdate: null, error: null, done: false }
		}
		// Re-throw non-SyntaxError exceptions
		throw parseError
	}
}

/**
 * Parse multiple SSE lines from a buffer.
 *
 * @param buffer - Buffer containing potentially multiple SSE lines
 * @returns Object containing parsed results and remaining buffer
 */
export function parseSSEBuffer(buffer: string): {
	results: SSEParseResult[]
	remaining: string
} {
	const lines = buffer.split('\n')
	const remaining = lines.pop() ?? '' // Last line may be incomplete
	const results: SSEParseResult[] = []

	for (const line of lines) {
		const result = parseSSELine(line)
		// Only include non-empty results
		if (result.content || result.stepUpdate || result.error || result.done) {
			results.push(result)
		}
	}

	return { results, remaining }
}

/**
 * Accumulate content from multiple SSE parse results.
 *
 * @param results - Array of SSE parse results
 * @returns Accumulated content string
 */
export function accumulateContent(results: SSEParseResult[]): string {
	return results
		.filter((r) => r.content)
		.map((r) => r.content)
		.join('')
}
