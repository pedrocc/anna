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

/**
 * Verify ownership of a resource through its session relation.
 * Returns 'not_found' if resource or session is null,
 * 'forbidden' if userId doesn't match, or 'ok' if authorized.
 */
export function verifyResourceOwnership(
	resource: { session: { userId: string } | null } | null | undefined,
	userId: string
): 'not_found' | 'forbidden' | 'ok' {
	if (!resource || !resource.session) {
		return 'not_found'
	}
	if (resource.session.userId !== userId) {
		return 'forbidden'
	}
	return 'ok'
}
