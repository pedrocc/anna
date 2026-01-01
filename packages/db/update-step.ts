import { eq } from 'drizzle-orm'
import { db } from './src/index.ts'
import { briefingSessions } from './src/schema/index.ts'

const sessionId = 'ccfde8a0-1e21-41d6-a4e8-29e58c93c9f7'

// Update the session to go back to 'scope' step
const _result = await db
	.update(briefingSessions)
	.set({
		currentStep: 'scope',
		stepsCompleted: ['init', 'vision', 'users', 'metrics'],
	})
	.where(eq(briefingSessions.id, sessionId))
	.returning({ id: briefingSessions.id, currentStep: briefingSessions.currentStep })
process.exit(0)
