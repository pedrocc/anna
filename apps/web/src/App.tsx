import { RedirectToSignIn, SignedIn, SignedOut } from '@clerk/clerk-react'
import { Route, Switch } from 'wouter'
import { Layout } from './components/Layout.js'
import { DashboardPage } from './pages/Dashboard.js'
import { HomePage } from './pages/Home.js'
import { NotFoundPage } from './pages/NotFound.js'

export function App() {
	return (
		<Layout>
			<Switch>
				<Route path="/" component={HomePage} />
				<Route path="/dashboard">
					<SignedIn>
						<DashboardPage />
					</SignedIn>
					<SignedOut>
						<RedirectToSignIn />
					</SignedOut>
				</Route>
				<Route component={NotFoundPage} />
			</Switch>
		</Layout>
	)
}
