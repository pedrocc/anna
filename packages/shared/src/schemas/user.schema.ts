import { z } from 'zod'
import { IdSchema, TimestampsSchema } from './common.schema.js'

export const UserRoleSchema = z.enum(['admin', 'user', 'guest'])

export const UserSchema = z
	.object({
		id: IdSchema,
		clerkId: z.string(),
		email: z.email().min(5).max(255),
		name: z.string().min(1).max(100),
		role: UserRoleSchema.default('user'),
		avatarUrl: z
			.string()
			.url()
			.refine((url) => url.startsWith('https://') || url.startsWith('http://'), {
				message: 'Avatar URL must use http or https protocol',
			})
			.optional(),
		metadata: z.record(z.string(), z.unknown()).optional(),
	})
	.merge(TimestampsSchema)

export const CreateUserSchema = UserSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
})

export const UpdateUserSchema = CreateUserSchema.partial().omit({ clerkId: true })

export type UserRole = z.infer<typeof UserRoleSchema>
export type User = z.infer<typeof UserSchema>
export type CreateUser = z.infer<typeof CreateUserSchema>
export type UpdateUser = z.infer<typeof UpdateUserSchema>
