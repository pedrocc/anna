import { Resend } from 'resend'

const RESEND_API_KEY = process.env['RESEND_API_KEY']

if (!RESEND_API_KEY) {
	// biome-ignore lint/suspicious/noConsole: Warning needed for missing config
	console.warn('RESEND_API_KEY not configured - emails will not be sent')
}

export const resend = new Resend(RESEND_API_KEY)
