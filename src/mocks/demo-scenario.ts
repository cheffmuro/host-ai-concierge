/**
 * Cenário de demonstração: loja de perfumes ("Maison Aroma") com clientes
 * reais fazendo perguntas em WhatsApp, Instagram, e-mail e chat do site.
 * Usado apenas quando o Modo Demonstração está ligado.
 */
import type { Conversation, KnowledgeDoc, QAPair } from "@/services/types";

const now = Date.now();
/** minutos atrás → ISO */
const ago = (min: number) => new Date(now - min * 60_000).toISOString();

const initials = (name: string) =>
  name.split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

export const demoConversations: Conversation[] = [
  {
    id: "demo-1",
    customerName: "Camila Rezende",
    customerInitials: initials("Camila Rezende"),
    customerIdentifier: "+5511998877221",
    channel: "whatsapp",
    sentiment: "neutral",
    preview: "Perfeito, já imprimi a etiqueta. Obrigada!",
    unread: 0,
    updatedAt: ago(6),
    aiHandling: true,
    messages: [
      { id: "d1m1", author: "customer", content: "Oi! O frasco do Noir Absolu chegou vazando, a caixa estava toda manchada. Pedido #48210.", timestamp: ago(16), status: "delivered" },
      { id: "d1m2", author: "ai", content: "Que chato, Camila — sinto muito. Avaria de transporte dá direito a troca imediata sem custo. Já abri a coleta na sua casa e reservei outro frasco de 100ml do Noir Absolu no estoque.", timestamp: ago(15), status: "delivered", aiReasoning: "Base: Política de Trocas e Devoluções — avaria de transporte em até 7 dias = coleta + reenvio sem custo." },
      { id: "d1m3", author: "ai", content: "Protocolo RMA-48210 ✅ Etiqueta de reversa emitida (Loggi, código LG884120BR). A coleta passa amanhã entre 9h e 18h. O reenvio sai assim que o frasco for conferido.", timestamp: ago(14), status: "delivered" },
      { id: "d1m4", author: "customer", content: "Perfeito, já imprimi a etiqueta. Obrigada!", timestamp: ago(6), status: "delivered" },
    ],
    context: {
      ltv: 4820,
      averageTicket: 402,
      totalOrders: 12,
      lastPurchases: [
        { id: "r1", item: "Noir Absolu EDP 100ml", date: "2026-08-09", amount: 589 },
        { id: "r2", item: "Vanille Blanche EDP 50ml", date: "2026-06-11", amount: 349 },
      ],
      tags: ["Cliente recorrente", "Reversa aberta"],
      aiReasoning: "Cliente recorrente sem histórico de abuso de trocas. Reversa aprovada automaticamente.",
      source: "Loja própria",
      automations: [
        { id: "d1a1", type: "ai_response", title: "Resposta automatizada", description: "IA aplicou a política de avaria de transporte.", status: "success", timestamp: ago(15) },
        { id: "d1a2", type: "reverse_logistics", title: "Etiqueta de reversa emitida", description: "Coleta domiciliar agendada com a Loggi.", status: "success", timestamp: ago(14), payload: { protocol: "RMA-48210", tracking: "LG884120BR", courier: "Loggi" } },
      ],
    },
  },
  {
    id: "demo-2",
    customerName: "Bruno Sartori",
    customerInitials: initials("Bruno Sartori"),
    customerIdentifier: "+5521997712004",
    channel: "whatsapp",
    sentiment: "satisfied",
    preview: "Show, comprei confiante então!",
    unread: 0,
    updatedAt: ago(28),
    aiHandling: true,
    messages: [
      { id: "d2m1", author: "customer", content: "Esse Bleu Intense de vocês é original? Tá bem mais barato que na loja física.", timestamp: ago(33), status: "delivered" },
      { id: "d2m2", author: "ai", content: "É 100% original, Bruno. Importamos direto do distribuidor autorizado e todo pedido sai com nota fiscal e selo de autenticidade no lacre. O preço menor é porque trabalhamos só com e-commerce, sem custo de loja física.", timestamp: ago(32), status: "delivered", aiReasoning: "Documento indexado: Certificado de Autenticidade (seção 2) + Guia de Preços." },
      { id: "d2m3", author: "customer", content: "Show, comprei confiante então!", timestamp: ago(28), status: "delivered" },
    ],
    context: {
      ltv: 890,
      averageTicket: 445,
      totalOrders: 2,
      lastPurchases: [{ id: "r1", item: "Bleu Intense EDP 100ml", date: "2026-08-13", amount: 519 }],
      tags: ["Primeira compra"],
      source: "WhatsApp",
      automations: [
        { id: "d2a1", type: "ai_response", title: "Resposta automatizada", description: "Objeção de autenticidade respondida em 11s.", status: "success", timestamp: ago(32) },
      ],
    },
  },
  {
    id: "demo-3",
    customerName: "Patrícia Nunes",
    customerInitials: initials("Patrícia Nunes"),
    customerIdentifier: "patricia.nunes@gmail.com",
    channel: "email",
    sentiment: "neutral",
    preview: "Queria trocar por um mais marcante, dá?",
    unread: 1,
    updatedAt: ago(41),
    aiHandling: true,
    messages: [
      { id: "d3m1", author: "customer", content: "Boa tarde. Comprei o Vanille Blanche mas a fixação some em 2 horas em mim. Queria trocar por um mais marcante, dá?", timestamp: ago(46), status: "delivered" },
      { id: "d3m2", author: "ai", content: "Dá sim, Patrícia. Você está no prazo de 7 dias e o frasco tem mais de 90% do conteúdo, então a troca é liberada. Para maior fixação eu sugeriria o Oud Royal EDP (R$ 690) ou o Noir Absolu EDP (R$ 589) — ambos são amadeirados com 8 a 10h de projeção.", timestamp: ago(44), status: "delivered", aiReasoning: "Base: Política de Trocas — arrependimento em 7 dias + Guia de Famílias Olfativas para recomendação." },
      { id: "d3m3", author: "customer", content: "Queria trocar por um mais marcante, dá?", timestamp: ago(41), status: "delivered" },
    ],
    context: {
      ltv: 1240,
      averageTicket: 310,
      totalOrders: 4,
      lastPurchases: [{ id: "r1", item: "Vanille Blanche EDP 50ml", date: "2026-08-10", amount: 349 }],
      tags: ["Troca em análise"],
      source: "Loja própria",
      automations: [
        { id: "d3a1", type: "reverse_logistics", title: "Troca cotada", description: "IA calculou diferença de valor e aguarda escolha do cliente.", status: "pending", timestamp: ago(44) },
      ],
    },
  },
  {
    id: "demo-4",
    customerName: "Eduardo Lima",
    customerInitials: initials("Eduardo Lima"),
    customerIdentifier: "+5531988220145",
    channel: "whatsapp",
    sentiment: "frustrated",
    preview: "Faz 12 dias e o rastreio não sai do lugar. Isso é inaceitável.",
    unread: 2,
    updatedAt: ago(9),
    aiHandling: false,
    messages: [
      { id: "d4m1", author: "customer", content: "Faz 12 dias e o rastreio do pedido #48155 não sai do lugar. Comprei pro aniversário da minha esposa, que era ontem.", timestamp: ago(19), status: "delivered" },
      { id: "d4m2", author: "ai", content: "Sinto muito, Eduardo. Confirmei que o objeto está parado no CD desde dia 03 — é extravio em trânsito. Já acionei a transportadora e chamei um atendente humano para resolver com prioridade.", timestamp: ago(18), status: "delivered", aiReasoning: "Prazo estourado + sentimento negativo → transbordo obrigatório para humano." },
      { id: "d4m3", author: "agent", content: "Eduardo, aqui é a Júlia. Não vamos esperar a transportadora: já despachei um novo frasco do Oud Royal hoje em Sedex 10 e coloquei um miniatura de 10ml de cortesia. Código sai em 1h.", timestamp: ago(16), status: "delivered" },
      { id: "d4m4", author: "customer", content: "Faz 12 dias e o rastreio não sai do lugar. Isso é inaceitável.", timestamp: ago(9), status: "delivered" },
    ],
    context: {
      ltv: 2480,
      averageTicket: 620,
      totalOrders: 4,
      lastPurchases: [{ id: "r1", item: "Oud Royal EDP 75ml", date: "2026-08-02", amount: 690 }],
      tags: ["Atenção", "Reenvio autorizado"],
      aiReasoning: "Risco alto de avaliação negativa e chargeback. Manter humano até a entrega confirmada.",
      source: "Loja própria",
      notes: "Reenvio expresso + brinde autorizado pela gerência.",
      automations: [
        { id: "d4a1", type: "handover", title: "Transbordo para humano", description: "IA detectou frustração e atraso de entrega; escalou em 38s.", status: "success", timestamp: ago(18), payload: { agent: "Júlia Vianna", reason: "sentiment=frustrated" } },
        { id: "d4a2", type: "reverse_logistics", title: "Reenvio expresso", description: "Novo envio Sedex 10 sem custo para o cliente.", status: "success", timestamp: ago(16), payload: { tracking: "BR992144507BR" } },
      ],
    },
  },
  {
    id: "demo-5",
    customerName: "Larissa Prado",
    customerInitials: initials("Larissa Prado"),
    customerIdentifier: "larissa.prado@outlook.com",
    channel: "email",
    sentiment: "neutral",
    preview: "Tive reação alérgica, preciso devolver.",
    unread: 0,
    updatedAt: ago(52),
    aiHandling: true,
    messages: [
      { id: "d5m1", author: "customer", content: "Tive reação alérgica ao Ambre Solaire que comprei semana passada. Manchas no pulso. Preciso devolver.", timestamp: ago(58), status: "delivered" },
      { id: "d5m2", author: "ai", content: "Larissa, lamento muito. Reação alérgica dá direito a devolução integral mesmo com o frasco aberto. Reembolso de R$ 459 aprovado e a coleta é por nossa conta.", timestamp: ago(56), status: "delivered", aiReasoning: "Base: Política de Trocas e Devoluções — reação adversa = devolução integral, item descartado." },
      { id: "d5m3", author: "ai", content: "Protocolo RMA-48377 criado. Etiqueta de reversa enviada por e-mail e estorno de R$ 459 no cartão final 4412 em até 7 dias úteis após a coleta.", timestamp: ago(52), status: "delivered" },
    ],
    context: {
      ltv: 6540,
      averageTicket: 545,
      totalOrders: 12,
      lastPurchases: [{ id: "r1", item: "Ambre Solaire EDP 50ml", date: "2026-08-07", amount: 459 }],
      tags: ["VIP", "Reembolso em curso"],
      source: "Loja própria",
      automations: [
        { id: "d5a1", type: "reverse_logistics", title: "Reembolso solicitado", description: "Estorno integral disparado no gateway.", status: "success", timestamp: ago(52), payload: { protocol: "RMA-48377", amount: 459 } },
        { id: "d5a2", type: "ai_response", title: "Resposta automatizada", description: "Política de reação adversa aplicada sem intervenção humana.", status: "success", timestamp: ago(56) },
      ],
    },
  },
  {
    id: "demo-6",
    customerName: "Marcelo Tanaka",
    customerInitials: initials("Marcelo Tanaka"),
    customerIdentifier: "@marcelotanaka",
    channel: "instagram",
    sentiment: "satisfied",
    preview: "Fechou, vou levar o Noir Absolu!",
    unread: 0,
    updatedAt: ago(88),
    aiHandling: true,
    messages: [
      { id: "d6m1", author: "customer", content: "Queria um amadeirado pro inverno, até R$ 400. O que vocês indicam?", timestamp: ago(96), status: "delivered" },
      { id: "d6m2", author: "ai", content: "Ótima pedida. Dentro de R$ 400 eu indico o Noir Absolu 50ml (R$ 389) — amadeirado especiado, projeção alta, ideal para frio — ou o Cedre Nuit 50ml (R$ 359), mais seco e discreto para o dia a dia. Ambos com 8h+ de fixação.", timestamp: ago(94), status: "delivered", aiReasoning: "Base: Guia de Famílias Olfativas — amadeirados por faixa de preço e estação." },
      { id: "d6m3", author: "customer", content: "Fechou, vou levar o Noir Absolu!", timestamp: ago(88), status: "delivered" },
    ],
    context: {
      ltv: 1520,
      averageTicket: 380,
      totalOrders: 4,
      lastPurchases: [{ id: "r1", item: "Cedre Nuit EDP 50ml", date: "2026-05-22", amount: 359 }],
      tags: ["Instagram", "Venda assistida"],
      source: "Instagram Direct",
      automations: [
        { id: "d6a1", type: "ai_response", title: "Recomendação de produto", description: "IA sugeriu 2 SKUs dentro do orçamento; cliente converteu.", status: "success", timestamp: ago(94) },
      ],
    },
  },
  {
    id: "demo-7",
    customerName: "Fernanda Alencar",
    customerInitials: initials("Fernanda Alencar"),
    customerIdentifier: "web-8841",
    channel: "web",
    sentiment: "neutral",
    preview: "Veio o perfume errado na caixa.",
    unread: 1,
    updatedAt: ago(4),
    aiHandling: false,
    messages: [
      { id: "d7m1", author: "customer", content: "Pedi o Rose Poudrée 50ml e veio o Vanille Blanche 30ml. Pedido #48402.", timestamp: ago(8), status: "delivered" },
      { id: "d7m2", author: "ai", content: "Erro nosso na separação, Fernanda — desculpa. Confirmando: pode me mandar a foto do lacre e do código do frasco recebido? Com isso eu já emito a reversa e libero o envio correto hoje.", timestamp: ago(6), status: "delivered", aiReasoning: "Base: Política de Trocas — item divergente exige conferência fotográfica antes da coleta." },
      { id: "d7m3", author: "customer", content: "Mandei a foto. O código é VB-30-2291.", timestamp: ago(4), status: "delivered" },
    ],
    context: {
      ltv: 980,
      averageTicket: 327,
      totalOrders: 3,
      lastPurchases: [{ id: "r1", item: "Rose Poudrée EDP 50ml", date: "2026-08-12", amount: 429 }],
      tags: ["Erro de picking"],
      source: "Chat do site",
      automations: [
        { id: "d7a1", type: "handover", title: "Transbordo para humano", description: "Divergência de item confirmada — aguardando operador emitir reversa.", status: "pending", timestamp: ago(4) },
      ],
    },
  },
  {
    id: "demo-8",
    customerName: "Ricardo Bastos",
    customerInitials: initials("Ricardo Bastos"),
    customerIdentifier: "+5541996550187",
    channel: "whatsapp",
    sentiment: "frustrated",
    preview: "Segunda vez que peço o status da devolução e ninguém responde.",
    unread: 3,
    updatedAt: ago(47),
    aiHandling: true,
    messages: [
      { id: "d8m1", author: "customer", content: "Segunda vez que peço o status da devolução e ninguém responde. RMA-48090.", timestamp: ago(47), status: "delivered" },
    ],
    context: {
      ltv: 5210,
      averageTicket: 521,
      totalOrders: 10,
      lastPurchases: [{ id: "r1", item: "Oud Royal EDP 75ml", date: "2026-07-28", amount: 690 }],
      tags: ["VIP", "SLA estourado"],
      aiReasoning: "Cliente VIP sem resposta há 47 minutos com reversa em aberto. Prioridade máxima na fila.",
      source: "Loja própria",
      automations: [],
    },
  },
];

