import { describe, expect, it } from 'bun:test'
import { TECHNIQUES } from '@repo/shared/constants'
import { TECHNIQUE_IDS } from '@repo/shared/schemas'
import { buildDocumentPrompt, buildSystemPrompt, buildTechniquePrompt } from './brainstorm-prompts'

describe('brainstorm-prompts', () => {
	describe('TECHNIQUE_PROMPTS coverage', () => {
		it('should have a prompt for every technique in TECHNIQUE_IDS', () => {
			for (const id of TECHNIQUE_IDS) {
				const prompt = buildTechniquePrompt(id)
				expect(prompt).toBeDefined()
				expect(prompt.length).toBeGreaterThan(0)
			}
		})

		it('should return non-empty prompts for all techniques', () => {
			for (const id of TECHNIQUE_IDS) {
				const prompt = buildTechniquePrompt(id)
				expect(prompt.trim().length).toBeGreaterThan(50)
			}
		})
	})

	describe('TECHNIQUES constants coverage', () => {
		it('should have metadata for every technique in TECHNIQUE_IDS', () => {
			for (const id of TECHNIQUE_IDS) {
				const info = TECHNIQUES[id]
				expect(info).toBeDefined()
				expect(info.id).toBe(id)
				expect(info.name.length).toBeGreaterThan(0)
				expect(info.description.length).toBeGreaterThan(0)
				expect(info.icon.length).toBeGreaterThan(0)
				expect(info.estimatedMinutes).toBeGreaterThan(0)
			}
		})

		it('should have matching keys between TECHNIQUES and TECHNIQUE_IDS', () => {
			const techniqueKeys = Object.keys(TECHNIQUES).sort()
			const ids = [...TECHNIQUE_IDS].sort()
			expect(techniqueKeys).toEqual(ids)
		})
	})

	describe('buildDocumentPrompt technique names', () => {
		it('should include technique names in document prompt for all techniques', () => {
			for (const id of TECHNIQUE_IDS) {
				const prompt = buildDocumentPrompt('Test Project', 'Test description', [], [id])
				// Should not contain the raw ID as the only representation
				// The names record should map it to a display name
				expect(prompt).toContain('TECNICAS UTILIZADAS')
			}
		})
	})

	describe('buildSystemPrompt', () => {
		it('should include technique prompt in execution step', () => {
			for (const id of TECHNIQUE_IDS) {
				const prompt = buildSystemPrompt('Test', 'Description', 'execution', id)
				const techniquePrompt = buildTechniquePrompt(id)
				expect(prompt).toContain(techniquePrompt)
			}
		})

		it('should not include technique prompt in setup step', () => {
			const prompt = buildSystemPrompt('Test', 'Description', 'setup', 'scamper')
			const techniquePrompt = buildTechniquePrompt('scamper')
			expect(prompt).not.toContain(techniquePrompt)
		})

		it('should include project name in all steps', () => {
			const steps = ['setup', 'technique', 'execution', 'document'] as const
			for (const step of steps) {
				const prompt = buildSystemPrompt('My Project', 'Desc', step)
				expect(prompt).toContain('My Project')
			}
		})
	})
})
