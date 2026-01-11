import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'bun'
import { DEFAULT_PORTS, findAvailablePort, isPortInUse, printPortsSummary } from './lib/ports.js'

// Load root .env file
const envPath = resolve(import.meta.dir, '../.env')
try {
	const envContent = readFileSync(envPath, 'utf-8')
	for (const line of envContent.split('\n')) {
		const trimmed = line.trim()
		if (trimmed && !trimmed.startsWith('#')) {
			const [key, ...valueParts] = trimmed.split('=')
			if (key && valueParts.length > 0) {
				process.env[key] = valueParts.join('=')
			}
		}
	}
} catch {
	console.warn('⚠️  Arquivo .env não encontrado na raiz')
}

console.log('🔍 Verificando portas disponíveis...\n')

// Find available ports for API and Web
let apiPort = DEFAULT_PORTS.api
let webPort = DEFAULT_PORTS.web

if (isPortInUse(apiPort)) {
	apiPort = findAvailablePort(apiPort + 1)
	console.log(`⚠️  Porta ${DEFAULT_PORTS.api} em uso. API usará porta ${apiPort}`)
}

if (isPortInUse(webPort)) {
	webPort = findAvailablePort(webPort + 1)
	console.log(`⚠️  Porta ${DEFAULT_PORTS.web} em uso. Web usará porta ${webPort}`)
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

printPortsSummary({
	api: apiPort,
	web: webPort,
	postgres: DEFAULT_PORTS.postgres,
	redis: DEFAULT_PORTS.redis,
})

console.log('\n🚀 Iniciando serviços de desenvolvimento...\n')

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