export const demoKnowledgeDocs: KnowledgeDoc[] = [
  { id: "demo-doc-1", name: "Politica_de_Trocas_e_Devolucoes.pdf", type: "PDF", size: "318 KB", status: "indexed", updatedAt: "2026-07-02" },
  { id: "demo-doc-2", name: "Certificado_de_Autenticidade.pdf", type: "PDF", size: "142 KB", status: "indexed", updatedAt: "2026-07-19" },
  { id: "demo-doc-3", name: "Guia_de_Familias_Olfativas.docx", type: "DOCX", size: "96 KB", status: "indexed", updatedAt: "2026-08-01" },
  { id: "demo-doc-4", name: "Prazos_e_Fretes.pdf", type: "PDF", size: "204 KB", status: "indexed", updatedAt: "2026-08-05" },
  { id: "demo-doc-5", name: "Cuidados_e_Conservacao_2026.pdf", type: "PDF", size: "1.1 MB", status: "indexing", updatedAt: "2026-08-14" },
];

export const demoQA: QAPair[] = [
  { id: "demo-qa-1", question: "Os perfumes são originais?", answer: "Sim. Importados de distribuidor autorizado, com nota fiscal e selo de autenticidade no lacre.", updatedAt: "2026-07-19" },
  { id: "demo-qa-2", question: "Posso devolver um perfume aberto?", answer: "Sim, em até 7 dias, com no mínimo 90% do conteúdo. Em caso de reação alérgica, a devolução é integral mesmo com uso.", updatedAt: "2026-07-02" },
  { id: "demo-qa-3", question: "Qual o prazo de entrega?", answer: "Sudeste 2 a 4 dias úteis, demais regiões 4 a 8. Sedex 10 disponível no checkout.", updatedAt: "2026-08-05" },
  { id: "demo-qa-4", question: "Como funciona a logística reversa?", answer: "Emitimos etiqueta pré-paga: coleta domiciliar ou postagem em agência. Após a conferência, troca ou estorno em até 7 dias úteis.", updatedAt: "2026-08-01" },
];

