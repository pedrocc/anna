import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'

/**
 * Known trusted proxy IP ranges
 *
 * Cloudflare IP ranges: https://www.cloudflare.com/ips/
 * Railway: Uses Cloudflare, so we primarily rely on CF headers
 *
 * For production, these should be periodically updated or fetched dynamically.
 */
const CLOUDFLARE_IPV4_RANGES = [
	'173.245.48.0/20',
	'103.21.244.0/22',
	'103.22.200.0/22',
	'103.31.4.0/22',
	'141.101.64.0/18',
	'108.162.192.0/18',
	'190.93.240.0/20',
	'188.114.96.0/20',
	'197.234.240.0/22',
	'198.41.128.0/17',
	'162.158.0.0/15',
	'104.16.0.0/13',
	'104.24.0.0/14',
	'172.64.0.0/13',
	'131.0.72.0/22',
]

const CLOUDFLARE_IPV6_RANGES = [
	'2400:cb00::/32',
	'2606:4700::/32',
	'2803:f800::/32',
	'2405:b500::/32',
	'2405:8100::/32',
	'2a06:98c0::/29',
	'2c0f:f248::/32',
]

/**
 * Railway proxy IPs (Railway uses Cloudflare, but may have additional internal IPs)
 * In production, Railway requests come through Cloudflare
 */
const RAILWAY_TRUSTED_HEADERS = ['cf-connecting-ip', 'x-real-ip'] as const

/**
 * Parse CIDR notation to check if IP is in range
 */
function ipInCidr(ip: string, cidr: string): boolean {
	const [range, bitsStr] = cidr.split('/')
	const bits = Number.parseInt(bitsStr, 10)

	// Handle IPv6
	if (ip.includes(':') && range.includes(':')) {
		return ipv6InCidr(ip, range, bits)
	}

	// Handle IPv4
	if (!ip.includes(':') && !range.includes(':')) {
		return ipv4InCidr(ip, range, bits)
	}

	return false
}

function ipv4InCidr(ip: string, range: string, bits: number): boolean {
	// /0 means all IPs match
	if (bits === 0) {
		return true
	}

	const ipParts = ip.split('.').map((p) => Number.parseInt(p, 10))
	const rangeParts = range.split('.').map((p) => Number.parseInt(p, 10))

	// Use >>> 0 to treat as unsigned 32-bit integer
	const ipNum = ((ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]) >>> 0
	const rangeNum =
		((rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3]) >>> 0

	// Create mask - use >>> 0 for unsigned behavior
	const mask = bits === 32 ? 0xffffffff : ~((1 << (32 - bits)) - 1) >>> 0
	return (ipNum & mask) === (rangeNum & mask)
}

function ipv6InCidr(ip: string, range: string, bits: number): boolean {
	const ipParts = expandIPv6(ip)
	const rangeParts = expandIPv6(range)

	const fullBits = Math.floor(bits / 16)
	const partialBits = bits % 16

	for (let i = 0; i < fullBits; i++) {
		if (ipParts[i] !== rangeParts[i]) {
			return false
		}
	}

	if (partialBits > 0 && fullBits < 8) {
		const mask = 0xffff << (16 - partialBits)
		if ((ipParts[fullBits] & mask) !== (rangeParts[fullBits] & mask)) {
			return false
		}
	}

	return true
}

function expandIPv6(ip: string): number[] {
	const parts = ip.split(':')
	const result: number[] = []

	for (const part of parts) {
		if (part === '') {
			const missing = 8 - parts.filter((p) => p !== '').length
			for (let i = 0; i < missing + 1; i++) {
				result.push(0)
			}
		} else {
			result.push(Number.parseInt(part, 16))
		}
	}

	while (result.length < 8) {
		result.push(0)
	}

	return result.slice(0, 8)
}

/**
 * Check if the connecting IP is from a trusted Cloudflare proxy
 */
function isCloudflareProxy(ip: string): boolean {
	for (const cidr of CLOUDFLARE_IPV4_RANGES) {
		if (ipInCidr(ip, cidr)) {
			return true
		}
	}
	for (const cidr of CLOUDFLARE_IPV6_RANGES) {
		if (ipInCidr(ip, cidr)) {
			return true
		}
	}
	return false
}

/**
 * Configuration for trusted proxy middleware
 */
export interface TrustedProxyConfig {
	/**
	 * Trust all proxies (ONLY for development/testing)
	 * When true, proxy headers are always trusted
	 * @default false
	 */
	trustAll?: boolean

	/**
	 * Additional trusted proxy IPs/CIDRs
	 * These IPs will be trusted in addition to Cloudflare ranges
	 */
	additionalTrustedProxies?: string[]
}

