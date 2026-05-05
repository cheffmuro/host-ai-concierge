# Feedback visual /inbox + nota sobre PWA

As rotas `/dashboard`, `/inbox` e `/brain` já foram entregues no turno anterior com cards de métricas, gráfico Recharts de 7 dias, upload de documentos e fluxo de Q&A mockados. Esta iteração foca apenas no que ainda falta.

## 1. Toaster global

- Em `src/routes/__root.tsx`, importar `Toaster` de `@/components/ui/sonner` e montar uma única instância dentro do `SidebarProvider`, abaixo do layout. Mantém um único ponto de exibição para toda a app.

## 2. Feedback visual em /inbox

Em `src/routes/inbox.tsx`:

- Importar `toast` de `sonner` e `Loader2` de `lucide-react`.
- `ChatArea` ganha estado local `sending` e `assuming` (booleans). Usar `useTransition` não — basta `useState` + `try/finally`.
- **Envio de mensagem (`submit`)**:
  - Valida draft, marca `sending=true`, limpa o textarea e chama `onSend(text)`.
  - Em caso de sucesso: `toast.success("Mensagem enviada", { description: "Entregue via " + canal })`.
  - Em erro: `toast.error("Falha ao enviar mensagem")` e restaura o draft no textarea.
  - Botão "Enviar" mostra `Loader2` girando + texto "Enviando…" e fica desabilitado enquanto `sending`.
  - Textarea desabilita enquanto `sending` para impedir envios paralelos.
- **Handover (`onAssume` no header)**:
  - `toast.loading("Acionando handover…", { id: "handover" })` ao iniciar.
  - Em sucesso: `toast.success("Conversa assumida pelo time humano", { id: "handover", description: "Automação n8n disparada com sucesso" })`.
  - Em erro: `toast.error("Não foi possível acionar o handover", { id: "handover" })`.
  - Botão "Assumir conversa" troca o ícone por `Loader2` e desabilita enquanto `assuming`.
- As funções `onSend` / `onAssume` já são `async` no componente pai — a callback continua igual, só o `ChatArea` passa a tratar loading + toast.

## 3. Service worker / PWA — esclarecimento (sem mudança de código)

O `vite-plugin-pwa` já está configurado em `vite.config.ts` com `registerType: "autoUpdate"` e manifest válido (`/manifest.webmanifest`, ícones 192/512). O plano original deixou o registro desativado em ambiente de preview por uma diretriz da plataforma:

> Service workers registrados dentro do iframe de preview do Lovable causam cache agressivo de builds antigos, "presos" no editor, e interferem no roteamento do preview. Por isso o registro só deve ocorrer em produção, fora do iframe.

Implicação prática:
- **No preview** (`id-preview--*.lovable.app` dentro do iframe do editor): o SW NÃO é registrado, o app não fica instalável e não há modo offline. Isso é intencional — não é bug.
- **Após publicar** (`*.lovable.app` aberto em uma aba normal do navegador, fora do editor): o SW é registrado automaticamente pelo `vite-plugin-pwa` (`registerType: "autoUpdate"`), o manifest é servido e o navegador exibe o prompt "Instalar app". O modo offline passa a funcionar para navegação (estratégia `NetworkFirst` com cache `html`).

Para validar a instalação:
1. Publicar o projeto pelo botão Publish.
2. Abrir a URL publicada em uma janela normal do Chrome/Edge (não dentro do editor).
3. Aguardar o ícone de instalação aparecer na barra de endereço, ou DevTools → Application → Manifest / Service Workers.

Não vou habilitar o registro do SW dentro do preview porque isso quebraria o próprio editor de pré-visualização — é uma restrição conhecida da plataforma.

## Entregáveis desta iteração

1. `Toaster` montado no layout raiz.
2. `ChatArea` com estados de loading e toasts em envio de mensagem e handover.
3. Resposta clara sobre o status do PWA (já configurado; só ativa em produção publicada).
