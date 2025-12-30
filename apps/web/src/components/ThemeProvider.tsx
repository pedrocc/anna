import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeProviderProps {
	readonly children: React.ReactNode
	readonly defaultTheme?: Theme
	readonly storageKey?: string
}

interface ThemeProviderState {
	theme: Theme
	setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderState | null>(null)

function getStoredTheme(storageKey: string, defaultTheme: Theme): Theme {
	if (globalThis.window === undefined) {
		return defaultTheme
	}
	return (globalThis.localStorage.getItem(storageKey) as Theme) || defaultTheme
}

function getSystemTheme(): 'dark' | 'light' {
	if (globalThis.window === undefined) {
		return 'light'
	}
	return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
	if (globalThis.document === undefined) {
		return
	}
	const root = globalThis.document.documentElement
	root.classList.remove('dark')

	const resolvedTheme = theme === 'system' ? getSystemTheme() : theme

	if (resolvedTheme === 'dark') {
		root.classList.add('dark')
	}
}

export function ThemeProvider({
	children,
	defaultTheme = 'system',
	storageKey = 'stack-vdev-theme',
}: ThemeProviderProps) {
	const [theme, setTheme] = useState<Theme>(() => getStoredTheme(storageKey, defaultTheme))

	const updateTheme = useCallback(
		(newTheme: Theme) => {
			globalThis.localStorage.setItem(storageKey, newTheme)
			setTheme(newTheme)
		},
		[storageKey]
	)

	// Aplica tema quando muda
	useEffect(() => {
		applyTheme(theme)
	}, [theme])

	// Listener para mudanças no tema do sistema
	useEffect(() => {
		if (theme !== 'system') {
			return
		}

		const mediaQuery = globalThis.matchMedia('(prefers-color-scheme: dark)')

		const handleChange = () => {
			applyTheme('system')
		}

		mediaQuery.addEventListener('change', handleChange)
		return () => mediaQuery.removeEventListener('change', handleChange)
	}, [theme])

	const value = useMemo(() => ({ theme, setTheme: updateTheme }), [theme, updateTheme])

	return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>
}

export const useTheme = () => {
	const context = useContext(ThemeProviderContext)

	if (context === null) {
		throw new Error('useTheme must be used within a ThemeProvider')
	}

	return context
}
