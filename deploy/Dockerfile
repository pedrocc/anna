# =============================================================================
# Anna - Multi-stage Dockerfile for on-premises deployment
# =============================================================================
# Produces a single container with: nginx (static + proxy), API, workers
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM oven/bun:1-alpine AS deps

WORKDIR /app

# Copy workspace structure for install
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/email/package.json ./packages/email/
COPY packages/jobs/package.json ./packages/jobs/
COPY tooling/biome/package.json ./tooling/biome/
COPY tooling/typescript/package.json ./tooling/typescript/

RUN bun install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 2: Build API
# -----------------------------------------------------------------------------
FROM deps AS builder-api

COPY tsconfig.json ./
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY packages/email ./packages/email
COPY packages/jobs ./packages/jobs
COPY apps/api ./apps/api
COPY tooling ./tooling

RUN cd apps/api && bun build src/index.ts --outdir dist --target bun --minify

# -----------------------------------------------------------------------------
# Stage 3: Build Web
# -----------------------------------------------------------------------------
FROM deps AS builder-web

ARG CLERK_PUBLISHABLE_KEY=""
ARG SENTRY_DSN=""

COPY tsconfig.json ./
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui
COPY apps/web ./apps/web
COPY tooling ./tooling

ENV API_URL=
ENV CLERK_PUBLISHABLE_KEY=${CLERK_PUBLISHABLE_KEY}

RUN cd apps/web && bun run build.ts

# -----------------------------------------------------------------------------
# Stage 4: Production Runner
# -----------------------------------------------------------------------------
FROM oven/bun:1-alpine AS runner

RUN apk add --no-cache nginx supervisor curl

WORKDIR /app

# Copy workspace structure for runtime (workers need it)
COPY package.json bun.lock ./
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/email/package.json ./packages/email/
COPY packages/jobs/package.json ./packages/jobs/
COPY tooling/typescript/package.json ./tooling/typescript/
# Additional packages needed for lockfile consistency
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY tooling/biome/package.json ./tooling/biome/

# Install production dependencies
RUN bun install --frozen-lockfile --production

# Copy source packages needed at runtime (workers run from source)
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared
COPY packages/email ./packages/email
COPY packages/jobs ./packages/jobs
COPY tooling/typescript ./tooling/typescript
COPY tsconfig.json ./

# Install drizzle-kit for migrations
RUN cd packages/db && bun add -d drizzle-kit

# Copy API build output
COPY --from=builder-api /app/apps/api/dist ./apps/api/dist

# Copy Web build output to nginx html dir
COPY --from=builder-web /app/apps/web/dist /usr/share/nginx/html

# Copy deploy configurations
COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY deploy/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY deploy/entrypoint.sh /app/deploy/entrypoint.sh
RUN chmod +x /app/deploy/entrypoint.sh

# Create nginx directories
RUN mkdir -p /var/log/nginx /var/lib/nginx/tmp /run/nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost/health/ready || exit 1

ENTRYPOINT ["/app/deploy/entrypoint.sh"]
