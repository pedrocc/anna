# =============================================================================
# @repo/web Dockerfile - Produção
# =============================================================================
# Multi-stage build: Bun para build, nginx para servir
# Gera SPA React otimizado e serve com nginx Alpine
# =============================================================================

# =============================================================================
# Stage 1: Build com Bun
# =============================================================================
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copiar arquivos de configuração do workspace
COPY package.json bun.lock tsconfig.json ./
COPY tooling ./tooling

# Copiar todos os package.json do workspace para manter consistência com lockfile
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/
COPY packages/jobs/package.json ./packages/jobs/
COPY packages/email/package.json ./packages/email/

# Instalar todas as dependências (incluindo devDependencies para build)
RUN bun install

# Copiar código fonte dos packages
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui

# Copiar código fonte da aplicação web
COPY apps/web ./apps/web

# Variáveis de ambiente para o build (passadas via --build-arg)
ARG CLERK_PUBLISHABLE_KEY
ARG API_URL
ARG SENTRY_DSN

ENV CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY
ENV API_URL=$API_URL
ENV SENTRY_DSN=$SENTRY_DSN

# Executar o build
RUN cd apps/web && bun run build.ts

# =============================================================================
# Stage 2: Servir com nginx
# =============================================================================
FROM nginx:1.27-alpine AS runner

# Remover configuração padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar configuração customizada do nginx
COPY apps/web/nginx.conf /etc/nginx/nginx.conf

# Copiar arquivos buildados
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Criar usuário não-root (nginx já roda como nginx user)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Expor porta 80
EXPOSE 80

# Switch to non-root user
USER nginx

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Comando de execução
CMD ["nginx", "-g", "daemon off;"]
