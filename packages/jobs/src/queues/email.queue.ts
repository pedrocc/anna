import { Queue } from 'bullmq'
import { connection, defaultJobOptions } from '../connection.js'

export type SendEmailJobData = {
	to: string
	subject: string
	template: string
	data: Record<string, unknown>
}

export const emailQueue = new Queue<SendEmailJobData>('email', {
	connection,
	defaultJobOptions,
})

export async function queueEmail(data: SendEmailJobData) {
	return emailQueue.add('send-email', data)
}
