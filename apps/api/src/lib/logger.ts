import pino from 'pino'

const isDev = process.env['NODE_ENV'] !== 'production'

export const logger = pino({
	level: process.env['LOG_LEVEL'] || (isDev ? 'debug' : 'info'),
	transport: isDev
		? {
				target: 'pino-pretty',
				options: {
					colorize: true,
					translateTime: 'HH:MM:ss',
					ignore: 'pid,hostname',
				},
			}
		: undefined,
	redact: {
		paths: [
			'*.apiKey',
			'*.api_key',
			'*.API_KEY',
			'*.authorization',
			'*.Authorization',
			'*.password',
		],
		censor: '[REDACTED]',
	},
})

// Child loggers for specific modules
export const createLogger = (module: string) => logger.child({ module })

// Pre-configured loggers for common modules
export const apiLogger = createLogger('api')
export const dbLogger = createLogger('db')
export const authLogger = createLogger('auth')
export const openrouterLogger = createLogger('openrouter')
export const jobsLogger = createLogger('jobs')
export const emailLogger = createLogger('email')
