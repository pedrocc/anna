/**
 * Script para verificar configuração do Clerk
 * Uso: bun run scripts/verify-clerk.ts
 */

// biome-ignore-all lint/suspicious/noConsole: CLI script needs console output

const REQUIRED_VARS = {
	CLERK_PUBLISHABLE_KEY: {
		pattern: /^pk_(test|live)_[a-zA-Z0-9]+$/,
		description: 'Clerk Publishable Key',
		help: 'Obtenha em: https://dashboard.clerk.com → API Keys',
	},
	CLERK_SECRET_KEY: {
		pattern: /^sk_(test|live)_[a-zA-Z0-9]+$/,
		description: 'Clerk Secret Key',
		help: 'Obtenha em: https://dashboard.clerk.com → API Keys',
	},
}

interface ValidationResult {
	valid: boolean
	errors: string[]
	warnings: string[]
}

function validateClerkConfig(): ValidationResult {
	const errors: string[] = []
	const warnings: string[] = []

	console.log('🔍 Verificando configuração do Clerk...\n')

	for (const [varName, config] of Object.entries(REQUIRED_VARS)) {
		const value = process.env[varName]

		if (!value) {
			errors.push(`❌ ${varName} não está definida`)
			console.log(`   ${config.help}`)
			continue
		}

		if (value.includes('placeholder')) {
			errors.push(`❌ ${varName} contém valor placeholder`)
			console.log(`   ${config.help}`)
			continue
		}

		if (!config.pattern.test(value)) {
			errors.push(`❌ ${varName} tem formato inválido`)
			console.log(`   Esperado: ${config.pattern}`)
			console.log(`   ${config.help}`)
			continue
		}

		// Check if using test keys
		if (value.includes('_test_')) {
			warnings.push(`⚠️  ${varName} está usando chave de teste (ok para desenvolvimento)`)
		}

		console.log(`✅ ${config.description}: configurada corretamente`)
	}

	console.log('')

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	}
}

async function testClerkConnection(): Promise<boolean> {
	const secretKey = process.env['CLERK_SECRET_KEY']

	if (!secretKey || secretKey.includes('placeholder')) {
		console.log('⏭️  Pulando teste de conexão (chaves não configuradas)\n')
		return false
	}

	console.log('🔗 Testando conexão com Clerk API...')

	try {
		const response = await fetch('https://api.clerk.com/v1/users?limit=1', {
			headers: {
				Authorization: `Bearer ${secretKey}`,
				'Content-Type': 'application/json',
			},
		})

		if (response.ok) {
			console.log('✅ Conexão com Clerk API funcionando!\n')
			return true
		}

		if (response.status === 401) {
			console.log('❌ Chave inválida ou expirada\n')
			return false
		}

		console.log(`❌ Erro na API: ${response.status} ${response.statusText}\n`)
		return false
	} catch (error) {
		console.log(`❌ Erro de conexão: ${error}\n`)
		return false
	}
}

async function main() {
	console.log('═══════════════════════════════════════════════════')
	console.log('          Verificação de Configuração Clerk        ')
	console.log('═══════════════════════════════════════════════════\n')

	const result = validateClerkConfig()

	// Show warnings
	for (const warning of result.warnings) {
		console.log(warning)
	}

	if (!result.valid) {
		console.log('\n═══════════════════════════════════════════════════')
		console.log('                 CONFIGURAÇÃO INVÁLIDA              ')
		console.log('═══════════════════════════════════════════════════')
		console.log('\nPara configurar o Clerk:')
		console.log('1. Crie uma conta em https://clerk.com')
		console.log('2. Crie um novo application')
		console.log('3. Copie as chaves de API Keys')
		console.log('4. Edite o arquivo .env com as chaves reais')
		console.log('\nExemplo no .env:')
		console.log('  CLERK_PUBLISHABLE_KEY=pk_test_xxx...')
		console.log('  CLERK_SECRET_KEY=sk_test_xxx...')
		console.log('')
		process.exit(1)
	}

	// Test actual connection
	const connected = await testClerkConnection()

	console.log('═══════════════════════════════════════════════════')
	if (connected) {
		console.log('     ✅ CLERK CONFIGURADO E FUNCIONANDO!            ')
	} else if (result.valid) {
		console.log('     ⚠️  CLERK CONFIGURADO (conexão não testada)    ')
	}
	console.log('═══════════════════════════════════════════════════\n')

	if (connected) {
		console.log('Próximos passos:')
		console.log('1. Execute: bun dev')
		console.log('2. Acesse: http://localhost:5173')
		console.log('3. Clique em "Sign In" ou "Sign Up"')
		console.log('4. Teste o fluxo de autenticação')
		console.log('')
	}
}

await main()
