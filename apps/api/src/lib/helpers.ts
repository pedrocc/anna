import { db } from '@repo/db'
import { users } from '@repo/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Get user by Clerk ID
 * Centralized helper to avoid code duplication across routes
 */
export async function getUserByClerkId(clerkId: string) {
	return db.query.users.findFirst({
		where: eq(users.clerkId, clerkId),
	})
}
