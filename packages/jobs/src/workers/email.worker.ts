import { type Job, Worker } from 'bullmq'
import { connection } from '../connection.js'
import type { SendEmailJobData } from '../queues/email.queue.js'

async function processEmailJob(job: Job<SendEmailJobData>) {
	const { to, subject } = job.data

	// Email integration placeholder - connect to @repo/email when ready
	await job.updateProgress(50)

	// Simulate sending
	await new Promise((resolve) => setTimeout(resolve, 1000))

	await job.updateProgress(100)

	return { sent: true, to, subject }
}

export const emailWorker = new Worker<SendEmailJobData>('email', processEmailJob, {
	connection,
	concurrency: 5,
})

emailWorker.on('completed', (_job) => {})

emailWorker.on('failed', (_job, _err) => {})
