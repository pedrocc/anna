# Anna Digital

**Anna** é uma plataforma de brainstorming com IA que ajuda você a transformar ideias em projetos executivos.

Uma plataforma **Masterboi**.

## Sobre

Anna é sua facilitadora de brainstorming com IA. Explore técnicas criativas, gere insights e crie documentos executivos para seus projetos.

### Funcionalidades

- **10 Técnicas de Criatividade** - SCAMPER, Six Thinking Hats, First Principles, Mind Mapping e mais metodologias comprovadas
- **Perguntas Provocativas** - Anna faz as perguntas certas para expandir seu pensamento e revelar novas perspectivas
- **Documentação Automática** - Suas ideias são organizadas e documentadas em tempo real, prontas para compartilhar

### Como Funciona

1. **Crie seu projeto** - Dê um nome e descreva brevemente o que você quer explorar
2. **Escolha a técnica** - Selecione entre 10 metodologias de brainstorming
3. **Gere o documento** - Anna compila automaticamente um documento executivo com todas as ideias e insights

## Stack Técnico

### Backend
- **Hono** - Framework web ultrarrápido
- **Drizzle ORM** - PostgreSQL
- **Clerk** - Autenticação
- **BullMQ** - Filas de processamento

### Frontend
- **React 19** - UI
- **Wouter** - Routing
- **SWR** - Data fetching
- **shadcn/ui** - Componentes
- **Tailwind CSS 4** - Estilização

### Infraestrutura
- **Bun** - Runtime, package manager e bundler
- **TypeScript** - Linguagem
- **Biome** - Lint e formatação
- **Redis** - Cache

## Estrutura do Projeto

```
anna/
├── apps/
│   ├── api/          # Hono REST API
│   └── web/          # React SPA
├── packages/
│   ├── db/           # Drizzle ORM + schemas
│   ├── shared/       # Types e schemas Zod
│   ├── ui/           # Componentes shadcn/ui
│   ├── jobs/         # BullMQ queues/workers
│   └── email/        # Templates de email
├── tooling/
│   ├── typescript/   # Configs TypeScript
│   └── biome/        # Config Biome
├── scripts/          # Scripts de desenvolvimento
└── docker/           # Docker Compose
```

## Desenvolvimento

### Pré-requisitos

- [Bun](https://bun.sh/) 1.3.5+
- [Docker](https://docker.com) (para PostgreSQL e Redis)
- Conta no [Clerk](https://clerk.com/)

### Quick Start

```bash
# 1. Clone o repositório
git clone https://github.com/masterboi/anna.git
cd anna

# 2. Instale as dependências
bun install

# 3. Inicie os containers (PostgreSQL + Redis)
docker compose -f docker/docker-compose.yml up -d

# 4. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas chaves (Clerk, Resend, etc.)

# 5. Execute as migrations
bun db:migrate

# 6. Inicie o servidor de desenvolvimento
bun dev
```

A API estará em `http://localhost:3000` e o frontend em `http://localhost:5173`.

### Comandos

| Comando | Descrição |
|---------|-----------|
| `bun dev` | Inicia API + Web em modo desenvolvimento |
| `bun build` | Build de produção |
| `bun test` | Roda todos os testes |
| `bun lint` | Lint + format check |
| `bun typecheck` | Verifica tipos TypeScript |
| `bun db:migrate` | Aplica migrations |
| `bun db:seed` | Popula banco com dados de teste |
| `bun db:studio` | Abre Drizzle Studio |

### Variáveis de Ambiente

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/anna

# Redis
REDIS_URL=redis://localhost:6379

# Auth (Clerk)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Email (Resend)
RESEND_API_KEY=re_...

# URLs
API_URL=http://localhost:3000
WEB_URL=http://localhost:5173
```

## Deploy

O projeto está configurado para deploy via Railway com GitHub Actions:

- Push para `main` = deploy automático
- Dockerfiles otimizados em `apps/api/Dockerfile` e `apps/web/Dockerfile`

## Licença

Este projeto é privado e de propriedade da Masterboi.

---

**Anna Digital** - Uma plataforma Masterboi
