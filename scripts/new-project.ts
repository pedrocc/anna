import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { $ } from 'bun'

const args = process.argv.slice(2)
const nameArg = args.find((a) => a.startsWith('--name='))
const descArg = args.find((a) => a.startsWith('--description='))

if (!nameArg) {
	console.error('❌ Erro: --name é obrigatório')
	console.error('   Uso: bun new-project --name=meu-projeto --description="Descrição"')
	process.exit(1)
}

const projectName = nameArg.split('=')[1]
const description = descArg?.split('=')[1] ?? ''

// Validate name (kebab-case)
if (!projectName || !/^[a-z][a-z0-9-]*$/.test(projectName)) {
	console.error('❌ Erro: Nome do projeto inválido')
	console.error('   O nome deve ser kebab-case: letras minúsculas, números e hífens')
	console.error('   Deve começar com letra. Ex: meu-projeto, app-vendas-2024')
	process.exit(1)
}

// Helper functions to convert name formats
function toSnakeCase(name: string): string {
	return name.replaceAll('-', '_')
}

function toTitleCase(name: string): string {
	return name
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}

const projectNameSnake = toSnakeCase(projectName)
const projectNameTitle = toTitleCase(projectName)

console.log(`\n🚀 Criando projeto: ${projectName}`)
console.log(`   Snake case: ${projectNameSnake}`)
console.log(`   Title case: ${projectNameTitle}\n`)

// Files to update with their replacement patterns
const filesToUpdate = [
	'package.json',
	'docker/docker-compose.yml',
	'.env.example',
	'apps/web/index.html',
	'apps/web/src/pages/Home.tsx',
	'apps/web/src/components/Layout.tsx',
	'packages/email/src/templates/welcome.ts',
]

let updatedCount = 0

for (const file of filesToUpdate) {
	if (!existsSync(file)) {
		console.warn(`⚠️  Arquivo não encontrado: ${file}`)
		continue
	}

	try {
		const content = readFileSync(file, 'utf-8')
		const updated = content
			// Replace all three name variations
			.replaceAll('stack-vdev', projectName)
			.replaceAll('stack_vdev', projectNameSnake)
			.replaceAll('Stack VDev', projectNameTitle)
			// Replace description in package.json
			.replace(/"description":\s*""/, `"description": "${description}"`)

		if (content !== updated) {
			writeFileSync(file, updated)
			console.log(`✅ Atualizado: ${file}`)
			updatedCount++
		}
	} catch (error) {
		console.error(`❌ Erro ao atualizar ${file}:`, error)
	}
}

console.log(`\n📝 ${updatedCount} arquivo(s) atualizado(s)`)

// Remove .git if exists
if (existsSync('.git')) {
	try {
		rmSync('.git', { recursive: true, force: true })
		console.log('🗑️  Histórico git do template removido')
	} catch {
		console.warn('⚠️  Não foi possível remover .git')
	}
}

// Initialize new git repo
console.log('📦 Inicializando novo repositório git...')
await $`git init`.quiet()
console.log('✅ Repositório git inicializado')

// Copy .env.example to .env
if (existsSync('.env.example')) {
	try {
		const envExample = readFileSync('.env.example', 'utf-8')
		writeFileSync('.env', envExample)
		console.log('✅ Arquivo .env criado a partir de .env.example')
	} catch {
		console.warn('⚠️  Não foi possível criar .env')
	}
}

// Install dependencies
console.log('\n📥 Instalando dependências...')
await $`bun install`.quiet()
console.log('✅ Dependências instaladas')

console.log(`
🎉 Projeto "${projectName}" criado com sucesso!

Próximos passos:
  1. Configure as variáveis em .env (Clerk, Resend, etc.)
  2. Inicie os containers: docker compose -f docker/docker-compose.yml up -d
  3. Rode as migrations: bun db:migrate
  4. Inicie o desenvolvimento: bun dev
`)
