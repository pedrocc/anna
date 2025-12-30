// biome-ignore-all lint/suspicious/noConsole: Health check script needs console output
import { $ } from 'bun'

let hasErrors = false

// Check Bun version
const bunVersion = await $`bun --version`.text()
console.log(`Bun version: ${bunVersion.trim()}`)

// Check TypeScript
try {
	await $`bun run typecheck`.quiet()
	console.log('TypeScript: OK')
} catch {
	console.error('TypeScript: FAILED')
	hasErrors = true
}

// Check Biome
try {
	await $`bun run lint`.quiet()
	console.log('Biome lint: OK')
} catch {
	console.error('Biome lint: FAILED')
	hasErrors = true
}

// Check database connection
try {
	const dbCheck = await fetch('http://localhost:3000/health/ready')
	if (dbCheck.ok) {
		console.log('Database: OK')
	} else {
		console.error('Database: FAILED')
		hasErrors = true
	}
} catch {
	console.warn('Database: SKIPPED (API not running)')
}

if (hasErrors) {
	process.exit(1)
} else {
	console.log('All checks passed!')
}
