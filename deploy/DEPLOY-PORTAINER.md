# Deploy do Anna via Portainer (On-Premises)

Guia passo-a-passo para subir a aplicação Anna usando Portainer em um servidor local.

## O que é o Anna

Anna é uma plataforma de gestão de projetos e requisitos com inteligência artificial. Ela permite criar briefings, documentos de requisitos (PRD), gerenciar sprints e histórias, tudo com assistência de IA via chat em tempo real.

## O que você vai precisar

Antes de começar, confirme que você tem:

- **Servidor com Docker** instalado (versão 24 ou superior)
- **Portainer** rodando e acessível via browser (versão 2.x)
- **Código-fonte do projeto** (acesso ao repositório git)
- **Conta no Clerk** para autenticação (https://clerk.com)
- **2 GB de RAM** disponível no mínimo
- **(Opcional)** Chave de API do Resend para envio de emails
- **(Opcional)** Chave de API do OpenRouter para funcionalidades de IA

## Arquitetura simplificada

```
                         ┌─────────────────────────────────────────┐
                         │  Container: app (porta 80)              │
                         │                                         │
  Browser ──────────────►│  nginx ──► API (:3000) + Workers        │
                         │  (arquivos     (Hono)    (BullMQ)       │
                         │   estáticos                             │
                         │   + proxy)                              │
                         └────────────────┬───────────┬────────────┘
                                          │           │
                                          ▼           ▼
                                   ┌──────────┐ ┌──────────┐
                                   │ postgres │ │  redis   │
                                   │  :5432   │ │  :6379   │
                                   └──────────┘ └──────────┘
```

**O que cada peça faz:**

- **nginx** — Serve o frontend (arquivos HTML/JS/CSS) e redireciona chamadas `/api` para o backend
- **API** — Servidor backend que processa requisições, autentica usuários e conversa com a IA
- **Workers** — Processam tarefas em segundo plano (emails, sincronização)
- **PostgreSQL** — Banco de dados principal onde ficam os dados da aplicação
- **Redis** — Cache e fila de tarefas para os workers

## Passo 1: Clonar o repositório no servidor

Acesse o terminal do seu servidor e clone o repositório:

```bash
git clone https://github.com/sua-org/anna.git
cd anna
```

> Se o repositório for privado, você vai precisar de uma chave SSH ou token de acesso configurado no servidor.

## Passo 2: Configurar variáveis de ambiente

### 2.1 Criar o arquivo .env

```bash
cd deploy
cp .env.example .env
```

### 2.2 Editar o arquivo .env

Abra o arquivo com seu editor preferido (`nano .env`, `vim .env`, etc.) e preencha cada variável:

---

### Variáveis do banco de dados

| Variável | Obrigatória | Valor padrão | Descrição |
|----------|:-----------:|:------------:|-----------|
| `POSTGRES_USER` | Não | `anna` | Nome do usuário do banco. Pode deixar o padrão. |
| `POSTGRES_PASSWORD` | **Sim** | — | Senha do banco de dados. |
| `POSTGRES_DB` | Não | `anna` | Nome do banco de dados. Pode deixar o padrão. |

**Exemplo:**
```env
POSTGRES_USER=anna
POSTGRES_PASSWORD=mInHaSeNhA_SuP3r_F0rTe_2025!
POSTGRES_DB=anna
```

> **Como gerar uma senha forte:**
> ```bash
> openssl rand -base64 32
> ```
> Copie o resultado e cole como valor de `POSTGRES_PASSWORD`.

---

### Variáveis de autenticação (Clerk)

| Variável | Obrigatória | Descrição |
|----------|:-----------:|-----------|
| `CLERK_PUBLISHABLE_KEY` | **Sim** | Chave pública do Clerk (começa com `pk_live_` ou `pk_test_`) |
| `CLERK_SECRET_KEY` | **Sim** | Chave secreta do Clerk (começa com `sk_live_` ou `sk_test_`) |
| `CLERK_WEBHOOK_SECRET` | Não | Usada para receber notificações do Clerk sobre eventos de usuário |

**Onde encontrar:**

1. Acesse https://dashboard.clerk.com
2. Selecione (ou crie) sua aplicação
3. Vá em **API Keys** no menu lateral
4. Copie a **Publishable key** e a **Secret key**

**Exemplo:**
```env
CLERK_PUBLISHABLE_KEY=pk_live_abc123xyz...
CLERK_SECRET_KEY=sk_live_def456uvw...
CLERK_WEBHOOK_SECRET=whsec_...
```

> Se você não precisa de webhooks agora, pode deixar `CLERK_WEBHOOK_SECRET` em branco.

---

### Variáveis de email (Resend)

| Variável | Obrigatória | Descrição |
|----------|:-----------:|-----------|
| `RESEND_API_KEY` | Não | Chave da API do Resend para envio de emails |

**Onde encontrar:**

1. Acesse https://resend.com/api-keys
2. Crie uma nova API key
3. Copie o valor (começa com `re_`)

**Exemplo:**
```env
RESEND_API_KEY=re_abc123def456...
```

> Se deixar em branco, a aplicação funciona normalmente mas não envia emails.

---

### Variáveis de IA (OpenRouter)

| Variável | Obrigatória | Valor padrão | Descrição |
|----------|:-----------:|:------------:|-----------|
| `OPENROUTER_API_KEY` | Não | — | Chave do OpenRouter para usar modelos de IA |
| `OPENROUTER_DEFAULT_MODEL` | Não | `deepseek/deepseek-v3.2` | Modelo de IA a ser usado |

**Onde encontrar:**

1. Acesse https://openrouter.ai/keys
2. Crie uma nova chave
3. Copie o valor (começa com `sk-or-`)

**Exemplo:**
```env
OPENROUTER_API_KEY=sk-or-v1-abc123...
OPENROUTER_DEFAULT_MODEL=deepseek/deepseek-v3.2
```

> Se deixar em branco, as funcionalidades de chat com IA não vão funcionar, mas o resto da aplicação opera normalmente.

---

### Variáveis de URL

| Variável | Obrigatória | Valor padrão | Descrição |
|----------|:-----------:|:------------:|-----------|
| `WEB_URL` | Não | `http://localhost` | URL pública onde o Anna será acessado |
| `API_URL` | Não | `http://localhost/api` | URL da API (sempre termina com `/api`) |
| `APP_PORT` | Não | `80` | Porta exposta no servidor |

**Exemplo para acesso na rede local:**
```env
WEB_URL=http://192.168.1.100
API_URL=http://192.168.1.100/api
APP_PORT=80
```

**Exemplo com domínio:**
```env
WEB_URL=https://anna.suaempresa.com
API_URL=https://anna.suaempresa.com/api
APP_PORT=80
```

> A `API_URL` deve sempre ser a `WEB_URL` seguida de `/api`. Elas precisam apontar para o mesmo servidor.

> Se a porta 80 já estiver em uso no servidor, altere `APP_PORT` para outra porta (ex: `8080`).

---

### Variáveis de observabilidade

| Variável | Obrigatória | Valor padrão | Descrição |
|----------|:-----------:|:------------:|-----------|
| `LOG_LEVEL` | Não | `info` | Nível de detalhe dos logs (`debug`, `info`, `warn`, `error`) |
| `SENTRY_DSN` | Não | — | URL do Sentry para rastreamento de erros |

**Exemplo:**
```env
LOG_LEVEL=info
SENTRY_DSN=
```

> Para investigar problemas, mude `LOG_LEVEL` para `debug`. Em produção, deixe como `info`.

---

### Resumo: arquivo .env completo

```env
# Database
POSTGRES_USER=anna
POSTGRES_PASSWORD=SUA_SENHA_FORTE_AQUI
POSTGRES_DB=anna

# Clerk (obrigatório)
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=

# Resend (opcional)
RESEND_API_KEY=

# OpenRouter (opcional)
OPENROUTER_API_KEY=
OPENROUTER_DEFAULT_MODEL=deepseek/deepseek-v3.2

# URLs
WEB_URL=http://SEU_IP_OU_DOMINIO
API_URL=http://SEU_IP_OU_DOMINIO/api
APP_PORT=80

# Logs
LOG_LEVEL=info
SENTRY_DSN=
```

## Passo 3: Acessar o Portainer

1. Abra o browser e acesse o Portainer (normalmente em `http://SEU_SERVIDOR:9000` ou `https://SEU_SERVIDOR:9443`)
2. Faça login com suas credenciais
3. Selecione o **Environment** (ambiente) onde deseja fazer o deploy — geralmente é o "local"
4. No menu lateral, clique em **Stacks**

## Passo 4: Criar a Stack no Portainer

Clique no botão **"+ Add stack"** no canto superior direito.

Dê um nome para a stack: `anna`

Você tem 3 opções para configurar o compose. Escolha uma:

---

### Opção A: Git Repository (Recomendada)

Esta opção permite que o Portainer baixe o código direto do repositório e faça o build automaticamente.

1. Em **Build method**, selecione **Repository**
2. Preencha:
   - **Repository URL:** URL do seu repositório (ex: `https://github.com/sua-org/anna.git`)
   - **Repository reference:** `refs/heads/main` (para usar a branch main)
   - **Compose path:** `deploy/docker-compose.yml`
   - Se o repo for privado, marque **Authentication** e preencha usuário/token
3. Marque a opção **"Enable relative path volumes"** se disponível

> **Por que esta é a melhor opção?** Porque o Portainer consegue baixar o código, fazer o build da imagem Docker e criar os containers tudo automaticamente. Para atualizar no futuro, basta clicar em "Pull and redeploy".

---

### Opção B: Upload

Se preferir enviar o arquivo do seu computador:

1. Em **Build method**, selecione **Upload**
2. Clique em **"Select file"** e selecione o arquivo `deploy/docker-compose.yml`

> Esta opção **não funciona** para o nosso caso porque o Dockerfile precisa do contexto do monorepo (todo o código-fonte). Use apenas se já tiver a imagem Docker em um registry.

---

### Opção C: Web editor

Se quiser colar o conteúdo manualmente:

1. Em **Build method**, selecione **Web editor**
2. Cole o conteúdo do arquivo `deploy/docker-compose.yml`:

```yaml
services:
  app:
    build:
      context: ..
      dockerfile: deploy/Dockerfile
      args:
        - CLERK_PUBLISHABLE_KEY=${CLERK_PUBLISHABLE_KEY}
        - SENTRY_DSN=${SENTRY_DSN:-}
    ports:
      - "${APP_PORT:-80}:80"
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER:-anna}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-anna}
      - REDIS_URL=redis://redis:6379
      - CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
      - CLERK_PUBLISHABLE_KEY=${CLERK_PUBLISHABLE_KEY}
      - CLERK_WEBHOOK_SECRET=${CLERK_WEBHOOK_SECRET:-}
      - RESEND_API_KEY=${RESEND_API_KEY:-}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-}
      - OPENROUTER_DEFAULT_MODEL=${OPENROUTER_DEFAULT_MODEL:-deepseek/deepseek-v3.2}
      - WEB_URL=${WEB_URL:-http://localhost}
      - API_URL=${API_URL:-http://localhost/api}
      - TRUST_ALL_PROXIES=true
      - PORT=3000
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - SENTRY_DSN=${SENTRY_DSN:-}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health/ready"]
      interval: 30s
      timeout: 5s
      start_period: 60s
      retries: 3

  postgres:
    image: postgres:17-alpine
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-anna}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB:-anna}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-anna}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    name: anna_network
```

> A Opção C só funciona se o build da imagem for feito antes e ela estiver em um registry. Para build a partir do código-fonte, use a Opção A.

---

### Configurar variáveis de ambiente no Portainer

Independente da opção escolhida, role a página para baixo até a seção **"Environment variables"**.

Você pode:
- **Opção 1 (recomendada):** Clicar em **"Load variables from .env file"** e fazer upload do seu arquivo `.env`
- **Opção 2:** Adicionar manualmente cada variável clicando em **"+ Add an environment variable"**

Variáveis **obrigatórias** que precisam estar configuradas:

| Nome | Exemplo |
|------|---------|
| `POSTGRES_PASSWORD` | `mInHaSeNhA_SuP3r_F0rTe_2025!` |
| `CLERK_PUBLISHABLE_KEY` | `pk_live_abc123...` |
| `CLERK_SECRET_KEY` | `sk_live_def456...` |

## Passo 5: Build e Deploy

1. Revise tudo e clique em **"Deploy the stack"**
2. O Portainer vai iniciar o processo de build

**O que acontece internamente:**

1. O Docker baixa a imagem base (`oven/bun:1-alpine`)
2. Instala as dependências do projeto (`bun install`)
3. Compila o backend (API) em um bundle otimizado
4. Compila o frontend (React) em arquivos estáticos
5. Monta a imagem final com nginx, API compilada e frontend
6. Inicia os containers: postgres e redis primeiro, depois o app
7. O container app roda as migrations do banco de dados
8. Inicia nginx, API e workers via supervisord

> O primeiro build leva de 3 a 5 minutos, dependendo da velocidade do servidor e da internet. Builds subsequentes são mais rápidos graças ao cache do Docker.

## Passo 6: Verificar que está funcionando

### 6.1 Verificar status dos containers

No Portainer, vá em **Containers** no menu lateral. Você deve ver 3 containers:

| Container | Status esperado |
|-----------|----------------|
| `anna-app-1` | Running (healthy) |
| `anna-postgres-1` | Running (healthy) |
| `anna-redis-1` | Running (healthy) |

> O container `app` pode mostrar "starting" nos primeiros 60 segundos enquanto faz as migrations e inicia os serviços. Isso é normal.

### 6.2 Verificar health check

Acesse no browser ou via curl:

```bash
curl http://SEU_SERVIDOR/health/ready
```

Resposta esperada:
```json
{"status":"ready","database":"connected"}
```

### 6.3 Ver logs no Portainer

1. Clique no container `anna-app-1`
2. Clique no ícone de **Logs** (ícone de documento no topo)
3. Marque **"Auto-refresh logs"** para acompanhar em tempo real

**Logs de sucesso esperados:**

```
=== Anna Deploy: Starting ===
Waiting for database...
Migration attempt 1/30...
Migrations applied successfully.
=== Anna Deploy: Starting services ===
```

Seguido de mensagens do supervisord iniciando nginx, API e worker.

## Passo 7: Acessar a aplicação

1. Abra o browser e acesse a URL configurada em `WEB_URL` (ex: `http://192.168.1.100` ou `http://anna.suaempresa.com`)
2. Você verá a tela de login do Clerk
3. Faça login com as credenciais configuradas no seu dashboard Clerk

> Se estiver usando Clerk em modo de teste (`pk_test_`), qualquer email pode ser usado para criar uma conta de teste.

> Se configurou Microsoft Entra ID no Clerk, o botão de login corporativo aparecerá automaticamente.

## Atualizando a aplicação

Quando houver uma nova versão do Anna:

### Via Portainer (Opção A - Git Repository)

1. Vá em **Stacks** > clique na stack `anna`
2. Clique em **"Pull and redeploy"**
3. Marque **"Re-pull image and redeploy"**
4. Clique em **"Update"**

### Via terminal

```bash
cd anna
git pull origin main
cd deploy
docker compose build app
docker compose up -d app
```

> As migrations do banco de dados são aplicadas automaticamente a cada reinício do container app. Você não precisa rodar nada manualmente.

## Troubleshooting

### Container app reiniciando em loop

**Sintoma:** O container `anna-app-1` fica alternando entre "running" e "restarting".

**Causas mais comuns:**

1. **Banco de dados não conecta**
   - Verifique se o container `anna-postgres-1` está "healthy"
   - Verifique se `POSTGRES_PASSWORD` está igual no `.env`
   - Veja os logs: o entrypoint tenta 30 vezes antes de desistir

2. **Variável obrigatória faltando**
   - Verifique se `CLERK_SECRET_KEY` e `CLERK_PUBLISHABLE_KEY` estão configuradas
   - Sem elas, a API não consegue iniciar

3. **Porta já em uso**
   - Se algo já usa a porta 80 no servidor, altere `APP_PORT` para outra (ex: `8080`)

**Como investigar:**
```bash
# Ver logs do container
docker compose logs app --tail 50

# Ver se postgres está pronto
docker compose exec postgres pg_isready -U anna
```

---

### 502 Bad Gateway

**Sintoma:** O browser mostra "502 Bad Gateway" ao acessar a URL.

**Causa:** O nginx está rodando mas a API ainda não está pronta.

**Soluções:**

1. Aguarde 30-60 segundos — a API pode estar iniciando
2. Verifique se a API está rodando dentro do container:
   ```bash
   docker compose exec app curl http://localhost:3000/health
   ```
3. Se retornar erro, veja os logs da API:
   ```bash
   docker compose logs app | grep -i "error"
   ```

---

### Migrations falhando

**Sintoma:** Nos logs aparece "ERROR: Database not ready after 30 attempts. Exiting."

**Causas:**

1. **PostgreSQL não iniciou** — verifique se o container postgres está healthy
2. **Senha incorreta** — confira `POSTGRES_PASSWORD` no `.env`
3. **Schema incompatível** — se atualizou de uma versão muito antiga, pode precisar de migrations manuais

**Solução manual:**
```bash
# Rodar migrations manualmente
docker compose exec app sh -c "cd /app/packages/db && bun drizzle-kit migrate"
```

---

### Health check failing

**Sintoma:** O container mostra status "unhealthy" no Portainer.

**Investigação:**
```bash
# Testar o health check manualmente
docker compose exec app curl http://localhost/health/ready

# Ver status dos processos internos
docker compose exec app supervisorctl status
```

**Resultado esperado do supervisorctl:**
```
api        RUNNING   pid 12, uptime 0:05:00
nginx      RUNNING   pid 14, uptime 0:05:00
worker     RUNNING   pid 13, uptime 0:05:00
```

Se algum processo mostra `FATAL` ou `STOPPED`, veja os logs específicos:
```bash
docker compose logs app | grep -i "fatal\|error\|failed"
```

---

### Clerk não funciona (login não aparece ou dá erro)

**Sintomas:**
- Tela branca no login
- Erro "Invalid publishable key"
- Redirecionamento infinito após login

**Soluções:**

1. **Verifique as chaves:** `CLERK_PUBLISHABLE_KEY` deve começar com `pk_live_` (produção) ou `pk_test_` (teste)

2. **Configure as URLs no dashboard Clerk:**
   - Acesse https://dashboard.clerk.com > sua app > **Paths**
   - Adicione sua URL (`http://SEU_SERVIDOR` ou `https://anna.suaempresa.com`) como domínio permitido

3. **WEB_URL deve bater com o Clerk:**
   - A URL configurada em `WEB_URL` no `.env` precisa ser a mesma registrada no Clerk

4. **Rebuild após alterar CLERK_PUBLISHABLE_KEY:**
   - Esta variável é embutida no frontend durante o build
   - Se alterou, precisa rebuildar: `docker compose build app && docker compose up -d app`

## Backup do banco de dados

### Criar backup

```bash
# Backup completo
docker compose exec postgres pg_dump -U anna anna > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup comprimido (recomendado para bancos grandes)
docker compose exec postgres pg_dump -U anna anna | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restaurar backup

```bash
# Restaurar de .sql
docker compose exec -T postgres psql -U anna anna < backup_20250120_143000.sql

# Restaurar de .sql.gz
gunzip -c backup_20250120_143000.sql.gz | docker compose exec -T postgres psql -U anna anna
```

### Backup automático (cron)

Para backups diários automáticos, adicione ao crontab do servidor:

```bash
crontab -e
```

Adicione a linha:
```
0 2 * * * cd /caminho/para/anna/deploy && docker compose exec -T postgres pg_dump -U anna anna | gzip > /backups/anna_$(date +\%Y\%m\%d).sql.gz
```

> Isso cria um backup comprimido todo dia às 2h da manhã.

## Comandos úteis (referência rápida)

```bash
# ---------- Status ----------
docker compose ps                          # Ver status dos containers
docker compose exec app supervisorctl status  # Ver processos internos

# ---------- Logs ----------
docker compose logs -f                     # Todos os logs em tempo real
docker compose logs -f app                 # Apenas logs do app
docker compose logs --tail 100 app         # Últimas 100 linhas

# ---------- Restart ----------
docker compose restart app                 # Reiniciar apenas o app
docker compose restart                     # Reiniciar tudo

# ---------- Update ----------
git pull origin main                       # Baixar código novo
docker compose build app                   # Rebuildar imagem
docker compose up -d app                   # Subir nova versão

# ---------- Database ----------
docker compose exec postgres psql -U anna anna  # Acessar SQL direto
docker compose exec app sh -c "cd /app/packages/db && bun drizzle-kit migrate"  # Migrations

# ---------- Debug ----------
docker compose exec app curl http://localhost:3000/health  # API direta
docker compose exec app curl http://localhost/health/ready  # Via nginx
docker compose exec app sh                 # Shell dentro do container

# ---------- Limpar ----------
docker compose down                        # Parar tudo (dados preservados)
docker compose down -v                     # Parar e APAGAR dados (cuidado!)
```

> O comando `docker compose down -v` apaga os volumes (banco de dados e Redis). Use apenas se quiser começar do zero.
