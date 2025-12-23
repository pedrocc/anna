import { emailWorker } from './workers/email.worker.js'
import { syncWorker } from './workers/sync.worker.js'

// Graceful shutdown
async function shutdown() {
	await Promise.all([emailWorker.close(), syncWorker.close()])
	process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
