import { spawn, spawnSync } from 'bun'

const DEFAULT_API_PORT = 3000
const DEFAULT_WEB_PORT = 5173

// Kill any process using a specific port
function killProcessOnPort(port: number): void {
	const result = spawnSync(['lsof', '-i', `:${port}`, '-t'], {
		stdout: 'pipe',
		stderr: 'pipe',
	})
	const pids = result.stdout.toString().trim()
	if (pids) {
		for (const pid of pids.split('\n')) {
			if (pid) {
				spawnSync(['kill', '-9', pid], { stdout: 'pipe', stderr: 'pipe' })
			}
		}
	}
}

// Ensure default ports are free before starting
function ensurePortsFree(): void {
	killProcessOnPort(DEFAULT_API_PORT)
	killProcessOnPort(DEFAULT_WEB_PORT)
	// Small delay to ensure ports are released
	Bun.sleepSync(500)
}

const processes: ReturnType<typeof spawn>[] = []

function cleanup() {
	for (const proc of processes) {
		proc.kill()
	}
	process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

// Kill any existing processes on the default ports
ensurePortsFree()

const apiPort = DEFAULT_API_PORT
const webPort = DEFAULT_WEB_PORT

console.log(`🚀 Iniciando API em http://localhost:${apiPort}`)
console.log(`🌐 Iniciando Web em http://localhost:${webPort}`)

// Start API
const api = spawn({
	cmd: ['bun', 'run', '--filter', '@repo/api', 'dev'],
	stdout: 'inherit',
	stderr: 'inherit',
	env: {
		...process.env,
		PORT: String(apiPort),
		WEB_URL: `http://localhost:${webPort}`,
	},
})
processes.push(api)

// Start Web
const web = spawn({
	cmd: ['bun', 'run', '--filter', '@repo/web', 'dev'],
	stdout: 'inherit',
	stderr: 'inherit',
	env: {
		...process.env,
		PORT: String(webPort),
		API_URL: `http://localhost:${apiPort}`,
		CLERK_PUBLISHABLE_KEY: process.env['CLERK_PUBLISHABLE_KEY'] || '',
	},
})
processes.push(web)

await Promise.all(processes.map((p) => p.exited))
