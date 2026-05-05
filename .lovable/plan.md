## Objetivo

Substituir os mocks de `src/services/` por implementações reais (Chatwoot, Dify, n8n) com **fallback automático para mock** quando as variáveis de ambiente não estiverem definidas — assim o preview na Vercel continua funcionando antes da VPS estar no ar. Entregar também o **workflow n8n pronto para importar** e o **`.env.example` do front**.

## Arquivos a alterar / criar

### 1. `src/services/chatwootService.ts` (substituir)
- Lê `VITE_CHATWOOT_URL`, `VITE_CHATWOOT_USER_TOKEN`, `VITE_CHATWOOT_ACCOUNT_ID`, `VITE_CHATWOOT_INBOX_ID`.
- Flag `isLive` decide entre API real e mock.
- Helpers `api(path)`, `headers()`, `http<T>()`.
- Mappers `CwConversation → Conversation`, `CwMessage → Message`, derivando `sentiment` de labels e `aiHandling`/`ltv`/`avg_ticket` de `custom_attributes`.
- `listConversations`: `GET /conversations?status=open&assignee_type=me`.
- `getConversation`: `GET /conversations/:id` + `/messages`.
- `sendMessage`: `POST /conversations/:id/messages` (JSON) ou multipart com `attachments[]` quando houver anexos (faz `fetch(a.url).blob()` para subir blob real do object URL).
- `assignAgent`: `POST /conversations/:id/assignments`.
- `listAutomations`: stub (Chatwoot não expõe nativamente — virá via custom attributes/n8n).

### 2. `src/services/difyService.ts` (substituir)
- Lê `VITE_DIFY_URL`, `VITE_DIFY_API_KEY`, `VITE_DIFY_DATASET_ID`.
- `listKnowledgeDocuments`: `GET /v1/datasets/:id/documents`.
- `uploadDocument`: `POST /v1/datasets/:id/document/create-by-file` (multipart, `process_rule: { mode: "automatic" }`).
- `removeDocument`: `DELETE /v1/datasets/:id/documents/:docId`.
- `listQAPairs` / `addQAPair`: usa endpoints de **Q&A segments** ou cai em mock se o dataset não for do tipo Q&A.
- `askDify(query, conversationId?)`: novo helper opcional para a tela `/brain` chamar `POST /v1/chat-messages` (response_mode `blocking`).

### 3. `src/services/n8nService.ts` (substituir)
- Lê `VITE_N8N_WEBHOOK_HANDOFF`, `VITE_N8N_WEBHOOK_REVERSE_LOGISTICS`.
- `triggerHandoff(conversationId)`: `POST` para o webhook com `{ conversationId, source: "anfitriao", agent }`.
- `triggerReverseLogistics(orderId)`: idem.
- Sem token (webhooks n8n são autorizados por URL secreta) — mas suporta header opcional `X-Webhook-Token` se `VITE_N8N_WEBHOOK_TOKEN` estiver definido.

### 4. `.env.example` (criar na raiz do projeto)
Lista todas as `VITE_*` necessárias, com comentário do que cada uma é e onde obter:
```
VITE_CHATWOOT_URL=https://chat.suaempresa.com.br
VITE_CHATWOOT_USER_TOKEN=          # Profile Settings → Access Token
VITE_CHATWOOT_ACCOUNT_ID=1
VITE_CHATWOOT_INBOX_ID=1
VITE_DIFY_URL=https://dify.suaempresa.com.br
VITE_DIFY_API_KEY=                 # App → API Access → Service API key
VITE_DIFY_DATASET_ID=              # Knowledge → Settings
VITE_N8N_WEBHOOK_HANDOFF=https://n8n.suaempresa.com.br/webhook/handoff
VITE_N8N_WEBHOOK_REVERSE_LOGISTICS=https://n8n.suaempresa.com.br/webhook/reverse-logistics
VITE_N8N_WEBHOOK_TOKEN=            # opcional, validado dentro do workflow
```
Instrução: copiar para a Vercel em **Settings → Environment Variables** (escopos Production + Preview).

### 5. `n8n-workflows/whatsapp-rag-chatwoot.json` (criar)
Workflow completo, exportado no formato do n8n, contendo nós:
1. **Webhook** `POST /webhook/whatsapp` (recebe payload da Evolution API).
2. **Function** "Normalize" — extrai `from`, `text`, `instanceName`, `messageId`.
3. **HTTP Request** "Find or create Chatwoot contact" — `POST /public/api/v1/inboxes/:inbox_identifier/contacts` (canal API).
4. **HTTP Request** "Find or create conversation" — `POST .../contacts/:source_id/conversations`.
5. **HTTP Request** "Push incoming message" — `POST .../conversations/:id/messages` (`message_type: incoming`).
6. **IF** "AI handling?" — verifica `custom_attributes.ai_handling !== false`.
7. **HTTP Request** "Ask Dify" — `POST {DIFY_URL}/v1/chat-messages` com `inputs`, `query`, `user`.
8. **HTTP Request** "Reply via Evolution" — `POST {EVOLUTION_URL}/message/sendText/:instance` com `apikey` header.
9. **HTTP Request** "Log AI message in Chatwoot" — `message_type: outgoing`, `content_attributes: { ai: true, reasoning }`.
10. Branch alternativo (handover): grava nota privada `[automation] handover` na conversa.

Outro workflow `n8n-workflows/handoff.json`:
- **Webhook** `POST /webhook/handoff` — recebe `{ conversationId }`.
- **HTTP Request** Chatwoot — atualiza `custom_attributes.ai_handling = false` e cria nota.
- **HTTP Request** Slack/Email opcional para notificar a equipe.

Outro workflow `n8n-workflows/reverse-logistics.json`:
- **Webhook** `POST /webhook/reverse-logistics` — recebe `{ orderId }`.
- **HTTP Request** ERP/Shopify (placeholder) que cria etiqueta de devolução.
- **HTTP Request** Chatwoot — adiciona nota privada com `trackingId`.

### 6. `n8n-workflows/README.md` (criar)
- Como importar (Workflows → Import from file).
- Variáveis n8n a configurar em **Credentials → HTTP Header Auth** e em **Variables**: `CHATWOOT_URL`, `CHATWOOT_API_TOKEN`, `CHATWOOT_ACCOUNT_ID`, `CHATWOOT_INBOX_IDENTIFIER`, `EVOLUTION_URL`, `EVOLUTION_API_KEY`, `DIFY_URL`, `DIFY_API_KEY`.
- Como testar: enviar mensagem do WhatsApp para o número conectado via Evolution → conferir conversa criada no Chatwoot e resposta automática da IA.

## Detalhes técnicos

- Todas as chamadas usam `fetch` nativo (sem novas dependências).
- `isLive` flag por service evita quebrar preview Vercel sem env vars.
- Mappers tolerantes a campos ausentes (defaults razoáveis).
- Anexos: front envia como object URL local → `sendMessage` faz `fetch(url).blob()` antes do multipart. Isso funciona porque object URLs são same-origin do app.
- CORS: o usuário precisa habilitar no Chatwoot/Dify o origin do front (`https://anfitriao.vercel.app` + custom domain). Documentar no README.
- Tipos: nenhuma mudança em `src/services/types.ts` — interfaces atuais já cobrem.

## Fora de escopo

- Implementação de webhook *receptor* no front (Chatwoot → Anfitriao) para realtime; isso exigiria WebSocket do Chatwoot (`/cable`) — fica para fase 4.
- Persistência local de credenciais por usuário (multi-tenant) — assume single-tenant.
- Alterações em `/dashboard` e `/inbox` UI — apenas a camada de service muda.