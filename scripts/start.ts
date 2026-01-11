#!/usr/bin/env bun
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn, spawnSync } from 'bun'
import { generatePortsEnv, getAvailablePorts, printPortsSummary } from './lib/ports.js'

// Constants
const dockerComposePath = resolve(import.meta.dir, '../docker/docker-compose.yml')
const portsEnvPath = resolve(import.meta.dir, '../docker/.env.ports')

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

// State tracking for cleanup
let dockerStarted = false
let isCleaningUp = false
const processes: ReturnType<typeof spawn>[] = []

// Cleanup function (registered early to handle interrupts at any stage)
async function cleanup() {
	if (isCleaningUp) return
	isCleaningUp = true

	console.log('\n\n🛑 Encerrando serviços...')

	// Kill API/Web processes gracefully
	if (processes.length > 0) {
		console.log('   Parando API e Web...')
		for (const proc of processes) {
			proc.kill('SIGTERM')
		}

		// Wait for processes to exit (max 2s)
		await Promise.race([Promise.all(processes.map((p) => p.exited)), Bun.sleep(2000)])
	}

	// Stop Docker containers if they were started
	if (dockerStarted) {
		console.log('   Parando containers Docker...')
		spawnSync(['docker', 'compose', '-f', dockerComposePath, 'down'], {
			stdout: 'pipe',
			stderr: 'pipe',
		})
	}

	// Clean up generated files
	try {
		unlinkSync(portsEnvPath)
	} catch {
		// File may not exist
	}

	console.log('✅ Encerrado com sucesso!')
	process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

console.log('🚀 Iniciando Anna...\n')
console.log('🔍 Verificando portas disponíveis...\n')

// Get available ports for all services
const ports = getAvailablePorts()

// Generate .env.ports file in docker directory
writeFileSync(portsEnvPath, generatePortsEnv(ports))

printPortsSummary(ports)

// Warn if .env has different port values (they will be overridden)
const envDatabaseUrl = process.env['DATABASE_URL']
const envRedisUrl = process.env['REDIS_URL']

if (envDatabaseUrl) {
	const envDbPort = envDatabaseUrl.match(/:(\d+)\//)?.[1]
	if (envDbPort && envDbPort !== String(ports.postgres)) {
		console.log(
			`\n⚠️  Aviso: DATABASE_URL no .env usa porta ${envDbPort}, mas será usado ${ports.postgres}`
		)
	}
}

if (envRedisUrl) {
	const envRedisPort = envRedisUrl.match(/:(\d+)$/)?.[1]
	if (envRedisPort && envRedisPort !== String(ports.redis)) {
		console.log(
			`⚠️  Aviso: REDIS_URL no .env usa porta ${envRedisPort}, mas será usado ${ports.redis}`
		)
	}
}

// Step 1: Check for existing containers and start Docker
console.log('\n🐳 Verificando containers Docker existentes...')

// Check if containers are already running
const existingContainers = spawnSync(['docker', 'compose', '-f', dockerComposePath, 'ps', '-q'], {
	stdout: 'pipe',
	stderr: 'pipe',
})

if (existingContainers.stdout.toString().trim()) {
	console.log('   Containers existentes encontrados. Reiniciando...')
	spawnSync(['docker', 'compose', '-f', dockerComposePath, 'down'], {
		stdout: 'pipe',
		stderr: 'pipe',
	})
}

console.log('\n🐳 Iniciando containers Docker (PostgreSQL + Redis)...\n')

const dockerCompose = spawnSync(
	['docker', 'compose', '-f', dockerComposePath, '--env-file', portsEnvPath, 'up', '-d'],
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

dockerStarted = true
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
			dockerComposePath,
			'exec',
			'-T',
			'postgres',
			'pg_isready',
			'-U',
			'postgres',
		],
		{ stdout: 'pipe', stderr: 'pipe' }
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

// Use ports from getAvailablePorts() - already validated
const apiPort = ports.api
const webPort = ports.web

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

console.log(`\n${'═'.repeat(50)}`)
console.log('🎉 Anna está rodando!')
console.log('═'.repeat(50))
console.log(`\n   🌐 Web:        http://localhost:${webPort}`)
console.log(`   🔌 API:        http://localhost:${apiPort}`)
console.log(`   🐘 PostgreSQL: localhost:${ports.postgres}`)
console.log(`   📮 Redis:      localhost:${ports.redis}`)
console.log('\n   Pressione Ctrl+C para encerrar')
console.log(`${'═'.repeat(50)}\n`)

await Promise.all(processes.map((p) => p.exited))
