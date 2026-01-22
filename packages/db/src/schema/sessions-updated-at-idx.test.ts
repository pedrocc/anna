import { describe, expect, it } from 'bun:test'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { briefingSessions } from './briefing'
import { prdSessions } from './prd'
import { smSessions } from './sm'

describe('updatedAtIdx on session tables', () => {
	describe('briefingSessions', () => {
		it('should have an index on updatedAt', () => {
			const tableConfig = getTableConfig(briefingSessions)
			const indexes = tableConfig.indexes.map((i) => {
				const cfg = (i as Record<string, unknown>).config as {
					name: string
					columns: { name: string }[]
				}
				return { name: cfg.name, columns: cfg.columns.map((c) => c.name) }
			})

			const idx = indexes.find((i) => i.name === 'briefing_sessions_updated_at_idx')

			expect(idx).toBeDefined()
			expect(idx?.columns).toEqual(['updated_at'])
		})
	})

	describe('prdSessions', () => {
		it('should have an index on updatedAt', () => {
			const tableConfig = getTableConfig(prdSessions)
			const indexes = tableConfig.indexes.map((i) => {
				const cfg = (i as Record<string, unknown>).config as {
					name: string
					columns: { name: string }[]
				}
				return { name: cfg.name, columns: cfg.columns.map((c) => c.name) }
			})

			const idx = indexes.find((i) => i.name === 'prd_sessions_updated_at_idx')

			expect(idx).toBeDefined()
			expect(idx?.columns).toEqual(['updated_at'])
		})
	})

	describe('smSessions', () => {
		it('should have an index on updatedAt', () => {
			const tableConfig = getTableConfig(smSessions)
			const indexes = tableConfig.indexes.map((i) => {
				const cfg = (i as Record<string, unknown>).config as {
					name: string
					columns: { name: string }[]
				}
				return { name: cfg.name, columns: cfg.columns.map((c) => c.name) }
			})

			const idx = indexes.find((i) => i.name === 'sm_sessions_updated_at_idx')

			expect(idx).toBeDefined()
			expect(idx?.columns).toEqual(['updated_at'])
		})
	})
})
