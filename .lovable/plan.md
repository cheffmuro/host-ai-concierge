## Objetivo

(1) Workflow n8n principal respeita `custom_attributes.ai_handling` antes do Dify; (2) consumer realtime do Chatwoot via ActionCable WebSocket no `/inbox`; (3) "Assumir conversa" reflete o modo humano imediatamente em conjunto com o realtime.

## Mudanças

### 1. `n8n-workflows/whatsapp-rag-chatwoot.json` (substituir)

Inserir, após **"Chatwoot · push incoming"**:

- **HTTP Request** `Chatwoot · fetch conversation` — `GET /api/v1/accounts/:acct/conversations/:id` com header `api_access_token` para ler `custom_attributes`.
- **IF** `AI handling?` — condição `custom_attributes.ai_handling !== false` (default `true`).
  - **true** → segue para `Dify · ask RAG → Evolution · reply → Chatwoot · log AI reply → OK`.
  - **false** → `Chatwoot · note (IA pausada)` (nota privada `[automation] IA pausada — aguardando atendimento humano`) → `OK`.

Atualizar o bloco `connections` para refletir o novo fluxo de dois ramos.

### 2. `src/services/chatwootService.ts` (estender)

Adicionar:

- `getCurrentUser()` — `GET /auth/sso_url` ou simplesmente expõe `VITE_CHATWOOT_PUBSUB_TOKEN` lido do env (Chatwoot User → Profile → Access Token também serve como `pubsub_token`). Para evitar chamada extra, leio `VITE_CHATWOOT_PUBSUB_TOKEN` direto.
- `setAiHandling(conversationId, enabled)` — `POST /api/v1/accounts/:acct/conversations/:id/custom_attributes` com `{ custom_attributes: { ai_handling: enabled } }`. Usado para refletir handover no Chatwoot mesmo quando o webhook n8n falhar.

### 3. `src/hooks/useChatwootRealtime.ts` (novo)

Hook que abre conexão **ActionCable** com `wss://chat.suaempresa.com.br/cable`:

- Usa `WebSocket` nativo (sem dependência).
- Subscreve `RoomChannel` com `pubsub_token` do usuário.
- Eventos relevantes: `message.created`, `message.updated`, `conversation.updated`, `conversation.status_changed`.
- Callbacks: `onMessage(conversationId, message)`, `onConversationUpdated(conversationId, patch)`.
- Reconexão exponencial (1s → 30s) ao fechar; `ping` a cada 25s.
- Inativo se `VITE_CHATWOOT_URL`/`VITE_CHATWOOT_PUBSUB_TOKEN` não estiverem definidos (não quebra preview mock).
- Cleanup em `useEffect` retorna `() => ws.close()`.

Mapper local converte `CwMessage`/`CwConversation` (mesmas interfaces do service) para `Message`/patch parcial de `Conversation`. Para evitar duplicação, exporta os mappers de `chatwootService.ts` (refator: extrair para função interna `mappers` exportada).

### 4. `src/routes/inbox.tsx` (estender)

- Importa `useChatwootRealtime`.
- Em `InboxPage`, adiciona:
  ```ts
  useChatwootRealtime({
    onMessage: (cid, msg) => {
      setConversations(prev => prev.map(c =>
        c.id === cid
          ? { ...c, messages: dedup([...c.messages, msg]), preview: msg.content || c.preview, updatedAt: msg.timestamp }
          : c
      ));
    },
    onConversationUpdated: (cid, patch) => {
      setConversations(prev => prev.map(c => c.id === cid ? { ...c, ...patch } : c));
    },
  });
  ```
  `dedup` evita conflito com a mensagem otimista (mesmo `id` ou mesmo `content+timestamp` em janela de 5s).
- `handleAssume`:
  - Já marca `aiHandling: false` localmente. Mantém.
  - Chama em paralelo `triggerHandoff(cid)` (n8n) **e** `setAiHandling(cid, false)` (Chatwoot direto), com `Promise.allSettled` — se um falhar, o outro cobre. Se ambos falharem, reverte estado e mostra toast erro.
  - Adiciona `AutomationEvent` `handover` no contexto (já existe).
- Botão "Assumir conversa" continua aparecendo apenas enquanto `aiHandling===true`. Após sucesso, sai imediatamente da UI; `useChatwootRealtime` confirma via `conversation.updated` quando o Chatwoot propagar.

### 5. `.env.example` (estender)

Adicionar:
```
VITE_CHATWOOT_PUBSUB_TOKEN=   # User Profile → Access Token (mesmo do USER_TOKEN serve)
```
Comentário explicando que é o token de subscription do ActionCable.

## Detalhes técnicos

- **ActionCable wire format** (Chatwoot usa Rails ActionCable):
  - Conectar: `new WebSocket("wss://.../cable")`.
  - Subscribe: enviar `JSON.stringify({ command: "subscribe", identifier: JSON.stringify({ channel: "RoomChannel", pubsub_token: TOKEN }) })`.
  - Mensagens chegam como `{ type, message }` ou `{ identifier, message: { event, data } }`.
  - Filtrar `type === "ping"`/`"welcome"`/`"confirm_subscription"` para não processar como dados.
- **Dedup de mensagens otimistas**: criar mapa por `content+author+(timestamp dentro de 5s)` ou substituir entrada com `status: sending` quando o `id` realtime chegar e o conteúdo bater.
- **Reconexão**: `setTimeout(connect, Math.min(30000, 1000 * 2^attempts))`; resetar `attempts=0` ao receber `welcome`.
- **Mock fallback**: hook é no-op se envs ausentes (preview Vercel continua funcionando 100% mock).

## Fora de escopo

- Indicadores de "digitando…" via `conversation.typing_on`.
- Notificações de áudio/badge de unread no SidebarApp.
- Suporte a múltiplas contas/account_id dinâmico.