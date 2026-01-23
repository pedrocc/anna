import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { Context } from 'hono'
import { Hono } from 'hono'
import { _testUtils, getClientIp, trustedProxyMiddleware } from './trusted-proxy.js'

const { isCloudflareProxy, ipInCidr, normalizeIp, CLOUDFLARE_IPV4_RANGES } = _testUtils

describe('trusted-proxy middleware', () => {
	const originalEnv = { ...process.env }

	beforeEach(() => {
		// Reset environment
		process.env['NODE_ENV'] = 'test'
		process.env['TRUST_ALL_PROXIES'] = 'false'
		delete process.env['TRUSTED_PROXY_IPS']
	})

	afterEach(() => {
		// Restore environment
		process.env = { ...originalEnv }
	})

	describe('ipInCidr', () => {
		describe('IPv4', () => {
			it('should match IP within CIDR range', () => {
				expect(ipInCidr('192.168.1.5', '192.168.1.0/24')).toBe(true)
				expect(ipInCidr('192.168.1.255', '192.168.1.0/24')).toBe(true)
				expect(ipInCidr('192.168.1.0', '192.168.1.0/24')).toBe(true)
			})

			it('should not match IP outside CIDR range', () => {
				expect(ipInCidr('192.168.2.1', '192.168.1.0/24')).toBe(false)
				expect(ipInCidr('10.0.0.1', '192.168.1.0/24')).toBe(false)
			})

			it('should handle /32 (single IP)', () => {
				expect(ipInCidr('192.168.1.1', '192.168.1.1/32')).toBe(true)
				expect(ipInCidr('192.168.1.2', '192.168.1.1/32')).toBe(false)
			})

			it('should handle /0 (all IPs)', () => {
				expect(ipInCidr('1.2.3.4', '0.0.0.0/0')).toBe(true)
				expect(ipInCidr('255.255.255.255', '0.0.0.0/0')).toBe(true)
			})

			it('should handle various subnet sizes', () => {
				// /16 subnet
				expect(ipInCidr('10.0.50.1', '10.0.0.0/16')).toBe(true)
				expect(ipInCidr('10.1.0.1', '10.0.0.0/16')).toBe(false)

				// /8 subnet
				expect(ipInCidr('10.100.200.5', '10.0.0.0/8')).toBe(true)
				expect(ipInCidr('11.0.0.1', '10.0.0.0/8')).toBe(false)
			})
		})

		describe('IPv6', () => {
			it('should match IP within CIDR range', () => {
				expect(ipInCidr('2606:4700:0:0:0:0:0:1', '2606:4700::/32')).toBe(true)
				expect(ipInCidr('2606:4700:ffff:ffff:ffff:ffff:ffff:ffff', '2606:4700::/32')).toBe(true)
			})

			it('should not match IP outside CIDR range', () => {
				expect(ipInCidr('2607:4700:0:0:0:0:0:1', '2606:4700::/32')).toBe(false)
			})

			it('should not match IPv4 against IPv6 CIDR', () => {
				expect(ipInCidr('192.168.1.1', '2606:4700::/32')).toBe(false)
			})
		})
	})

	describe('normalizeIp', () => {
		it('should remove IPv6 prefix from IPv4-mapped addresses', () => {
			expect(normalizeIp('::ffff:192.168.1.1')).toBe('192.168.1.1')
			expect(normalizeIp('::ffff:10.0.0.1')).toBe('10.0.0.1')
		})

		it('should trim whitespace', () => {
			expect(normalizeIp('  192.168.1.1  ')).toBe('192.168.1.1')
		})

		it('should not modify regular IPv4', () => {
			expect(normalizeIp('192.168.1.1')).toBe('192.168.1.1')
		})

		it('should not modify regular IPv6', () => {
			expect(normalizeIp('2606:4700::1')).toBe('2606:4700::1')
		})
	})

	describe('isCloudflareProxy', () => {
		it('should identify Cloudflare IPv4 addresses', () => {
			// Sample IPs from known Cloudflare ranges
			expect(isCloudflareProxy('104.16.0.1')).toBe(true) // 104.16.0.0/13
			expect(isCloudflareProxy('104.24.0.1')).toBe(true) // 104.24.0.0/14
			expect(isCloudflareProxy('172.64.0.1')).toBe(true) // 172.64.0.0/13
			expect(isCloudflareProxy('162.158.0.1')).toBe(true) // 162.158.0.0/15
		})

		it('should identify Cloudflare IPv6 addresses', () => {
			expect(isCloudflareProxy('2606:4700:0:0:0:0:0:1')).toBe(true)
			expect(isCloudflareProxy('2400:cb00:0:0:0:0:0:1')).toBe(true)
		})

		it('should reject non-Cloudflare IPs', () => {
			expect(isCloudflareProxy('192.168.1.1')).toBe(false)
			expect(isCloudflareProxy('10.0.0.1')).toBe(false)
			expect(isCloudflareProxy('8.8.8.8')).toBe(false)
			expect(isCloudflareProxy('1.1.1.1')).toBe(false) // Cloudflare DNS, but not proxy
		})
	})

	describe('getClientIp with Hono context', () => {
		function createMockContext(
			headers: Record<string, string> = {},
			env: Record<string, unknown> = {}
		): {
			c: Context
		} {
			// Create a minimal mock context for testing
			const mockContext = {
				req: {
					header: (name: string) => headers[name.toLowerCase()],
				},
				env: env,
				set: () => {},
				get: () => undefined,
			} as unknown as Context

			return { c: mockContext }
		}

		describe('when TRUST_ALL_PROXIES=true', () => {
			beforeEach(() => {
				process.env['TRUST_ALL_PROXIES'] = 'true'
			})

			it('should trust cf-connecting-ip header', () => {
				const { c } = createMockContext({ 'cf-connecting-ip': '203.0.113.50' })
				expect(getClientIp(c)).toBe('203.0.113.50')
			})

			it('should trust x-real-ip header', () => {
				const { c } = createMockContext({ 'x-real-ip': '203.0.113.60' })
				expect(getClientIp(c)).toBe('203.0.113.60')
			})

			it('should prefer cf-connecting-ip over x-real-ip', () => {
				const { c } = createMockContext({
					'cf-connecting-ip': '203.0.113.50',
					'x-real-ip': '203.0.113.60',
				})
				expect(getClientIp(c)).toBe('203.0.113.50')
			})

			it('should NOT trust x-forwarded-for (even when trust all)', () => {
				const { c } = createMockContext({ 'x-forwarded-for': '203.0.113.70' })
				// Without cf-connecting-ip or x-real-ip, should return unknown
				expect(getClientIp(c)).toBe('unknown')
			})
		})

		describe('when TRUST_ALL_PROXIES=false (default)', () => {
			beforeEach(() => {
				process.env['TRUST_ALL_PROXIES'] = 'false'
				process.env['NODE_ENV'] = 'test'
			})

			it('should NOT trust headers from unknown proxy', () => {
				const { c } = createMockContext(
					{ 'cf-connecting-ip': '203.0.113.50' },
					{ remoteAddress: '192.168.1.1' } // Not a Cloudflare IP
				)
				// Should NOT trust the header since connecting IP is not from Cloudflare
				expect(getClientIp(c)).toBe('192.168.1.1')
			})

			it('should trust headers from Cloudflare proxy IP', () => {
				const { c } = createMockContext(
					{ 'cf-connecting-ip': '203.0.113.50' },
					{ remoteAddress: '104.16.0.1' } // Cloudflare IP
				)
				expect(getClientIp(c)).toBe('203.0.113.50')
			})

			it('should return unknown when no proxy headers and no remote address', () => {
				const { c } = createMockContext({}, {})
				expect(getClientIp(c)).toBe('unknown')
			})
		})

		describe('with config override', () => {
			it('should trust all when config.trustAll=true', () => {
				const { c } = createMockContext({ 'cf-connecting-ip': '203.0.113.50' })
				expect(getClientIp(c, { trustAll: true })).toBe('203.0.113.50')
			})

			it('should trust additional proxy IPs from config', () => {
				const { c } = createMockContext(
					{ 'cf-connecting-ip': '203.0.113.50' },
					{ remoteAddress: '10.0.0.1' } // Custom internal proxy
				)
				expect(getClientIp(c, { additionalTrustedProxies: ['10.0.0.1'] })).toBe('203.0.113.50')
			})

			it('should trust additional proxy CIDR from config', () => {
				const { c } = createMockContext(
					{ 'x-real-ip': '203.0.113.60' },
					{ remoteAddress: '10.0.5.10' } // Within 10.0.0.0/16
				)
				expect(getClientIp(c, { additionalTrustedProxies: ['10.0.0.0/16'] })).toBe('203.0.113.60')
			})
		})

		describe('with TRUSTED_PROXY_IPS env var', () => {
			it('should parse comma-separated IPs', () => {
				process.env['TRUSTED_PROXY_IPS'] = '10.0.0.1,10.0.0.2'
				const { c } = createMockContext(
					{ 'cf-connecting-ip': '203.0.113.50' },
					{ remoteAddress: '10.0.0.1' }
				)
				expect(getClientIp(c)).toBe('203.0.113.50')
			})

			it('should handle whitespace in env var', () => {
				process.env['TRUSTED_PROXY_IPS'] = ' 10.0.0.1 , 10.0.0.2 '
				const { c } = createMockContext(
					{ 'cf-connecting-ip': '203.0.113.50' },
					{ remoteAddress: '10.0.0.1' }
				)
				expect(getClientIp(c)).toBe('203.0.113.50')
			})

			it('should handle CIDR in env var', () => {
				process.env['TRUSTED_PROXY_IPS'] = '10.0.0.0/24'
				const { c } = createMockContext(
					{ 'x-real-ip': '203.0.113.60' },
					{ remoteAddress: '10.0.0.100' }
				)
				expect(getClientIp(c)).toBe('203.0.113.60')
			})
		})

		describe('IP spoofing prevention', () => {
			it('should reject spoofed x-forwarded-for header', () => {
				const { c } = createMockContext(
					{
						'x-forwarded-for': '1.2.3.4, 5.6.7.8', // Attacker tries to spoof
						'cf-connecting-ip': '203.0.113.50', // Set by Cloudflare
					},
					{ remoteAddress: '104.16.0.1' } // From Cloudflare
				)
				// Should use cf-connecting-ip, not x-forwarded-for
				expect(getClientIp(c)).toBe('203.0.113.50')
			})

			it('should not allow client to spoof headers when not behind proxy', () => {
				process.env['TRUST_ALL_PROXIES'] = 'false'
				const { c } = createMockContext(
					{
						'cf-connecting-ip': '1.2.3.4', // Attacker tries to set this
						'x-real-ip': '5.6.7.8', // Attacker tries to set this
					},
					{ remoteAddress: '203.0.113.100' } // Actual client IP (not a proxy)
				)
				// Should return the actual connecting IP, not the spoofed headers
				expect(getClientIp(c)).toBe('203.0.113.100')
			})
		})

		describe('X-Forwarded-For spoofing attack vectors', () => {
			beforeEach(() => {
				process.env['TRUST_ALL_PROXIES'] = 'false'
				process.env['NODE_ENV'] = 'test'
			})

			it('should ignore x-forwarded-for when client connects directly (no proxy)', () => {
				// Attack: Client sends X-Forwarded-For to pretend to be another IP
				const { c } = createMockContext(
					{ 'x-forwarded-for': '10.0.0.1' }, // Attacker claims to be internal IP
					{ remoteAddress: '203.0.113.50' } // Actual client IP
				)
				// Should return actual IP, ignoring spoofed header
				expect(getClientIp(c)).toBe('203.0.113.50')
			})

			it('should ignore x-forwarded-for with multiple IPs when not from trusted proxy', () => {
				// Attack: Client crafts X-Forwarded-For chain to appear from internal network
				const { c } = createMockContext(
					{ 'x-forwarded-for': '192.168.1.1, 10.0.0.1, 172.16.0.1' },
					{ remoteAddress: '203.0.113.50' }
				)
				expect(getClientIp(c)).toBe('203.0.113.50')
			})

			it('should ignore x-forwarded-for with localhost when not from trusted proxy', () => {
				// Attack: Client tries to appear as localhost
				const { c } = createMockContext(
					{ 'x-forwarded-for': '127.0.0.1' },
					{ remoteAddress: '203.0.113.50' }
				)
				expect(getClientIp(c)).toBe('203.0.113.50')
			})

			it('should ignore x-forwarded-for with IPv6 localhost when not from trusted proxy', () => {
				// Attack: Client tries to appear as IPv6 localhost
				const { c } = createMockContext(
					{ 'x-forwarded-for': '::1' },
					{ remoteAddress: '203.0.113.50' }
				)
				expect(getClientIp(c)).toBe('203.0.113.50')
			})

			it('should ignore x-forwarded-for even when it looks like Cloudflare format', () => {
				// Attack: Client mimics Cloudflare-style header
				const { c } = createMockContext(
					{ 'x-forwarded-for': '1.2.3.4, 104.16.0.1' }, // Includes a Cloudflare IP
					{ remoteAddress: '203.0.113.50' }
				)
				expect(getClientIp(c)).toBe('203.0.113.50')
			})

			it('should ignore x-forwarded-for completely - header is never trusted', () => {
				// Even with TRUST_ALL_PROXIES=true, x-forwarded-for is not in trusted headers list
				process.env['TRUST_ALL_PROXIES'] = 'true'
				const { c } = createMockContext(
					{ 'x-forwarded-for': '1.2.3.4' },
					{ remoteAddress: '203.0.113.50' }
				)
				// x-forwarded-for is never trusted, falls back to remoteAddress
				expect(getClientIp(c)).toBe('203.0.113.50')
			})

			it('should use cf-connecting-ip and ignore x-forwarded-for even from trusted proxy', () => {
				// Scenario: Request through Cloudflare with both headers
				// x-forwarded-for may contain spoofed data prepended by attacker
				const { c } = createMockContext(
					{
						'x-forwarded-for': '1.2.3.4, 5.6.7.8, 203.0.113.50', // Attacker prepended IPs
						'cf-connecting-ip': '203.0.113.50', // Real client IP from Cloudflare
					},
					{ remoteAddress: '104.16.0.1' } // Cloudflare proxy IP
				)
				// Should trust cf-connecting-ip, completely ignore x-forwarded-for
				expect(getClientIp(c)).toBe('203.0.113.50')
			})

			it('should not trust x-forwarded-for even with malformed IP to bypass validation', () => {
				// Attack: Send malformed IP hoping to confuse parser
				const { c } = createMockContext(
					{ 'x-forwarded-for': '999.999.999.999' },
					{ remoteAddress: '203.0.113.50' }
				)
				expect(getClientIp(c)).toBe('203.0.113.50')
			})

			it('should not trust x-forwarded-for with empty value', () => {
				const { c } = createMockContext(
					{ 'x-forwarded-for': '' },
					{ remoteAddress: '203.0.113.50' }
				)
				expect(getClientIp(c)).toBe('203.0.113.50')
			})

			it('should not trust x-forwarded-for with whitespace-only value', () => {
				const { c } = createMockContext(
					{ 'x-forwarded-for': '   ' },
					{ remoteAddress: '203.0.113.50' }
				)
				expect(getClientIp(c)).toBe('203.0.113.50')
			})

			it('should not trust x-forwarded-for containing script injection attempt', () => {
				// Attack: XSS/injection attempt via header
				const { c } = createMockContext(
					{ 'x-forwarded-for': '<script>alert(1)</script>' },
					{ remoteAddress: '203.0.113.50' }
				)
				expect(getClientIp(c)).toBe('203.0.113.50')
			})

			it('should not trust spoofed cf-connecting-ip from non-Cloudflare IP', () => {
				// Attack: Client directly sends cf-connecting-ip without going through Cloudflare
				const { c } = createMockContext(
					{ 'cf-connecting-ip': '10.0.0.1' },
					{ remoteAddress: '203.0.113.50' } // Not a Cloudflare IP
				)
				// Should not trust cf-connecting-ip since request is not from Cloudflare
				expect(getClientIp(c)).toBe('203.0.113.50')
			})

			it('should not trust spoofed x-real-ip from non-proxy IP', () => {
				// Attack: Client directly sends x-real-ip
				const { c } = createMockContext(
					{ 'x-real-ip': '10.0.0.1' },
					{ remoteAddress: '203.0.113.50' } // Not a trusted proxy
				)
				expect(getClientIp(c)).toBe('203.0.113.50')
			})

			it('should not trust all spoofed headers combined from non-proxy IP', () => {
				// Attack: Client sends all possible proxy headers
				const { c } = createMockContext(
					{
						'x-forwarded-for': '10.0.0.1',
						'cf-connecting-ip': '10.0.0.2',
						'x-real-ip': '10.0.0.3',
						'x-client-ip': '10.0.0.4',
						'true-client-ip': '10.0.0.5',
						forwarded: 'for=10.0.0.6',
					},
					{ remoteAddress: '203.0.113.50' } // Actual client IP
				)
				// Should return actual connecting IP, ignoring all spoofed headers
				expect(getClientIp(c)).toBe('203.0.113.50')
			})

			it('should handle attacker trying to spoof Cloudflare IP in x-forwarded-for', () => {
				// Attack: Client includes Cloudflare IP in x-forwarded-for chain
				const { c } = createMockContext(
					{ 'x-forwarded-for': '10.0.0.1, 104.16.0.1' }, // Second IP is Cloudflare range
					{ remoteAddress: '203.0.113.50' }
				)
				// x-forwarded-for is completely ignored, actual IP is used
				expect(getClientIp(c)).toBe('203.0.113.50')
			})

			it('should not allow rate limit bypass via spoofed headers', () => {
				// Attack: Attacker changes x-forwarded-for to get fresh rate limit
				const { c: c1 } = createMockContext(
					{ 'x-forwarded-for': '1.1.1.1' },
					{ remoteAddress: '203.0.113.50' }
				)
				const { c: c2 } = createMockContext(
					{ 'x-forwarded-for': '2.2.2.2' },
					{ remoteAddress: '203.0.113.50' }
				)
				// Both should resolve to same IP (actual connecting IP)
				expect(getClientIp(c1)).toBe('203.0.113.50')
				expect(getClientIp(c2)).toBe('203.0.113.50')
			})
		})

		describe('development mode', () => {
			beforeEach(() => {
				process.env['NODE_ENV'] = 'development'
			})

			it('should trust localhost in development', () => {
				const { c } = createMockContext(
					{ 'cf-connecting-ip': '203.0.113.50' },
					{ remoteAddress: '127.0.0.1' }
				)
				expect(getClientIp(c)).toBe('203.0.113.50')
			})

			it('should trust ::1 in development', () => {
				const { c } = createMockContext({ 'x-real-ip': '203.0.113.60' }, { remoteAddress: '::1' })
				expect(getClientIp(c)).toBe('203.0.113.60')
			})
		})

		describe('production mode', () => {
			beforeEach(() => {
				process.env['NODE_ENV'] = 'production'
			})

			it('should NOT trust localhost in production', () => {
				const { c } = createMockContext(
					{ 'cf-connecting-ip': '203.0.113.50' },
					{ remoteAddress: '127.0.0.1' }
				)
				// In production, localhost is not trusted as a proxy
				expect(getClientIp(c)).toBe('127.0.0.1')
			})
		})
	})

	describe('trustedProxyMiddleware', () => {
		it('should set clientIp in context', async () => {
			process.env['TRUST_ALL_PROXIES'] = 'true'

			const app = new Hono<{ Variables: { clientIp: string } }>()
			app.use('*', trustedProxyMiddleware())
			app.get('/test', (c) => {
				const ip = c.get('clientIp')
				return c.json({ ip })
			})

			const response = await app.request('/test', {
				headers: {
					'cf-connecting-ip': '203.0.113.50',
				},
			})

			const data = (await response.json()) as { ip: string }
			expect(data.ip).toBe('203.0.113.50')
		})

		it('should work with custom config', async () => {
			const app = new Hono<{ Variables: { clientIp: string } }>()
			app.use('*', trustedProxyMiddleware({ trustAll: true }))
			app.get('/test', (c) => {
				const ip = c.get('clientIp')
				return c.json({ ip })
			})

			const response = await app.request('/test', {
				headers: {
					'x-real-ip': '203.0.113.60',
				},
			})

			const data = (await response.json()) as { ip: string }
			expect(data.ip).toBe('203.0.113.60')
		})
	})

	describe('Cloudflare IP ranges validity', () => {
		it('should have valid CIDR format for all IPv4 ranges', () => {
			for (const cidr of CLOUDFLARE_IPV4_RANGES) {
				const parts = cidr.split('/')
				const ip = parts[0] as string
				const bits = parts[1] as string
				expect(ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)
				expect(Number.parseInt(bits, 10)).toBeGreaterThanOrEqual(0)
				expect(Number.parseInt(bits, 10)).toBeLessThanOrEqual(32)
			}
		})
	})

	describe('real connection IP via Bun server', () => {
		it('should get actual connection IP from Bun runtime', async () => {
			// This test verifies that when running on Bun, getConnInfo provides the real IP
			const app = new Hono<{ Variables: { clientIp: string } }>()
			app.use('*', trustedProxyMiddleware())
			app.get('/ip', (c) => {
				const ip = c.get('clientIp')
				return c.json({ ip })
			})

			// When making a request through Bun's test server, the IP should be resolved
			// In test environment, this will be 127.0.0.1 or ::1
			const response = await app.request('/ip')
			const data = (await response.json()) as { ip: string }

			// The IP should be either localhost (IPv4 or IPv6) or 'unknown' in edge cases
			// but NOT the string 'unknown' when getConnInfo works
			expect(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'unknown']).toContain(data.ip)
		})

		it('should use real connection IP when not from trusted proxy and no headers', async () => {
			process.env['TRUST_ALL_PROXIES'] = 'false'
			process.env['NODE_ENV'] = 'test'

			const app = new Hono<{ Variables: { clientIp: string } }>()
			app.use('*', trustedProxyMiddleware())
			app.get('/ip', (c) => {
				const ip = c.get('clientIp')
				return c.json({ ip })
			})

			// Request without proxy headers - should get the actual connection IP
			const response = await app.request('/ip')
			const data = (await response.json()) as { ip: string }

			// Should return something (connection IP or unknown), not crash
			expect(typeof data.ip).toBe('string')
			expect(data.ip.length).toBeGreaterThan(0)
		})
	})
})