/**
 * Get client IP from request, only trusting proxy headers from known proxies
 *
 * This function validates that the request is coming from a trusted proxy
 * (Cloudflare/Railway) before trusting headers like cf-connecting-ip.
 *
 * If the request is not from a trusted proxy, we return a fallback identifier
 * since we cannot reliably determine the client IP without a trusted proxy.
 *
 * @param c - Hono context
 * @param config - Optional configuration
 * @returns The client IP address or 'unknown' if not determinable
 */
export function getClientIp(c: Context, config?: TrustedProxyConfig): string {
	const trustAll = config?.trustAll ?? process.env['TRUST_ALL_PROXIES'] === 'true'
	const additionalProxies = config?.additionalTrustedProxies ?? parseEnvProxies()

	// Get the direct connecting IP (from socket/connection)
	// In Bun, this is available via c.req.raw or socket info
	// When behind proxy, this will be the proxy's IP
	const connectingIp = getConnectingIp(c)

	// Check if we should trust proxy headers
	const shouldTrustHeaders = trustAll || isFromTrustedProxy(connectingIp, additionalProxies)

	if (shouldTrustHeaders) {
		// Trust proxy headers - check in priority order
		for (const header of RAILWAY_TRUSTED_HEADERS) {
			const value = c.req.header(header)
			if (value) {
				// cf-connecting-ip is a single IP, x-real-ip should also be single
				return normalizeIp(value.split(',')[0].trim())
			}
		}
	}

	// Not behind trusted proxy or no proxy headers found
	// Return the direct connecting IP if available
	if (connectingIp && connectingIp !== 'unknown') {
		return normalizeIp(connectingIp)
	}

	// Last resort fallback
	return 'unknown'
}

/**
 * Parse additional trusted proxies from environment variable
 */
function parseEnvProxies(): string[] {
	const envValue = process.env['TRUSTED_PROXY_IPS']
	if (!envValue) {
		return []
	}
	return envValue
		.split(',')
		.map((ip) => ip.trim())
		.filter((ip) => ip.length > 0)
}

/**
 * Get the direct connecting IP from the request
 * This is the IP that directly connected to our server (could be proxy)
 */
function getConnectingIp(c: Context): string {
	// In Bun with Hono, the socket address might be available
	// Try multiple methods to get the actual connection IP

	// Method 1: Check for x-forwarded-for ONLY from Bun's internal handling
	// This is set by Bun's server itself, not user-provided
	const connInfo = c.env?.['remoteAddress'] as string | undefined
	if (connInfo) {
		return normalizeIp(connInfo)
	}

	// Method 2: For local development (127.0.0.1 or ::1)
	// When running locally without proxy, treat as trusted for dev purposes
	if (process.env['NODE_ENV'] === 'development') {
		return '127.0.0.1'
	}

	return 'unknown'
}

/**
 * Check if the connecting IP is from a trusted proxy
 */
function isFromTrustedProxy(ip: string, additionalProxies: string[]): boolean {
	// Always trust localhost in development
	if (ip === '127.0.0.1' || ip === '::1') {
		return process.env['NODE_ENV'] === 'development'
	}

	// Check Cloudflare ranges (Railway uses Cloudflare)
	if (isCloudflareProxy(ip)) {
		return true
	}

	// Check additional trusted proxies
	for (const proxy of additionalProxies) {
		if (proxy.includes('/')) {
			// CIDR notation
			if (ipInCidr(ip, proxy)) {
				return true
			}
		} else {
			// Exact IP match
			if (normalizeIp(ip) === normalizeIp(proxy)) {
				return true
			}
		}
	}

	return false
}

/**
 * Normalize IP address format
 */
function normalizeIp(ip: string): string {
	// Remove IPv6 prefix for IPv4-mapped addresses
	if (ip.startsWith('::ffff:')) {
		return ip.slice(7)
	}
	return ip.trim()
}

/**
 * Middleware that extracts and validates client IP from trusted proxies
 *
 * Sets c.set('clientIp', ip) for use in handlers
 */
export const trustedProxyMiddleware = (config?: TrustedProxyConfig) => {
	return createMiddleware(async (c, next) => {
		const clientIp = getClientIp(c, config)
		c.set('clientIp', clientIp)
		await next()
	})
}

// Export utilities for testing
export const _testUtils = {
	isCloudflareProxy,
	ipInCidr,
	isFromTrustedProxy,
	normalizeIp,
	CLOUDFLARE_IPV4_RANGES,
	CLOUDFLARE_IPV6_RANGES,
}
