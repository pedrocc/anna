import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', ['admin', 'user', 'guest'])

export const users = pgTable(
	'users',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		clerkId: text('clerk_id').notNull().unique(),
		email: text('email').notNull().unique(),
		name: text('name').notNull(),
		role: userRoleEnum('role').default('user').notNull(),
		avatarUrl: text('avatar_url'),
		metadata: text('metadata').$type<Record<string, unknown>>(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		clerkIdIdx: uniqueIndex('users_clerk_id_idx').on(table.clerkId),
		emailIdx: index('users_email_idx').on(table.email),
		roleIdx: index('users_role_idx').on(table.role),
		createdAtIdx: index('users_created_at_idx').on(table.createdAt),
	})
)

export type UserRecord = typeof users.$inferSelect
export type NewUserRecord = typeof users.$inferInsert
