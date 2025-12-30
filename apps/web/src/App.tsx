import { Route, Switch } from 'wouter'
import { Layout } from './components/Layout.js'
import { BrainstormPage } from './pages/Brainstorm.js'
import { BrainstormSessionPage } from './pages/BrainstormSession.js'
import { HomePage } from './pages/Home.js'
import { NotFoundPage } from './pages/NotFound.js'
import { SignInPage } from './pages/SignIn.js'
import { SignUpPage } from './pages/SignUp.js'

export function App() {
	return (
		<Switch>
			{/* Landing page - pública, sem Layout */}
			<Route path="/" component={HomePage} />

			{/* Auth pages - sem Layout (inclui sub-rotas do Clerk como /sign-in/factor-one) */}
			<Route path="/sign-in/:rest*" component={SignInPage} />
			<Route path="/sign-in" component={SignInPage} />
			<Route path="/sign-up/:rest*" component={SignUpPage} />
			<Route path="/sign-up" component={SignUpPage} />

			{/* App pages - com Layout (requer autenticação) */}
			<Route>
				<Layout>
					<Switch>
						<Route path="/brainstorm" component={BrainstormPage} />
						<Route path="/brainstorm/:id" component={BrainstormSessionPage} />
						<Route component={NotFoundPage} />
					</Switch>
				</Layout>
			</Route>
		</Switch>
	)
}
