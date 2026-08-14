# Simulação "tudo conectado" — Modo Demonstração + relatório

Objetivo: ver o app funcionando como se Chatwoot, Dify e Evolution estivessem ligados, com hóspedes reais mandando perguntas — e receber um relatório com prints do fluxo.

## Parte 1 — Modo Demonstração dentro do app

Um interruptor **Modo Demonstração** em Configurações → Integrações (visível só para admin). Quando ligado, o app deixa de tentar falar com as integrações e passa a usar um cenário de pousada/hotel simulado, sem gravar nada no banco.

O que passa a aparecer:

- **Inbox**: 8 conversas de hóspedes em canais diferentes (WhatsApp, Instagram, e-mail, web), com histórico de mensagens, SLA correndo, criticidade e sentimento variados.
- **IA respondendo**: em 5 conversas a IA já respondeu com base na "base de conhecimento"; em 2 houve handoff para humano; 1 está aguardando primeira resposta (SLA estourando).
- **Painel de contexto**: LTV, reservas anteriores, tags e linha do tempo de automações para cada hóspede.
- **Dashboard**: métricas coerentes com essas conversas (volume por canal, % resolvido pela IA, tempo médio de resposta, sentimento).
- **Base de Conhecimento**: documentos simulados indexados (Regras da casa, Wi-Fi e eletrodomésticos, Check-in/Check-out, Política de reembolso) e um chat de teste que responde citando a fonte.

Temas das perguntas simuladas (cobrindo os casos que o app promete):

1. Check-in antecipado e envio da chave digital
2. Senha do Wi-Fi (resposta automática pela IA)
3. Late checkout com cobrança extra
4. Reclamação de limpeza → escala para humano
5. Pedido de reembolso / cancelamento → logística reversa
6. Como chegar / estacionamento
7. Ar-condicionado não liga (suporte técnico)
8. Hóspede irritado com barulho → sentimento negativo + prioridade alta

Um banner discreto no topo indica "Modo demonstração ativo" para não confundir com dados reais. Desligar o interruptor devolve tudo ao estado real.

## Parte 2 — Relatório do fluxo simulado

Com o modo ligado, eu navego pelo app automaticamente e entrego um relatório com prints e observações: Dashboard, Inbox com a fila, uma conversa respondida pela IA, uma conversa escalada para humano, painel de contexto do hóspede e a Base de Conhecimento. Incluo o que funcionou e o que ainda depende de integração real.

## Detalhes técnicos

- Flag em `localStorage` + estado no `integrationsStore` (`demoMode`), sem migração de banco.
- Dataset novo em `src/mocks/demo-scenario.ts` (conversas, mensagens, contexto, docs, métricas derivadas).
- Ponto de entrada nos services existentes (`chatwootService`, `difyService`) e nos hooks `useDashboardMetrics` / `useCustomerContext`: quando `demoMode` estiver ligado, retornam o cenário antes de chamar as server functions.
- Nenhuma escrita em Supabase; server functions não são chamadas em modo demo.
- Independente do `USE_MOCKS` atual (que continua `false` por padrão).
- Relatório gerado via navegação automatizada no preview, com prints.

## Correção de build (primeiro passo)

O projeto está com dois erros de compilação que precisam ser corrigidos antes da simulação: os links de rodapé em `src/routes/index.tsx` e `src/routes/privacy.tsx` apontam para `/privacidade`, mas a rota existente é `/privacy`. Ajustar os dois links.
