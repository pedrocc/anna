import { type Job, Worker } from 'bullmq'
import { connection } from '../connection.js'
import type { SyncUserJobData } from '../queues/sync.queue.js'

async function processSyncJob(job: Job<SyncUserJobData>) {
	const { clerkId, action } = job.data

	// Sync logic placeholder - integrate with @repo/db when needed

	return { synced: true, clerkId, action }
}

export const syncWorker = new Worker<SyncUserJobData>('sync', processSyncJob, {
	connection,
	concurrency: 10,
})

syncWorker.on('completed', (_job) => {})

syncWorker.on('failed', (_job, _err) => {})
