// Build-time constants replaced by Bun's define option
declare const __API_URL__: string | undefined
declare const __CLERK_PUBLISHABLE_KEY__: string | undefined

declare const Bun: typeof import('bun')

// html2pdf.js types
declare module 'html2pdf.js' {
	interface Html2PdfInstance {
		set(options: Record<string, unknown>): Html2PdfInstance
		from(element: HTMLElement | string): Html2PdfInstance
		save(): Promise<void>
		toPdf(): Html2PdfInstance
		output(type: string): Promise<unknown>
	}

	function html2pdf(): Html2PdfInstance
	export default html2pdf
}
