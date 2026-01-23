/**
 * Seed script para criar dados fictícios completos do projeto "Vendas Master"
 * Uma loja de carnes digital
 *
 * Execução: bun run packages/db/src/seeds/vendas-master.ts
 */

import 'dotenv/config'
import { db } from '../client.js'
import {
	brainstormMessages,
	brainstormSessions,
	briefingDocuments,
	briefingSessions,
	prdDocuments,
	prdSessions,
	smDocuments,
	smEpics,
	smSessions,
	smStories,
} from '../schema/index.js'

const PROJECT_NAME = 'Vendas Master'
const PROJECT_DESCRIPTION =
	'Plataforma digital de vendas de carnes premium com delivery e assinatura mensal'

// Helper para gerar UUIDs
function uuid() {
	return crypto.randomUUID()
}

async function main() {
	// 1. Buscar usuário existente (primeiro usuário do banco)
	const existingUsers = await db.query.users.findMany({ limit: 1 })
	const firstUser = existingUsers[0]
	if (!firstUser) {
		// biome-ignore lint/suspicious/noConsole: Seed script needs to log errors
		console.error('No users found in database. Please create a user first.')
		process.exit(1)
	}
	const userId = firstUser.id

	const brainstormId = uuid()
	const brainstormIdeas = [
		{
			id: uuid(),
			content: 'Sistema de assinatura mensal com box de carnes personalizadas',
			technique: 'scamper',
			category: 'Modelo de Negócio',
			priority: 'high' as const,
			createdAt: new Date().toISOString(),
		},
		{
			id: uuid(),
			content: 'Integração com açougues locais para garantir frescor',
			technique: 'what_if',
			category: 'Logística',
			priority: 'high' as const,
			createdAt: new Date().toISOString(),
		},
		{
			id: uuid(),
			content: 'Gamificação: pontos por compras que viram descontos',
			technique: 'yes_and',
			category: 'Engajamento',
			priority: 'medium' as const,
			createdAt: new Date().toISOString(),
		},
		{
			id: uuid(),
			content: 'Receitas personalizadas baseadas nos cortes comprados',
			technique: 'analogical',
			category: 'Conteúdo',
			priority: 'medium' as const,
			createdAt: new Date().toISOString(),
		},
		{
			id: uuid(),
			content: 'Rastreabilidade completa: do produtor à mesa do cliente',
			technique: 'first_principles',
			category: 'Diferencial',
			priority: 'high' as const,
			createdAt: new Date().toISOString(),
		},
		{
			id: uuid(),
			content: 'Sistema de agendamento de churrasco com lista de compras automática',
			technique: 'future_self',
			category: 'Feature Premium',
			priority: 'medium' as const,
			createdAt: new Date().toISOString(),
		},
		{
			id: uuid(),
			content: 'Parceria com churrasqueiros profissionais para eventos',
			technique: 'six_hats',
			category: 'Serviços',
			priority: 'low' as const,
			createdAt: new Date().toISOString(),
		},
		{
			id: uuid(),
			content: 'Cortes personalizados sob demanda via app',
			technique: 'reversal',
			category: 'Personalização',
			priority: 'high' as const,
			createdAt: new Date().toISOString(),
		},
	]

	await db.insert(brainstormSessions).values({
		id: brainstormId,
		userId,
		projectName: PROJECT_NAME,
		projectDescription: PROJECT_DESCRIPTION,
		goals: [
			'Definir modelo de negócio inovador para venda de carnes online',
			'Identificar diferenciais competitivos',
			'Explorar formas de fidelização de clientes',
		],
		approach: 'comprehensive',
		currentStep: 'document',
		status: 'completed',
		selectedTechniques: [
			'scamper',
			'what_if',
			'yes_and',
			'analogical',
			'first_principles',
			'future_self',
			'six_hats',
			'reversal',
		],
		currentTechniqueIndex: 8,
		ideas: brainstormIdeas,
		documentContent: `# Brainstorm: Vendas Master

## Resumo Executivo
Sessão de brainstorming para o projeto Vendas Master - uma plataforma digital de vendas de carnes premium.

## Ideias Principais

### Alta Prioridade
1. **Assinatura Mensal** - Box de carnes personalizadas entregues mensalmente
2. **Rastreabilidade Total** - QR Code em cada produto mostrando origem e qualidade
3. **Cortes Personalizados** - Cliente escolhe espessura e preparo via app
4. **Rede de Açougues** - Parceria com açougues locais para frescor garantido

### Média Prioridade
1. **Gamificação** - Sistema de pontos e recompensas
2. **Receitas Inteligentes** - Sugestões baseadas nos cortes comprados
3. **Planejador de Churrasco** - Calculadora de quantidade + lista de compras

### Para Explorar Futuramente
1. **Eventos** - Parceria com churrasqueiros profissionais
2. **B2B** - Vendas para restaurantes e hotéis

## Próximos Passos
Avançar para o Product Brief com foco em MVP de e-commerce + assinatura.
`,
		documentTitle: 'Brainstorm: Vendas Master',
		completedAt: new Date(),
	})

	await db.insert(brainstormMessages).values([
		{
			sessionId: brainstormId,
			role: 'assistant',
			content:
				'Olá! Sou a Anna e vou facilitar nossa sessão de brainstorming para o projeto Vendas Master. Vamos explorar ideias criativas para sua plataforma de carnes digitais!',
			step: 'setup',
		},
		{
			sessionId: brainstormId,
			role: 'user',
			content:
				'Quero criar uma loja online de carnes premium com delivery e algum modelo de recorrência',
			step: 'setup',
		},
		{
			sessionId: brainstormId,
			role: 'assistant',
			content:
				'Excelente! Vamos usar a técnica SCAMPER para começar. Pensando em **Substituir**: E se substituíssemos a compra avulsa por um modelo de assinatura mensal com boxes personalizadas?',
			step: 'execution',
			technique: 'scamper',
		},
	])

	const briefingId = uuid()
	const primaryUsers = [
		{
			id: uuid(),
			name: 'Entusiasta do Churrasco',
			context: 'Pessoa que faz churrascos regulares em casa e busca qualidade',
			painPoints: [
				'Dificuldade em encontrar cortes de qualidade',
				'Falta de tempo para ir ao açougue',
				'Não sabe a quantidade ideal para cada evento',
			],
			goals: [
				'Receber carnes de qualidade em casa',
				'Ter praticidade na compra',
				'Impressionar família e amigos',
			],
			currentSolutions: 'Compra em supermercados ou açougues locais quando dá tempo',
		},
		{
			id: uuid(),
			name: 'Família Carnívora',
			context: 'Família de 4+ pessoas com consumo regular de carnes na semana',
			painPoints: [
				'Gastos altos com carnes de qualidade',
				'Desperdício por compras mal planejadas',
				'Variedade limitada nos mercados próximos',
			],
			goals: [
				'Economizar comprando em quantidade',
				'Ter variedade de cortes',
				'Receber em horários convenientes',
			],
			currentSolutions: 'Compras semanais no atacadão ou supermercado',
		},
	]

	const mvpFeatures = [
		{
			id: uuid(),
			name: 'Catálogo de Produtos',
			description: 'Listagem de cortes com fotos, descrições e preços',
			priority: 'must_have' as const,
			inMvp: true,
		},
		{
			id: uuid(),
			name: 'Carrinho de Compras',
			description: 'Adicionar, remover e editar itens antes de finalizar',
			priority: 'must_have' as const,
			inMvp: true,
		},
		{
			id: uuid(),
			name: 'Checkout e Pagamento',
			description: 'Integração com gateway de pagamento (PIX, cartão)',
			priority: 'must_have' as const,
			inMvp: true,
		},
		{
			id: uuid(),
			name: 'Área do Cliente',
			description: 'Login, histórico de pedidos e dados salvos',
			priority: 'must_have' as const,
			inMvp: true,
		},
		{
			id: uuid(),
			name: 'Plano de Assinatura',
			description: 'Assinatura mensal com box de carnes personalizável',
			priority: 'should_have' as const,
			inMvp: true,
		},
		{
			id: uuid(),
			name: 'Rastreamento de Pedido',
			description: 'Acompanhar status do delivery em tempo real',
			priority: 'should_have' as const,
			inMvp: true,
		},
		{
			id: uuid(),
			name: 'Programa de Pontos',
			description: 'Acumular pontos e trocar por descontos',
			priority: 'nice_to_have' as const,
			inMvp: false,
		},
	]

	await db.insert(briefingSessions).values({
		id: briefingId,
		userId,
		projectName: PROJECT_NAME,
		projectDescription: PROJECT_DESCRIPTION,
		problemStatement:
			'Consumidores de carnes premium enfrentam dificuldade em encontrar cortes de qualidade com conveniência, perdendo tempo em filas de açougue e sem garantia de procedência.',
		problemImpact:
			'Além da frustração, há desperdício por compras mal planejadas e falta de confiança na qualidade do produto. O mercado de carnes premium cresce 15% ao ano mas a experiência de compra permanece antiquada.',
		existingSolutionsGaps:
			'Açougues tradicionais têm horário limitado e sem delivery. Apps de mercado oferecem carnes genéricas sem curadoria. Não existe um player focado em experiência premium de carnes.',
		proposedSolution:
			'Plataforma digital que conecta produtores de carnes premium diretamente ao consumidor, com delivery refrigerado, rastreabilidade completa e opção de assinatura mensal personalizada.',
		keyDifferentiators: [
			'Rastreabilidade do produtor à mesa via QR Code',
			'Assinatura mensal personalizada',
			'Cortes sob demanda com preparo escolhido',
			'Delivery refrigerado com garantia de qualidade',
		],
		primaryUsers,
		secondaryUsers: [
			{
				id: uuid(),
				name: 'Churrasqueiro Eventual',
				role: 'Usuário secundário',
				relationship: 'Compra esporadicamente para eventos especiais',
			},
		],
		userJourneys: [
			{ stage: 'discovery', description: 'Descobre o app via indicação ou anúncio' },
			{ stage: 'onboarding', description: 'Cadastra-se e explora o catálogo' },
			{ stage: 'core_usage', description: 'Faz primeira compra e recebe em casa' },
			{ stage: 'success', description: 'Repete compras e considera assinatura' },
			{ stage: 'long_term', description: 'Torna-se assinante e indica para amigos' },
		],
		successMetrics: [
			{
				id: uuid(),
				name: 'Taxa de Conversão',
				description: 'Visitantes que completam uma compra',
				target: '3%',
				timeframe: '3 meses',
				category: 'business',
			},
			{
				id: uuid(),
				name: 'NPS',
				description: 'Net Promoter Score dos clientes',
				target: '50+',
				timeframe: '6 meses',
				category: 'user',
			},
			{
				id: uuid(),
				name: 'Retenção Mensal',
				description: 'Clientes que compram novamente em 30 dias',
				target: '40%',
				timeframe: '3 meses',
				category: 'growth',
			},
		],
		businessObjectives: [
			'Atingir 1000 clientes ativos em 6 meses',
			'Ticket médio de R$250 por pedido',
			'100 assinantes no primeiro trimestre',
		],
		kpis: [
			{
				id: uuid(),
				name: 'GMV Mensal',
				description: 'Volume bruto de vendas',
				target: 'R$ 100.000',
				timeframe: '6 meses',
				category: 'financial',
			},
		],
		mvpFeatures,
		outOfScope: [
			'Aplicativo mobile nativo (será PWA)',
			'Integração com restaurantes (B2B)',
			'Produção própria de carnes',
		],
		mvpSuccessCriteria: [
			'100 primeiras vendas em 30 dias',
			'NPS acima de 30',
			'Taxa de problema em entregas < 5%',
		],
		futureVision:
			'Tornar-se a maior plataforma de carnes premium do Brasil, expandindo para outros estados e incluindo linha de produtos complementares (temperos, acessórios de churrasco).',
		currentStep: 'complete',
		status: 'completed',
		stepsCompleted: ['init', 'vision', 'users', 'metrics', 'scope'],
		documentContent: `# Product Brief: Vendas Master

## Visão do Produto
Plataforma digital de vendas de carnes premium com delivery refrigerado e assinatura mensal.

## Problema
Consumidores de carnes premium não têm uma opção conveniente e confiável para comprar cortes de qualidade.

## Solução
E-commerce especializado com rastreabilidade completa, delivery refrigerado e planos de assinatura.

## Métricas de Sucesso
- 1000 clientes ativos em 6 meses
- NPS > 50
- Ticket médio R$250
`,
		documentTitle: 'Product Brief: Vendas Master',
		executiveSummary:
			'Vendas Master é uma plataforma de e-commerce especializada em carnes premium, oferecendo delivery refrigerado, rastreabilidade completa e assinatura mensal personalizada.',
		completedAt: new Date(),
	})

	await db.insert(briefingDocuments).values({
		sessionId: briefingId,
		type: 'product_brief',
		title: 'Product Brief: Vendas Master',
		content: `# Product Brief: Vendas Master

## 1. Resumo Executivo
Vendas Master é uma plataforma digital de vendas de carnes premium que revoluciona a experiência de compra de carnes no Brasil.

## 2. Problema
- Dificuldade em encontrar carnes de qualidade com conveniência
- Falta de rastreabilidade e transparência
- Experiência de compra antiquada

## 3. Solução
- E-commerce especializado em carnes premium
- Delivery refrigerado com garantia de qualidade
- Assinatura mensal personalizável
- QR Code para rastreabilidade completa

## 4. Público-Alvo
- Entusiastas de churrasco
- Famílias com alto consumo de carnes
- Consumidores que valorizam qualidade e praticidade

## 5. MVP
- Catálogo de produtos
- Carrinho e checkout
- Área do cliente
- Plano de assinatura básico
- Rastreamento de pedido

## 6. Métricas de Sucesso
- 1000 clientes ativos em 6 meses
- Ticket médio de R$250
- NPS acima de 50
`,
		version: 1,
	})

	const prdId = uuid()
	const personas = [
		{
			id: uuid(),
			name: 'Carlos - Mestre do Churrasco',
			description: 'Homem de 35-50 anos, classe média-alta, que faz churrascos frequentes',
			goals: [
				'Impressionar convidados com carnes de qualidade',
				'Ter praticidade na compra',
				'Descobrir novos cortes',
			],
			painPoints: [
				'Tempo perdido em filas',
				'Inconsistência na qualidade',
				'Dificuldade em calcular quantidades',
			],
			context: 'Profissional ocupado que usa fins de semana para reunir família e amigos',
		},
		{
			id: uuid(),
			name: 'Marina - Mãe Prática',
			description: 'Mulher de 30-45 anos responsável pelas compras da casa',
			goals: ['Alimentar família com qualidade', 'Economizar tempo', 'Controlar gastos'],
			painPoints: [
				'Falta de tempo para ir ao açougue',
				'Preços altos em supermercados',
				'Desperdício de alimentos',
			],
			context: 'Trabalha fora e cuida de família com 2+ filhos',
		},
	]

	const features = [
		{
			id: uuid(),
			name: 'Catálogo Inteligente',
			description: 'Listagem de cortes com filtros por tipo, preço, uso culinário',
			priority: 'must_have' as const,
			scope: 'mvp' as const,
		},
		{
			id: uuid(),
			name: 'Carrinho Persistente',
			description: 'Carrinho salvo mesmo após sair do app',
			priority: 'must_have' as const,
			scope: 'mvp' as const,
		},
		{
			id: uuid(),
			name: 'Checkout Otimizado',
			description: 'Processo de compra em 3 passos com múltiplas formas de pagamento',
			priority: 'must_have' as const,
			scope: 'mvp' as const,
		},
		{
			id: uuid(),
			name: 'Gestão de Assinaturas',
			description: 'Criação, edição e cancelamento de planos mensais',
			priority: 'must_have' as const,
			scope: 'mvp' as const,
		},
		{
			id: uuid(),
			name: 'Rastreabilidade QR',
			description: 'QR Code em cada produto com informações de origem',
			priority: 'should_have' as const,
			scope: 'mvp' as const,
		},
		{
			id: uuid(),
			name: 'Programa de Fidelidade',
			description: 'Sistema de pontos com níveis e recompensas',
			priority: 'nice_to_have' as const,
			scope: 'growth' as const,
		},
	]

	const functionalRequirements = [
		{
			id: uuid(),
			code: 'FR-001',
			name: 'Cadastro de Usuário',
			description: 'Sistema deve permitir cadastro via email, Google ou Apple ID',
			category: 'Autenticação',
			priority: 'critical' as const,
			acceptanceCriteria: [
				'Usuário pode se cadastrar com email válido',
				'Integração OAuth com Google funcional',
				'Email de confirmação enviado automaticamente',
			],
		},
		{
			id: uuid(),
			code: 'FR-002',
			name: 'Login e Autenticação',
			description: 'Sistema deve autenticar usuários de forma segura',
			category: 'Autenticação',
			priority: 'critical' as const,
			acceptanceCriteria: [
				'Login com email e senha',
				'Recuperação de senha por email',
				'Sessão expira após 7 dias de inatividade',
			],
		},
		{
			id: uuid(),
			code: 'FR-003',
			name: 'Listagem de Produtos',
			description: 'Exibir catálogo de carnes com filtros e ordenação',
			category: 'Catálogo',
			priority: 'critical' as const,
			acceptanceCriteria: [
				'Exibir nome, foto, preço e descrição',
				'Filtrar por categoria de corte',
				'Ordenar por preço, popularidade',
			],
		},
		{
			id: uuid(),
			code: 'FR-004',
			name: 'Detalhes do Produto',
			description: 'Página com informações completas do corte',
			category: 'Catálogo',
			priority: 'critical' as const,
			acceptanceCriteria: [
				'Galeria de fotos do produto',
				'Informações nutricionais',
				'Sugestões de preparo',
				'Avaliações de clientes',
			],
		},
		{
			id: uuid(),
			code: 'FR-005',
			name: 'Carrinho de Compras',
			description: 'Gerenciar itens antes da compra',
			category: 'Compras',
			priority: 'critical' as const,
			acceptanceCriteria: [
				'Adicionar/remover itens',
				'Alterar quantidade',
				'Mostrar subtotal atualizado',
				'Persistir entre sessões',
			],
		},
		{
			id: uuid(),
			code: 'FR-006',
			name: 'Processamento de Pagamento',
			description: 'Integrar com gateway para processar pagamentos',
			category: 'Pagamentos',
			priority: 'critical' as const,
			acceptanceCriteria: [
				'Aceitar PIX',
				'Aceitar cartão de crédito',
				'Aceitar cartão de débito',
				'Emitir comprovante',
			],
		},
		{
			id: uuid(),
			code: 'FR-007',
			name: 'Gestão de Endereços',
			description: 'Cadastrar e gerenciar endereços de entrega',
			category: 'Perfil',
			priority: 'high' as const,
			acceptanceCriteria: [
				'Cadastrar múltiplos endereços',
				'Definir endereço padrão',
				'Validar CEP automaticamente',
			],
		},
		{
			id: uuid(),
			code: 'FR-008',
			name: 'Acompanhamento de Pedido',
			description: 'Rastrear status do pedido em tempo real',
			category: 'Pedidos',
			priority: 'high' as const,
			acceptanceCriteria: [
				'Mostrar etapas do pedido',
				'Notificar mudanças de status',
				'Exibir previsão de entrega',
			],
		},
		{
			id: uuid(),
			code: 'FR-009',
			name: 'Criação de Assinatura',
			description: 'Permitir criação de plano mensal',
			category: 'Assinaturas',
			priority: 'high' as const,
			acceptanceCriteria: [
				'Escolher frequência de entrega',
				'Selecionar produtos da box',
				'Definir data de cobrança',
			],
		},
		{
			id: uuid(),
			code: 'FR-010',
			name: 'Histórico de Pedidos',
			description: 'Visualizar pedidos anteriores',
			category: 'Perfil',
			priority: 'medium' as const,
			acceptanceCriteria: [
				'Listar todos os pedidos',
				'Ver detalhes de cada pedido',
				'Repetir pedido com um clique',
			],
		},
	]

	const nonFunctionalRequirements = [
		{
			id: uuid(),
			code: 'NFR-001',
			category: 'performance' as const,
			name: 'Tempo de Carregamento',
			description: 'Páginas devem carregar em menos de 3 segundos',
			metric: 'Tempo de carregamento',
			target: '< 3s',
			priority: 'critical' as const,
		},
		{
			id: uuid(),
			code: 'NFR-002',
			category: 'security' as const,
			name: 'Proteção de Dados',
			description: 'Dados sensíveis devem ser criptografados',
			metric: 'Conformidade LGPD',
			target: '100%',
			priority: 'critical' as const,
		},
		{
			id: uuid(),
			code: 'NFR-003',
			category: 'reliability' as const,
			name: 'Disponibilidade',
			description: 'Sistema deve ter alta disponibilidade',
			metric: 'Uptime',
			target: '99.5%',
			priority: 'high' as const,
		},
		{
			id: uuid(),
			code: 'NFR-004',
			category: 'scalability' as const,
			name: 'Escalabilidade',
			description: 'Suportar crescimento de usuários',
			metric: 'Usuários simultâneos',
			target: '1000+',
			priority: 'high' as const,
		},
		{
			id: uuid(),
			code: 'NFR-005',
			category: 'usability' as const,
			name: 'Responsividade',
			description: 'Funcionar em todos os dispositivos',
			metric: 'Breakpoints',
			target: 'Mobile, Tablet, Desktop',
			priority: 'critical' as const,
		},
	]

	await db.insert(prdSessions).values({
		id: prdId,
		userId,
		projectName: PROJECT_NAME,
		projectDescription: PROJECT_DESCRIPTION,
		projectType: 'web_app',
		domain: 'E-commerce / Food Tech',
		domainComplexity: 'medium',
		executiveSummary:
			'Vendas Master é uma plataforma de e-commerce especializada em carnes premium, oferecendo delivery refrigerado, rastreabilidade completa do produtor à mesa, e planos de assinatura mensal personalizados.',
		differentiators: [
			'Rastreabilidade completa via QR Code',
			'Assinatura mensal personalizada',
			'Delivery refrigerado com garantia',
			'Cortes sob demanda',
		],
		successCriteria: [
			{
				id: uuid(),
				type: 'business',
				description: 'Atingir 1000 clientes ativos',
				metric: 'Clientes ativos',
				target: '1000 em 6 meses',
			},
			{
				id: uuid(),
				type: 'user',
				description: 'Alcançar alto índice de satisfação',
				metric: 'NPS',
				target: '50+',
			},
			{
				id: uuid(),
				type: 'technical',
				description: 'Manter alta disponibilidade',
				metric: 'Uptime',
				target: '99.5%',
			},
		],
		personas,
		userJourneys: personas.map((p) => ({
			id: uuid(),
			personaId: p.id,
			personaName: p.name,
			stages: [
				{
					stage: 'discovery' as const,
					description: 'Descobre via indicação ou anúncio no Instagram',
				},
				{ stage: 'onboarding' as const, description: 'Cria conta e explora catálogo' },
				{ stage: 'core_usage' as const, description: 'Faz primeira compra e avalia entrega' },
				{ stage: 'success' as const, description: 'Torna-se cliente recorrente' },
				{ stage: 'long_term' as const, description: 'Adere à assinatura e indica amigos' },
			],
		})),
		domainConcerns: [
			{
				id: uuid(),
				category: 'Logística',
				concern: 'Manter cadeia de frio durante transporte',
				requirement: 'Veículos refrigerados e embalagens térmicas',
				priority: 'critical' as const,
			},
			{
				id: uuid(),
				category: 'Regulatório',
				concern: 'Conformidade com vigilância sanitária',
				requirement: 'Licenças ANVISA e certificações',
				priority: 'critical' as const,
			},
		],
		regulatoryRequirements: ['Licença ANVISA', 'Certificação SIF', 'LGPD'],
		domainExpertise: ['Logística refrigerada', 'Qualidade de carnes', 'E-commerce'],
		skipDomainStep: false,
		innovations: [
			{
				id: uuid(),
				type: 'Rastreabilidade',
				description: 'QR Code em cada produto com blockchain de rastreamento',
				impact: 'Transparência total e confiança do consumidor',
				risks: ['Custo de implementação', 'Adesão dos fornecedores'],
			},
		],
		skipInnovationStep: false,
		projectTypeDetails: {
			framework: 'React + Node.js',
			hosting: 'AWS',
			database: 'PostgreSQL',
		},
		features,
		outOfScope: [
			'App mobile nativo',
			'Vendas B2B para restaurantes',
			'Produção própria de carnes',
			'Integração com marketplaces',
		],
		mvpSuccessCriteria: [
			'100 primeiras vendas em 30 dias',
			'Taxa de problema em entregas < 5%',
			'Tempo médio de checkout < 3 minutos',
		],
		functionalRequirements,
		nonFunctionalRequirements,
		currentStep: 'complete',
		status: 'completed',
		stepsCompleted: [
			'init',
			'discovery',
			'success',
			'journeys',
			'domain',
			'innovation',
			'project_type',
			'scoping',
			'functional',
			'nonfunctional',
		],
		documentContent: `# PRD: Vendas Master

## 1. Visão Geral
Plataforma de e-commerce especializada em carnes premium.

## 2. Requisitos Funcionais
- FR-001 a FR-010 documentados

## 3. Requisitos Não-Funcionais
- NFR-001 a NFR-005 documentados

## 4. Escopo MVP
- Catálogo, carrinho, checkout, assinaturas
`,
		documentTitle: 'PRD: Vendas Master',
		completedAt: new Date(),
	})

	await db.insert(prdDocuments).values({
		sessionId: prdId,
		type: 'prd_full',
		title: 'PRD Completo: Vendas Master',
		content: `# Product Requirements Document
## Vendas Master - Plataforma de Carnes Premium

### 1. Introdução
Este documento descreve os requisitos do produto Vendas Master, uma plataforma de e-commerce especializada em carnes premium.

### 2. Requisitos Funcionais
${functionalRequirements.map((fr) => `- **${fr.code}**: ${fr.name} - ${fr.description}`).join('\n')}

### 3. Requisitos Não-Funcionais
${nonFunctionalRequirements.map((nfr) => `- **${nfr.code}**: ${nfr.name} - ${nfr.target}`).join('\n')}
`,
		version: 1,
	})

	const smId = uuid()
	const epic1Id = uuid()
	const epic2Id = uuid()
	const epic3Id = uuid()
	const epic4Id = uuid()

	await db.insert(smSessions).values({
		id: smId,
		userId,
		prdSessionId: prdId,
		projectName: PROJECT_NAME,
		projectDescription: PROJECT_DESCRIPTION,
		prdContext: {
			projectType: 'web_app',
			domain: 'E-commerce / Food Tech',
			executiveSummary: 'Plataforma de carnes premium com delivery e assinatura',
			features: features.map((f) => ({
				id: f.id,
				name: f.name,
				description: f.description,
				priority: f.priority,
				scope: f.scope,
			})),
			functionalRequirements: functionalRequirements.map((fr) => ({
				id: fr.id,
				code: fr.code,
				name: fr.name,
				description: fr.description,
				category: fr.category,
				priority: fr.priority,
				acceptanceCriteria: fr.acceptanceCriteria,
			})),
			nonFunctionalRequirements: nonFunctionalRequirements.map((nfr) => ({
				id: nfr.id,
				code: nfr.code,
				category: nfr.category,
				name: nfr.name,
				description: nfr.description,
				priority: nfr.priority,
			})),
			personas: personas.map((p) => ({
				id: p.id,
				name: p.name,
				description: p.description,
			})),
		},
		sprintConfig: {
			sprintDuration: 14,
			velocityEstimate: 40,
			teamSize: 4,
		},
		currentStep: 'complete',
		status: 'completed',
		stepsCompleted: ['init', 'epics', 'stories', 'details', 'planning', 'review'],
		totalEpics: 4,
		totalStories: 16,
		totalStoryPoints: 89,
		completedAt: new Date(),
	})

	// Criar Epics
	const epics = [
		{
			id: epic1Id,
			sessionId: smId,
			number: 1,
			title: 'Autenticação e Perfil',
			description: 'Sistema de cadastro, login e gestão de perfil do usuário',
			businessValue:
				'Base fundamental para identificação e personalização da experiência do cliente',
			featureIds: [],
			functionalRequirementCodes: ['FR-001', 'FR-002', 'FR-007'],
			status: 'backlog' as const,
			priority: 'critical' as const,
			targetSprint: 1,
			estimatedStoryPoints: 21,
		},
		{
			id: epic2Id,
			sessionId: smId,
			number: 2,
			title: 'Catálogo de Produtos',
			description: 'Listagem e detalhamento de cortes de carnes',
			businessValue: 'Core da experiência de compra, essencial para conversão',
			featureIds: [],
			functionalRequirementCodes: ['FR-003', 'FR-004'],
			status: 'backlog' as const,
			priority: 'critical' as const,
			targetSprint: 1,
			estimatedStoryPoints: 18,
		},
		{
			id: epic3Id,
			sessionId: smId,
			number: 3,
			title: 'Carrinho e Checkout',
			description: 'Fluxo de compra completo até o pagamento',
			businessValue: 'Monetização direta, conversão de visitas em vendas',
			featureIds: [],
			functionalRequirementCodes: ['FR-005', 'FR-006'],
			status: 'backlog' as const,
			priority: 'critical' as const,
			targetSprint: 2,
			estimatedStoryPoints: 26,
		},
		{
			id: epic4Id,
			sessionId: smId,
			number: 4,
			title: 'Assinaturas e Pedidos',
			description: 'Gestão de assinaturas mensais e acompanhamento de pedidos',
			businessValue: 'Receita recorrente e fidelização de clientes',
			featureIds: [],
			functionalRequirementCodes: ['FR-008', 'FR-009', 'FR-010'],
			status: 'backlog' as const,
			priority: 'high' as const,
			targetSprint: 3,
			estimatedStoryPoints: 24,
		},
	]

	await db.insert(smEpics).values(epics)

	// Criar Stories
	const stories = [
		// Epic 1: Autenticação
		{
			id: uuid(),
			sessionId: smId,
			epicId: epic1Id,
			epicNumber: 1,
			storyNumber: 1,
			storyKey: '1-1',
			title: 'Cadastro com email',
			asA: 'visitante',
			iWant: 'me cadastrar usando meu email',
			soThat: 'possa fazer compras na plataforma',
			description: 'Formulário de cadastro com validação de email e senha forte',
			acceptanceCriteria: [
				{ id: uuid(), description: 'Validar formato de email', type: 'simple' as const },
				{ id: uuid(), description: 'Exigir senha com 8+ caracteres', type: 'simple' as const },
				{ id: uuid(), description: 'Enviar email de confirmação', type: 'simple' as const },
			],
			tasks: [
				{
					id: uuid(),
					description: 'Criar formulário de cadastro',
					estimatedHours: 4,
					completed: false,
				},
				{ id: uuid(), description: 'Implementar validações', estimatedHours: 2, completed: false },
				{ id: uuid(), description: 'Integrar envio de email', estimatedHours: 3, completed: false },
			],
			devNotes: {
				architecturePatterns: ['Form validation', 'Email service'],
				componentsToTouch: ['RegisterForm', 'AuthService'],
				testingRequirements: ['Testar validações', 'Mock de email'],
			},
			status: 'backlog' as const,
			priority: 'critical' as const,
			storyPoints: 5,
			targetSprint: 1,
			functionalRequirementCodes: ['FR-001'],
		},
		{
			id: uuid(),
			sessionId: smId,
			epicId: epic1Id,
			epicNumber: 1,
			storyNumber: 2,
			storyKey: '1-2',
			title: 'Login com email e senha',
			asA: 'usuário cadastrado',
			iWant: 'fazer login com meu email',
			soThat: 'acesse minha conta',
			description: 'Tela de login com autenticação JWT',
			acceptanceCriteria: [
				{ id: uuid(), description: 'Autenticar usuário válido', type: 'simple' as const },
				{
					id: uuid(),
					description: 'Mostrar erro para credenciais inválidas',
					type: 'simple' as const,
				},
				{ id: uuid(), description: 'Redirecionar após login', type: 'simple' as const },
			],
			tasks: [
				{ id: uuid(), description: 'Criar tela de login', estimatedHours: 3, completed: false },
				{
					id: uuid(),
					description: 'Implementar autenticação JWT',
					estimatedHours: 4,
					completed: false,
				},
			],
			devNotes: {
				architecturePatterns: ['JWT', 'Protected routes'],
				securityConsiderations: ['Token refresh', 'Secure storage'],
			},
			status: 'ready_for_dev' as const,
			priority: 'critical' as const,
			storyPoints: 5,
			targetSprint: 1,
			functionalRequirementCodes: ['FR-002'],
		},
		{
			id: uuid(),
			sessionId: smId,
			epicId: epic1Id,
			epicNumber: 1,
			storyNumber: 3,
			storyKey: '1-3',
			title: 'Login social Google',
			asA: 'visitante',
			iWant: 'me cadastrar/logar com Google',
			soThat: 'tenha mais praticidade',
			description: 'OAuth com Google para login simplificado',
			acceptanceCriteria: [
				{ id: uuid(), description: 'Botão de login com Google', type: 'simple' as const },
				{ id: uuid(), description: 'Criar conta se não existir', type: 'simple' as const },
			],
			tasks: [
				{ id: uuid(), description: 'Configurar OAuth Google', estimatedHours: 3, completed: false },
				{
					id: uuid(),
					description: 'Implementar fluxo de auth',
					estimatedHours: 4,
					completed: false,
				},
			],
			devNotes: {
				architecturePatterns: ['OAuth 2.0'],
				references: ['https://developers.google.com/identity'],
			},
			status: 'backlog' as const,
			priority: 'high' as const,
			storyPoints: 5,
			targetSprint: 1,
			functionalRequirementCodes: ['FR-001'],
		},
		{
			id: uuid(),
			sessionId: smId,
			epicId: epic1Id,
			epicNumber: 1,
			storyNumber: 4,
			storyKey: '1-4',
			title: 'Gestão de endereços',
			asA: 'cliente',
			iWant: 'cadastrar meus endereços',
			soThat: 'escolha onde receber entregas',
			description: 'CRUD de endereços com validação de CEP',
			acceptanceCriteria: [
				{ id: uuid(), description: 'Adicionar novo endereço', type: 'simple' as const },
				{ id: uuid(), description: 'Validar CEP automaticamente', type: 'simple' as const },
				{ id: uuid(), description: 'Definir endereço padrão', type: 'simple' as const },
			],
			tasks: [
				{ id: uuid(), description: 'Criar CRUD de endereços', estimatedHours: 4, completed: false },
				{ id: uuid(), description: 'Integrar API de CEP', estimatedHours: 2, completed: false },
			],
			devNotes: {
				architecturePatterns: ['CRUD pattern'],
				references: ['ViaCEP API'],
			},
			status: 'backlog' as const,
			priority: 'high' as const,
			storyPoints: 6,
			targetSprint: 1,
			functionalRequirementCodes: ['FR-007'],
		},

		// Epic 2: Catálogo
		{
			id: uuid(),
			sessionId: smId,
			epicId: epic2Id,
			epicNumber: 2,
			storyNumber: 1,
			storyKey: '2-1',
			title: 'Listagem de produtos',
			asA: 'visitante',
			iWant: 'ver os produtos disponíveis',
			soThat: 'escolha o que comprar',
			description: 'Grid de produtos com imagem, nome e preço',
			acceptanceCriteria: [
				{ id: uuid(), description: 'Mostrar grid responsivo', type: 'simple' as const },
				{ id: uuid(), description: 'Exibir foto, nome, preço', type: 'simple' as const },
				{ id: uuid(), description: 'Paginação ou infinite scroll', type: 'simple' as const },
			],
			tasks: [
				{
					id: uuid(),
					description: 'Criar componente ProductCard',
					estimatedHours: 3,
					completed: false,
				},
				{
					id: uuid(),
					description: 'Implementar grid responsivo',
					estimatedHours: 2,
					completed: false,
				},
				{ id: uuid(), description: 'Conectar com API', estimatedHours: 2, completed: false },
			],
			devNotes: {
				architecturePatterns: ['Server components', 'Image optimization'],
				performanceNotes: ['Lazy loading de imagens'],
			},
			status: 'in_progress' as const,
			priority: 'critical' as const,
			storyPoints: 5,
			targetSprint: 1,
			functionalRequirementCodes: ['FR-003'],
		},
		{
			id: uuid(),
			sessionId: smId,
			epicId: epic2Id,
			epicNumber: 2,
			storyNumber: 2,
			storyKey: '2-2',
			title: 'Filtros de produtos',
			asA: 'cliente',
			iWant: 'filtrar produtos por categoria',
			soThat: 'encontre o que procuro mais rápido',
			description: 'Sidebar com filtros por tipo de corte, faixa de preço',
			acceptanceCriteria: [
				{ id: uuid(), description: 'Filtrar por categoria', type: 'simple' as const },
				{ id: uuid(), description: 'Filtrar por faixa de preço', type: 'simple' as const },
				{ id: uuid(), description: 'Limpar filtros', type: 'simple' as const },
			],
			tasks: [
				{
					id: uuid(),
					description: 'Criar componente de filtros',
					estimatedHours: 4,
					completed: false,
				},
				{
					id: uuid(),
					description: 'Implementar lógica de filtragem',
					estimatedHours: 3,
					completed: false,
				},
			],
			devNotes: {
				architecturePatterns: ['URL state', 'Query params'],
			},
			status: 'backlog' as const,
			priority: 'high' as const,
			storyPoints: 5,
			targetSprint: 1,
			functionalRequirementCodes: ['FR-003'],
		},
		{
			id: uuid(),
			sessionId: smId,
			epicId: epic2Id,
			epicNumber: 2,
			storyNumber: 3,
			storyKey: '2-3',
			title: 'Página de detalhes do produto',
			asA: 'cliente',
			iWant: 'ver detalhes completos do produto',
			soThat: 'tome decisão de compra informada',
			description: 'Página com galeria, descrição, nutricionais e avaliações',
			acceptanceCriteria: [
				{ id: uuid(), description: 'Galeria de fotos', type: 'simple' as const },
				{ id: uuid(), description: 'Informações nutricionais', type: 'simple' as const },
				{ id: uuid(), description: 'Botão adicionar ao carrinho', type: 'simple' as const },
			],
			tasks: [
				{
					id: uuid(),
					description: 'Criar página de detalhes',
					estimatedHours: 5,
					completed: false,
				},
				{
					id: uuid(),
					description: 'Implementar galeria de fotos',
					estimatedHours: 3,
					completed: false,
				},
			],
			devNotes: {
				architecturePatterns: ['Dynamic routes'],
				componentsToTouch: ['ProductDetail', 'ImageGallery', 'AddToCart'],
			},
			status: 'backlog' as const,
			priority: 'critical' as const,
			storyPoints: 8,
			targetSprint: 1,
			functionalRequirementCodes: ['FR-004'],
		},

		// Epic 3: Carrinho e Checkout
		{
			id: uuid(),
			sessionId: smId,
			epicId: epic3Id,
			epicNumber: 3,
			storyNumber: 1,
			storyKey: '3-1',
			title: 'Adicionar ao carrinho',
			asA: 'cliente',
			iWant: 'adicionar produtos ao carrinho',
			soThat: 'compre múltiplos itens de uma vez',
			description: 'Botão e lógica de adicionar produtos ao carrinho',
			acceptanceCriteria: [
				{ id: uuid(), description: 'Adicionar item ao carrinho', type: 'simple' as const },
				{ id: uuid(), description: 'Mostrar feedback visual', type: 'simple' as const },
				{ id: uuid(), description: 'Atualizar contador do carrinho', type: 'simple' as const },
			],
			tasks: [
				{ id: uuid(), description: 'Criar state do carrinho', estimatedHours: 3, completed: false },
				{
					id: uuid(),
					description: 'Implementar persistência',
					estimatedHours: 2,
					completed: false,
				},
			],
			devNotes: {
				architecturePatterns: ['Context API', 'LocalStorage'],
			},
			status: 'review' as const,
			priority: 'critical' as const,
			storyPoints: 5,
			targetSprint: 2,
			functionalRequirementCodes: ['FR-005'],
		},
		{
			id: uuid(),
			sessionId: smId,
			epicId: epic3Id,
			epicNumber: 3,
			storyNumber: 2,
			storyKey: '3-2',
			title: 'Página do carrinho',
			asA: 'cliente',
			iWant: 'ver e editar meu carrinho',
			soThat: 'revise antes de finalizar',
			description: 'Página com lista de itens, quantidades e subtotal',
			acceptanceCriteria: [
				{ id: uuid(), description: 'Listar itens do carrinho', type: 'simple' as const },
				{ id: uuid(), description: 'Alterar quantidades', type: 'simple' as const },
				{ id: uuid(), description: 'Remover itens', type: 'simple' as const },
				{ id: uuid(), description: 'Mostrar subtotal', type: 'simple' as const },
			],
			tasks: [
				{
					id: uuid(),
					description: 'Criar página do carrinho',
					estimatedHours: 4,
					completed: false,
				},
				{
					id: uuid(),
					description: 'Implementar edição de quantidade',
					estimatedHours: 2,
					completed: false,
				},
			],
			devNotes: {
				componentsToTouch: ['CartPage', 'CartItem', 'CartSummary'],
			},
			status: 'backlog' as const,
			priority: 'critical' as const,
			storyPoints: 5,
			targetSprint: 2,
			functionalRequirementCodes: ['FR-005'],
		},
		{
			id: uuid(),
			sessionId: smId,
			epicId: epic3Id,
			epicNumber: 3,
			storyNumber: 3,
			storyKey: '3-3',
			title: 'Checkout - Dados de entrega',
			asA: 'cliente',
			iWant: 'informar endereço de entrega',
			soThat: 'receba meu pedido',
			description: 'Step 1 do checkout: seleção de endereço',
			acceptanceCriteria: [
				{ id: uuid(), description: 'Selecionar endereço salvo', type: 'simple' as const },
				{ id: uuid(), description: 'Cadastrar novo endereço', type: 'simple' as const },
				{ id: uuid(), description: 'Calcular frete', type: 'simple' as const },
			],
			tasks: [
				{ id: uuid(), description: 'Criar step de endereço', estimatedHours: 4, completed: false },
				{
					id: uuid(),
					description: 'Integrar cálculo de frete',
					estimatedHours: 3,
					completed: false,
				},
			],
			devNotes: {
				architecturePatterns: ['Multi-step form'],
			},
			status: 'backlog' as const,
			priority: 'critical' as const,
			storyPoints: 8,
			targetSprint: 2,
			functionalRequirementCodes: ['FR-006'],
		},
		{
			id: uuid(),
			sessionId: smId,
			epicId: epic3Id,
			epicNumber: 3,
			storyNumber: 4,
			storyKey: '3-4',
			title: 'Checkout - Pagamento',
			asA: 'cliente',
			iWant: 'pagar com cartão ou PIX',
			soThat: 'finalize minha compra',
			description: 'Step 2 do checkout: pagamento',
			acceptanceCriteria: [
				{ id: uuid(), description: 'Pagar com PIX', type: 'simple' as const },
				{ id: uuid(), description: 'Pagar com cartão de crédito', type: 'simple' as const },
				{ id: uuid(), description: 'Mostrar confirmação', type: 'simple' as const },
			],
			tasks: [
				{
					id: uuid(),
					description: 'Integrar gateway de pagamento',
					estimatedHours: 8,
					completed: false,
				},
				{
					id: uuid(),
					description: 'Implementar tela de pagamento',
					estimatedHours: 4,
					completed: false,
				},
			],
			devNotes: {
				architecturePatterns: ['Payment gateway integration'],
				securityConsiderations: ['PCI compliance', 'Tokenização'],
			},
			status: 'backlog' as const,
			priority: 'critical' as const,
			storyPoints: 8,
			targetSprint: 2,
			functionalRequirementCodes: ['FR-006'],
		},

		// Epic 4: Assinaturas e Pedidos
		{
			id: uuid(),
			sessionId: smId,
			epicId: epic4Id,
			epicNumber: 4,
			storyNumber: 1,
			storyKey: '4-1',
			title: 'Criar assinatura',
			asA: 'cliente',
			iWant: 'criar uma assinatura mensal',
			soThat: 'receba carnes todo mês',
			description: 'Wizard de criação de assinatura com personalização',
			acceptanceCriteria: [
				{ id: uuid(), description: 'Escolher frequência', type: 'simple' as const },
				{ id: uuid(), description: 'Selecionar produtos', type: 'simple' as const },
				{ id: uuid(), description: 'Definir data de cobrança', type: 'simple' as const },
			],
			tasks: [
				{
					id: uuid(),
					description: 'Criar wizard de assinatura',
					estimatedHours: 6,
					completed: false,
				},
				{ id: uuid(), description: 'Implementar recorrência', estimatedHours: 4, completed: false },
			],
			devNotes: {
				architecturePatterns: ['Subscription model', 'Recurring billing'],
			},
			status: 'done' as const,
			priority: 'high' as const,
			storyPoints: 8,
			targetSprint: 3,
			functionalRequirementCodes: ['FR-009'],
		},
		{
			id: uuid(),
			sessionId: smId,
			epicId: epic4Id,
			epicNumber: 4,
			storyNumber: 2,
			storyKey: '4-2',
			title: 'Gerenciar assinatura',
			asA: 'assinante',
			iWant: 'pausar ou cancelar minha assinatura',
			soThat: 'tenha controle sobre meu plano',
			description: 'Painel de gestão da assinatura ativa',
			acceptanceCriteria: [
				{ id: uuid(), description: 'Pausar assinatura', type: 'simple' as const },
				{ id: uuid(), description: 'Cancelar assinatura', type: 'simple' as const },
				{ id: uuid(), description: 'Alterar produtos', type: 'simple' as const },
			],
			tasks: [
				{
					id: uuid(),
					description: 'Criar painel de assinatura',
					estimatedHours: 5,
					completed: false,
				},
				{ id: uuid(), description: 'Implementar ações', estimatedHours: 3, completed: false },
			],
			devNotes: {},
			status: 'backlog' as const,
			priority: 'high' as const,
			storyPoints: 5,
			targetSprint: 3,
			functionalRequirementCodes: ['FR-009'],
		},
		{
			id: uuid(),
			sessionId: smId,
			epicId: epic4Id,
			epicNumber: 4,
			storyNumber: 3,
			storyKey: '4-3',
			title: 'Acompanhar pedido',
			asA: 'cliente',
			iWant: 'acompanhar meu pedido',
			soThat: 'saiba quando vai chegar',
			description: 'Timeline de status do pedido com notificações',
			acceptanceCriteria: [
				{ id: uuid(), description: 'Ver status atual', type: 'simple' as const },
				{ id: uuid(), description: 'Ver histórico de status', type: 'simple' as const },
				{ id: uuid(), description: 'Receber notificações', type: 'simple' as const },
			],
			tasks: [
				{
					id: uuid(),
					description: 'Criar timeline de pedido',
					estimatedHours: 4,
					completed: false,
				},
				{
					id: uuid(),
					description: 'Implementar push notifications',
					estimatedHours: 4,
					completed: false,
				},
			],
			devNotes: {
				architecturePatterns: ['Real-time updates', 'Push notifications'],
			},
			status: 'backlog' as const,
			priority: 'high' as const,
			storyPoints: 6,
			targetSprint: 3,
			functionalRequirementCodes: ['FR-008'],
		},
		{
			id: uuid(),
			sessionId: smId,
			epicId: epic4Id,
			epicNumber: 4,
			storyNumber: 4,
			storyKey: '4-4',
			title: 'Histórico de pedidos',
			asA: 'cliente',
			iWant: 'ver meus pedidos anteriores',
			soThat: 'acompanhe meu histórico de compras',
			description: 'Lista de pedidos com opção de repetir',
			acceptanceCriteria: [
				{ id: uuid(), description: 'Listar pedidos', type: 'simple' as const },
				{ id: uuid(), description: 'Ver detalhes do pedido', type: 'simple' as const },
				{ id: uuid(), description: 'Repetir pedido', type: 'simple' as const },
			],
			tasks: [
				{
					id: uuid(),
					description: 'Criar página de histórico',
					estimatedHours: 3,
					completed: false,
				},
				{
					id: uuid(),
					description: 'Implementar repetir pedido',
					estimatedHours: 2,
					completed: false,
				},
			],
			devNotes: {},
			status: 'backlog' as const,
			priority: 'medium' as const,
			storyPoints: 5,
			targetSprint: 3,
			functionalRequirementCodes: ['FR-010'],
		},
	]

	await db.insert(smStories).values(stories)

	await db.insert(smDocuments).values({
		sessionId: smId,
		type: 'full_planning',
		title: 'Planejamento Completo: Vendas Master',
		content: `# Planejamento de Desenvolvimento
## Vendas Master

### Sprint 1 (Semanas 1-2)
**Foco: Autenticação + Catálogo**
- Epic 1: Autenticação e Perfil (21 pts)
- Epic 2: Catálogo de Produtos (18 pts)
- **Total: 39 pontos**

### Sprint 2 (Semanas 3-4)
**Foco: Carrinho e Checkout**
- Epic 3: Carrinho e Checkout (26 pts)
- **Total: 26 pontos**

### Sprint 3 (Semanas 5-6)
**Foco: Assinaturas e Pedidos**
- Epic 4: Assinaturas e Pedidos (24 pts)
- **Total: 24 pontos**

### Resumo
- Total de Stories: 16
- Total de Story Points: 89
- Velocidade estimada: 40 pts/sprint
- Duração: 3 sprints (6 semanas)
`,
		version: 1,
	})

	process.exit(0)
}

main().catch((_err) => {
	process.exit(1)
})
