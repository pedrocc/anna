# Instruções para Claude Code

## Regra #1: Bun Obrigatório
Este projeto usa **exclusivamente Bun** para:
- **Runtime**: `bun run src/index.ts`
- **Package Manager**: `bun install`, `bun add`
- **Bundler**: `bun build`
- **Test Runner**: `bun test`

**PROIBIDO:** Node.js, npm, yarn, pnpm, Vite, esbuild, Webpack, Jest, Vitest.

## Sobre este Projeto
Template de monorepo TypeScript + Bun para aplicações web (API REST + SPA) com autenticação Clerk, banco PostgreSQL e componentes shadcn/ui.

## Estrutura do Monorepo

```
stack-vdev/
├── apps/
│   ├── api/          # Hono REST API (runtime Bun)
│   └── web/          # React 19 SPA (bundled com Bun)
├── packages/
│   ├── db/           # Drizzle ORM + schemas PostgreSQL
│   ├── shared/       # Types e schemas Zod compartilhados
│   └── ui/           # Componentes shadcn/ui reutilizáveis
└── tooling/
    └── biome/        # Configuração Biome (lint/format)
```

**Workspaces:**
- `@repo/db` - Database schemas e Drizzle client
- `@repo/shared` - Types, schemas Zod, constantes
- `@repo/ui` - Componentes shadcn/ui

## Comandos Principais

```bash
bun dev          # Inicia API + Web em modo desenvolvimento
bun test         # Roda todos os testes (via Bun)
bun build        # Build de produção (via Bun bundler)
bun lint         # Lint + format check (via Biome)
bun db:migrate   # Aplica migrations Drizzle
bun db:seed      # Popula banco com dados de teste
bun typecheck    # Verifica tipos TypeScript
```

## Stack Técnico

**Backend:**
- Hono 4.7+ (framework web)
- Drizzle ORM 0.45+ (PostgreSQL)
- Clerk Backend (autenticação JWT)
- Zod (validação)

**Frontend:**
- React 19
- Wouter (routing - NÃO React Router)
- SWR (data fetching)
- shadcn/ui (componentes)
- Tailwind CSS

**Dev Tools:**
- Bun 1.3.5+
- TypeScript 5.8+ (strict mode)
- Biome (lint/format)

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
# apps/api/.env
DATABASE_URL=postgresql://...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# apps/web/.env
CLERK_PUBLISHABLE_KEY=pk_test_...
```

**IMPORTANTE:**
- Nunca commitar `.env` (já no `.gitignore`)
- Usar `.env.example` como template
- Clerk gerencia toda autenticação (não implementar JWT customizado)
- Microsoft Entra ID configurado no dashboard Clerk

## Regras de Código

1. **TypeScript Strict** - NUNCA use `any`
2. **Validação Obrigatória** - Todo input validado com Zod
3. **Testes** - Lógica de negócio DEVE ter testes (`bun test`)
4. **Componentes UI** - Use EXCLUSIVAMENTE shadcn/ui (tema Red, suporta Light/Dark)
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

### Configuração

- Rate limiting já configurado globalmente
- CORS configurado para ambiente de desenvolvimento
- Error handling global para erros não tratados

## Padrões de Frontend

### Estrutura

```
apps/web/src/
├── components/
│   └── ErrorBoundary.tsx    # Error boundary global
├── pages/                   # Páginas da aplicação
├── lib/
│   └── api-client.ts        # Client API tipado + hooks SWR
├── router.tsx               # Rotas (Wouter)
└── main.tsx                 # Entry point
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
- **Tema:** Red (vermelho como cor primária)
- **Modo:** Light/Dark (suporta ambos via ThemeProvider)
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
2. Mantenha consistência com tema Red
3. Suporte aos modos Light e Dark via ThemeProvider
4. Use classes Tailwind dark: para variantes de tema

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

- Build com `bun build` (NÃO Vite)
- Tailwind compilado automaticamente no build
- HMR configurado para desenvolvimento

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
3. Mantém consistência com shadcn/ui tema Red
4. Produz código otimizado e bem estruturado
5. Suporta modos Light e Dark corretamente

**Após usar a skill:**
- Implementar usando componentes shadcn/ui
- Manter tema Red e modo Light
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

**Workflow:**
1. Push para `main` = deploy automático
2. CI/CD roda: lint → typecheck → test → build
3. Se passar, deploy para Railway

**Docker:**
- Base image: `oven/bun:1-alpine`
- Multi-stage build configurado
- Variáveis de ambiente via Railway dashboard

## Checklist de Verificação

Antes de fazer commit/PR, verifique:

**Build & Quality:**
- [ ] `bun lint` passa sem erros
- [ ] `bun typecheck` passa sem erros
- [ ] `bun test` passa sem erros (coverage adequado)
- [ ] `bun build` compila com sucesso

**Código:**
- [ ] TypeScript strict (sem `any`)
- [ ] Inputs validados com Zod
- [ ] Respostas API usam helpers de `response.ts`
- [ ] Componentes usam shadcn/ui (tema Red, suporta Light/Dark)

**Segurança:**
- [ ] Middleware de autenticação em rotas protegidas
- [ ] Validação de permissões implementada
- [ ] Sem dados sensíveis em logs/commits
- [ ] Variáveis de ambiente não commitadas

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
