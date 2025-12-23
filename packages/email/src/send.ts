import type { Result } from '@repo/shared'
import { resend } from './client.js'

type SendEmailOptions = {
	to: string | string[]
	subject: string
	html: string
	from?: string
	replyTo?: string
	tags?: Array<{ name: string; value: string }>
}

type EmailResult = {
	id: string
}

export async function sendEmail({
	to,
	subject,
	html,
	from,
	replyTo,
	tags,
}: SendEmailOptions): Promise<Result<EmailResult, Error>> {
	const fromAddress = from ?? 'noreply@example.com'

	const { data, error } = await resend.emails.send({
		from: fromAddress,
		to,
		subject,
		html,
		replyTo,
		tags,
	})

	if (error) {
		return { ok: false, error: new Error(`Failed to send email: ${error.message}`) }
	}

	if (!data) {
		return { ok: false, error: new Error('No data returned from Resend') }
	}

	return { ok: true, value: { id: data.id } }
}

type SendBatchOptions = {
	emails: Array<Omit<SendEmailOptions, 'from'> & { from?: string }>
	defaultFrom?: string
}

export async function sendBatchEmails({
	emails,
	defaultFrom,
}: SendBatchOptions): Promise<Result<EmailResult[], Error>> {
	const fromAddress = defaultFrom ?? 'noreply@example.com'

	const { data, error } = await resend.batch.send(
		emails.map((email) => ({
			from: email.from ?? fromAddress,
			to: email.to,
			subject: email.subject,
			html: email.html,
			replyTo: email.replyTo,
			tags: email.tags,
		}))
	)

	if (error) {
		return { ok: false, error: new Error(`Failed to send batch emails: ${error.message}`) }
	}

	if (!data) {
		return { ok: false, error: new Error('No data returned from Resend batch') }
	}

	return { ok: true, value: data.data.map((d) => ({ id: d.id })) }
}
