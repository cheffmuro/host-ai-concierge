# Simulação realista (loja de perfumes) + logística reversa funcional

## Auditoria — como a logística reversa está hoje

Verificado no código:

- Na Inbox existem dois botões: "Gerar etiqueta de reversa" e "Solicitar reembolso" (`src/routes/_authenticated/inbox.tsx`, linhas ~760-775). Ambos apenas disparam um toast — não criam protocolo, não geram etiqueta, não mudam estado, não gravam nada e não aparecem na conversa.
- Existe o tipo de automação `reverse_logistics` (`src/services/types.ts`) e itens de linha do tempo nos mocks, mas eles são estáticos: nenhum é criado por ação do operador.
- Não existe tabela, server function nem status de retorno (aguardando coleta → coletado → recebido → reembolsado). Não há rastreio nem prazo.

Conclusão: hoje a reversa é decorativa. O plano abaixo a torna um fluxo completo e operável (dentro do Modo Demonstração, sem gravar em banco), com o desenho pronto para ligar em transportadora/gateway reais depois.

## 1. Todo o cenário vira loja de perfumes

Substituir o cenário de pousada por uma perfumaria ("Maison Aroma"), mantendo a mesma estrutura de dados. Oito conversas em WhatsApp, Instagram, e-mail e chat do site:

1. Frasco chegou vazando / lacre violado → reversa + reenvio
2. "Esse perfume é original?" → IA responde com nota fiscal e certificado
3. Não gostou da fixação, quer trocar por outro → troca com diferença de valor
4. Pedido não chegou no prazo → rastreio + reenvio expresso
5. Alergia à fragrância → reembolso integral (direito de arrependimento, 7 dias)
6. Dúvida de recomendação: "amadeirado para o inverno, até R$ 400" → venda assistida
7. Recebeu o perfume errado (trocado no picking) → coleta + envio correto
8. Cliente irritado, segundo contato sem resposta → SLA estourado, prioridade máxima

A base de conhecimento passa a ter: Política de Trocas e Devoluções, Certificado de Autenticidade, Guia de Famílias Olfativas, Prazos e Fretes, Cuidados e Conservação. As respostas do chat de teste (RAG) citam esses documentos.

## 2. Simulação ao vivo

Botão em Configurações → Integrações: **"Iniciar atendimento ao vivo"**. Ao clicar, abre a Inbox e uma nova conversa de perfume entra em tempo real:

- a mensagem do cliente chega com badge "novo";
- aparece "IA digitando…" por alguns segundos;
- a IA responde citando a fonte da base de conhecimento;
- o cliente responde de volta e a IA conclui o caso (etiqueta emitida, reembolso aberto ou venda fechada);
- cada passo cria um item na linha do tempo de automações e atualiza sentimento, SLA e métricas do dashboard.

Controles: iniciar, pausar e reiniciar a simulação; velocidade normal/rápida.

## 3. Logística reversa funcional

Um fluxo real de ponta a ponta dentro da demonstração:

- **Gerar etiqueta de reversa** abre um formulário: motivo (vazamento, produto errado, avaria, arrependimento, alergia), item do pedido, e se é coleta domiciliar ou postagem em agência. Ao confirmar, gera protocolo (RMA-XXXXX), código de rastreio, transportadora e prazo — e envia automaticamente a mensagem com a etiqueta ao cliente na conversa.
- **Solicitar reembolso** abre formulário com valor (total ou parcial), forma (estorno no cartão, Pix, crédito na loja) e vínculo com o RMA; gera protocolo e prazo, e avisa o cliente.
- **Painel de reversa** no contexto do cliente mostrando o caso aberto com status em etapas: Solicitado → Etiqueta emitida → Em trânsito → Recebido na loja → Conferido → Reembolsado. Na simulação, os status avançam ao longo do tempo.
- Nova página **Reversas** no menu, listando todos os casos com filtro por status, motivo e canal, além de indicadores: casos abertos, tempo médio de resolução, valor em reembolso e principais motivos.

Tudo isso funciona em modo demonstração sem tocar no banco. O que ainda depende de integração real (contrato de transportadora para etiqueta, gateway para estorno, ERP do estoque) fica explicitamente indicado na interface.

## Detalhes técnicos

- Reescrever `src/mocks/demo-scenario.ts` para o domínio de perfumaria (conversas, contexto/LTV, docs, Q&A, métricas, `demoRagAnswer`).
- Novo `src/lib/demo-live.ts`: store Zustand com o roteiro da conversa ao vivo (timers, etapas, digitando), publicando na mesma fonte que a Inbox lê em modo demo.
- Novo `src/lib/reverse-logistics.ts`: store de casos de reversa (criação de RMA, geração de código/rastreio, avanço de status) — sem banco.
- Novos componentes: diálogos de reversa e reembolso, `ReverseCasePanel` no painel de contexto, e rota `src/routes/_authenticated/reversas.tsx` com o item na sidebar.
- Substituir os toasts em `src/routes/_authenticated/inbox.tsx` pelos diálogos, mantendo o toast como confirmação final.
- Nenhuma migração de banco; nenhuma chamada a server function em modo demonstração.
