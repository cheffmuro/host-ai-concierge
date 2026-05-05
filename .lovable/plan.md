## Objetivo

Estender `/inbox` (mock-only) com fila offline persistente, anexos, estados por mensagem, histórico de automações e botão "Tentar novamente".

## Arquivos a alterar / criar

**`src/services/types.ts`** — adicionar tipos:
- `MessageStatus = "sending" | "queued" | "delivered" | "error"`
- `Attachment = { id; name; size; type; url; kind: "image" | "file" }`
- `AutomationEvent = { id; type: "handover" | "ai_reply" | "reverse_logistics" | "other"; title; description; timestamp; result: "success" | "error" | "pending"; payload?: unknown }`
- Estender `Message` com `status`, `attachments?`, `error?`
- Estender `CustomerContext` com `automations: AutomationEvent[]`

**`src/services/chatwootService.ts`** — `sendMessage` agora aceita `{ content, attachments }`, falha aleatoriamente (~25%) e devolve `{ id, deliveredAt }` em caso de sucesso (para simular acks reais).

**`src/mocks/data.ts`** — incluir 2 `AutomationEvent` por cliente (handover + ai_reply) com payloads exemplares.

**`src/stores/outboxStore.ts`** (novo) — Zustand com `persist`:
- `OutboxItem { id; conversationId; content; attachmentMeta[]; attempts; lastError?; createdAt }`
- Ações: `enqueue`, `remove`, `incrementAttempt`, `setError`
- Apenas metadados de anexos persistem (arquivos reais somem após reload — mensagem mantém status "queued" com aviso).

**`src/hooks/useOutboxFlusher.ts`** (novo) — escuta `online`/`offline`, dispara flush a cada ~15s e ao voltar online; chama `chatwootService.sendMessage`; em sucesso, remove do outbox e atualiza status da mensagem no `inboxStore` para `delivered`; em erro, incrementa tentativas com backoff. Toasts: "Conexão restaurada", "Mensagem reenviada".

**`src/stores/inboxStore.ts`** — adicionar:
- `addOptimisticMessage(conversationId, message)`
- `updateMessageStatus(conversationId, messageId, status, patch?)`
- `appendAutomation(customerId, event)`

**`src/routes/inbox.tsx`** — `ChatArea`:
- Botão `Paperclip` → input file (múltiplos; imagens, PDF, DOC); limite 5 arquivos / 10 MB cada.
- `pendingAttachments` com previews (`URL.createObjectURL`); strip removível acima do textarea; cleanup de object URLs.
- `submit()`: cria mensagem otimista com `status: "sending"` e UUID, envia via service; sucesso → `delivered`; falha → enfileira no outbox e marca `queued` (offline) ou `error` (online).
- Render por status: `Loader2` (sending), `CloudOff` (queued), `Check` + hora (delivered), `AlertCircle` + botão "Tentar novamente" (error).
- "Tentar novamente": volta status para `sending`, reenviá via service, segue mesmo fluxo.
- Anexos no balão: grid com thumbs clicáveis (imagem) e cards minimalistas (arquivo).
- "Assumir conversa": além do toast, registra `AutomationEvent` (`handover`, success) no contexto via `appendAutomation`.

**`ContextPanel`** (mesmo arquivo) — nova seção "Histórico de automações" abaixo do "Raciocínio da IA":
- Timeline vertical (linha + ponto), itens com ícone por tipo, título, descrição, hora relativa, badge de resultado.
- Botão "Ver payload" expande JSON formatado em `<pre>` discreto.

**`src/routes/__root.tsx`** — montar `useOutboxFlusher()` dentro do provider.

## Detalhes técnicos

- IDs com `crypto.randomUUID()`.
- Persistência: `zustand/middleware` `persist` (storage `localStorage`, key `anfitriao-outbox-v1`); apenas metadados de arquivos.
- Offline: detectado por `navigator.onLine` + listeners `online`/`offline`.
- Backoff do flusher: `min(60s, 5s * 2^attempts)`.
- Toda a lógica é mock — nenhuma chamada real de rede; manter isolado a `/inbox`.

## Fora de escopo

Persistência de arquivos binários reais, retry em background via Service Worker, alterações em `/dashboard` e `/brain`.