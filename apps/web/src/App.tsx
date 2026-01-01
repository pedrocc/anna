import { Route, Switch } from 'wouter'
import { Layout } from './components/Layout.js'
import { BriefingPage } from './pages/Briefing.js'
import { BriefingSessionPage } from './pages/BriefingSession.js'
import { DashboardPage } from './pages/Dashboard.js'
import { HomePage } from './pages/Home.js'
import { InicioPage } from './pages/Inicio.js'
import { KanbanPage } from './pages/Kanban.js'
import { KanbanBoardPage } from './pages/KanbanBoard.js'
import { NotFoundPage } from './pages/NotFound.js'
import { PlanningPage } from './pages/Planning.js'
import { PlanningSessionPage } from './pages/PlanningSession.js'
import { PMPage } from './pages/PM.js'
import { PMSessionPage } from './pages/PMSession.js'
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
						<Route path="/inicio" component={InicioPage} />
						<Route path="/dashboard" component={DashboardPage} />
						<Route path="/briefing" component={BriefingPage} />
						<Route path="/briefing/:id" component={BriefingSessionPage} />
						<Route path="/pm" component={PMPage} />
						<Route path="/pm/:id" component={PMSessionPage} />
						<Route path="/requisitos" component={PlanningPage} />
						<Route path="/requisitos/:id" component={PlanningSessionPage} />
						<Route path="/kanban" component={KanbanPage} />
						<Route path="/kanban/:id" component={KanbanBoardPage} />
						<Route component={NotFoundPage} />
					</Switch>
				</Layout>
			</Route>
		</Switch>
	)
}
