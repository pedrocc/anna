import { eq } from '../node_modules/.bun/drizzle-orm@0.45.3/node_modules/drizzle-orm/index.js'
import { brainstormSessions, db } from '../packages/db/src/index.js'

const result = await db
	.update(brainstormSessions)
	.set({
		status: 'completed',
		completedAt: new Date(),
		updatedAt: new Date(),
	})
	.where(eq(brainstormSessions.currentStep, 'document'))
	.returning({ id: brainstormSessions.id, projectName: brainstormSessions.projectName })

console.log('Updated sessions:', result)
process.exit(0)
