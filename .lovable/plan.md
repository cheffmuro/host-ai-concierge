## Objetivo

Criar uma página `/channels` (Canais) onde o cliente final conecta WhatsApp, Instagram, Email e Webchat **sem sair do nosso app** — todas as ações chamam Chatwoot/Evolution por baixo via server functions. Multi-tenant: cada cliente vê só os canais da própria conta Chatwoot.

## Arquitetura

```text
[Cliente final no nosso app /channels]
        │
        ▼
[createServerFn no TanStack Start]  ← injeta credenciais, valida tenant
        │
        ├── Chatwoot Application API (criar inbox, gerar widget token)
        └── Evolution API (criar instância WhatsApp, expor QR Code)
```

Multi-tenant: cada usuário Lovable Cloud tem 1 `account_id` no Chatwoot + 1 `user_api_access_token` (gerado no signup do app, salvo em `profiles`). Todas as chamadas server-side usam esse token, então o isolamento já é garantido pelo próprio Chatwoot.

## Telas

### 1. `/channels` — listagem (entry point principal)
Grid de 4 cards (WhatsApp, Instagram, Email, Webchat) com:
- ícone do canal, nome, status (`Conectado` / `Pendente` / `Não conectado`)
- número de conversas nas últimas 24h
- CTA primário: `Conectar` ou `Gerenciar`
- badge de contagem de mensagens não lidas

### 2. Wizard de conexão (Sheet lateral, um por canal)

**WhatsApp** (Evolution API):
- Passo 1: nome amigável da conexão ("WhatsApp Atendimento")
- Passo 2: cria instância Evolution + exibe **QR Code inline** com polling de status (pending → scanning → connected)
- Passo 3: confirmação + botão "Ir para Inbox"

**Instagram** (Chatwoot OAuth Meta):
- Explica o pré-requisito (página Facebook conectada à conta Instagram Business)
- Botão "Autorizar com Facebook" → abre OAuth da Meta em popup, callback volta pro nosso `/api/public/oauth/instagram` que cria o inbox via Chatwoot API
- Lista contas elegíveis e cliente escolhe qual conectar

**Email** (Chatwoot Email channel):
- Form: endereço de envio, IMAP host/port/user/pass, SMTP host/port/user/pass
- Validação client+server com Zod, teste de conexão antes de salvar
- Cria inbox tipo `Email` no Chatwoot

**Webchat** (Chatwoot Website channel):
- Form: nome do site, URL, cor primária, mensagem de boas-vindas
- Cria inbox tipo `Website`, retorna `website_token`
- Exibe **snippet `<script>` pronto pra copiar** + botão "Copiar"

### 3. Estado vazio elegante
Quando 0 canais conectados: hero centralizado com os 4 cards + texto "Comece conectando seu primeiro canal".

## Backend (server functions)

`src/server/channels.functions.ts`:
- `listChannels()` — GET `/api/v1/accounts/{id}/inboxes` no Chatwoot, normaliza pra shape do front
- `createWhatsAppChannel({ name })` — chama Evolution `POST /instance/create`, retorna `qrcode` base64 + `instanceName`
- `getWhatsAppStatus({ instanceName })` — Evolution `GET /instance/connectionState/{name}`, polling
- `createEmailChannel({ name, imap, smtp })` — Chatwoot `POST /inboxes` tipo Email
- `createWebchatChannel({ name, url, primaryColor })` — Chatwoot `POST /inboxes` tipo Website, retorna `website_token`
- `deleteChannel({ inboxId })` — Chatwoot `DELETE /inboxes/{id}`

`src/routes/api/public/oauth/instagram.ts` — server route que recebe callback OAuth Meta, troca code por token, cria inbox FB no Chatwoot.

Todos protegidos com `requireSupabaseAuth` (multi-tenant). Lê `process.env.CHATWOOT_URL`, `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` — secrets já existentes na infra ou a configurar.

## Auth & multi-tenancy

Lovable Cloud (Supabase) já existente na infra. Tabela nova `tenant_chatwoot_accounts`:
- `user_id` (FK auth.users)
- `chatwoot_account_id` (int)
- `chatwoot_user_token` (text, criptografado)

RLS: usuário só lê/escreve a própria linha. Server functions buscam essa linha pra montar headers `api_access_token` nas chamadas Chatwoot.

Provisionamento no signup (trigger ou edge function): cria `Account` + `User` no Chatwoot, salva token na tabela.

## Sidebar

Adicionar item "Canais" (ícone `Plug` do lucide) entre Inbox e Brain em `app-sidebar.tsx`.

## Fora do escopo deste plano
- Páginas de detalhes/edição avançada de cada canal (versão 2)
- Roteamento de mensagens entre canais (já é responsabilidade do Chatwoot/n8n)
- Billing/limites por plano

## Detalhes técnicos
- Stack: TanStack Start + shadcn (Sheet, Card, Form, Input, Stepper custom)
- Validação: Zod em todos os forms (cliente e server)
- Polling do QR: `useQuery` do TanStack Query com `refetchInterval: 2000`, para quando status = `connected`
- Snippet webchat copiável com `navigator.clipboard.writeText` + toast
- Mock-mode: se `CHATWOOT_URL` ausente, services retornam dados fake (igual `difyService.ts`) pra desenvolvimento

## Pré-requisitos de infra (você precisa confirmar)
1. Lovable Cloud habilitado neste projeto (auth + DB pra `tenant_chatwoot_accounts`)
2. Secrets: `CHATWOOT_URL`, `CHATWOOT_PLATFORM_APP_API_KEY` (pra criar Account/User), `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `META_APP_ID`, `META_APP_SECRET`
3. Webhook do Chatwoot apontando pro nosso `/api/public/webhooks/chatwoot` (já existe?) pra atualizar status em realtime
