## Objetivo
Versionar toda a infraestrutura da VPS dentro do repo (em `infra/`), para que ao conectar `cheffmuro/host-ai-concierge` ao GitHub o repositório tenha **front + workflows n8n + stack Docker completa** num único lugar.

## Estrutura a criar

```text
infra/
├── README.md                  # Passo a passo de bootstrap da VPS
├── docker-compose.yml         # Stack completa (Chatwoot, Dify, n8n, Evolution, Postgres, Redis, Caddy)
├── .env.example               # Todas as variáveis da stack (sem secrets)
├── .gitignore                 # Ignora .env real, volumes/, backups/
├── caddy/
│   └── Caddyfile              # Reverse proxy + TLS automático para os subdomínios
├── chatwoot/
│   └── cors-setup.rb          # Script rails runner p/ liberar origins do front
├── dify/
│   └── .env.dify.example      # Overrides específicos do Dify (CORS, storage)
├── evolution/
│   └── create-instance.sh     # curl pronto p/ criar instância + registrar webhook do n8n
└── scripts/
    ├── bootstrap.sh           # Instala docker, cria rede, sobe stack
    ├── backup.sh              # Dump diário Postgres + volumes Redis
    └── validate.sh            # 6 checks (Chatwoot up, Dify up, n8n up, Evo up, webhook OK, CORS OK)
```

## Conteúdo de cada arquivo

### `infra/docker-compose.yml`
Serviços com healthchecks, volumes nomeados, rede `host-ai-concierge_net`:
- `postgres` (compartilhado por Chatwoot + Dify + n8n, com 3 DBs separados via init script)
- `redis` (compartilhado)
- `chatwoot-rails` + `chatwoot-sidekiq` (imagem `chatwoot/chatwoot:latest`)
- `dify-api`, `dify-worker`, `dify-web`, `dify-sandbox` (imagens `langgenius/dify-*`)
- `n8n` (imagem `n8nio/n8n:latest`, com volume p/ workflows)
- `evolution` (imagem `atendai/evolution-api:latest`)
- `caddy` (reverse proxy, expõe 80/443)

Cada serviço lê env do `.env` raiz (referenciado por `${VAR}`).

### `infra/.env.example`
Lista comentada de todas as variáveis (host base, secret keys, JWT, SMTP, S3 opcional, tokens). Espelha o que o `docker-compose.yml` consome — usuário copia para `.env`, preenche e sobe.

### `infra/caddy/Caddyfile`
4 blocos: `chatwoot.suaempresa.com.br`, `dify.suaempresa.com.br`, `n8n.suaempresa.com.br`, `evo.suaempresa.com.br` — cada um com `reverse_proxy` para o serviço interno e TLS automático via Let's Encrypt.

### `infra/scripts/bootstrap.sh`
1. Instala Docker + compose plugin (apt)
2. Cria diretórios de volume
3. Valida `.env` (checa variáveis obrigatórias)
4. `docker compose up -d`
5. Aguarda Chatwoot subir e roda `db:chatwoot_prepare`

### `infra/scripts/validate.sh`
6 checks com `curl` e exit code != 0 em qualquer falha:
1. `GET https://chatwoot.../api` → 200
2. `GET https://dify.../console/api` → 200/401 (autenticação ok = serviço up)
3. `GET https://n8n.../healthz` → 200
4. `GET https://evo.../instance/fetchInstances` → 200
5. `POST` no webhook do n8n com payload mock → 200
6. `OPTIONS` no Chatwoot com `Origin: https://host-ai-concierge.vercel.app` → header `Access-Control-Allow-Origin` presente

### `infra/README.md`
Passo a passo curto:
1. `cp .env.example .env && nano .env`
2. Apontar DNS A dos 4 subdomínios para o IP da VPS
3. `bash scripts/bootstrap.sh`
4. Gerar token Chatwoot (Profile → Access Token) e popular `VITE_CHATWOOT_USER_TOKEN` na Vercel
5. Criar inbox Evolution → copiar `inbox_identifier`
6. Importar workflows de `../n8n-workflows/` no n8n
7. `bash evolution/create-instance.sh`
8. `bash scripts/validate.sh`

## Atualização no repo

- **`.gitignore` raiz**: adicionar `infra/.env`, `infra/volumes/`, `infra/backups/`
- **`README.md` raiz** (se existir; caso contrário, criar): seção “Estrutura” explicando que o front fica em `src/`, workflows em `n8n-workflows/`, stack VPS em `infra/`
- **`.lovable/plan.md`**: registrar entrada “infra versionada”

## Não-objetivos

- Não toco no código do front nesta tarefa (handover state, realtime status e UX de erro continuam pendentes — abordamos depois)
- Não publico imagens Docker próprias (uso só imagens oficiais)
- Não configuro CI/CD (GitHub Actions) — fica para um próximo passo se você quiser
- Sem mudanças em DB / nem novas dependências npm

## Após aprovar
Crio os arquivos, então você:
1. Conecta o repo `cheffmuro/host-ai-concierge` (Connectors → GitHub → Connect project)
2. Faz `git pull` na VPS dentro de `infra/` para subir a stack

---

## Entrada: infra versionada (concluída)

Toda a stack VPS foi movida para `infra/` no repo:
- `docker-compose.yml` (Chatwoot + Dify + n8n + Evolution + Postgres + Redis + Caddy)
- `.env.example` + `.gitignore` (segredos fora do git)
- `caddy/Caddyfile` (TLS automático)
- `chatwoot/cors-setup.rb`, `evolution/create-instance.sh`
- `scripts/bootstrap.sh | backup.sh | validate.sh | init-multi-db.sh`
- `README.md` com passo a passo completo

`README.md` raiz e `.gitignore` raiz atualizados.
