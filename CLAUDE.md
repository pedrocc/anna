# Instruções para Claude Code

## Regra #1: Bun Obrigatório
Este projeto usa **exclusivamente Bun** para:
- **Runtime**: `bun run src/index.ts`
- **Package Manager**: `bun install`, `bun add`
- **Bundler**: `bun build`
- **Test Runner**: `bun test`

**PROIBIDO:** Node.js, npm, yarn, pnpm, Vite, esbuild, Webpack, Jest, Vitest.

## Sobre este Projeto
**Anna** - Plataforma de gestão de projetos e requisitos com AI. Monorepo TypeScript + Bun com API REST (Hono), SPA React 19, autenticação Clerk, banco PostgreSQL e componentes shadcn/ui.

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.

## Estrutura do Monorepo

```
anna/
├── apps/
│   ├── api/          # Hono REST API (runtime Bun)
│   └── web/          # React 19 SPA (bundled com Bun)
├── packages/
│   ├── db/           # Drizzle ORM + schemas PostgreSQL
│   ├── shared/       # Types e schemas Zod compartilhados
│   ├── ui/           # Componentes shadcn/ui reutilizáveis
│   ├── email/        # Email service via Resend
│   └── jobs/         # Job queue via BullMQ + Redis
└── tooling/
    └── biome/        # Configuração Biome (lint/format)
```

**Workspaces:**
- `@repo/db` - Database schemas e Drizzle client
- `@repo/shared` - Types, schemas Zod, constantes
- `@repo/ui` - Componentes shadcn/ui
- `@repo/email` - Envio de emails via Resend
- `@repo/jobs` - Background jobs via BullMQ

## Comandos Principais

```bash
# Desenvolvimento
bun start        # Startup completo: Docker + migrations + API + Web
bun dev          # Apenas API + Web (Docker deve estar rodando)

# Build e Testes
bun build        # Build de produção
bun test         # Rodar todos os testes
bun lint         # Lint + format check (Biome)
bun lint:fix     # Auto-fix lint issues
bun typecheck    # Verificar tipos TypeScript

# Database
bun db:migrate   # Aplicar migrations
bun db:seed      # Popular com dados de teste
bun db:studio    # Abrir Drizzle Studio (GUI)
bun db:generate  # Gerar nova migration

# Docker
bun docker:start # Iniciar apenas containers
bun docker:stop  # Parar containers
bun docker:logs  # Ver logs dos containers

# Utilitários
bun new-project  # Criar novo projeto (wizard)
bun health-check # Verificar saúde dos serviços
bun verify-clerk # Validar configuração Clerk
```

### Sistema de Auto-Detecção de Portas

O script `bun start` detecta automaticamente portas disponíveis:
- API: 3000 (ou próxima disponível)
- Web: 5173 (ou próxima disponível)
- PostgreSQL: 5432
- Redis: 6379

Configurado em `scripts/lib/ports.ts`.

## Stack Técnico

**Backend:**
- Hono 4.11+ (framework web)
- Drizzle ORM 0.45+ (PostgreSQL)
- Clerk Backend 2.29+ (autenticação JWT)
- Zod 4.3+ (validação)
- Pino 10.1+ (logging estruturado)
- OpenRouter (LLM/AI via deepseek-v3.2)
- IORedis 5.9+ (cache e rate limiting)
- BullMQ 5.66+ (job queue)
- Svix (webhook verification)

**Frontend:**
- React 19.2+
- Wouter 3.9+ (routing - NÃO React Router)
- SWR 2.3+ (data fetching)
- shadcn/ui + Radix UI (componentes)
- Tailwind CSS 4.1+ (NÃO v3)
- @dnd-kit (drag & drop para Kanban)
- react-markdown + remark-gfm (rendering markdown)
- Recharts 3.6+ (gráficos)
- Lucide React (ícones)
- docx + html2pdf.js (exportação de documentos)
- @clerk/localizations (pt-BR)

**Dev Tools:**
- Bun 1.3.5+
- TypeScript 5.9+ (strict mode)
- Biome 2.3+ (lint/format)

## Autenticação e Segurança

### Clerk Authentication

**Frontend:**
```tsx
import { ClerkProvider, SignIn, SignUp, UserButton } from '@clerk/clerk-react'

// Wrapped em main.tsx
<ClerkProvider publishableKey={CLERK_KEY}>
  <App />
</ClerkProvider>
```

