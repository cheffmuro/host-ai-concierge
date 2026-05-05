
## Contexto

O rename `anfitriao → host-ai-concierge` já foi aplicado (compose project name, rede, volumes, paths `/opt/`, user Postgres default, webhookIds, origin Vercel). Falta: (1) verificar saúde da nova stack, (2) propagar o novo path em toda a doc, (3) entregar migração 1-clique com rollback, (4) confirmar que o n8n continua funcional após o rename.

Não tenho acesso à VPS — então “verificar se sobe sem erros” vira **um script de bring-up + healthcheck** que o usuário roda na VPS e me reporta o resultado, mais um aviso explícito do que pode quebrar.

---

## 1. Healthcheck da nova stack (`infra/scripts/up-and-check.sh`)

Script novo que:
1. `docker compose config -q` (valida YAML/env antes de subir).
2. `docker compose up -d --remove-orphans`.
3. Loop de até 180 s consultando `docker compose ps --format json` — falha se algum serviço terminar em `exited` ou ficar `unhealthy`.
4. Para cada serviço sem healthcheck nativo (dify-web, dify-sandbox, n8n, evolution, caddy), faz um `curl` interno via `docker compose exec caddy wget -qO- http://<svc>:<port>/...` e exige 2xx/3xx/401.
5. Roda `scripts/validate.sh` no final (os 6 checks externos via HTTPS).
6. Em qualquer falha imprime `docker compose logs --tail=80 <svc>` do serviço problemático e sai != 0.

Adiciono também healthchecks explícitos no `docker-compose.yml` para `chatwoot-rails` (`curl -f http://localhost:3000/`), `dify-api` (`/console/api/setup`), `n8n` (`/healthz`) e `evolution` (`/`) para o passo 3 do script ser determinístico.

## 2. Atualizar docs para o novo path/nome

**`README.md` raiz** (linhas 1, 32–33):
- Título mantém “Anfitrião” (marca do produto), adiciono subtítulo `_repo: cheffmuro/host-ai-concierge_`.
- Bloco de clone já está em `/opt/host-ai-concierge` ✅ (verifiquei).

**`infra/README.md`**:
- Trocar título e primeira linha para “**Host AI Concierge** — Infra (VPS)”.
- Adicionar nota destacada: **nome do projeto Docker = `host-ai-concierge`** (`docker compose -p host-ai-concierge ...`) e **prefixo dos volumes/rede = `host-ai-concierge_*`**.
- Cron já aponta para `/opt/host-ai-concierge/...` ✅.
- Webhook do passo 6 está como `/webhook/whatsapp-rag` mas o workflow usa path `whatsapp` → corrigir para `https://n8n.${BASE_DOMAIN}/webhook/whatsapp` (ver seção 4).
- Nova seção **“Migração de stack antiga”** apontando para `scripts/migrate-from-anfitriao.sh` (seção 3).

**`n8n-workflows/README.md`**:
- Título → “Host AI Concierge — n8n Workflows”.
- Renomear os 3 nomes internos dos workflows (chave `name` nos JSONs) de `Anfitriao —` para `Host AI Concierge —`.

**`.lovable/plan.md`**: anexar entrada “rename concluído + migração”.

## 3. Script único de migração (`infra/scripts/migrate-from-anfitriao.sh`)

Migração idempotente, executada na VPS dentro do novo checkout (`/opt/host-ai-concierge/infra`). Fluxo:

```text
[0] Pré-checks
    ├─ Confirma execução (prompt y/N, pode pular com --yes)
    ├─ Verifica .env presente
    └─ Detecta stack antiga: docker compose -p anfitriao ps -q

[1] Backup completo da stack antiga (em backups/migration_<stamp>/)
    ├─ pg_dump dos 3 DBs (chatwoot, dify, n8n) via container postgres antigo
    ├─ tar.gz de cada volume nomeado anfitriao_*  (read-only mount)
    └─ Salva docker compose -p anfitriao config > old-compose.yml (manifesto)

[2] Para a stack antiga sem apagar volumes
    └─ docker compose -p anfitriao stop

[3] Cria volumes novos host-ai-concierge_* e copia dados
    └─ Para cada volume: docker run --rm -v anfitriao_X:/from -v host-ai-concierge_X:/to alpine sh -c 'cp -a /from/. /to/'

[4] Sobe a nova stack
    └─ bash scripts/up-and-check.sh

[5] Valida
    └─ bash scripts/validate.sh  (exit != 0 dispara rollback automático se --auto-rollback)

[6] Imprime instruções finais
    ├─ Como remover a stack antiga: docker compose -p anfitriao down -v
    └─ Como restaurar: bash scripts/migrate-rollback.sh <stamp>
```

Flags: `--yes` (sem prompt), `--auto-rollback` (rollback se passo 5 falhar), `--keep-old` (não remove referência da stack antiga).

