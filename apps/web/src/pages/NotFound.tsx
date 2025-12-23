import { Link } from 'wouter'

export function NotFoundPage() {
	return (
		<div className="py-12 text-center">
			<h1 className="text-6xl font-bold text-gray-900">404</h1>
			<p className="mt-4 text-xl text-gray-600">Page not found</p>
			<p className="mt-2 text-gray-500">The page you're looking for doesn't exist.</p>
			<Link
				href="/"
				className="mt-6 inline-block rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
			>
				Go back home
			</Link>
		</div>
	)
}
