# Anfitrião — Infra (VPS)

Stack Docker completa: **Chatwoot + Dify + n8n + Evolution API + Postgres + Redis + Caddy** (TLS automático).

```
infra/
├── docker-compose.yml      Stack completa
├── .env.example            Variáveis (copie para .env)
├── caddy/Caddyfile         Reverse proxy + TLS
├── chatwoot/cors-setup.rb  Libera origins do front
├── dify/.env.dify.example  Overrides opcionais
├── evolution/              Script de bootstrap WhatsApp
└── scripts/                bootstrap | backup | validate
```

## Pré-requisitos

- VPS Linux (Ubuntu 22.04+) com **2 vCPU / 4 GB RAM** mínimo (8 GB recomendado).
- Domínio próprio com 4 subdomínios apontando (A record) para o IP da VPS:
  - `chatwoot.suaempresa.com.br`
  - `dify.suaempresa.com.br`
  - `n8n.suaempresa.com.br`
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
echo "N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"
echo "REDIS_PASSWORD=$(openssl rand -base64 24)"
echo "EVOLUTION_API_KEY=$(openssl rand -hex 24)"
```

### 2. Subir a stack

```bash
bash scripts/bootstrap.sh
```

O script instala Docker (se faltar), valida o `.env`, sobe os containers e roda
o `db:chatwoot_prepare`.

### 3. Configurar Chatwoot

1. Acesse `https://chatwoot.suaempresa.com.br` → crie a conta admin.
2. **Profile Settings → Access Token** → copie e cole na Vercel como
   `VITE_CHATWOOT_USER_TOKEN`.
3. **Settings → Inboxes → Add → API channel** → copie:
   - `Inbox ID` → `VITE_CHATWOOT_INBOX_ID`
   - `inbox_identifier` → use no widget/integração.
4. Liberar CORS para o front:
   ```bash
   docker compose cp chatwoot/cors-setup.rb chatwoot-rails:/app/cors-setup.rb
   docker compose exec chatwoot-rails bundle exec rails runner /app/cors-setup.rb
   ```

### 4. Configurar Dify

1. Acesse `https://dify.suaempresa.com.br` → crie conta admin.
2. **Knowledge → Create** → vazia → copie o **Dataset ID** → Vercel
   `VITE_DIFY_DATASET_ID`.
3. **Settings → API Keys** → gere **App API Key** + **Dataset API Key** →
   Vercel `VITE_DIFY_API_KEY`.

### 5. Importar workflows n8n

1. Acesse `https://n8n.suaempresa.com.br` (basic auth do `.env`).
2. **Import from File** → importe os 3 JSONs em `../n8n-workflows/`:
   - `whatsapp-rag-chatwoot.json`
   - `handoff.json`
   - `reverse-logistics.json`
3. Preencha as variáveis listadas no README de `n8n-workflows/`.
4. **Active** os 3 workflows. Copie a URL pública de cada webhook → Vercel
   (`VITE_N8N_WEBHOOK_HANDOFF`, `VITE_N8N_WEBHOOK_REVERSE_LOGISTICS`).

### 6. Conectar WhatsApp (Evolution)

```bash
export $(grep -v '^#' .env | xargs)
bash evolution/create-instance.sh
```

Escaneie o QR no WhatsApp → Aparelhos conectados. O webhook já fica
registrado em `https://n8n.suaempresa.com.br/webhook/whatsapp-rag`.

### 7. Validar

```bash
bash scripts/validate.sh
```

Saída esperada: `Resultado: 6 passou / 0 falhou`.

## Backup

Agende no cron:

```cron
0 3 * * * /opt/anfitriao/infra/scripts/backup.sh >> /var/log/anfitriao-backup.log 2>&1
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
| Webhook n8n 404 | Workflow não está **Active** |
| Evo "instance not found" | Rode `evolution/create-instance.sh` de novo |
