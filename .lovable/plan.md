## Contexto importante (corrigindo o guia que você colou)

O guia genérico que você colou foi escrito para um projeto Vercel padrão. **Este projeto já está pronto** — eu não preciso reescrever os services. Dois pontos críticos:

1. **Não estamos na Vercel.** Estamos no Lovable Cloud (domínio `anfitriao.app.br`). Variáveis `VITE_*` são configuradas em **Lovable → Project Settings → Environment Variables** (ou via secrets), não na Vercel.
2. **Os nomes das variáveis no guia colado estão ERRADOS** para este código. O código em `src/services/*` já existe, já chama as APIs reais, e espera nomes específicos. Se você usar os nomes do guia (ex.: `VITE_DIFY_API_URL`, `VITE_CHATWOOT_TOKEN`, `VITE_N8N_WEBHOOK_URL`), nada vai conectar — vai continuar em modo MOCK.

## Nomes corretos que o código espera

| Serviço | Variável correta (este projeto) | Variável errada (guia colado) |
|---|---|---|
| Chatwoot URL | `VITE_CHATWOOT_URL` | ✓ igual |
| Chatwoot token | `VITE_CHATWOOT_USER_TOKEN` | ❌ `VITE_CHATWOOT_TOKEN` |
| Chatwoot account | `VITE_CHATWOOT_ACCOUNT_ID` | (faltando) |
| Chatwoot inbox | `VITE_CHATWOOT_INBOX_ID` | (faltando) |
| Chatwoot pubsub | `VITE_CHATWOOT_PUBSUB_TOKEN` | (faltando) |
| Dify URL | `VITE_DIFY_URL` | ❌ `VITE_DIFY_API_URL` |
| Dify key | `VITE_DIFY_API_KEY` | ✓ igual |
| Dify dataset | `VITE_DIFY_DATASET_ID` | (faltando) |
| n8n handoff | `VITE_N8N_WEBHOOK_HANDOFF` | ❌ `VITE_N8N_WEBHOOK_URL` |
| n8n logística | `VITE_N8N_WEBHOOK_REVERSE_LOGISTICS` | (faltando) |
| n8n token | `VITE_N8N_WEBHOOK_TOKEN` | (opcional) |

Confirmei lendo `src/services/chatwootService.ts`, `difyService.ts` e `n8nService.ts` — todos já têm a integração real implementada com fallback automático para mock quando as variáveis estão ausentes. **Não há código a escrever; só configurar variáveis.**

## Plano de execução (modo Build)

### Passo 1 — Pré-requisito (bloqueante)
Os 4 subdomínios DNS (chatwoot/dify/n8n/evo.anfitriao.app.br) precisam estar resolvendo para o IP da VPS, e o stack Docker (`bash scripts/bootstrap.sh`) precisa estar de pé. Sem isso, qualquer token configurado falha em runtime.

→ **Confirme** que rodou o bootstrap e que `https://chatwoot.anfitriao.app.br` abre.

### Passo 2 — Coletar credenciais na sua VPS
Você precisa pegar 6 valores:

1. **Chatwoot Access Token**: Chatwoot → Profile Settings → Access Token → copiar
2. **Chatwoot Account ID**: número na URL após login (ex: `/app/accounts/1` → `1`)
3. **Chatwoot Inbox ID**: Settings → Inboxes → criar inbox API/Website → copiar ID da URL
4. **Chatwoot PubSub Token**: mesmo Profile Settings → Access Token (serve para ActionCable)
5. **Dify API Key**: Dify → seu App → API Access → copiar Service API Key
6. **Dify Dataset ID**: Dify → Knowledge → seu dataset → Settings → copiar Dataset ID

URLs base (já sabemos):
- `VITE_CHATWOOT_URL=https://chatwoot.anfitriao.app.br`
- `VITE_DIFY_URL=https://dify.anfitriao.app.br`
- `VITE_N8N_WEBHOOK_HANDOFF=https://n8n.anfitriao.app.br/webhook/handoff`
- `VITE_N8N_WEBHOOK_REVERSE_LOGISTICS=https://n8n.anfitriao.app.br/webhook/reverse-logistics`

### Passo 3 — Configurar as variáveis no Lovable
Eu adiciono as 11 variáveis acima como secrets do projeto (você cola os valores quando eu pedir, um por um, em formulário seguro). Como são `VITE_*`, o Lovable as injeta no build.

### Passo 4 — Configurar CORS no Chatwoot (lado VPS)
Editar `infra/chatwoot/cors-setup.rb` para incluir `https://anfitriao.app.br` e `https://host-concierge.lovable.app`, e rodar dentro do container:
```
docker compose exec chatwoot-rails bundle exec rails runner /app/cors-setup.rb
```

### Passo 5 — Validação
Rodar `bash infra/scripts/validate.sh` na VPS — esperar 7/7 verde (Chatwoot up, Dify up, n8n up, Evolution up, webhook handoff, CORS, webhook WhatsApp).

Depois, abrir `https://anfitriao.app.br/inbox` e confirmar que aparecem conversas reais (não os mocks `c1`, `c2`).

### Passo 6 — Importar workflows n8n
Importar os 3 JSONs de `n8n-workflows/` (handoff, reverse-logistics, whatsapp-rag-chatwoot) e ativá-los.

## O que eu preciso de você agora para destravar

**Responda na ordem:**
1. O `bootstrap.sh` já rodou na VPS? `https://chatwoot.anfitriao.app.br` abre a tela de login?
2. Se sim, me confirme que pegou os 6 valores listados no Passo 2 — aí eu inicio a configuração das secrets uma a uma.

Se ainda não rodou o bootstrap, esse é o próximo passo antes de qualquer coisa de API.