**Backend:**
```typescript
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'

// Middleware de autenticação
app.use('*', clerkMiddleware())

// Obter userId na rota
const { userId } = getAuth(c)
```

### Padrões de Segurança

**1. Middleware de Autorização** (`apps/api/src/middleware/auth.ts`):
```typescript
// authMiddleware - verifica se está autenticado
// requireAdmin - verifica se é admin (role-based)
```

**2. Ordem de Middleware:**
```typescript
// SEMPRE nesta ordem:
router.get('/',
  authMiddleware,        // 1. Autenticação
  requireAdmin,          // 2. Autorização
  zValidator('query'),   // 3. Validação
  handler                // 4. Handler
)
```

**3. Validação de Permissões:**
- Usuários só podem editar próprios dados
- Admins podem editar qualquer usuário
- Não-admins NÃO podem alterar `role`
- Validar `userId` antes de operações críticas

**4. Variáveis de Ambiente:**
```bash
# .env (raiz do projeto)

# Database
DATABASE_URL=postgresql://...

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...  # Para validação de webhooks

# Redis (cache, rate limiting, jobs)
REDIS_URL=redis://localhost:6379

# Email
RESEND_API_KEY=re_...

# LLM/AI
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_DEFAULT_MODEL=deepseek/deepseek-v3.2  # opcional

# Logging
LOG_LEVEL=info  # debug, info, warn, error

# URLs (para CORS e referências)
WEB_URL=http://localhost:5173
API_URL=http://localhost:3000

# Portas (opcional, auto-detectadas)
PORT=3000
```

**5. Webhook Verification** (`apps/api/src/middleware/webhook.ts`):
```typescript
import { verifyClerkWebhook } from '../middleware/webhook.js'

// Usar em rotas de webhook do Clerk
userRoutes.post('/', verifyClerkWebhook, zValidator('json', schema), handler)
```

**IMPORTANTE:**
- Nunca commitar `.env` (já no `.gitignore`)
- Usar `.env.example` como template
- Clerk gerencia toda autenticação (não implementar JWT customizado)
- Microsoft Entra ID configurado no dashboard Clerk
- Webhooks do Clerk DEVEM usar o middleware `verifyClerkWebhook`

## Regras de Código

