# Auditoria Go-Live — Anfitrião

Fiz uma varredura do fluxo ponta-a-ponta comparando o que o app entrega hoje com os 5 objetivos que você definiu. **O app ainda não está pronto para receber cliente real.** Encontrei 8 bloqueadores; 4 são graves (impedem o produto de funcionar de verdade), 4 são de qualidade/UX pré-lançamento.

## Estado atual vs. objetivos do produto

| Objetivo | Estado | Gap |
|---|---|---|
| Dashboard omnichannel (WA/site/Instagram/Facebook) | ⚠️ Parcial | Só WhatsApp/e-mail/webchat via Chatwoot. Instagram/Facebook não estão mapeados. |
| SAC + logística reversa automatizada | ⚠️ Parcial | Workflows n8n existem, mas ligação inbox→n8n só cobre handoff e RL manual. |
| Tirar dúvidas com base treinada (RAG) | ✅ OK | Dify integrado (askDify + upload de docs). |
| Transbordo humano | ✅ OK | `handleAssume` chama n8n + Chatwoot em paralelo. |
| Contexto do cliente (compras/reclamações) | ❌ Não implementado | Painel lê `custom_attributes` do Chatwoot, mas não há ingest de CRM/ERP nem histórico persistido. |

## 🔴 Bloqueadores críticos (impedem operação real)

### B1. Inbox nunca carrega conversas históricas
`src/routes/_authenticated/inbox.tsx` inicializa `conversations` com `[]` (quando não-mock) e **nunca chama `listConversations()`**. Só popula via `useChatwootRealtime` — que só entrega eventos novos. Um usuário logando pela primeira vez vê inbox vazia mesmo com Chatwoot cheio de tickets.
**Fix:** buscar `listConversations()` no mount + polling de fallback quando websocket estiver desconectado.

### B2. Dashboard 100% mock — sem métricas reais
`dashboard.tsx` só lê `mockMetrics`/`mockConversations`. Sem mocks, mostra `—` em tudo. Não existe agregador que calcule resolução IA / tempo médio / transbordos / volume 7 dias.
**Fix:** criar `getDashboardMetrics()` que agrega via Chatwoot Reports API (`/api/v2/accounts/{id}/reports`) + contagens locais de eventos de automação.

### B3. `app_settings` está vazio em produção
Confirmado por query: nenhuma linha em `app_settings`. Ninguém salvou credenciais ainda. Sem isso, todos os services caem em vazio.
**Fix:** onboarding forçado pós-primeiro-login (redirect para `/settings/integrations` se admin e config faltando) + validação "ping" de cada integração ao salvar (bater `/api/v1/accounts/{id}` do Chatwoot, `/v1/datasets/{id}` do Dify) para detectar credencial errada antes do dashboard quebrar.

### B4. `handleSend` no inbox não usa outbox para status de rede
`sendMessage` falha → `outboxStore.enqueue` só é acionado em erro de JS, não em 5xx do Chatwoot com corpo válido. Mensagens "somem" em produção instável.
**Fix:** consolidar retry no `useOutboxFlusher` e garantir que **toda** chamada de `sendMessage` (inclusive retry) passe pela fila; tratar 429/5xx explicitamente.

## 🟠 Gaps de escopo funcional

### B5. Instagram e Facebook Messenger não estão implementados
`channelsService.ts` só suporta `whatsapp | email | webchat`. Você pediu Instagram e Facebook explicitamente.
**Decisão necessária:** habilitar via Chatwoot (que suporta ambos nativamente) ou postergar? Se habilitar: adicionar `instagram` e `facebook` como `ChannelKind`, wizards no `/channels`, e mapeamento em `mapChannel` do chatwootService.

### B6. Contexto de cliente (compras/reclamações passadas) sem fonte de dados
O painel lateral da inbox lê `context.ltv`, `totalOrders`, etc. de `custom_attributes` — mas nada popula isso. Precisa de ingest via n8n (webhook do e-commerce → grava `custom_attributes` no contato do Chatwoot) ou de um `getCustomerContext(identifier)` que consulte Shopify/ERP no on-open da conversa.
**Decisão necessária:** qual é a fonte de verdade dos dados de cliente? (Shopify? ERP próprio? Planilha?)

## 🟡 Qualidade pré-produção

### B7. Segurança / RLS
- `app_settings` permite leitura de tokens (Chatwoot user_token, Dify api_key) para **qualquer** autenticado. Um usuário comum vê credenciais de admin. Corrigir política para só admin ler campos secretos, OU mover secretos para variáveis de servidor (Secrets do Cloud) e deixar em `app_settings` só metadados não-sensíveis (`url`, `account_id`).
- Chamadas à Chatwoot/Dify saem **direto do navegador do usuário final** com o token de admin exposto. Precisa virar server function: `sendMessage`, `listConversations`, `askDify`, `uploadDocument` devem rodar em `createServerFn` para não vazar `api_access_token` para o cliente.

### B8. SEO, erros e observabilidade
- Rota pública `/` sem `head()` com `og:image`; página `/login` sem meta.
- Nenhuma rota tem `errorComponent` nem `notFoundComponent` (obrigatório pela stack).
- Sem logging estruturado dos falhas de webhook/handoff — quando quebra em produção, você não sabe o quê.

## Plano de execução sugerido (2 fases)

**Fase 1 — Destravar operação real (obrigatório antes do go-live):**
1. B1: carregar `listConversations()` no inbox + fallback polling.
2. B2: `getDashboardMetrics()` server fn agregando Chatwoot Reports.
3. B3: onboarding + ping-validate ao salvar integrações.
4. B7 (parte crítica): mover chamadas Chatwoot/Dify que usam tokens para server functions (`sendMessage`, `listConversations`, `askDify`), restringir leitura de secretos em `app_settings` a admin.
5. B4: consolidar outbox retry.
6. B8 (mínimo): `errorComponent`+`notFoundComponent` em rotas com loader, root com `notFoundComponent`.

**Fase 2 — Completar escopo (pode ir logo depois):**
7. B5: Instagram + Facebook (via Chatwoot).
8. B6: definir fonte de contexto do cliente e implementar `getCustomerContext`.
9. B8 (resto): SEO das rotas públicas, logging estruturado, health check das integrações no dashboard.

## Perguntas antes de eu partir para a implementação

1. **Fase 1 completa** (itens 1–6) ou você quer que eu comece só pelos 3 mais críticos (B1, B2, B3)?
2. **B5 (Instagram/Facebook):** entra na Fase 1 ou fica para Fase 2?
3. **B6 (contexto do cliente):** qual sistema é a fonte (Shopify, outro e-commerce, ERP, CRM)? Sem isso não dá para implementar.
4. **B7 (server functions para chamadas com token):** ok mover as chamadas hoje client-side para server functions? Isso melhora segurança mas muda arquitetura — só confirmando o apetite.
