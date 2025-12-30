# Stack VDev

Template de monorepo TypeScript + Bun para aplicações web modernas.

## Criando um Novo Projeto

Este repositório é um template. Para criar um novo projeto a partir dele:

```bash
# 1. Clone o template
git clone https://github.com/seu-usuario/stack-vdev.git meu-projeto
cd meu-projeto

# 2. Inicialize o projeto com seu nome
bun new-project --name=meu-projeto --description="Descrição do projeto"
```

O script `new-project` automaticamente:
- Renomeia o projeto em todos os arquivos relevantes:
  - `package.json` (nome do workspace)
  - `docker/docker-compose.yml` (containers e banco de dados)
  - `.env.example` (DATABASE_URL)
  - `apps/web/index.html` (título da página)
  - `apps/web/src/pages/Home.tsx` (texto de boas-vindas)
  - `apps/web/src/components/Layout.tsx` (header)
  - `packages/email/src/templates/welcome.ts` (templates de email)
- Converte o nome automaticamente para os formatos necessários:
  - `meu-projeto` → kebab-case (package.json)
  - `meu_projeto` → snake_case (docker, database)
  - `Meu Projeto` → Title Case (UI, emails)
- Remove o histórico git do template
- Inicializa um novo repositório git
- Copia `.env.example` para `.env`
- Instala todas as dependências

**Requisitos do nome:** deve ser kebab-case (letras minúsculas, números e hífens, começando com letra).

Após a inicialização, configure suas variáveis de ambiente no `.env` e siga o Quick Start abaixo.

## Quick Start

```bash
# 1. Instalar dependências
bun install

# 2. Iniciar containers (PostgreSQL + Redis)
docker compose -f docker/docker-compose.yml up -d

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas chaves (Clerk, Resend, etc.)

# 4. Rodar migrations
bun db:migrate

# 5. Iniciar desenvolvimento
bun dev
```

A API estará em `http://localhost:3000` e o frontend em `http://localhost:5173`.

## Tech Stack

- **Runtime/Bundler/Package Manager**: [Bun](https://bun.sh)
- **API**: [Hono](https://hono.dev) - Framework web ultrarrápido
- **Frontend**: [React 19](https://react.dev) + [Wouter](https://github.com/molefrog/wouter) + [SWR](https://swr.vercel.app)
- **Database**: [PostgreSQL](https://postgresql.org) + [Drizzle ORM](https://orm.drizzle.team)
- **Cache/Queue**: [Redis](https://redis.io) + [BullMQ](https://bullmq.io)
- **Auth**: [Clerk](https://clerk.com)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com)
- **Linting**: [Biome](https://biomejs.dev)

## Estrutura

```
stack_vdev/
├── apps/
│   ├── api/          # Hono REST API
│   └── web/          # React SPA
├── packages/
│   ├── shared/       # Schemas, tipos, utilitários
│   ├── db/           # Drizzle ORM + migrations
│   ├── ui/           # Componentes React
│   ├── jobs/         # BullMQ queues/workers
│   └── email/        # Templates de email (Resend)
├── tooling/
│   ├── typescript/   # Configs TypeScript
│   └── biome/        # Config Biome
├── scripts/          # Scripts de desenvolvimento
└── docker/           # Docker Compose
```

## Requisitos

- [Bun](https://bun.sh) >= 1.0
- [Docker](https://docker.com) (para PostgreSQL e Redis)

## Comandos

| Comando | Descrição |
|---------|-----------|
| `bun dev` | Inicia API + Web em modo desenvolvimento |
| `bun test` | Executa todos os testes |
| `bun build` | Build de produção |
| `bun lint` | Verifica lint com Biome |
| `bun typecheck` | Verifica tipos TypeScript |
| `bun db:migrate` | Aplica migrations |
| `bun db:seed` | Popula banco com dados de teste |
| `bun db:studio` | Abre Drizzle Studio |
| `bun verify-clerk` | Valida configuração do Clerk |
| `bun health-check` | Verifica status dos serviços |

## Configuração

### Variáveis de Ambiente

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/stack_vdev

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

### Clerk

1. Crie uma conta em [clerk.com](https://clerk.com)
2. Crie um novo application
3. Copie as chaves de API Keys para o `.env`
4. Execute `bun verify-clerk` para validar

## Testes

```bash
# Todos os testes
bun test

# Com coverage
bun test --coverage

# Arquivo específico
bun test apps/api/src/middleware/auth.test.ts
```

## Deploy

O projeto está configurado para deploy via Railway com GitHub Actions:

- Push para `main` = deploy automático
- Dockerfiles otimizados em `apps/api/Dockerfile` e `apps/web/Dockerfile`

## Licença

MIT
