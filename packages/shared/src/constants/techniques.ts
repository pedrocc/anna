import type { BrainstormTechnique, TechniqueInfo } from '../schemas/brainstorm.schema.js'

export const TECHNIQUES: Record<BrainstormTechnique, TechniqueInfo> = {
	scamper: {
		id: 'scamper',
		name: 'SCAMPER',
		description:
			'Explore 7 lentes de criatividade: Substituir, Combinar, Adaptar, Modificar, Propor outros usos, Eliminar, Reverter',
		icon: 'Lightbulb',
		estimatedMinutes: 15,
	},
	what_if: {
		id: 'what_if',
		name: 'E Se...?',
		description:
			'Questione todas as restrições perguntando "E se...?" para desbloquear novas possibilidades',
		icon: 'HelpCircle',
		estimatedMinutes: 10,
	},
	six_hats: {
		id: 'six_hats',
		name: 'Seis Chapéus',
		description:
			'Explore 6 perspectivas distintas: Fatos, Emoções, Cautela, Benefícios, Criatividade, Processo',
		icon: 'Users',
		estimatedMinutes: 20,
	},
	five_whys: {
		id: 'five_whys',
		name: 'Cinco Porquês',
		description: 'Investigue a raiz do problema perguntando "Por quê?" repetidamente',
		icon: 'Search',
		estimatedMinutes: 10,
	},
	mind_mapping: {
		id: 'mind_mapping',
		name: 'Mapa Mental',
		description: 'Exploração visual ramificada de conceitos e suas conexões',
		icon: 'Network',
		estimatedMinutes: 15,
	},
	analogical: {
		id: 'analogical',
		name: 'Pensamento Analógico',
		description: 'Busque paralelos de outros domínios e indústrias para inspirar soluções',
		icon: 'ArrowLeftRight',
		estimatedMinutes: 12,
	},
	first_principles: {
		id: 'first_principles',
		name: 'Primeiros Princípios',
		description: 'Remova suposições e reconstrua a partir de verdades fundamentais',
		icon: 'Layers',
		estimatedMinutes: 15,
	},
	yes_and: {
		id: 'yes_and',
		name: 'Sim, E...',
		description: 'Construa momentum positivo aceitando e expandindo cada ideia',
		icon: 'Plus',
		estimatedMinutes: 10,
	},
	future_self: {
		id: 'future_self',
		name: 'Entrevista com Eu Futuro',
		description: 'Ganhe sabedoria entrevistando seu eu do futuro bem-sucedido',
		icon: 'Clock',
		estimatedMinutes: 12,
	},
	reversal: {
		id: 'reversal',
		name: 'Inversão',
		description: 'Vire os problemas de cabeça para baixo para descobrir soluções ocultas',
		icon: 'RotateCw',
		estimatedMinutes: 10,
	},
} as const

export const TECHNIQUE_LIST = Object.values(TECHNIQUES)
