## Objetivo

Criar uma área no painel para gerenciar os 3 workflows n8n (`handoff`, `reverse-logistics`, `whatsapp-rag-chatwoot`), permitindo:
- Ver instruções de import (link direto p/ baixar o JSON do repo)
- **Validar** cada workflow (ping no webhook → confirma se está ativo no n8n)
- **Ativar** o "modo conectado" no front (testa de ponta a ponta com payload real)
- Resumo consolidado: status de cada um + último teste

A ativação real (toggle Active) acontece no n8n self-hosted — não há API pública nossa para isso sem credenciais admin do n8n. Então "Ativar" no painel = disparar um payload de teste e marcar como verde se o webhook responder 200.

## Mudanças

### 1. `src/routes/workflows.tsx` (novo)
Página com 3 cards (um por workflow). Cada card mostra:
- Nome, path do webhook, descrição curta
- Status badge: `desconhecido` / `ok` / `falhou` / `não configurado` (quando a env var está vazia)
- Botão **Validar** → chama health-check (HEAD/POST com payload mínimo `{ ping: true }`)
- Botão **Testar com payload real** → dispara via `n8nService` (handoff/reverse) ou payload mock para o whatsapp
- Link "Baixar JSON" (download do arquivo de `n8n-workflows/`)
- Última resposta (status + body truncado) num `<pre>`

Topo da página: card-resumo "X de 3 conectados" + botão "Validar todos".

### 2. `src/services/n8nService.ts` (estender)
Adicionar:
- `WHATSAPP` env (`VITE_N8N_WEBHOOK_WHATSAPP`) com fallback derivado de `VITE_N8N_BASE_URL` se existir
- `validateWebhook(url)` → POST `{ ping: true, source: "host-ai-concierge" }`, retorna `{ ok, status, body, ms }`
- `triggerWhatsappTest(payload)` → simula MESSAGES_UPSERT da Evolution
- Exportar mapa `WORKFLOWS` com `{ key, label, url, description, jsonPath }` para a UI iterar

### 3. `src/components/app-sidebar.tsx`
Adicionar item "Workflows" (ícone `Workflow` do lucide) apontando p/ `/workflows`.

### 4. Copiar JSONs para `public/n8n/` (download)
Para o link "Baixar JSON" funcionar no app publicado, copiar `handoff.json`, `reverse-logistics.json`, `whatsapp-rag-chatwoot.json` para `public/n8n/`. Acesso via `/n8n/handoff.json`.

## Detalhes técnicos

- Estado local (`useState`) por card guarda último resultado; sem persistência (próximo refresh re-valida).
- Sem mutação no backend nosso — apenas chamadas HTTP aos webhooks n8n.
- CORS: webhooks n8n por padrão respondem com `*`. Se falhar por CORS, mostrar mensagem clara orientando habilitar `N8N_CORS_ALLOW_ORIGIN` no `.env` do n8n.
- Não toca em `routeTree.gen.ts` (auto-gerado pelo plugin Vite).
- Reaproveita componentes existentes (`Card`, `Button`, `Badge`, `sonner` para toasts).

## Fora de escopo

- Login/admin no n8n via API (exige API key do n8n; pode virar Passo 2 se quiser)
- Import automático dos JSONs no n8n (mesma razão acima)
- Persistência de histórico de validações
