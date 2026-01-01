import { eq } from 'drizzle-orm'
import { db } from '../packages/db/src/index.ts'
import { briefingSessions } from '../packages/db/src/schema/index.ts'

const sessionId = 'ccfde8a0-1e21-41d6-a4e8-29e58c93c9f7'

// Update the session to go back to 'scope' step
const result = await db
	.update(briefingSessions)
	.set({
		currentStep: 'scope',
		stepsCompleted: ['init', 'vision', 'users', 'metrics'],
	})
	.where(eq(briefingSessions.id, sessionId))
	.returning({ id: briefingSessions.id, currentStep: briefingSessions.currentStep })

console.log('Updated session:', result)
process.exit(0)
