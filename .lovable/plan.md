# Inbox: fila offline, anexos, status de mensagem e histórico de automações

Quatro melhorias na rota `/inbox` e na camada de serviços, todas mockadas em memória (sem backend).

## 1. Tipos & camada de serviços

`src/services/types.ts`:
- `MessageStatus = "sending" | "queued" | "delivered" | "error"`.
- `Message` ganha `status?: MessageStatus`, `attachments?: Attachment[]`, `error?: string`.
- Novo `Attachment { id, name, mime, size, url, kind: "image" | "file" }` (`url` é object URL local).
- Novo `AutomationEvent { id, type: "handover" | "reverse_logistics" | "ai_response", title, description, status: "success" | "error" | "pending", timestamp, payload? }`.
- `CustomerContext` ganha `automations: AutomationEvent[]` (popular nos mocks com 2–3 eventos por cliente para demonstrar a UI).

`src/services/chatwootService.ts`:
- `sendMessage(conversationId, content, attachments?)` — Promise; simula falha aleatória (~30%) jogando erro, para exercitar a fila offline.
- Nova `listAutomations(conversationId): Promise<AutomationEvent[]>` (lê do mock).

`src/services/n8nService.ts`:
- `triggerHandoff` continua igual; mantém retorno `{ ok: true }`.

## 2. Fila offline com auto-reenvio

Novo `src/stores/outboxStore.ts` (Zustand + `persist` em `localStorage`):

```
type OutboxItem = {
  id: string;            // mesmo id da mensagem otimista
  conversationId: string;
  content: string;
  attachments?: SerializableAttachment[];  // sem File/Blob, só metadados (anexos não persistem entre reloads)
  createdAt: string;
  attempts: number;
  lastError?: string;
};

state: { items: OutboxItem[]; flushing: boolean }
actions: enqueue, dequeue, markAttempt, clearForConversation, getForConversation
```

Hook `src/hooks/useOutboxFlusher.ts`:
- Monta listeners `online` / `offline` no `window`.
- Função `flush()` percorre items: chama `sendMessage` via `chatwootService`; em sucesso remove o item e dispara callback para atualizar o status da mensagem para `delivered`; em erro incrementa `attempts` e mantém na fila.
- Roda quando: app ganha `online`, ao montar (catch-up), e a cada ~15s (backoff simples) enquanto houver items.
- Toasts: `toast.info("Conexão restabelecida — reenviando N mensagens")` ao voltar online; `toast.success` por reenvio bem-sucedido.

O hook é montado no nível da rota `/inbox` para ter acesso ao callback que atualiza o estado de conversas.

## 3. Anexos no inbox

`src/routes/inbox.tsx` no `ChatArea`:
- Botão `Paperclip` abre input de arquivo (`<input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xlsx" hidden ref>`) — antes era apenas decorativo.
- Estado local `pendingAttachments: Attachment[]` (com `URL.createObjectURL` para preview de imagens).
- Strip de previews acima do textarea: thumbnails 56px para imagens, badge com nome+ícone para outros; cada um com botão "x" para remover.
- `submit()` envia `content + attachments`; permite envio só com anexos (texto opcional se houver anexo).
- Limite simples: até 5 anexos, 10MB cada (toast.error se exceder).
- Cleanup dos object URLs em `useEffect` cleanup.
- Renderização das mensagens: se `attachments`, mostrar grid acima do texto — `<img>` para imagens, "card de arquivo" minimal (ícone + nome + tamanho) para os demais.

## 4. Estados de mensagem no chat

Fluxo no `submit`:
1. Cria mensagem otimista com `id`, `status: "sending"`, attachments → push imediato em `conversation.messages`.
2. Chama `sendMessage`; em sucesso, marca `status: "delivered"` (timestamp do servidor). Em falha, marca `status: "queued"`, enfileira em `outboxStore`, mostra `toast.info("Sem conexão — mensagem na fila")`. Se erro for "permanente" (>3 attempts), `status: "error"`.

Renderização do balão (apenas para `author === "agent"`):
- `sending`: spinner Loader2 12px + "Enviando…" em `text-slate-400`.
- `queued`: ícone `CloudOff` + "Na fila".
- `delivered`: ícone `Check` + horário.
- `error`: ícone `AlertCircle` em `text-rose-600` + botão "Tentar novamente" inline que reexecuta o envio (e move para `sending`).

Hook do flusher atualiza `status` quando a fila esvaziar com sucesso.

## 5. Histórico de handovers e automações

`ContextPanel` ganha nova seção "Linha do tempo de automações" abaixo de "Raciocínio da IA":
- Lista vertical compacta com timeline-style (linha vertical à esquerda + dot por evento).
- Cada item mostra: badge do tipo (Handover / Logística reversa / Resposta IA), título, descrição (motivo), timestamp formatado e badge de resultado (success verde dessaturado / error rose / pending âmbar).
- Botão "Ver payload" expansível (`<details>`) que mostra `payload` em `<pre>` mono pequena, para auditoria.
- Quando o usuário aciona "Assumir conversa" no chat, criamos um novo `AutomationEvent` localmente (no estado das conversas) e ele aparece imediatamente nessa timeline. Mesmo padrão para reenvios da fila offline (registro de tipo `ai_response` com status correspondente — opcional, manter escopo enxuto: só registramos `handover` por enquanto para evitar inflar o painel).

Mocks: adicionar 2 eventos por cliente em `mockConversations` (ex.: handover anterior bem-sucedido, disparo de logística reversa).

## Detalhes técnicos

- IDs de mensagem usam `crypto.randomUUID()` (disponível no Worker e no browser moderno).
- O `outboxStore.persist` só persiste `content + metadados de anexo` — arquivos reais (`File`) não atravessam reload; ao recarregar com itens na fila, eles são reenviados como mensagem texto + um aviso "Anexo perdido no reload" (toast.warning).
- Todas as mudanças continuam isoladas em `/inbox`; outras rotas não precisam ajuste.
- TypeScript estrito: garantir que campos novos são opcionais para não quebrar dados existentes.

## Entregáveis

1. Tipos atualizados + serviços mock falhando aleatoriamente.
2. `outboxStore` com persist + `useOutboxFlusher`.
3. ChatArea com seleção/preview/envio de anexos e renderização de anexos nas mensagens.
4. Indicadores visuais de status por mensagem + retry manual em erro.
5. Timeline de automações no painel de contexto + integração com o botão "Assumir conversa".
