import { resolve } from 'node:path'
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'

// Load .env from monorepo root if not already loaded
if (!process.env['DATABASE_URL']) {
	config({ path: resolve(import.meta.dir, '../../../.env') })
}

const connectionString = process.env['DATABASE_URL']

if (!connectionString) {
	throw new Error('DATABASE_URL environment variable is not set')
}

const client = postgres(connectionString, {
	max: 10,
	idle_timeout: 20,
	connect_timeout: 10,
})

export const db = drizzle(client, { schema })

export type Database = typeof db
