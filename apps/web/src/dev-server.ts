import { existsSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'

const homepage = readFileSync('./index.html', 'utf-8')

// Port is determined by scripts/dev.ts and passed via PORT env var
const PORT = Number(process.env['PORT']) || 5173
const API_URL = process.env['API_URL'] || '/api'
const CLERK_KEY = process.env['CLERK_PUBLISHABLE_KEY'] || ''

// biome-ignore lint/suspicious/noConsole: Startup info
console.log(`🔧 Config: API_URL=${API_URL}, CLERK_KEY=${CLERK_KEY ? 'loaded' : 'MISSING!'}`)

const MIME_TYPES: Record<string, string> = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.jsx': 'text/javascript',
	'.ts': 'text/javascript',
	'.tsx': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
}

async function proxyApiRequest(req: Request, pathname: string, search: string): Promise<Response> {
	const apiUrl = `${API_URL}${pathname}${search}`
	const headers = new Headers(req.headers)
	headers.delete('host')

	try {
		const response = await fetch(apiUrl, {
			method: req.method,
			headers,
			body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
		})

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
		})
	} catch {
		return new Response(JSON.stringify({ error: 'API unavailable' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' },
		})
	}
}

function serveStaticFile(filePath: string): Response {
	const ext = extname(filePath)
	const contentType = MIME_TYPES[ext] || 'application/octet-stream'
	return new Response(Bun.file(filePath), {
		headers: { 'Content-Type': contentType },
	})
}

// Cache for compiled Tailwind CSS
let tailwindCache: { css: string; mtime: number } | null = null

async function compileTailwindCSS(filePath: string): Promise<string | null> {
	const stat = Bun.file(filePath)
	const mtime = (await stat.stat()).mtime.getTime()

	if (tailwindCache?.mtime === mtime) {
		return tailwindCache.css
	}

	const proc = Bun.spawn(['bunx', 'tailwindcss', '-i', filePath], {
		stdout: 'pipe',
		stderr: 'pipe',
	})

	const output = await new Response(proc.stdout).text()
	const error = await new Response(proc.stderr).text()
	const exitCode = await proc.exited

	if (exitCode !== 0) {
		// biome-ignore lint/suspicious/noConsole: Error logging
		console.error('Tailwind compilation error:', error)
		return null
	}

	tailwindCache = { css: output, mtime }
	return output
}

async function serveTypeScript(filePath: string): Promise<Response | null> {
	if (!existsSync(filePath)) return null

	const result = await Bun.build({
		entrypoints: [filePath],
		target: 'browser',
		format: 'esm',
		splitting: false,
		minify: false,
		define: {
			'process.env.NODE_ENV': '"development"',
			__CLERK_PUBLISHABLE_KEY__: JSON.stringify(CLERK_KEY),
			__API_URL__: JSON.stringify(API_URL),
		},
	})

	if (!result.success || !result.outputs[0]) return null

	const code = await result.outputs[0].text()
	const headers = new Headers()
	headers.set('Content-Type', 'text/javascript')
	headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
	headers.set('Pragma', 'no-cache')
	headers.set('Expires', '0')
	return new Response(code, { headers })
}

// Handle .js imports by mapping to .ts/.tsx files
async function handleJsImport(pathname: string): Promise<Response | null> {
	const basePath = join('.', pathname.slice(0, -3))
	const extensions = ['.tsx', '.ts']

	for (const ext of extensions) {
		const tsPath = basePath + ext
		if (!existsSync(tsPath)) continue
		const response = await serveTypeScript(tsPath)
		if (response) return response
	}
	return null
}

// Handle CSS requests with Tailwind compilation
async function handleCssRequest(pathname: string): Promise<Response | null> {
	const filePath = join('.', pathname)
	if (!existsSync(filePath)) return null

	const compiled = await compileTailwindCSS(filePath)
	if (compiled) {
		return new Response(compiled, {
			headers: { 'Content-Type': 'text/css' },
		})
	}
	return serveStaticFile(filePath)
}

function serveHomepage(): Response {
	return new Response(homepage, {
		headers: { 'Content-Type': 'text/html' },
	})
}

// biome-ignore lint/suspicious/noConsole: Startup info
console.log(`🌐 Web server: http://localhost:${PORT}`)

const _server = Bun.serve({
	port: PORT,
	async fetch(req) {
		const url = new URL(req.url)
		const pathname = url.pathname

		if (pathname === '/') return serveHomepage()

		if (pathname.startsWith('/api/') || pathname.startsWith('/health')) {
			return proxyApiRequest(req, pathname, url.search)
		}

		const publicPath = join('./public', pathname)
		if (existsSync(publicPath)) return serveStaticFile(publicPath)

		if (pathname.endsWith('.ts') || pathname.endsWith('.tsx')) {
			const response = await serveTypeScript(join('.', pathname))
			if (response) return response
		}

		if (pathname.endsWith('.js')) {
			const response = await handleJsImport(pathname)
			if (response) return response
		}

		if (pathname.endsWith('.css')) {
			const response = await handleCssRequest(pathname)
			if (response) return response
		}

		return serveHomepage()
	},
})
