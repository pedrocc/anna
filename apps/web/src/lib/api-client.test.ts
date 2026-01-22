import { describe, expect, it } from 'bun:test'

/**
 * Since SWR hooks require React rendering context, we test the
 * defaultSwrConfig and apiRoutes by importing them directly.
 * The hooks themselves spread defaultSwrConfig into every useSWR call.
 */

// We need to import the module to verify the config is correctly applied.
// Since hooks are exported functions, we can inspect their behavior indirectly
// by verifying the module structure.
import { apiRoutes } from './api-client.js'

describe('api-client', () => {
	describe('apiRoutes', () => {
		it('should have all expected route groups', () => {
			expect(apiRoutes.users).toBeDefined()
			expect(apiRoutes.briefing).toBeDefined()
			expect(apiRoutes.prd).toBeDefined()
			expect(apiRoutes.sm).toBeDefined()
			expect(apiRoutes.kanban).toBeDefined()
		})

		it('should have correct user routes', () => {
			expect(apiRoutes.users.me).toBe('/api/v1/users/me')
			expect(apiRoutes.users.sync).toBe('/api/v1/users/me/sync')
			expect(apiRoutes.users.list).toBe('/api/v1/users')
			expect(apiRoutes.users.byId('123')).toBe('/api/v1/users/123')
		})

		it('should have correct briefing routes', () => {
			expect(apiRoutes.briefing.sessions).toBe('/api/v1/briefing/sessions')
			expect(apiRoutes.briefing.session('abc')).toBe('/api/v1/briefing/sessions/abc')
			expect(apiRoutes.briefing.documents('abc')).toBe('/api/v1/briefing/sessions/abc/documents')
			expect(apiRoutes.briefing.documentById('doc1')).toBe('/api/v1/briefing/documents/doc1')
		})

		it('should have correct prd routes', () => {
			expect(apiRoutes.prd.sessions).toBe('/api/v1/prd/sessions')
			expect(apiRoutes.prd.session('abc')).toBe('/api/v1/prd/sessions/abc')
			expect(apiRoutes.prd.documents('abc')).toBe('/api/v1/prd/sessions/abc/documents')
		})

		it('should have correct sm routes', () => {
			expect(apiRoutes.sm.sessions).toBe('/api/v1/sm/sessions')
			expect(apiRoutes.sm.session('abc')).toBe('/api/v1/sm/sessions/abc')
			expect(apiRoutes.sm.stories('abc')).toBe('/api/v1/sm/sessions/abc/stories')
			expect(apiRoutes.sm.storyById('s1')).toBe('/api/v1/sm/stories/s1')
		})

		it('should have correct kanban routes', () => {
			expect(apiRoutes.kanban.sessions).toBe('/api/v1/kanban/sessions')
			expect(apiRoutes.kanban.board('abc')).toBe('/api/v1/kanban/sessions/abc/board')
		})
	})

	describe('defaultSwrConfig (dedupingInterval)', () => {
		it('should export hooks that apply dedupingInterval: 5000 via defaultSwrConfig', async () => {
			// Verify the module source contains the defaultSwrConfig with correct value
			const moduleSource = await Bun.file(
				new URL('./api-client.ts', import.meta.url).pathname
			).text()

			expect(moduleSource).toContain('dedupingInterval: 5000')
			expect(moduleSource).toContain('const defaultSwrConfig: SWRConfiguration')
		})

		it('should spread defaultSwrConfig into all hook useSWR calls', async () => {
			const moduleSource = await Bun.file(
				new URL('./api-client.ts', import.meta.url).pathname
			).text()

			// Count how many useSWR calls exist vs how many use defaultSwrConfig
			const useSWRCalls = moduleSource.match(/return useSWR/g)
			const defaultConfigSpreads = moduleSource.match(/\.\.\.defaultSwrConfig/g)

			expect(useSWRCalls).not.toBeNull()
			expect(defaultConfigSpreads).not.toBeNull()

			// Every useSWR call should use defaultSwrConfig
			expect(defaultConfigSpreads?.length).toBe(useSWRCalls?.length)
		})

		it('should allow config override by spreading user config after defaultSwrConfig', async () => {
			const moduleSource = await Bun.file(
				new URL('./api-client.ts', import.meta.url).pathname
			).text()

			// Verify pattern: ...defaultSwrConfig always comes before ...config
			// This ensures user config can override defaults
			const lines = moduleSource.split('\n')

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i]
				if (line.includes('...defaultSwrConfig') && line.includes('...config')) {
					// Both on same line: defaultSwrConfig must come first positionally
					const defaultIdx = line.indexOf('...defaultSwrConfig')
					const configIdx = line.indexOf('...config')
					expect(defaultIdx).toBeLessThan(configIdx)
				}
			}

			// Also verify no ...config appears before ...defaultSwrConfig across lines
			// in the same useSWR block
			const useSWRBlocks = moduleSource.split('return useSWR')
			for (const block of useSWRBlocks.slice(1)) {
				const blockUpToClose = block.slice(0, block.indexOf('\n}') + 2)
				const defaultPos = blockUpToClose.indexOf('...defaultSwrConfig')
				const configPos = blockUpToClose.indexOf('...config')
				if (defaultPos >= 0 && configPos >= 0) {
					expect(defaultPos).toBeLessThan(configPos)
				}
			}
		})
	})
})