**Rollback rápido (`infra/scripts/migrate-rollback.sh`)**:
1. `docker compose -p host-ai-concierge down` (mantém volumes novos).
2. `docker compose -p anfitriao up -d` (reusa volumes antigos intactos).
3. Se `<stamp>` passado e volumes antigos perdidos: restaura tar.gz de `backups/migration_<stamp>/` para `anfitriao_*` antes do up.

Garantias:
- Volumes antigos `anfitriao_*` **nunca** são apagados pelo script — só por comando manual.
- Backup vai para `infra/backups/migration_<stamp>/` (já no `.gitignore`).
- Idempotente: se rodar de novo, detecta volumes novos já populados e pula passo 3.

## 4. Validação dos webhooks/integrações n8n após o rename

Inventário e correções:

| Item | Estado | Ação |
|---|---|---|
| `webhookId` nos 3 JSONs | já como `host-ai-concierge-*` | nada — IDs internos do n8n, irrelevantes para chamadas externas |
| Webhook **path** (`/webhook/whatsapp`, `/webhook/handoff`, `/webhook/reverse-logistics`) | inalterado | nenhuma mudança nas URLs externas — Vercel envs `VITE_N8N_WEBHOOK_*` continuam válidas |
| `WEBHOOK_GLOBAL_URL` no Evolution (`docker-compose.yml`) | aponta para `…/webhook/whatsapp-rag` ❌ | corrigir para `…/webhook/whatsapp` (path real do workflow) |
| `evolution/create-instance.sh` `N8N_WEBHOOK` | aponta para `…/webhook/whatsapp-rag` ❌ | mesma correção |
| `infra/README.md` passo 6 | mesmo erro | mesma correção |
| Nome interno dos workflows (chave `name` nos JSONs) | ainda “Anfitriao —” | renomear para “Host AI Concierge —” (cosmético; não afeta execução) |
| `n8nService.ts` `source: "host-ai-concierge"` | ✅ | nada |
| `outbox` storage key `host-ai-concierge-outbox` | ✅ — porém **invalida outbox local de usuários existentes** | adicionar nota no README + migration shim no Zustand persist (`migrate` callback lendo a key antiga `anfitriao-outbox`) |
| Marca “Anfitrião” na UI (sidebar, títulos, manifest PWA) | mantida | nada |

Adiciono ao final de `validate.sh` um 7º check específico: `POST` em `/webhook/whatsapp` com payload mock da Evolution — confirma que o workflow principal está ativo após o rename.

## Arquivos tocados

Criados:
- `infra/scripts/up-and-check.sh`
- `infra/scripts/migrate-from-anfitriao.sh`
- `infra/scripts/migrate-rollback.sh`

Editados:
- `infra/docker-compose.yml` (healthchecks + corrigir `WEBHOOK_GLOBAL_URL`)
- `infra/evolution/create-instance.sh` (path do webhook)
- `infra/scripts/validate.sh` (+1 check)
- `infra/README.md` (título, nota do project name, seção migração, fix do passo 6)
- `n8n-workflows/README.md` (título)
- `n8n-workflows/whatsapp-rag-chatwoot.json`, `handoff.json`, `reverse-logistics.json` (chave `name`)
- `src/stores/outboxStore.ts` (migrate shim para nome antigo)
- `README.md` raiz (subtítulo com nome do repo)
- `.lovable/plan.md` (entrada da migração)

## Não-objetivos

- Não rodo a stack na VPS (não tenho acesso); entrego scripts auto-validáveis.
- Não mudo o nome do produto “Anfitrião” na UI.
- Não toco no schema dos workflows além de `name` — comportamento permanece idêntico.
- Não reescrevo `bootstrap.sh` (continua válido para instalação inicial; `up-and-check.sh` é a versão idempotente para reuso).

---

## Entrada: rename + migração concluídos

- Compose com healthchecks em `chatwoot-rails`, `dify-api`, `n8n`, `evolution`.
- `WEBHOOK_GLOBAL_URL` da Evolution e `create-instance.sh` agora apontam para `/webhook/whatsapp` (path real).
- `validate.sh` ganhou 7º check (POST mock no webhook do WhatsApp).
- `up-and-check.sh`: sobe stack + valida saúde de todos containers (180s timeout) + roda `validate.sh`.
- `migrate-from-anfitriao.sh`: backup completo (pg_dump + tar volumes) → stop antiga → copy volumes → up nova → validate. Idempotente. Flags `--yes`, `--auto-rollback`.
- `migrate-rollback.sh`: derruba nova, sobe antiga; com `<stamp>` restaura tar.gz dos volumes.
- Outbox store: `onRehydrateStorage` migra payload da chave legada `anfitriao-outbox`.
- Docs (`README.md`, `infra/README.md`, `n8n-workflows/README.md`) atualizadas com novo path/projeto Docker e seção de migração.
