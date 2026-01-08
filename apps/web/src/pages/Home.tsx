import { useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { useLocation } from 'wouter'
import { WelcomePage } from './Welcome'

export function HomePage() {
	const { isSignedIn, isLoaded } = useAuth()
	const [, setLocation] = useLocation()

	useEffect(() => {
		if (isLoaded && isSignedIn) {
			setLocation('/inicio')
		}
	}, [isLoaded, isSignedIn, setLocation])

	// Mostrar nada enquanto verifica autenticação para evitar flash
	if (!isLoaded) {
		return null
	}

	// Se logado, não renderizar (vai redirecionar)
	if (isSignedIn) {
		return null
	}

	return <WelcomePage />
}
