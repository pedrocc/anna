# Instruções para Claude Code

## Regra #1: Bun Obrigatório
Este projeto usa **exclusivamente Bun** para:
- **Runtime**: `bun run src/index.ts`
- **Package Manager**: `bun install`, `bun add`
- **Bundler**: `bun build`
- **Test Runner**: `bun test`

**PROIBIDO:** Node.js, npm, yarn, pnpm, Vite, esbuild, Webpack, Jest, Vitest.

## Sobre este Projeto
Template de monorepo TypeScript + Bun para aplicações web (API REST + SPA).

## Comandos Principais
```bash
bun dev          # Inicia API + Web em modo desenvolvimento
bun test         # Roda todos os testes (via Bun)
bun build        # Build de produção (via Bun bundler)
bun lint         # Lint + format check (via Biome)
bun db:migrate   # Aplica migrations
bun db:seed      # Popula banco com dados de teste
bun typecheck    # Verifica tipos TypeScript
```

## Estrutura
- `apps/api` — Hono REST API (executado com `bun run`)
- `apps/web` — React SPA (bundled com Bun)
- `packages/*` — Código compartilhado

## Autenticação (Clerk)
- Frontend: usar `<ClerkProvider>`, `<SignIn>`, `<SignUp>`, `<UserButton>`
- Backend: verificar JWT com `@clerk/backend` ou middleware Hono
- Não implementar auth customizado — Clerk gerencia tudo
- Microsoft Entra ID configurado no dashboard Clerk

## Regras de Código
1. TypeScript strict — nunca use `any`
2. Valide inputs com Zod
3. Escreva testes com `bun test` para lógica de negócio
4. Use os componentes de `@repo/ui`
5. Schemas compartilhados ficam em `@repo/shared`

## Padrões de API
- Rotas em `apps/api/src/routes/{domínio}.ts`
- Use OpenAPI decorators do Hono
- Rate limiting já configurado globalmente
- Auth via middleware Clerk (`clerkMiddleware`)

## Padrões de Frontend
- Pages em `apps/web/src/pages/`
- Rotas definidas em `apps/web/src/router.tsx`
- Data fetching com SWR + API client tipado
- Componentes UI de `@repo/ui`
- Build com `bun build` (NÃO Vite)
- Auth UI do Clerk (não criar formulários de login)

## Antes de Implementar
1. Consulte docs via Context7 para a tecnologia em questão
2. Verifique se já existe código similar no projeto
3. Siga os padrões existentes
4. Confirme que está usando Bun (não Node/npm/Vite)

## Adicionar Dependências
```bash
# Correto
bun add pacote
bun add -d pacote-dev

# ERRADO - nunca usar
npm install pacote
yarn add pacote
```

## Testes
```bash
# Rodar todos
bun test

# Rodar específico
bun test apps/api/src/services/user.test.ts

# Com coverage
bun test --coverage
```

## Deploy
Railway via GitHub Actions. Push para `main` = deploy automático.
Dockerfiles usam `oven/bun:1-alpine` como base.