const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const volumeSeed = [
  { automated: 96, human: 18 },
  { automated: 112, human: 21 },
  { automated: 104, human: 16 },
  { automated: 138, human: 27 },
  { automated: 151, human: 24 },
  { automated: 167, human: 31 },
  { automated: 143, human: 22 },
];

export const demoMetrics = {
  configured: true,
  resolutionRate: 0.82,
  avgHandleTime: "1m 48s",
  humanHandoffs: 9,
  activeConversations: demoConversations.length,
  weeklyVolume: volumeSeed.map((v, i) => {
    const d = new Date(now - (6 - i) * 86_400_000);
    return { day: dayNames[d.getDay()], ...v };
  }),
};

/** Respostas simuladas do RAG para o chat de teste da Base de Conhecimento. */
export function demoRagAnswer(query: string): { answer: string; source: string } {
  const q = query.toLowerCase();
  if (q.includes("original") || q.includes("autentic") || q.includes("falsific"))
    return { answer: "Todos os perfumes são originais, importados de distribuidor autorizado, com nota fiscal e selo de autenticidade no lacre.", source: "Certificado_de_Autenticidade.pdf" };
  if (q.includes("devolv") || q.includes("troca") || q.includes("reversa") || q.includes("arrepend"))
    return { answer: "Trocas e devoluções em até 7 dias com no mínimo 90% do conteúdo. Emitimos etiqueta pré-paga com coleta domiciliar ou postagem em agência.", source: "Politica_de_Trocas_e_Devolucoes.pdf" };
  if (q.includes("reembolso") || q.includes("estorno") || q.includes("cancel"))
    return { answer: "O estorno é processado em até 7 dias úteis após a conferência do frasco. Também é possível crédito imediato na loja com 10% de bônus.", source: "Politica_de_Trocas_e_Devolucoes.pdf" };
  if (q.includes("alerg") || q.includes("reação") || q.includes("irrit"))
    return { answer: "Em caso de reação adversa, a devolução é integral mesmo com o frasco usado, e a coleta é por nossa conta.", source: "Politica_de_Trocas_e_Devolucoes.pdf" };
  if (q.includes("prazo") || q.includes("entrega") || q.includes("frete") || q.includes("rastre"))
    return { answer: "Sudeste 2 a 4 dias úteis, demais regiões 4 a 8. Sedex 10 disponível. Atraso acima de 10 dias autoriza reenvio expresso sem custo.", source: "Prazos_e_Fretes.pdf" };
  if (q.includes("amadeirado") || q.includes("floral") || q.includes("cítrico") || q.includes("fixa") || q.includes("indica"))
    return { answer: "Amadeirados (Noir Absolu, Oud Royal, Cedre Nuit) têm 8h+ de fixação e vão bem no frio; florais e cítricos são mais leves, ideais para o dia.", source: "Guia_de_Familias_Olfativas.docx" };
  if (q.includes("conserv") || q.includes("guardar") || q.includes("valid"))
    return { answer: "Guarde longe de luz e calor, na embalagem original. Fechado, o perfume dura de 3 a 5 anos; aberto, cerca de 2 anos.", source: "Cuidados_e_Conservacao_2026.pdf" };
  return {
    answer: "Com base nos documentos indexados, o procedimento padrão é confirmar o número do pedido, checar o prazo de 7 dias e emitir a etiqueta de logística reversa antes de qualquer estorno.",
    source: "Politica_de_Trocas_e_Devolucoes.pdf",
  };
}
