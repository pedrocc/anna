import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

import { cn } from '../lib/utils.js'

const spinnerVariants = cva('animate-spin text-muted-foreground', {
	variants: {
		size: {
			sm: 'size-4',
			default: 'size-6',
			lg: 'size-8',
			xl: 'size-12',
		},
	},
	defaultVariants: {
		size: 'default',
	},
})

interface SpinnerProps
	extends React.SVGAttributes<SVGSVGElement>,
		VariantProps<typeof spinnerVariants> {}

function Spinner({ className, size, ...props }: SpinnerProps) {
	return (
		<Loader2 data-slot="spinner" className={cn(spinnerVariants({ size }), className)} {...props} />
	)
}

export { Spinner, spinnerVariants }
