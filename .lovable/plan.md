# Auditoria Go-Live — Anfitrião

## Status atual

**Pronto ✅**
- Frontend completo (landing, login, signup, dashboard, inbox, channels, brain, workflows)
- Auth real via Lovable Cloud (email/senha + Google + tabela `profiles` com RLS)
- Proteção de rotas (`_authenticated`)
- Camada de serviços com fallback automático: se as envs não estão setadas, roda em **mock**
- Domínio custom já ativo (`anfitriao.app.br`)

**Em mock (tudo) ❌**
Hoje, sem nenhuma env de integração configurada, o app abre, faz login e navega — mas **nenhum dado é real**. Inbox, canais, base de conhecimento e workflows mostram dados fictícios.

---

## O que falta para ficar 100% operacional

### 1. Chatwoot (caixa de entrada + canais) — CRÍTICO
Usado por: `/inbox`, `/channels`, widget no `/dashboard`.
Falta configurar:
- `VITE_CHATWOOT_URL` (ex: `https://app.chatwoot.com` ou self-hosted)
- `VITE_CHATWOOT_USER_TOKEN` (User Access Token de cada conta)
- `VITE_CHATWOOT_ACCOUNT_ID`
- `VITE_CHATWOOT_INBOX_ID` (opcional, default)
- Token do widget no `/dashboard` (hoje está hardcoded como `mock_tok_i4fnu8kx`)

**Problema multi-tenant:** hoje o token Chatwoot vem do build (env var única para todos). Para vários clientes, precisa migrar para **token por usuário**, salvo em tabela (`integrations` ou `tenant_settings`) e lido via server function.

### 2. Evolution API (WhatsApp) — CRÍTICO se vende WhatsApp
Usado por: `/channels` (criar instância, QR Code).
Falta:
- `VITE_EVOLUTION_URL`
- `VITE_EVOLUTION_API_KEY`
- Mesmo problema multi-tenant que o Chatwoot.

### 3. Dify (Brain / RAG) — CRÍTICO se vende IA
Usado por: `/brain` (documentos, Q&A, treinamento).
Falta:
- `VITE_DIFY_URL`
- `VITE_DIFY_API_KEY`
- `VITE_DIFY_DATASET_ID` (um por tenant, idealmente)

### 4. n8n (Workflows) — CRÍTICO se vende automação
Usado por: `/workflows`.
Falta:
- `VITE_N8N_WEBHOOK_HANDOFF`
- `VITE_N8N_WEBHOOK_REVERSE_LOGISTICS`
- `VITE_N8N_WEBHOOK_WHATSAPP`
- `VITE_N8N_WEBHOOK_TOKEN`
- (Já existe fallback via localStorage para configuração runtime — ok para piloto)

### 5. Segurança das credenciais — CRÍTICO
Hoje todas as credenciais estão como `VITE_*` (expostas no bundle do navegador). Para produção real, **mover para o backend**:
- Guardar tokens criptografados em tabela Supabase
- Criar **edge functions / server functions** que fazem as chamadas a Chatwoot, Dify, Evolution, n8n
- Frontend nunca toca chaves de API

### 6. Onboarding do tenant — IMPORTANTE
Falta UI/fluxo para um novo cliente conectar **as próprias contas**:
- Tela "Integrações" em Settings: campos para colar URL/token do Chatwoot, Dify, Evolution, n8n
- Botão "Testar conexão" para cada uma
- Persistir em tabela `tenant_integrations` (com RLS por user_id)

### 7. Pós-cadastro — IMPORTANTE
- Tabela `profiles` existe mas falta tela de edição (nome, empresa, avatar)
- Falta página `/reset-password` (esqueci senha)
- Falta confirmação de e-mail funcionando ponta-a-ponta (já habilitado no Cloud)

### 8. Operacionais — RECOMENDADO
- Política de billing/limites (quem paga? plano grátis vs pago?)
- Logs/observabilidade das chamadas a APIs externas
- Rate limiting nas server functions
- Termos de uso e política de privacidade (links no footer da landing)

---

## Plano sugerido de execução (em ordem)

1. **Tabela `tenant_integrations`** com RLS + tela `/settings/integrations`
2. **Migrar serviços para server functions** (Chatwoot/Dify/Evolution/n8n) lendo tokens dessa tabela
3. **Substituir widget hardcoded** do `/dashboard` por websiteToken vindo do tenant
4. **Página `/reset-password`** + edição de perfil em `/settings`
5. **Testes ponta-a-ponta** com 1 conta real de cada serviço
6. **Termos + Privacidade** + revisão final → publicar

## Decisões que eu preciso de você

Para eu começar pela parte mais valiosa, me diga:

- **Modelo:** SaaS multi-tenant (cada cliente pluga as próprias contas) **ou** instância dedicada (você gerencia tudo, um único Chatwoot/Dify/n8n para todos)?
- **Quais integrações são obrigatórias no MVP?** (Chatwoot é certo; Dify, Evolution e n8n são opcionais ou todos obrigatórios?)
- Você já tem contas/instâncias dessas ferramentas no ar prontas para conectar?
