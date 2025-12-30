// biome-ignore-all lint/suspicious/noConsole: Build script needs console output
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const outdir = './dist'

// Build the React app with Bun
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
		__API_URL__: JSON.stringify(process.env['API_URL'] || '/api'),
		__CLERK_PUBLISHABLE_KEY__: JSON.stringify(process.env['CLERK_PUBLISHABLE_KEY'] || ''),
	},
})

if (!result.success) {
	console.error('Build failed:', result.logs)
	process.exit(1)
}

// Copy public files if they exist
mkdirSync(join(outdir, 'assets'), { recursive: true })
if (existsSync('./public')) {
	cpSync('./public', outdir, { recursive: true })
}

// Generate index.html with hashed assets
const htmlTemplate = readFileSync('./index.html', 'utf-8')
const jsFile = result.outputs
	.find((o) => o.path.endsWith('.js'))
	?.path.split('/')
	.pop()
const cssFile = result.outputs
	.find((o) => o.path.endsWith('.css'))
	?.path.split('/')
	.pop()

let html = htmlTemplate.replace('src/main.tsx', jsFile ?? 'main.js')

if (cssFile) {
	html = html.replace('</head>', `<link rel="stylesheet" href="/${cssFile}">\n  </head>`)
}

writeFileSync(join(outdir, 'index.html'), html)
console.log(`Build complete: ${result.outputs.length} files generated`)
