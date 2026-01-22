import { describe, expect, it } from 'bun:test'
import { TECHNIQUE_IDS } from '@repo/shared/schemas'
import { brainstormTechniqueEnum } from './brainstorm'

describe('brainstormTechniqueEnum', () => {
	it('should have the same values as TECHNIQUE_IDS', () => {
		expect(brainstormTechniqueEnum.enumValues).toEqual([...TECHNIQUE_IDS])
	})

	it('should contain all expected technique IDs', () => {
		for (const id of TECHNIQUE_IDS) {
			expect(brainstormTechniqueEnum.enumValues).toContain(id)
		}
	})

	it('should not have extra values beyond TECHNIQUE_IDS', () => {
		expect(brainstormTechniqueEnum.enumValues.length).toBe(TECHNIQUE_IDS.length)
	})
})
