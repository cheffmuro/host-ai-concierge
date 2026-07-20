# Host AI Concierge — Infra (VPS)

Stack Docker: **Chatwoot + Dify + Evolution API + Postgres + Redis + Caddy** (TLS automático).

> **Project name Docker:** `host-ai-concierge` — todos os comandos `docker compose` neste repo
> rodam com esse prefixo (`docker compose -p host-ai-concierge ...`). Volumes e rede são
> nomeados como `host-ai-concierge_<nome>`. Path padrão na VPS: `/opt/host-ai-concierge`.

```
infra/
├── docker-compose.yml                   Stack completa (com healthchecks)
├── .env.example                         Variáveis (copie para .env)
├── caddy/Caddyfile                      Reverse proxy + TLS
├── chatwoot/cors-setup.rb               Libera origins do front
├── dify/.env.dify.example               Overrides opcionais
├── evolution/create-instance.sh         Bootstrap WhatsApp
└── scripts/
    ├── bootstrap.sh                     Instalação inicial (Docker + up + db prepare)
    ├── up-and-check.sh                  Sobe stack + valida saúde de todos containers
    ├── validate.sh                      Checks externos (HTTP/CORS)
    └── backup.sh                        Dump diário Postgres + snapshot volumes
```

## Pré-requisitos

- VPS Linux (Ubuntu 22.04+) com **2 vCPU / 4 GB RAM** mínimo (8 GB recomendado).
- Domínio próprio com 3 subdomínios apontando (A record) para o IP da VPS:
  - `chatwoot.suaempresa.com.br`
  - `dify.suaempresa.com.br`
  - `evo.suaempresa.com.br`
- Portas **80** e **443** abertas no firewall.

## Passo a passo

### 1. Configurar variáveis

```bash
cd infra
cp .env.example .env
nano .env
```

Gere os secrets:

```bash
echo "CHATWOOT_SECRET_KEY_BASE=$(openssl rand -hex 64)"
echo "DIFY_SECRET_KEY=$(openssl rand -base64 42)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"
echo "REDIS_PASSWORD=$(openssl rand -base64 24)"
echo "EVOLUTION_API_KEY=$(openssl rand -hex 24)"
```

### 2. Subir a stack

```bash
bash scripts/bootstrap.sh
```

### 3. Configurar Chatwoot

1. Acesse `https://chatwoot.suaempresa.com.br` → crie a conta admin.
2. **Profile Settings → Access Token** → copie para o painel (`/settings/integrations`).
3. **Settings → Inboxes → Add → API channel** → copie `Inbox ID`.
4. Liberar CORS:
   ```bash
   docker compose cp chatwoot/cors-setup.rb chatwoot-rails:/app/cors-setup.rb
   docker compose exec chatwoot-rails bundle exec rails runner /app/cors-setup.rb
   ```

### 4. Configurar Dify

1. Acesse `https://dify.suaempresa.com.br` → crie conta admin.
2. **Knowledge → Create** → vazia → copie o **Dataset ID**.
3. **Settings → API Keys** → gere **App API Key** + **Dataset API Key**.

### 5. Conectar WhatsApp (Evolution)

```bash
export $(grep -v '^#' .env | xargs)
bash evolution/create-instance.sh
```

Escaneie o QR no WhatsApp → Aparelhos conectados. Depois conecte a instância
ao Chatwoot criando um inbox do tipo **API** e apontando a integração
Evolution para o mesmo.

### 6. Validar

```bash
bash scripts/validate.sh
```

## Backup

Agende no cron:

```cron
0 3 * * * /opt/host-ai-concierge/infra/scripts/backup.sh >> /var/log/host-ai-concierge-backup.log 2>&1
```

Mantém 14 dias em `infra/backups/`.

## Atualizações

```bash
cd infra
docker compose pull
docker compose up -d
```

## Resolução de problemas

| Sintoma | Ação |
|---|---|
| Caddy não emite TLS | DNS ainda não propagou — `dig chatwoot.dom` |
| Chatwoot 502 | `docker compose logs chatwoot-rails --tail=200` |
| Dify "missing secret" | `DIFY_SECRET_KEY` vazio no `.env` |
| Evo "instance not found" | Rode `evolution/create-instance.sh` de novo |
