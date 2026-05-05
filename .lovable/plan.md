# ANFITRIÃO — Painel Omnichannel (Quiet Luxury)

Painel operacional PWA para SAC de luxo, unificando conversas multicanal e gestão de uma IA concierge (RAG). Toda a UI usa dados mockados, com camada de serviços pronta para integração futura com Chatwoot, Dify e n8n.

## Design System

- Paleta monocromática: fundo `bg-slate-50`, painéis `bg-white`, texto `text-slate-900` / `text-slate-500`, acentos discretos em areia/grafite.
- Tipografia Inter (carregada via Google Fonts no `__root.tsx`); Medium para títulos, Regular para corpo, tracking levemente reduzido nos headings.
- Tokens shadcn ajustados em `src/styles.css`: `--radius` reduzido para `2px` (visual arquitetônico), atualização das variáveis OKLCH para o tom off-white/charcoal.
- Componentes shadcn/ui já existentes reaproveitados (button, card, badge, table, sidebar, dialog, input, textarea, scroll-area, separator, avatar, tabs).
- Ícones `lucide-react` com `strokeWidth={1.5}`.

## Rotas (TanStack Start, file-based)

```
src/routes/
  __root.tsx           layout raiz com fonte Inter + SidebarProvider
  index.tsx            redireciona para /dashboard
  dashboard.tsx        Visão de Comando
  inbox.tsx            Omnichannel (3 colunas)
  brain.tsx            Gestão RAG
```

Cada rota define `head()` próprio (title/description/og).

### /dashboard — Visão de Comando
- 4 cards minimalistas: Taxa de Resolução IA, Tempo Médio de Atendimento, Transbordos Humanos, Conversas Ativas. Número grande em Medium, label em uppercase tracking-wide, delta semanal sutil.
- Gráfico de linha (Recharts) com volume de atendimentos automatizados — 7 dias, traço fino, sem grid pesado, tooltip discreto.
- Lista compacta "Últimos transbordos" abaixo.

### /inbox — Handover Humanizado
Grid 30/50/20 em desktop, colapsa em mobile (lista → chat → contexto via drawer).

- **Esquerda (lista de conversas):** avatar com inicial, nome, prévia, ícone de canal (WhatsApp/Mail/Globe), timestamp, badge de emoção (`Frustrado`, `Neutro`, `Satisfeito`) com cores muito dessaturadas. Busca no topo + filtro por canal.
- **Centro (chat):** header com nome + canal + status; balões refinados (cliente à esquerda, operação à direita); mensagens da IA marcadas com ícone `Bot` discreto e label "Concierge IA"; input com anexos, atalho de envio, botão "Assumir conversa" no topo quando IA está ativa.
- **Direita (Contexto do Cliente):** ticket médio, LTV, últimas compras, tags, e bloco "Raciocínio da IA" com a regra aplicada (ex.: "Política de troca art.3 — ofereci devolução com coleta").

Mobile: lista ocupa tela inteira; ao tocar abre o chat; contexto vira `Sheet` lateral acessível por botão no header.

### /brain — Gestão de Conhecimento (RAG)
- Tabs: "Documentos" e "Q&A".
- Documentos: zona de upload (drag & drop mock), tabela com nome, tipo, tamanho, status de indexação, data, ações (reindexar/remover).
- Q&A: formulário Pergunta/Resposta + tabela das entradas treinadas, com busca.

## Layout & Navegação

- `AppSidebar` com `collapsible="icon"`, logo monograma "A." no topo, links: Dashboard, Inbox, Brain. Item ativo destacado por barra fina à esquerda + texto charcoal. Rodapé com avatar do operador e status.
- Header fino (48px) com `SidebarTrigger`, breadcrumb da rota e ações contextuais.

## Camada de Serviços (mock-ready)

Em `src/services/`, todas as funções retornam Promises com dados mockados de `src/mocks/`, prontas para serem trocadas por chamadas reais:

- `chatwootService.ts` — `listConversations`, `getConversation`, `sendMessage`, `assignAgent`.
- `difyService.ts` — `listKnowledgeDocuments`, `uploadDocument`, `addQAPair`, `removeDocument`.
- `n8nService.ts` — `triggerReverseLogistics`, `triggerHandoff`.

Tipos compartilhados em `src/services/types.ts` (Conversation, Message, Channel, Sentiment, KnowledgeDoc, QAPair, CustomerContext).

## Estado

- Zustand (`src/stores/inboxStore.ts`) para conversa selecionada, filtros, draft de mensagem e abertura do painel de contexto em mobile.
- Estado das demais páginas é local (useState) — sem store global desnecessária.

## PWA

`vite-plugin-pwa` configurado em `vite.config.ts`:
- `registerType: "autoUpdate"`, `devOptions.enabled: false`.
- Manifest: nome "Anfitrião", short_name "Anfitrião", `display: "standalone"`, theme `#0f172a`, background `#f8fafc`, ícones 192/512 (SVG monograma gerado em `public/`).
- Registro do SW em `src/main.tsx` com guarda anti-iframe / anti-preview (não registra em `id-preview--*` nem dentro de iframe), seguindo as diretrizes da plataforma. PWA só ativa em produção publicada.

## Detalhes técnicos

- Dependências novas: `recharts`, `zustand`, `vite-plugin-pwa`, `date-fns`.
- Mocks ricos em `src/mocks/` (≥8 conversas com mensagens, 3 documentos, métricas e série temporal de 7 dias).
- Acessibilidade: foco visível discreto, labels em todos os inputs, navegação por teclado na lista de conversas.
- Sem alterações em `routeTree.gen.ts` (gerado automaticamente).

## Entregáveis

1. Tokens e fonte Inter aplicados; sidebar + header.
2. Rotas `/dashboard`, `/inbox`, `/brain` completas com mocks.
3. `src/services/*` e `src/stores/inboxStore.ts`.
4. PWA instalável com guarda de iframe.
