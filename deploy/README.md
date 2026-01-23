# Anna - Deploy On-Premises (Docker)

Deploy completo em 3 containers: **app** (API + Web + Workers), **postgres**, **redis**.

## Pre-requisitos

- Docker 24+ com Compose v2
- 2 GB RAM minimo
- Portas 80 (ou configuravel via APP_PORT)

## Quick Start

```bash
cd deploy

# 1. Configurar variaveis
cp .env.example .env
# Edite .env com suas credenciais

# 2. Build e start
docker compose build
docker compose up -d

# 3. Verificar
docker compose ps
curl http://localhost/health/ready
```

## Variaveis de Ambiente

| Variavel | Obrigatorio | Descricao |
|----------|-------------|-----------|
| `POSTGRES_PASSWORD` | Sim | Senha do PostgreSQL |
| `CLERK_PUBLISHABLE_KEY` | Sim | Clerk publishable key |
| `CLERK_SECRET_KEY` | Sim | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Nao | Webhook verification |
| `RESEND_API_KEY` | Nao | Email via Resend |
| `OPENROUTER_API_KEY` | Nao | LLM/AI features |
| `WEB_URL` | Nao | URL publica (default: http://localhost) |
| `API_URL` | Nao | URL da API (default: http://localhost/api) |
| `APP_PORT` | Nao | Porta do host (default: 80) |
| `LOG_LEVEL` | Nao | debug/info/warn/error (default: info) |
| `SENTRY_DSN` | Nao | Error tracking |

## Operacoes

### Logs

```bash
# Todos os servicos
docker compose logs -f

# Apenas app
docker compose logs -f app

# Ultimas 100 linhas
docker compose logs --tail 100 app
```

### Restart

```bash
docker compose restart app
```

### Update (novo deploy)

```bash
git pull
docker compose build app
docker compose up -d app
```

### Backup do banco

```bash
docker compose exec postgres pg_dump -U anna anna > backup_$(date +%Y%m%d).sql
```

### Restore do banco

```bash
docker compose exec -T postgres psql -U anna anna < backup_20250101.sql
```

### Seed (dados de teste)

```bash
docker compose exec app sh -c "cd /app/packages/db && bun run seed.ts"
```

## Portainer

Para importar como Stack no Portainer:

1. Stacks > Add stack
2. Upload ou cole o conteudo de `docker-compose.yml`
3. Configure as environment variables
4. Deploy

**Nota:** Se usar "Repository" no Portainer, configure:
- Repository URL: seu repo git
- Compose path: `deploy/docker-compose.yml`
- Build context: raiz do repo (para que o Dockerfile tenha acesso ao monorepo)

## Arquitetura

```
┌─────────────────────────────────────────┐
│  app (porta 80)                         │
│  ┌─────────┐  ┌─────┐  ┌────────────┐  │
│  │  nginx   │→ │ API │→ │  workers   │  │
│  │ (static  │  │:3000│  │ (bullmq)   │  │
│  │ +proxy)  │  └──┬──┘  └─────┬──────┘  │
│  └─────────┘     │            │          │
└──────────────────┼────────────┼──────────┘
                   │            │
         ┌─────────┘    ┌──────┘
         ▼              ▼
  ┌──────────┐   ┌──────────┐
  │ postgres │   │  redis   │
  │  :5432   │   │  :6379   │
  └──────────┘   └──────────┘
```

- **nginx**: Serve static files + proxy reverso para API em /api
- **API**: Hono server na porta 3000 (bundled)
- **Workers**: BullMQ email + sync workers (rodam de source com Bun)
- **supervisord**: Gerencia os 3 processos dentro do container app

## Troubleshooting

### Container app reiniciando

```bash
# Verificar logs de startup
docker compose logs app | head -50

# Problemas comuns:
# - Database nao acessivel → verificar se postgres esta healthy
# - Migration falhou → verificar DATABASE_URL e schema
# - Porta em uso → alterar APP_PORT no .env
```

### API retornando 502

```bash
# Verificar se API esta rodando dentro do container
docker compose exec app curl http://localhost:3000/health
```

### Health check falhando

```bash
# Testar direto no container
docker compose exec app curl http://localhost/health/ready

# Verificar status dos processos
docker compose exec app supervisorctl status
```

### Migrations nao aplicam

```bash
# Rodar manualmente
docker compose exec app sh -c "cd /app/packages/db && bun drizzle-kit migrate"
```
