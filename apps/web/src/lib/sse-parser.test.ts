import { describe, expect, it } from 'bun:test'
import {
	accumulateContent,
	parseSSEBuffer,
	parseSSELine,
	type SSEParseResult,
} from './sse-parser.js'

describe('SSE Parser', () => {
	describe('parseSSELine', () => {
		it('should parse valid JSON content', () => {
			const result = parseSSELine('data: {"content":"Hello"}')
			expect(result.content).toBe('Hello')
			expect(result.stepUpdate).toBeNull()
			expect(result.error).toBeNull()
			expect(result.done).toBe(false)
		})

		it('should parse step updates', () => {
			const result = parseSSELine('data: {"stepUpdate":"step_2"}')
			expect(result.content).toBeNull()
			expect(result.stepUpdate).toBe('step_2')
			expect(result.error).toBeNull()
			expect(result.done).toBe(false)
		})

		it('should parse combined content and step update', () => {
			const result = parseSSELine('data: {"content":"World","stepUpdate":"step_3"}')
			expect(result.content).toBe('World')
			expect(result.stepUpdate).toBe('step_3')
			expect(result.error).toBeNull()
			expect(result.done).toBe(false)
		})

		it('should detect [DONE] marker', () => {
			const result = parseSSELine('data: [DONE]')
			expect(result.content).toBeNull()
			expect(result.stepUpdate).toBeNull()
			expect(result.error).toBeNull()
			expect(result.done).toBe(true)
		})

		it('should handle stream errors', () => {
			const result = parseSSELine('data: {"error":{"message":"Rate limit exceeded"}}')
			expect(result.content).toBeNull()
			expect(result.stepUpdate).toBeNull()
			expect(result.error).toBeInstanceOf(Error)
			expect(result.error?.message).toBe('Rate limit exceeded')
			expect(result.done).toBe(false)
		})

		it('should return empty result for empty lines', () => {
			const result = parseSSELine('')
			expect(result.content).toBeNull()
			expect(result.stepUpdate).toBeNull()
			expect(result.error).toBeNull()
			expect(result.done).toBe(false)
		})

		it('should return empty result for whitespace-only lines', () => {
			const result = parseSSELine('   \t  ')
			expect(result.content).toBeNull()
			expect(result.stepUpdate).toBeNull()
			expect(result.error).toBeNull()
			expect(result.done).toBe(false)
		})

		it('should return empty result for lines without data: prefix', () => {
			const result = parseSSELine('event: message')
			expect(result.content).toBeNull()
			expect(result.stepUpdate).toBeNull()
			expect(result.error).toBeNull()
			expect(result.done).toBe(false)
		})

		describe('JSON parse error handling', () => {
			it('should silently ignore truncated JSON (incomplete object)', () => {
				const result = parseSSELine('data: {"content":"Hell')
				expect(result.content).toBeNull()
				expect(result.stepUpdate).toBeNull()
				expect(result.error).toBeNull()
				expect(result.done).toBe(false)
			})

			it('should silently ignore truncated JSON (missing closing brace)', () => {
				const result = parseSSELine('data: {"content":"Hello"')
				expect(result.content).toBeNull()
				expect(result.stepUpdate).toBeNull()
				expect(result.error).toBeNull()
				expect(result.done).toBe(false)
			})

			it('should silently ignore malformed JSON (extra comma)', () => {
				const result = parseSSELine('data: {"content":"Hello",}')
				expect(result.content).toBeNull()
				expect(result.stepUpdate).toBeNull()
				expect(result.error).toBeNull()
				expect(result.done).toBe(false)
			})

			it('should silently ignore malformed JSON (unquoted key)', () => {
				const result = parseSSELine('data: {content:"Hello"}')
				expect(result.content).toBeNull()
				expect(result.stepUpdate).toBeNull()
				expect(result.error).toBeNull()
				expect(result.done).toBe(false)
			})

			it('should silently ignore malformed JSON (single quotes)', () => {
				const result = parseSSELine("data: {'content':'Hello'}")
				expect(result.content).toBeNull()
				expect(result.stepUpdate).toBeNull()
				expect(result.error).toBeNull()
				expect(result.done).toBe(false)
			})

			it('should silently ignore malformed JSON (missing colon)', () => {
				const result = parseSSELine('data: {"content" "Hello"}')
				expect(result.content).toBeNull()
				expect(result.stepUpdate).toBeNull()
				expect(result.error).toBeNull()
				expect(result.done).toBe(false)
			})

			it('should silently ignore completely invalid JSON', () => {
				const result = parseSSELine('data: not-json-at-all')
				expect(result.content).toBeNull()
				expect(result.stepUpdate).toBeNull()
				expect(result.error).toBeNull()
				expect(result.done).toBe(false)
			})

			it('should silently ignore binary garbage', () => {
				const result = parseSSELine('data: \x00\x01\x02\x03')
				expect(result.content).toBeNull()
				expect(result.stepUpdate).toBeNull()
				expect(result.error).toBeNull()
				expect(result.done).toBe(false)
			})

			it('should silently ignore empty object', () => {
				const result = parseSSELine('data: {}')
				expect(result.content).toBeNull()
				expect(result.stepUpdate).toBeNull()
				expect(result.error).toBeNull()
				expect(result.done).toBe(false)
			})

			it('should silently ignore JSON with only unknown fields', () => {
				const result = parseSSELine('data: {"unknown":"value"}')
				expect(result.content).toBeNull()
				expect(result.stepUpdate).toBeNull()
				expect(result.error).toBeNull()
				expect(result.done).toBe(false)
			})

			it('should re-throw non-SyntaxError exceptions', () => {
				// Create a malicious object that throws a custom error during JSON.parse
				// This is simulated by testing the behavior with a custom error class
				const originalParse = JSON.parse
				const customError = new TypeError('Custom type error')

				JSON.parse = () => {
					throw customError
				}

				try {
					expect(() => parseSSELine('data: {}')).toThrow(customError)
				} finally {
					JSON.parse = originalParse
				}
			})
		})

		describe('edge cases', () => {
			it('should handle very long content', () => {
				const longContent = 'x'.repeat(10000)
				const result = parseSSELine(`data: {"content":"${longContent}"}`)
				expect(result.content).toBe(longContent)
			})

			it('should handle unicode content', () => {
				const result = parseSSELine('data: {"content":"こんにちは世界 🌍"}')
				expect(result.content).toBe('こんにちは世界 🌍')
			})

			it('should handle escaped quotes in content', () => {
				const result = parseSSELine('data: {"content":"He said \\"Hello\\""}')
				expect(result.content).toBe('He said "Hello"')
			})

			it('should handle newlines in content', () => {
				const result = parseSSELine('data: {"content":"Line1\\nLine2"}')
				expect(result.content).toBe('Line1\nLine2')
			})

			it('should handle empty content string', () => {
				const result = parseSSELine('data: {"content":""}')
				expect(result.content).toBeNull() // Empty string is falsy
				expect(result.done).toBe(false)
			})

			it('should handle error without message', () => {
				const result = parseSSELine('data: {"error":{}}')
				expect(result.error).toBeInstanceOf(Error)
				expect(result.error?.message).toBe('Unknown stream error')
			})

			it('should handle whitespace around data prefix', () => {
				const result = parseSSELine('  data: {"content":"Hello"}  ')
				expect(result.content).toBe('Hello')
			})
		})
	})

	describe('parseSSEBuffer', () => {
		it('should parse multiple complete lines', () => {
			const buffer = 'data: {"content":"Hello"}\ndata: {"content":" World"}\n'
			const { results, remaining } = parseSSEBuffer(buffer)

			expect(results).toHaveLength(2)
			expect(results[0].content).toBe('Hello')
			expect(results[1].content).toBe(' World')
			expect(remaining).toBe('')
		})

		it('should keep incomplete line as remaining', () => {
			const buffer = 'data: {"content":"Hello"}\ndata: {"content":"Wor'
			const { results, remaining } = parseSSEBuffer(buffer)

			expect(results).toHaveLength(1)
			expect(results[0].content).toBe('Hello')
			expect(remaining).toBe('data: {"content":"Wor')
		})

		it('should handle buffer with only incomplete line', () => {
			const buffer = 'data: {"content":"Hel'
			const { results, remaining } = parseSSEBuffer(buffer)

			expect(results).toHaveLength(0)
			expect(remaining).toBe('data: {"content":"Hel')
		})

		it('should handle empty buffer', () => {
			const { results, remaining } = parseSSEBuffer('')

			expect(results).toHaveLength(0)
			expect(remaining).toBe('')
		})

		it('should filter out empty results', () => {
			const buffer = '\n\nevent: message\ndata: {"content":"Hello"}\n\n'
			const { results } = parseSSEBuffer(buffer)

			expect(results).toHaveLength(1)
			expect(results[0].content).toBe('Hello')
		})

		it('should handle [DONE] in buffer', () => {
			const buffer = 'data: {"content":"Final"}\ndata: [DONE]\n'
			const { results } = parseSSEBuffer(buffer)

			expect(results).toHaveLength(2)
			expect(results[0].content).toBe('Final')
			expect(results[1].done).toBe(true)
		})

		it('should handle malformed JSON lines mixed with valid ones', () => {
			const buffer =
				'data: {"content":"Valid"}\ndata: {invalid json\ndata: {"content":"AlsoValid"}\n'
			const { results } = parseSSEBuffer(buffer)

			// Malformed JSON is silently ignored, so we get 2 valid results
			expect(results).toHaveLength(2)
			expect(results[0].content).toBe('Valid')
			expect(results[1].content).toBe('AlsoValid')
		})

		it('should handle step updates mixed with content', () => {
			const buffer =
				'data: {"content":"Part1"}\ndata: {"stepUpdate":"step_2"}\ndata: {"content":"Part2"}\n'
			const { results } = parseSSEBuffer(buffer)

			expect(results).toHaveLength(3)
			expect(results[0].content).toBe('Part1')
			expect(results[1].stepUpdate).toBe('step_2')
			expect(results[2].content).toBe('Part2')
		})

		it('should handle errors in stream', () => {
			const buffer = 'data: {"content":"Start"}\ndata: {"error":{"message":"Failed"}}\n'
			const { results } = parseSSEBuffer(buffer)

			expect(results).toHaveLength(2)
			expect(results[0].content).toBe('Start')
			expect(results[1].error?.message).toBe('Failed')
		})
	})

	describe('accumulateContent', () => {
		it('should accumulate content from multiple results', () => {
			const results: SSEParseResult[] = [
				{ content: 'Hello', stepUpdate: null, error: null, done: false },
				{ content: ' ', stepUpdate: null, error: null, done: false },
				{ content: 'World', stepUpdate: null, error: null, done: false },
			]

			expect(accumulateContent(results)).toBe('Hello World')
		})

		it('should filter out non-content results', () => {
			const results: SSEParseResult[] = [
				{ content: 'Hello', stepUpdate: null, error: null, done: false },
				{ content: null, stepUpdate: 'step_2', error: null, done: false },
				{ content: 'World', stepUpdate: null, error: null, done: false },
				{ content: null, stepUpdate: null, error: null, done: true },
			]

			expect(accumulateContent(results)).toBe('HelloWorld')
		})

		it('should return empty string for no content', () => {
			const results: SSEParseResult[] = [
				{ content: null, stepUpdate: 'step_1', error: null, done: false },
				{ content: null, stepUpdate: null, error: null, done: true },
			]

			expect(accumulateContent(results)).toBe('')
		})

		it('should handle empty array', () => {
			expect(accumulateContent([])).toBe('')
		})
	})

	describe('streaming simulation', () => {
		it('should handle realistic streaming scenario with chunked data', () => {
			// Simulate a realistic streaming scenario where data arrives in chunks
			const chunks = [
				'data: {"content":"Hel',
				'lo"}\ndata: {"conten',
				't":" World"}\ndata: [DONE]\n',
			]

			let buffer = ''
			const allResults: SSEParseResult[] = []

			for (const chunk of chunks) {
				buffer += chunk
				const { results, remaining } = parseSSEBuffer(buffer)
				allResults.push(...results)
				buffer = remaining
			}

			expect(allResults).toHaveLength(3)
			expect(accumulateContent(allResults)).toBe('Hello World')
			expect(allResults[2].done).toBe(true)
			expect(buffer).toBe('')
		})

		it('should handle streaming with mid-character UTF-8 breaks', () => {
			// Japanese characters can be multi-byte
			const fullMessage = '{"content":"日本語"}'
			const chunks = [`data: ${fullMessage.slice(0, 10)}`, `${fullMessage.slice(10)}\n`]

			let buffer = ''
			const allResults: SSEParseResult[] = []

			for (const chunk of chunks) {
				buffer += chunk
				const { results, remaining } = parseSSEBuffer(buffer)
				allResults.push(...results)
				buffer = remaining
			}

			expect(allResults).toHaveLength(1)
			expect(allResults[0].content).toBe('日本語')
		})

		it('should handle rapid step transitions', () => {
			const buffer = `${[
				'data: {"content":"Analyzing...","stepUpdate":"step_1"}',
				'data: {"stepUpdate":"step_2"}',
				'data: {"content":"Processing..."}',
				'data: {"stepUpdate":"step_3"}',
				'data: {"content":"Done!"}',
				'data: [DONE]',
			].join('\n')}\n`

			const { results } = parseSSEBuffer(buffer)

			const steps = results.filter((r) => r.stepUpdate).map((r) => r.stepUpdate)
			expect(steps).toEqual(['step_1', 'step_2', 'step_3'])

			const content = accumulateContent(results)
			expect(content).toBe('Analyzing...Processing...Done!')
		})
	})
})
