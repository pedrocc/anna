// apps/web/build.ts
// biome-ignore-all lint/suspicious/noConsole: Build script needs console output
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { $ } from 'bun' // Usamos o shell do Bun para rodar comandos

const outdir = './dist'

console.log('🚀 Iniciando Build do Frontend...')

// 1. Build do React (JS)
console.log('📦 Compilando Aplicação React...')
const result = await Bun.build({
	entrypoints: ['./src/main.tsx'],
	outdir,
	target: 'browser',
	format: 'esm',
	splitting: true,
	minify: true,
	sourcemap: 'external',
	naming: {
		entry: '[dir]/[name]-[hash].[ext]',
		chunk: '[name]-[hash].[ext]',
		asset: '[name]-[hash].[ext]',
	},
	define: {
		'process.env.NODE_ENV': '"production"',
		__API_URL__: JSON.stringify(process.env['API_URL'] ?? ''), 
		__CLERK_PUBLISHABLE_KEY__: JSON.stringify(process.env['CLERK_PUBLISHABLE_KEY'] || ''),
	},
})

if (!result.success) {
	console.error('❌ Build falhou:', result.logs)
	process.exit(1)
}

// 2. Build do CSS (Tailwind v4)
// O Bun não compila tailwind sozinho, precisamos chamar a CLI
console.log('🎨 Compilando Tailwind CSS...')
try {
	// Cria o arquivo final em dist/styles.css
	await $`bunx @tailwindcss/cli -i ./src/styles/globals.css -o ./dist/styles.css --minify`
} catch (error) {
	console.error('❌ Erro ao compilar Tailwind:', error)
	process.exit(1)
}

// 3. Copiar arquivos públicos
if (existsSync('./public')) {
	cpSync('./public', outdir, { recursive: true })
}

// 4. Gerar index.html final
console.log('📝 Gerando index.html...')
const htmlTemplate = readFileSync('./index.html', 'utf-8')

// Pega o nome do arquivo JS gerado (com hash)
const jsFile = result.outputs
	.find((o) => o.path.endsWith('.js'))
	?.path.split('/')
	.pop()

// Substitui o script e INJETA O CSS MANUALMENTE
let html = htmlTemplate.replace('src/main.tsx', jsFile ?? 'main.js')

// Aqui está o segredo: Injetamos o link para o styles.css que geramos no passo 2
html = html.replace(
	'</head>', 
	`<link rel="stylesheet" href="/styles.css">\n  </head>`
)

writeFileSync(join(outdir, 'index.html'), html)
console.log(`✅ Build finalizado com sucesso!`)