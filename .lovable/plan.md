# Corrigir página /workflows

## Diagnóstico

A página existe e os botões têm handlers, mas eles ficam **desabilitados** porque dependem das variáveis `VITE_N8N_WEBHOOK_HANDOFF`, `VITE_N8N_WEBHOOK_REVERSE_LOGISTICS` e `VITE_N8N_WEBHOOK_WHATSAPP`, que só podem ser definidas no build (`.env` da Lovable). Como elas estão vazias, todos os botões "Validar" e "Testar com payload real" ficam inertes — daí a sensação de "botões sem ação".

Apenas "Baixar JSON" funciona hoje (e continuará funcionando, os arquivos existem em `public/n8n/`).

## Decisão

**Não deletar**. A página é útil (importação dos JSONs do n8n + teste end-to-end). Vamos torná-la operável sem depender de variáveis de build.

## O que vou fazer

1. **Configuração inline por workflow**
   - Adicionar um campo de URL editável em cada card (com botão "Salvar").
   - Persistir em `localStorage` (`n8n:webhook:<key>` e `n8n:token`).
   - Se a env var existir, ela é usada como default; o valor salvo no localStorage tem prioridade.
   - Campo extra opcional para o token (`X-Webhook-Token`).

2. **Service refatorado (`src/services/n8nService.ts`)**
   - Nova função `getWorkflowUrl(key)` que lê localStorage → env var → undefined.
   - `setWorkflowUrl(key, url)` e `setWorkflowToken(token)`.
   - `WORKFLOWS` deixa de carregar `url` no módulo; vira getter dinâmico.
   - `buildHeaders()` lê o token do localStorage também.

3. **UX da página (`src/routes/workflows.tsx`)**
   - Cada card mostra: input da URL + Salvar + status (configurado/não configurado).
   - Botões "Validar" e "Testar com payload real" passam a usar a URL atual (env ou salva).
   - Toast claro quando não há URL: "Cole a URL do webhook do n8n e clique em Salvar".
   - Manter "Validar todos", "Baixar JSON" e o card "Como importar no n8n".

4. **Aviso de CORS**
   - Adicionar nota curta no card de instruções: se o n8n estiver em outro domínio, habilitar CORS para o domínio da Lovable, senão o navegador bloqueia.

## Arquivos afetados

- `src/services/n8nService.ts` — refatorar para URLs dinâmicas + token via localStorage.
- `src/routes/workflows.tsx` — adicionar inputs de configuração e usar URLs dinâmicas.

Nenhuma mudança em backend, rotas ou outras páginas.
