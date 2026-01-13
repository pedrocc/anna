import { spawnSync } from 'bun'

export interface PortConfig {
	api: number
	web: number
	postgres: number
	redis: number
}

export const DEFAULT_PORTS: PortConfig = {
	api: 3000,
	web: 5173,
	postgres: 5432,
	redis: 6379,
}

/**
 * Check if a port is in use
 */
export function isPortInUse(port: number): boolean {
	const result = spawnSync(['lsof', '-i', `:${port}`, '-t'], {
		stdout: 'pipe',
		stderr: 'pipe',
	})
	return result.stdout.toString().trim().length > 0
}

/**
 * Find an available port starting from the given port
 */
export function findAvailablePort(startPort: number, maxAttempts = 100): number {
	let port = startPort
	let attempts = 0

	while (isPortInUse(port) && attempts < maxAttempts) {
		port++
		attempts++
	}

	if (attempts >= maxAttempts) {
		throw new Error(`Could not find available port starting from ${startPort}`)
	}

	return port
}

/**
 * Get available ports for all services
 */
export function getAvailablePorts(): PortConfig {
	const ports: PortConfig = { ...DEFAULT_PORTS }

	// Check API port
	if (isPortInUse(DEFAULT_PORTS.api)) {
		ports.api = findAvailablePort(DEFAULT_PORTS.api + 1)
		console.log(`⚠️  Porta ${DEFAULT_PORTS.api} em uso. API usará porta ${ports.api}`)
	}

	// Check Web port
	if (isPortInUse(DEFAULT_PORTS.web)) {
		ports.web = findAvailablePort(DEFAULT_PORTS.web + 1)
		console.log(`⚠️  Porta ${DEFAULT_PORTS.web} em uso. Web usará porta ${ports.web}`)
	}

	// Check PostgreSQL port
	if (isPortInUse(DEFAULT_PORTS.postgres)) {
		ports.postgres = findAvailablePort(DEFAULT_PORTS.postgres + 1)
		console.log(
			`⚠️  Porta ${DEFAULT_PORTS.postgres} em uso. PostgreSQL usará porta ${ports.postgres}`
		)
	}

	// Check Redis port
	if (isPortInUse(DEFAULT_PORTS.redis)) {
		ports.redis = findAvailablePort(DEFAULT_PORTS.redis + 1)
		console.log(`⚠️  Porta ${DEFAULT_PORTS.redis} em uso. Redis usará porta ${ports.redis}`)
	}

	return ports
}

/**
 * Generate environment variables content for the ports
 */
export function generatePortsEnv(ports: PortConfig): string {
	return `# Auto-generated port configuration
# Generated at: ${new Date().toISOString()}

# Service Ports
API_PORT=${ports.api}
WEB_PORT=${ports.web}
POSTGRES_PORT=${ports.postgres}
REDIS_PORT=${ports.redis}

# URLs with dynamic ports
API_URL=http://localhost:${ports.api}
WEB_URL=http://localhost:${ports.web}
DATABASE_URL=postgresql://postgres:postgres@localhost:${ports.postgres}/anna
REDIS_URL=redis://localhost:${ports.redis}
`
}

/**
 * Print port configuration summary
 */
export function printPortsSummary(ports: PortConfig): void {
	console.log('\n📍 Configuração de Portas:')
	console.log('─'.repeat(40))
	console.log(`   API:        http://localhost:${ports.api}`)
	console.log(`   Web:        http://localhost:${ports.web}`)
	console.log(`   PostgreSQL: localhost:${ports.postgres}`)
	console.log(`   Redis:      localhost:${ports.redis}`)
	console.log('─'.repeat(40))
}