1. **TypeScript Strict** - NUNCA use `any`
2. **Validação Obrigatória** - Todo input validado com Zod
3. **Testes** - Lógica de negócio DEVE ter testes (`bun test`)
4. **Componentes UI** - Use EXCLUSIVAMENTE shadcn/ui (tema Azul #1d6ce0)
5. **Schemas Compartilhados** - Types em `@repo/shared`, nunca duplicar

## Padrões de API

### Estrutura de Rotas

```typescript
// apps/api/src/routes/users.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware, requireAdmin } from '../middleware/auth.js'
import { successResponse, commonErrors } from '../lib/response.js'

const userRoutes = new Hono()

userRoutes.get(
  '/',
  authMiddleware,              // 1. Auth
  requireAdmin,                // 2. Authorization
  zValidator('query', schema), // 3. Validation
  async (c) => {
    // Handler
    return successResponse(c, data, 200, meta)
  }
)
```

### Respostas Padronizadas

**Use os helpers de `apps/api/src/lib/response.ts`:**

```typescript
import { successResponse, commonErrors } from '../lib/response.js'

// Sucesso
return successResponse(c, data, 200, { page, limit, total })

// Erros comuns
return commonErrors.notFound(c, 'User not found')
return commonErrors.unauthorized(c)
return commonErrors.forbidden(c, 'Admin access required')
return commonErrors.badRequest(c, 'Invalid input', details)
return commonErrors.validationError(c, zodErrors)
```

**Formato de Resposta:**
```typescript
// Sucesso
{
  "success": true,
  "data": T,
  "meta"?: { page, limit, total, ... }
}

// Erro
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details"?: unknown
  }
}
```

### Decorators OpenAPI

```typescript
import { createRoute, z } from '@hono/zod-openapi'

// Documentar endpoints com OpenAPI
const route = createRoute({
  method: 'get',
  path: '/users',
  // ...
})
```

### Helpers Centralizados

**Use helpers de `apps/api/src/lib/helpers.ts`:**

```typescript
import { getUserByClerkId } from '../lib/helpers.js'

// Buscar usuário pelo Clerk ID
const user = await getUserByClerkId(userId)
if (!user) {
  return commonErrors.notFound(c, 'User not found')
}
```

### Configuração

- Rate limiting via Redis (X-RateLimit-* headers)
- CORS configurado para ambiente de desenvolvimento
- Error handling global para erros não tratados
- Webhook verification via Svix (Clerk)

### Rotas da API

**Estrutura versionada `/api/v1/*`:**
```typescript
app.route('/api/v1/users', userRoutes)
app.route('/api/v1/chat', chatRoutes)
app.route('/api/v1/briefing', briefingRoutes)
app.route('/api/v1/prd', prdRoutes)
app.route('/api/v1/sm', smRoutes)
app.route('/api/v1/kanban', kanbanRoutes)
```

**Padrão de URLs por domínio:**
- `GET /sessions` - listar com paginação
- `GET /sessions/:id` - obter específico
- `POST /sessions` - criar novo
- `PATCH /sessions/:id` - atualizar
- `DELETE /sessions/:id` - remover
- `POST /sessions/:id/:action` - ações (chat, rename, complete, etc.)

### Health Checks

```typescript
GET /health       → { status: 'ok' }
GET /health/ready → { status: 'ready', database: 'connected' }
GET /health/live  → { status: 'live' }
```

### Streaming SSE

**Para respostas em tempo real (chat, geração de documentos):**

```typescript
import { streamSSE } from 'hono/streaming'

return streamSSE(c, async (stream) => {
  const generator = client.chatStream(messages)
  for await (const chunk of generator) {
    await stream.writeSSE({
      data: JSON.stringify({ content: chunk }),
    })
  }
  await stream.writeSSE({ data: '[DONE]' })
})
```

### Integração LLM/AI (OpenRouter)

**Client centralizado em `apps/api/src/lib/openrouter.ts`:**

```typescript
import { getOpenRouterClient } from '../lib/openrouter.js'

const client = getOpenRouterClient()

// Completion padrão
const response = await client.chat(messages, { temperature: 0.7 })

// Streaming
const generator = client.chatStream(messages)
for await (const chunk of generator) {
  // processar chunk
}
```

**Modelo padrão:** `deepseek/deepseek-v3.2`

### Logging Estruturado (Pino)

```typescript
import { createLogger } from '../lib/logger.js'

const log = createLogger('module-name')

log.info({ userId, action: 'create' }, 'User created')
log.error({ err, sessionId }, 'Session failed')
```

**Loggers pré-configurados:**
- `apiLogger` - requisições HTTP
- `dbLogger` - operações de banco
- `authLogger` - autenticação
- `openrouterLogger` - chamadas LLM

**Redação automática:** apiKey, password, authorization

## Padrões de Frontend

### Estrutura

```
apps/web/src/
├── components/
│   ├── ErrorBoundary.tsx    # Error boundary global
│   ├── Layout.tsx           # Layout principal com sidebar
│   ├── AppSidebar.tsx       # Navegação lateral
│   ├── brainstorm/          # Componentes de brainstorm
│   ├── briefing/            # Componentes de briefing
│   ├── prd/                 # Componentes de PRD
│   ├── sm/                  # Componentes de Sprint/Story Manager
│   └── kanban/              # Board Kanban com @dnd-kit
├── pages/                   # Páginas da aplicação
├── hooks/                   # Hooks customizados (useBriefingChat, etc.)
├── lib/
│   ├── api-client.ts        # Client API tipado + hooks SWR
│   └── api.ts               # Fetcher base com auth
├── styles/
│   └── globals.css          # Tailwind + custom animations
└── main.tsx                 # Entry point + providers
```

### Organização por Feature

Cada módulo de feature segue a estrutura:
```
components/{feature}/
├── ChatInterface.tsx        # Interface de chat com SSE
├── ChatMessage.tsx          # Mensagem individual com markdown
├── StepIndicator.tsx        # Indicador de progresso multi-step
├── SessionCard.tsx          # Card para listagem de sessões
└── DocumentViewer.tsx       # Visualizador de documentos
```

### Error Boundary

**SEMPRE wrappear App com ErrorBoundary:**

```tsx
// apps/web/src/main.tsx
import { ErrorBoundary } from './components/ErrorBoundary'

<ErrorBoundary>
  <ClerkProvider>
    <App />
  </ClerkProvider>
</ErrorBoundary>
```

### API Client Tipado

**Use hooks tipados de `apps/web/src/lib/api-client.ts`:**

```typescript
import { useCurrentUser, useUsers } from '@/lib/api-client'

// Em componentes
function Profile() {
  const { data: user, error, isLoading } = useCurrentUser()

  if (error) return <div>Error: {error.message}</div>
  if (isLoading) return <div>Loading...</div>

  return <div>{user.name}</div>
}
```

**NUNCA:**
- Hardcoded URLs em componentes
- `fetch` direto sem error handling
- Chaves SWR sem constantes

### Componentes UI (shadcn/ui)

**Configuração Obrigatória:**
- **Tema:** Azul (#1d6ce0 como cor primária)
- **Modo:** Light (modo único)
- **Localização:** `packages/ui` ou importar via `@repo/ui`

**Instalação de Componentes:**
```bash
bunx shadcn@latest add button
bunx shadcn@latest add dialog
bunx shadcn@latest add form
```

**Componentes Disponíveis:**
- Layout: Card, Separator, Tabs, Accordion
- Forms: Button, Input, Select, Checkbox, Radio, Switch, Form, Label
- Feedback: Alert, Toast, Dialog, Popover, Tooltip
- Data: Table, Badge, Avatar

**Regras:**
1. SEMPRE prefira shadcn/ui a componentes customizados
2. Mantenha consistência com tema Azul (#1d6ce0)
3. Modo Light apenas (Dark mode não implementado)

### Routing e Pages

```tsx
// apps/web/src/router.tsx (Wouter)
import { Route, Switch } from 'wouter'

<Switch>
  <Route path="/" component={Home} />
  <Route path="/users" component={Users} />
</Switch>
```

### Auth UI

- Use componentes Clerk (`<SignIn>`, `<SignUp>`, `<UserButton>`)
- NÃO criar formulários de login customizados
- Clerk gerencia redirecionamentos e sessões

### Build

- Build com custom `build.ts` (NÃO Vite)
- Dev server com `dev-server.ts` para HMR
- Tailwind CSS v4 compilado automaticamente
- Build-time defines: `__API_URL__`, `__CLERK_PUBLISHABLE_KEY__`

### Hooks de Chat SSE

**Para streaming de mensagens em tempo real:**

```typescript
import { useBriefingChat } from '@/hooks/useBriefingChat'

function Chat({ sessionId }) {
  const { sendMessage, isStreaming, streamingContent, error } = useBriefingChat({
    sessionId,
    onMessageComplete: (content) => mutate(),
    onStepUpdate: (newStep) => setCurrentStep(newStep),
  })

  return (
    <button onClick={() => sendMessage(message)} disabled={isStreaming}>
      Enviar
    </button>
  )
}
```

**Hooks disponíveis:**
- `useBriefingChat` - chat de discovery/briefing
- `usePrdChat` - chat de requisitos (PRD)
- `useSmChat` - chat de sprint/stories
- `useMessageEdit` - edição de mensagens com regeneração

### Design Systems

**Dois sistemas visuais implementados:**

**1. Basecamp (padrão):**
- Minimalista, tipografia-driven
- Bordas sutis, cores calmas
- Classes: `.basecamp-card`, `.stagger-fade-in`

**2. Apple (Kanban):**
- Ultra minimalista, glassmorphism
- CSS vars: `--apple-bg`, `--apple-border`, `--apple-priority-*`
- Classes: `.apple-board`, `.apple-card`, `.apple-column`

### Kanban com @dnd-kit

```typescript
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

<DndContext onDragEnd={handleDragEnd}>
  <SortableContext items={stories} strategy={verticalListSortingStrategy}>
    {stories.map((story) => <KanbanCard key={story.id} story={story} />)}
  </SortableContext>
</DndContext>
```

### Exportação de Documentos

```typescript
import { Document, Packer, Paragraph } from 'docx'
import html2pdf from 'html2pdf.js'
import { saveAs } from 'file-saver'

// Word
const doc = new Document({ sections: [...] })
const blob = await Packer.toBlob(doc)
saveAs(blob, 'document.docx')

// PDF
html2pdf().from(element).save('document.pdf')
```

### Markdown Rendering

```typescript
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

<ReactMarkdown remarkPlugins={[remarkGfm]}>
  {content}
</ReactMarkdown>
```

## Padrões de Database

### Drizzle ORM

**Schemas em `packages/db/src/schema/`:**

```typescript
// packages/db/src/schema/users.ts
import { pgTable, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'

export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    clerkId: varchar('clerk_id', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).notNull().default('user'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    // SEMPRE adicionar indexes para queries frequentes
    clerkIdIdx: uniqueIndex('users_clerk_id_idx').on(table.clerkId),
    emailIdx: index('users_email_idx').on(table.email),
    roleIdx: index('users_role_idx').on(table.role),
    createdAtIdx: index('users_created_at_idx').on(table.createdAt),
  })
)
```

### Migrations

```bash
# Gerar migration
bun db:generate

# Aplicar migrations
bun db:migrate

# Seed (desenvolvimento)
bun db:seed
```

### Queries

```typescript
import { db } from '@repo/db'
import { users } from '@repo/db/schema'
import { eq, and, desc } from 'drizzle-orm'

// Select
const user = await db.query.users.findFirst({
  where: eq(users.clerkId, userId)
})

// Insert
await db.insert(users).values({
  clerkId: 'user_123',
  email: 'user@example.com'
})

// Update
await db.update(users)
  .set({ name: 'New Name' })
  .where(eq(users.id, userId))
```

### Performance

- **SEMPRE** adicionar indexes para colunas em `where`, `join`, `order by`
- Usar `findFirst()` ao invés de `findMany().limit(1)`
- Evitar `SELECT *` - especificar colunas necessárias
- Usar transactions para múltiplas operações

## Arquitetura de Features

O projeto segue um padrão modular para cada feature. Cada módulo possui:

```
packages/shared/src/schemas/{feature}.schema.ts  # Schemas Zod
packages/db/src/schema/{feature}.ts              # Tabelas Drizzle
apps/api/src/routes/{feature}.ts                 # Rotas API
apps/api/src/lib/{feature}-prompts.ts            # Prompts LLM (se aplicável)
apps/web/src/components/{feature}/               # Componentes React
apps/web/src/pages/{Feature}*.tsx                # Páginas
apps/web/src/hooks/use{Feature}Chat.ts           # Hooks SSE (se aplicável)
```

### Módulos Existentes

| Módulo | Descrição | Chat AI | Documentos |
|--------|-----------|---------|------------|
| **briefing** | Discovery e levantamento inicial | ✅ | ✅ |
| **prd** | Product Requirements Document | ✅ | ✅ |
| **sm** | Sprint/Story Manager | ✅ | ✅ (backlog, epics) |
| **kanban** | Board de gerenciamento visual | ❌ | ❌ |
| **brainstorm** | Sessões de brainstorming | ✅ | ✅ |

### Fluxo de Dados

```
Schema Zod → Validation → DB Insert/Update → API Response
     ↓                         ↓
Frontend Form ←──────── SWR Cache ←───── API Call
```

### Criando Nova Feature

1. Criar schema em `@repo/shared/src/schemas/`
2. Criar tabelas em `@repo/db/src/schema/`
3. Gerar migration: `bun db:generate`
4. Criar rotas em `apps/api/src/routes/`
5. Criar componentes em `apps/web/src/components/`
6. Criar páginas em `apps/web/src/pages/`
7. Adicionar hooks SWR em `apps/web/src/lib/api-client.ts`

## Design de Interface

### Quando Criar UI

**IMPORTANTE:** Sempre que for criar ou modificar componentes visuais, páginas, ou qualquer elemento de UI, você **DEVE** usar a skill `frontend-design`.

### Quando usar frontend-design:

- Criar novos componentes React
- Criar novas páginas
- Redesenhar componentes existentes
- Implementar layouts complexos
- Estilizar elementos com Tailwind CSS
- Criar interfaces interativas

### Como Usar:

```bash
# Invocar a skill ANTES de implementar
/frontend-design criar modal de confirmação com shadcn Dialog
```

**A skill frontend-design:**
1. Garante qualidade visual profissional
2. Evita designs genéricos ou sem identidade
3. Mantém consistência com shadcn/ui tema Azul
4. Produz código otimizado e bem estruturado

**Após usar a skill:**
- Implementar usando componentes shadcn/ui
- Manter tema Azul (#1d6ce0)
- Seguir padrões de código do projeto

## Antes de Implementar

1. **Consulte documentação** via Context7 para a tecnologia
2. **Verifique código existente** - procure padrões similares no projeto
3. **Siga os padrões** - não invente novos padrões sem necessidade
4. **Confirme Bun** - NUNCA use Node.js, npm, Vite, etc.
5. **Para UI** - Use skill `frontend-design` + shadcn/ui

## Adicionar Dependências

```bash
# ✅ CORRETO
bun add pacote
bun add -d pacote-dev

# ❌ ERRADO - nunca usar
npm install pacote
yarn add pacote
pnpm add pacote
```

## Testes

### Comandos

```bash
# Rodar todos
bun test

# Rodar específico
bun test apps/api/src/routes/users.test.ts

# Com coverage
bun test --coverage

# Watch mode
bun test --watch
```

### Padrões de Testes

**Estrutura:**
```typescript
import { describe, it, expect, beforeEach } from 'bun:test'

describe('Feature', () => {
  beforeEach(() => {
    // Setup
  })

  describe('Scenario', () => {
    it('should do something', async () => {
      // Arrange
      const input = { ... }

      // Act
      const result = await functionUnderTest(input)

      // Assert
      expect(result).toBe(expected)
    })
  })
})
```

**O que testar:**
1. Lógica de negócio (SEMPRE)
2. Validações Zod
3. Autenticação e autorização
4. Edge cases e error handling
5. Integrações críticas

**O que NÃO testar:**
- Componentes shadcn/ui (já testados)
- Código trivial (getters/setters)
- Código de terceiros

**Coverage Mínimo:**
- Rotas da API: 80%+
- Lógica de negócio: 90%+
- Utils: 80%+

## Deploy

**Plataforma:** Railway via GitHub Actions

**CI/CD Pipeline (.github/workflows/):**
1. `ci.yml`: lint → typecheck → test (com PostgreSQL/Redis) → build
2. `deploy.yml`: Deploy para Railway (API e Web separados)

**Trigger:** Push para `main` = deploy automático

**Docker Local:**
- PostgreSQL 17-alpine com health checks
- Redis 7-alpine com health checks
- Volumes nomeados: postgres_data, redis_data

**Docker Produção:**
- Base image: `oven/bun:1-alpine`
- Multi-stage build configurado
- Variáveis de ambiente via Railway dashboard

## Pós-Push: Verificação de CI

**OBRIGATÓRIO:** Após todo `git push`, SEMPRE executar:

1. Aguardar ~60s para o workflow iniciar
2. Verificar status: `gh run list --limit 1 --json status,conclusion,name,databaseId`
3. Se status = `in_progress`, aguardar com: `gh run watch <id>`
4. Se conclusion = `failure`:
   - Ler logs: `gh run view <id> --log-failed`
   - Analisar erros e criar plano de correção
   - Apresentar plano ao usuário e aguardar aprovação
   - Implementar fix, rodar testes locais, push novamente
   - Repetir verificação até CI passar
5. Se conclusion = `success`, informar ao usuário que CI passou

## Checklist de Verificação

Antes de fazer commit/PR, verifique:

**Build & Quality:**
- [ ] `bun lint` passa sem erros
- [ ] `bun typecheck` passa sem erros
- [ ] `bun test` passa sem erros
- [ ] Coverage mínimo 80% (configurado em bunfig.toml)
- [ ] `bun build` compila com sucesso

**Código:**
- [ ] TypeScript strict (sem `any`)
- [ ] Inputs validados com Zod
- [ ] Respostas API usam helpers de `response.ts`
- [ ] Componentes usam shadcn/ui (tema Azul)
- [ ] Logging usa Pino (não console.log em produção)

**Segurança:**
- [ ] Middleware de autenticação em rotas protegidas
- [ ] Validação de permissões implementada
- [ ] Sem dados sensíveis em logs/commits
- [ ] Variáveis de ambiente não commitadas
- [ ] Campos sensíveis redatados nos logs

**Database:**
- [ ] Migrations criadas e testadas
- [ ] Indexes adicionados para queries frequentes
- [ ] Queries otimizadas (sem N+1)

**Frontend:**
- [ ] ErrorBoundary configurado
- [ ] API client tipado usado (sem hardcoded URLs)
- [ ] UI usa skill `frontend-design` quando necessário

**Dependências:**
- [ ] Instaladas com `bun add` (NÃO npm/yarn)
- [ ] Versões compatíveis
- [ ] Lock file (`bun.lockb`) atualizado
