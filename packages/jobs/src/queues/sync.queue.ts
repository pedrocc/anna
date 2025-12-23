import { Queue } from 'bullmq'
import { connection, defaultJobOptions } from '../connection.js'

export type SyncUserJobData = {
	clerkId: string
	action: 'create' | 'update' | 'delete'
}

export const syncQueue = new Queue<SyncUserJobData>('sync', {
	connection,
	defaultJobOptions,
})

export async function queueUserSync(data: SyncUserJobData) {
	return syncQueue.add('sync-user', data, {
		jobId: `sync-user-${data.clerkId}`,
	})
}
