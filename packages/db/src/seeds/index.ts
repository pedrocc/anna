// biome-ignore-all lint/suspicious/noConsole: Seed script needs console output
import { db } from '../client.js'
import { users } from '../schema/index.js'

try {
	await db
		.insert(users)
		.values([
			{
				clerkId: 'user_seed_admin',
				email: 'admin@example.com',
				name: 'Admin User',
				role: 'admin',
			},
			{
				clerkId: 'user_seed_user',
				email: 'user@example.com',
				name: 'Regular User',
				role: 'user',
			},
		])
		.onConflictDoNothing()
	console.log('Seed completed successfully')
} catch (error) {
	console.error('Seed failed:', error)
} finally {
	process.exit(0)
}
