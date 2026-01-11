#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn, spawnSync } from 'bun'
import {
	DEFAULT_PORTS,
	findAvailablePort,
	generatePortsEnv,
	getAvailablePorts,
	isPortInUse,
	printPortsSummary,
} from './lib/ports.js'

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

console.log('🚀 Iniciando Anna...\n')
console.log('🔍 Verificando portas disponíveis...\n')

// Get available ports for all services
const ports = getAvailablePorts()

// Generate .env.ports file in docker directory
const portsEnvPath = resolve(import.meta.dir, '../docker/.env.ports')
writeFileSync(portsEnvPath, generatePortsEnv(ports))

printPortsSummary(ports)

// Step 1: Start Docker containers
console.log('\n🐳 Iniciando containers Docker (PostgreSQL + Redis)...\n')

const dockerCompose = spawnSync(
	[
		'docker',
		'compose',
		'-f',
		resolve(import.meta.dir, '../docker/docker-compose.yml'),
		'--env-file',
		portsEnvPath,
		'up',
		'-d',
	],
	{
		stdout: 'inherit',
		stderr: 'inherit',
		env: {
			...process.env,
			POSTGRES_PORT: String(ports.postgres),
			REDIS_PORT: String(ports.redis),
		},
	}
)

if (dockerCompose.exitCode !== 0) {
	console.error('\n❌ Erro ao iniciar containers Docker')
	process.exit(dockerCompose.exitCode || 1)
}

console.log('\n✅ Containers Docker iniciados!')

// Step 2: Wait for PostgreSQL to be ready
console.log('\n⏳ Aguardando PostgreSQL estar pronto...')

const maxRetries = 30
let retries = 0
let dbReady = false

while (retries < maxRetries && !dbReady) {
	const check = spawnSync(
		[
			'docker',
			'compose',
			'-f',
			resolve(import.meta.dir, '../docker/docker-compose.yml'),
			'exec',
			'-T',
			'postgres',
			'pg_isready',
			'-U',
			'postgres',
		],
		{
			stdout: 'pipe',
			stderr: 'pipe',
		}
	)

	if (check.exitCode === 0) {
		dbReady = true
	} else {
		retries++
		await Bun.sleep(1000)
		process.stdout.write('.')
	}
}

if (!dbReady) {
	console.error('\n❌ PostgreSQL não ficou pronto a tempo')
	process.exit(1)
}

console.log('\n✅ PostgreSQL pronto!')

// Step 3: Run migrations
console.log('\n📦 Aplicando migrations...\n')

const migrate = spawnSync(['bun', 'run', 'db:migrate'], {
	stdout: 'inherit',
	stderr: 'inherit',
	cwd: resolve(import.meta.dir, '..'),
	env: {
		...process.env,
		DATABASE_URL: `postgresql://postgres:postgres@localhost:${ports.postgres}/anna`,
	},
})

if (migrate.exitCode !== 0) {
	console.error('\n❌ Erro ao aplicar migrations')
	process.exit(migrate.exitCode || 1)
}

console.log('✅ Migrations aplicadas!')

// Step 4: Start API and Web
console.log('\n🌐 Iniciando aplicação (API + Web)...\n')

const processes: ReturnType<typeof spawn>[] = []

function cleanup() {
	console.log('\n\n🛑 Encerrando serviços...')
	for (const proc of processes) {
		proc.kill()
	}
	process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

// Find available ports for API and Web (may differ from Docker ports)
let apiPort = ports.api
let webPort = ports.web

if (isPortInUse(apiPort)) {
	apiPort = findAvailablePort(apiPort + 1)
	console.log(`⚠️  Porta ${ports.api} em uso. API usará porta ${apiPort}`)
}

if (isPortInUse(webPort)) {
	webPort = findAvailablePort(webPort + 1)
	console.log(`⚠️  Porta ${ports.web} em uso. Web usará porta ${webPort}`)
}

// Start API
const api = spawn({
	cmd: ['bun', 'run', '--filter', '@repo/api', 'dev'],
	stdout: 'inherit',
	stderr: 'inherit',
	env: {
		...process.env,
		PORT: String(apiPort),
		WEB_URL: `http://localhost:${webPort}`,
		DATABASE_URL: `postgresql://postgres:postgres@localhost:${ports.postgres}/anna`,
		REDIS_URL: `redis://localhost:${ports.redis}`,
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

console.log('\n' + '═'.repeat(50))
console.log('🎉 Anna está rodando!')
console.log('═'.repeat(50))
console.log(`\n   🌐 Web:        http://localhost:${webPort}`)
console.log(`   🔌 API:        http://localhost:${apiPort}`)
console.log(`   🐘 PostgreSQL: localhost:${ports.postgres}`)
console.log(`   📮 Redis:      localhost:${ports.redis}`)
console.log('\n   Pressione Ctrl+C para encerrar')
console.log('═'.repeat(50) + '\n')

await Promise.all(processes.map((p) => p.exited))
