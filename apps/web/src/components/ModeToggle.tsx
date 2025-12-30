import { Moon, Sun, Toggle } from '@repo/ui'
import { useTheme } from './ThemeProvider.js'

export function ModeToggle() {
	const { theme, setTheme } = useTheme()
	const isDark = theme === 'dark'

	return (
		<Toggle
			variant="outline"
			size="default"
			pressed={isDark}
			onPressedChange={(pressed) => setTheme(pressed ? 'dark' : 'light')}
			aria-label="Toggle theme"
		>
			{isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
		</Toggle>
	)
}
