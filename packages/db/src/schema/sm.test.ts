import { describe, expect, it } from 'bun:test'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { smEpics } from './sm'

describe('smEpics schema', () => {
	it('should have a composite index on (sessionId, number)', () => {
		const tableConfig = getTableConfig(smEpics)
		const indexes = tableConfig.indexes.map((i) => {
			const cfg = (i as Record<string, unknown>).config as {
				name: string
				columns: { name: string }[]
			}
			return { name: cfg.name, columns: cfg.columns.map((c) => c.name) }
		})

		const idx = indexes.find((i) => i.name === 'sm_epics_session_number_idx')

		expect(idx).toBeDefined()
		expect(idx?.columns).toEqual(['session_id', 'number'])
	})
})
