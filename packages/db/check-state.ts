import { eq } from 'drizzle-orm'
import { db } from './src/index.ts'
import { briefingSessions } from './src/schema/index.ts'

const sessionId = 'ccfde8a0-1e21-41d6-a4e8-29e58c93c9f7'

const _session = await db.query.briefingSessions.findFirst({
	where: eq(briefingSessions.id, sessionId),
	columns: { currentStep: true, stepsCompleted: true },
})
process.exit(0)
