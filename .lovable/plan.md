
# Auditoria: o que a landing promete × o que está de fato entregue

Análise baseada em leitura direta do código atual (`src/services/*`, `src/routes/_authenticated/*`, `src/hooks/useChatwootRealtime.ts`, `src/routes/api/public/customer-context.ts`, `supabase` schema/policies).

## Resumo por promessa

### 1. Inbox unificada (WhatsApp, Instagram, Email, Webchat)
**Status: PARCIAL**
- Entregue: Inbox lê conversas do Chatwoot via server function (`chatwootListConversations`), mapeia canais whatsapp/instagram/facebook/email/web, histórico do cliente aparece no painel lateral (`useCustomerContext`).
- Faltando:
  - **Instagram**: `channelsService.startInstagramOAuth()` retorna `{ authUrl: "" }` — não conecta. Wizard existe só como formulário informativo.
  - **Facebook Messenger**: não há wizard nem service — só é reconhecido se já existir inbox criado direto no Chatwoot.
  - **WhatsApp**: depende de `VITE_EVOLUTION_URL/API_KEY` em build (`channelsService`), não lê de `app_settings` como Chatwoot/Dify. Sem essas envs, cai em QR fake (SVG aleatório).
  - **Email/Webchat**: criam inbox via Chatwoot API, mas usam `VITE_CHATWOOT_USER_TOKEN` do build — não o token multi-tenant salvo em `app_settings`.

### 2. IA concierge com RAG (Dify)
**Status: PARCIAL**
- Entregue: server functions Dify (`dify.functions.ts`), tela `/brain` para upload/listagem de documentos, Q&A test.
- Faltando:
  - Resposta automática ao cliente **não está ligada no app**: o loop "mensagem entra → Dify responde → Chatwoot envia" só existe no workflow n8n em `n8n-workflows/whatsapp-rag-chatwoot.json` (não deployado pelo app; usuário precisa importar no n8n manualmente).
  - `sendMessage` do agente humano existe, mas não há trigger server-side que chame Dify ao receber webhook do Chatwoot.

### 3. Automações n8n (handoff, logística reversa, custom)
**Status: SÓ UI**
- Entregue: página `/workflows` lista workflows, botões "Gerar etiqueta de reversa" / "Solicitar reembolso" no painel (disparam apenas toast).
- Faltando:
  - Botões **não chamam webhook** — só `toast.success("Solicitação enviada para n8n")`.
  - `n8nService` existe mas endpoints não são chamados a partir da Inbox.
  - JSONs em `public/n8n/*` são só arquivos para o cliente importar manualmente; sem instalador automatizado.

### 4. Tempo real (WebSocket)
**Status: OK (dependente de config)**
- `useChatwootRealtime` conecta ActionCable com `pubsub_token` salvo em `app_settings`, invalida cache ao chegar mensagem. Funciona quando Chatwoot está configurado.

### 5. Multi-tenant seguro com RLS
**Status: FRACO**
- RLS existe nas tabelas (`app_settings`, `user_roles`, `profiles`, `customer_context`), mas **não há noção de tenant/organização**:
  - `app_settings` guarda **uma linha global por integração** (`key='chatwoot'`), leitura restrita a admin — ou seja, **todos os admins do banco compartilham a mesma configuração**. Não é multi-tenant, é single-tenant com admins.
  - `customer_context` é lido por qualquer `authenticated` (`using: true`) — sem isolamento por empresa.
  - Sem tabela `organizations` nem coluna `org_id` em lugar nenhum.

### 6. White-label (sua marca, seu domínio)
**Status: NÃO ENTREGUE**
- Sem tela de branding (logo, cores, nome da marca).
- Sem suporte a domínio próprio por cliente — o app tem 1 domínio (`anfitriao.app.br`).
- Header/sidebar/emails têm branding fixo "Anfitrião".

---

## Priorização sugerida para fechar o gap com a landing

**Fase 1 — parar de prometer o que não existe (rápido, editorial)**
- Ajustar a landing para descrever o que hoje funciona: WhatsApp+Webchat+Email via Chatwoot, IA no `/brain`, automações n8n via import manual, single-tenant.
- Remover ou marcar como "em breve": Instagram, Facebook, White-label, Multi-tenant.

**Fase 2 — completar Inbox unificada**
- Ler credenciais Chatwoot/Evolution de `app_settings` também em `channelsService` (hoje usa `VITE_*`).
- Implementar OAuth real Instagram/Facebook via server route pública (`/api/public/oauth/meta/callback`) → cria inbox no Chatwoot.
- Ligar botões de reversa/reembolso a webhooks n8n reais (`n8nService.trigger*`).

**Fase 3 — IA respondendo dentro do app**
- Server route pública `/api/public/webhooks/chatwoot` recebe mensagem entrante → chama Dify → posta resposta via `chatwootSendMessage`. Elimina dependência do n8n para o caminho crítico.

**Fase 4 — multi-tenant real**
- Tabela `organizations`, coluna `org_id` em `app_settings`/`customer_context`/`user_roles`.
- RLS por `org_id`. Onboarding cria organização ao primeiro admin.

**Fase 5 — white-label**
- Tabela `org_branding` (logo, cores, nome). Provider de tema lendo do backend.
- Suporte a subdomínio por cliente (via wildcard DNS + rota que resolve org pelo host).

---

## Perguntas antes de eu propor um plano de execução

1. Você quer que eu **ajuste a landing** para refletir o entregue de hoje, ou quer que eu **implemente as lacunas** para cumprir a promessa atual?
2. Se for implementar: aceita começar por **Fase 2 + Fase 3** (Inbox completa + IA respondendo automaticamente) e deixar multi-tenant/white-label para depois? Ou multi-tenant é bloqueador porque você já tem >1 cliente?
3. Instagram/Facebook exigem app aprovado na Meta (business verification, permissões `instagram_basic`, `pages_messaging`). Você já tem esse app criado ou precisa entrar nesse processo antes?

Depois das respostas eu volto com o plano detalhado de execução.
