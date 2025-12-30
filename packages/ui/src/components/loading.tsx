import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../lib/utils.js'
import { Spinner } from './spinner.js'

const loadingVariants = cva('flex items-center justify-center', {
	variants: {
		variant: {
			default: 'flex-col gap-3',
			inline: 'flex-row gap-2',
			overlay: 'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm',
			fullscreen: 'min-h-screen w-full',
		},
		size: {
			sm: '',
			default: '',
			lg: '',
		},
	},
	defaultVariants: {
		variant: 'default',
		size: 'default',
	},
})

interface LoadingProps
	extends React.HTMLAttributes<HTMLOutputElement>,
		VariantProps<typeof loadingVariants> {
	readonly text?: string
	readonly showText?: boolean
}

function getSpinnerSize(size: LoadingProps['size']): 'lg' | 'sm' | 'default' {
	if (size === 'lg') return 'lg'
	if (size === 'sm') return 'sm'
	return 'default'
}

function Loading({
	className,
	variant,
	size,
	text = 'Carregando...',
	showText = true,
	...props
}: LoadingProps) {
	const spinnerSize = getSpinnerSize(size)

	return (
		<output
			data-slot="loading"
			className={cn(loadingVariants({ variant, size }), className)}
			aria-label={text}
			{...props}
		>
			<Spinner size={spinnerSize} />
			{showText && (
				<span
					className={cn(
						'text-muted-foreground',
						size === 'sm' && 'text-xs',
						size === 'lg' && 'text-lg'
					)}
				>
					{text}
				</span>
			)}
		</output>
	)
}

export { Loading, loadingVariants }
