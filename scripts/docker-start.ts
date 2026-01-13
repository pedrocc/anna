#!/usr/bin/env bun
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'bun'
import { generatePortsEnv, getAvailablePorts, printPortsSummary } from './lib/ports.js'

console.log('🔍 Verificando portas disponíveis...\n')

// Get available ports
const ports = getAvailablePorts()

// Generate .env.ports file in docker directory
const portsEnvPath = resolve(import.meta.dir, '../docker/.env.ports')
writeFileSync(portsEnvPath, generatePortsEnv(ports))

// Print summary
printPortsSummary(ports)

console.log('\n🐳 Iniciando containers Docker...\n')

// Start docker-compose with the ports environment
const dockerCompose = spawn({
	cmd: [
		'docker',
		'compose',
		'-f',
		resolve(import.meta.dir, '../docker/docker-compose.yml'),
		'--env-file',
		portsEnvPath,
		'up',
		'-d',
	],
	stdout: 'inherit',
	stderr: 'inherit',
	env: {
		...process.env,
		POSTGRES_PORT: String(ports.postgres),
		REDIS_PORT: String(ports.redis),
	},
})

const exitCode = await dockerCompose.exited

if (exitCode === 0) {
	console.log('\n✅ Containers iniciados com sucesso!')
	printPortsSummary(ports)

	// Update .env file with new URLs
	console.log('\n💡 Atualize seu .env com estas URLs se necessário:')
	console.log(`   DATABASE_URL=postgresql://postgres:postgres@localhost:${ports.postgres}/anna`)
	console.log(`   REDIS_URL=redis://localhost:${ports.redis}`)
} else {
	console.error('\n❌ Erro ao iniciar containers')
	process.exit(exitCode)
}
