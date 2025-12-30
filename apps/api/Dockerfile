# =============================================================================
# @repo/api Dockerfile - Produção
# =============================================================================
# Multi-stage build otimizado para Bun + Hono API
# Base: oven/bun:1-alpine (imagem oficial Bun)
# =============================================================================

FROM oven/bun:1-alpine AS base
WORKDIR /app

# =============================================================================
# Stage 1: Instalar dependências
# =============================================================================
FROM base AS deps

# Copiar todos os package.json do workspace para manter consistência com lockfile
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/
COPY packages/jobs/package.json ./packages/jobs/
COPY packages/email/package.json ./packages/email/
COPY tooling/typescript/package.json ./tooling/typescript/
COPY tooling/biome/package.json ./tooling/biome/

# Instalar dependências de produção
RUN bun install --production

# =============================================================================
# Stage 2: Build da aplicação
# =============================================================================
FROM base AS builder

# Copiar node_modules do stage anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar arquivos de configuração
COPY package.json bun.lock tsconfig.json ./
COPY tooling ./tooling

# Copiar packages necessários
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db

# Copiar código da API
COPY apps/api ./apps/api

# Build da API
RUN cd apps/api && bun build src/index.ts --outdir dist --target bun

# =============================================================================
# Stage 3: Imagem de produção
# =============================================================================
FROM base AS runner

ENV NODE_ENV=production

# Criar usuário não-root para segurança
RUN addgroup --system --gid 1001 hono && \
    adduser --system --uid 1001 --ingroup hono hono

# Copiar node_modules de produção
COPY --from=deps /app/node_modules ./node_modules

# Copiar o build da API
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./

# Alterar ownership para o usuário não-root
RUN chown -R hono:hono /app

# Trocar para usuário não-root
USER hono

# Expor porta padrão
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Comando de execução
CMD ["bun", "run", "dist/index.js"]
