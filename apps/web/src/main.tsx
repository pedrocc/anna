import { ClerkProvider } from '@clerk/clerk-react'
import { ptBR } from '@clerk/localizations'
import { Toaster } from '@repo/ui'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SWRConfig } from 'swr'
import { App } from './App.js'
import { ErrorBoundary } from './components/ErrorBoundary.js'
import { fetcher } from './lib/api.js'
import './styles/globals.css'

// Replaced at build time by Bun's define option
declare const __CLERK_PUBLISHABLE_KEY__: string | undefined
const CLERK_KEY = __CLERK_PUBLISHABLE_KEY__ ?? ''

const rootElement = document.getElementById('root')

if (!rootElement) {
	throw new Error('Root element not found')
}

function AppWithProviders() {
	const content = (
		<SWRConfig value={{ fetcher, revalidateOnFocus: false }}>
			<App />
			<Toaster position="bottom-right" closeButton richColors />
		</SWRConfig>
	)

	if (CLERK_KEY) {
		return (
			<ClerkProvider
				publishableKey={CLERK_KEY}
				localization={ptBR}
				signInUrl="/sign-in"
				signUpUrl="/sign-up"
				signInFallbackRedirectUrl="/inicio"
				signUpFallbackRedirectUrl="/inicio"
				afterSignOutUrl="/"
			>
				{content}
			</ClerkProvider>
		)
	}

	return content
}

createRoot(rootElement).render(
	<StrictMode>
		<ErrorBoundary>
			<AppWithProviders />
		</ErrorBoundary>
	</StrictMode>
)
