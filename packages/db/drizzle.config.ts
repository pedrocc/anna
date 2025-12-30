import { resolve } from 'node:path'
import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Load .env from monorepo root
config({ path: resolve(__dirname, '../../.env') })

export default defineConfig({
	schema: './src/schema/index.ts',
	out: './src/migrations',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env['DATABASE_URL'] ?? '',
	},
	verbose: true,
	strict: true,
})
