/**
 * Cenário de demonstração: pousada/hotel com hóspedes reais fazendo
 * perguntas em WhatsApp, Instagram, e-mail e chat do site.
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
    preview: "Perfeito, obrigada! Vou chegar por volta das 12h.",
    unread: 0,
    updatedAt: ago(6),
    aiHandling: true,
    messages: [
      { id: "d1m1", author: "customer", content: "Oi! Consigo fazer check-in antes das 15h? Meu voo chega 11h30.", timestamp: ago(14), status: "delivered" },
      { id: "d1m2", author: "ai", content: "Olá, Camila! Sim — o check-in antecipado a partir das 12h está disponível hoje, sem custo, pois a unidade está livre. Vou liberar sua chave digital para as 12h e você recebe o código por aqui.", timestamp: ago(13), status: "delivered", aiReasoning: "Base de conhecimento: Check-in/Check-out — antecipação gratuita quando não há reserva anterior na mesma diária." },
      { id: "d1m3", author: "ai", content: "Chave digital emitida ✅ Código de acesso: 4471. Válido a partir das 12h de hoje.", timestamp: ago(12), status: "delivered" },
      { id: "d1m4", author: "customer", content: "Perfeito, obrigada! Vou chegar por volta das 12h.", timestamp: ago(6), status: "delivered" },
    ],
    context: {
      ltv: 4820,
      averageTicket: 1205,
      totalOrders: 4,
      lastPurchases: [
        { id: "r1", item: "Suíte Varanda · 3 diárias", date: "2026-08-14", amount: 1740 },
        { id: "r2", item: "Suíte Varanda · 2 diárias", date: "2026-02-11", amount: 1180 },
      ],
      tags: ["Hóspede recorrente", "Check-in hoje"],
      aiReasoning: "Hóspede recorrente sem ocorrências. Antecipação de check-in aprovada automaticamente.",
      source: "Booking",
      automations: [
        { id: "d1a1", type: "ai_response", title: "Resposta automatizada", description: "IA respondeu sobre check-in antecipado usando a política da casa.", status: "success", timestamp: ago(13) },
        { id: "d1a2", type: "ai_response", title: "Chave digital emitida", description: "Código de acesso gerado para 12h.", status: "success", timestamp: ago(12), payload: { code: "4471" } },
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
    preview: "Funcionou, valeu!",
    unread: 0,
    updatedAt: ago(28),
    aiHandling: true,
    messages: [
      { id: "d2m1", author: "customer", content: "Qual a senha do wi-fi?", timestamp: ago(32), status: "delivered" },
      { id: "d2m2", author: "ai", content: "Rede: Anfitriao_5G · Senha: bemvindo2026. Se cair, o roteador fica no armário do corredor — basta desligar 10s e ligar de novo.", timestamp: ago(32), status: "delivered", aiReasoning: "Documento indexado: Wi-Fi e eletrodomésticos (seção 1)." },
      { id: "d2m3", author: "customer", content: "Funcionou, valeu!", timestamp: ago(28), status: "delivered" },
    ],
    context: {
      ltv: 890,
      averageTicket: 890,
      totalOrders: 1,
      lastPurchases: [{ id: "r1", item: "Studio Centro · 2 diárias", date: "2026-08-13", amount: 890 }],
      tags: ["Primeira estadia"],
      source: "Airbnb",
      automations: [
        { id: "d2a1", type: "ai_response", title: "Resposta automatizada", description: "Wi-Fi respondido pela base de conhecimento em 11s.", status: "success", timestamp: ago(32) },
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
    preview: "Consigo sair só às 16h amanhã?",
    unread: 1,
    updatedAt: ago(41),
    aiHandling: true,
    messages: [
      { id: "d3m1", author: "customer", content: "Boa tarde. Consigo sair só às 16h amanhã? Meu voo é à noite.", timestamp: ago(44), status: "delivered" },
      { id: "d3m2", author: "ai", content: "Boa tarde, Patrícia. O late checkout até 16h tem taxa de 50% da diária (R$ 310). Posso reservar e lançar na sua conta — confirma?", timestamp: ago(43), status: "delivered", aiReasoning: "Base: Check-in/Check-out — late checkout após 13h cobra 50% da diária." },
      { id: "d3m3", author: "customer", content: "Consigo sair só às 16h amanhã?", timestamp: ago(41), status: "delivered" },
    ],
    context: {
      ltv: 3720,
      averageTicket: 1240,
      totalOrders: 3,
      lastPurchases: [{ id: "r1", item: "Suíte Jardim · 5 diárias", date: "2026-08-10", amount: 3100 }],
      tags: ["Estadia longa"],
      source: "Site próprio",
      automations: [
        { id: "d3a1", type: "ai_response", title: "Cotação de late checkout", description: "IA calculou taxa de 50% da diária e aguarda confirmação.", status: "pending", timestamp: ago(43) },
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
    preview: "O quarto não estava limpo na chegada. Isso é inaceitável.",
    unread: 2,
    updatedAt: ago(9),
    aiHandling: false,
    messages: [
      { id: "d4m1", author: "customer", content: "O quarto não estava limpo na chegada. Toalhas usadas no banheiro.", timestamp: ago(18), status: "delivered" },
      { id: "d4m2", author: "ai", content: "Sinto muito, Eduardo. Já acionei a equipe de limpeza com prioridade e chamei um atendente humano para acompanhar seu caso.", timestamp: ago(17), status: "delivered", aiReasoning: "Sentimento negativo + palavra-chave 'limpeza' → transbordo obrigatório para humano." },
      { id: "d4m3", author: "agent", content: "Eduardo, aqui é a Júlia da equipe. A camareira chega em 20 minutos e vamos aplicar um voucher de R$ 150 na sua estadia.", timestamp: ago(15), status: "delivered" },
      { id: "d4m4", author: "customer", content: "O quarto não estava limpo na chegada. Isso é inaceitável.", timestamp: ago(9), status: "delivered" },
    ],
    context: {
      ltv: 2480,
      averageTicket: 1240,
      totalOrders: 2,
      lastPurchases: [{ id: "r1", item: "Suíte Varanda · 2 diárias", date: "2026-08-14", amount: 1240 }],
      tags: ["Atenção", "Compensação aberta"],
      aiReasoning: "Risco de avaliação negativa. Manter atendimento humano até o encerramento.",
      source: "Booking",
      notes: "Voucher de R$ 150 autorizado pela gerência.",
      automations: [
        { id: "d4a1", type: "handover", title: "Transbordo para humano", description: "IA detectou frustração e escalou em 42s.", status: "success", timestamp: ago(17), payload: { agent: "Júlia Vianna", reason: "sentiment=frustrated" } },
        { id: "d4a2", type: "ai_response", title: "Chamado de limpeza", description: "Ordem de serviço prioritária aberta para a unidade 204.", status: "success", timestamp: ago(17) },
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
    preview: "Preciso cancelar e pedir reembolso da reserva de setembro.",
    unread: 0,
    updatedAt: ago(52),
    aiHandling: true,
    messages: [
      { id: "d5m1", author: "customer", content: "Preciso cancelar e pedir reembolso da reserva de setembro.", timestamp: ago(58), status: "delivered" },
      { id: "d5m2", author: "ai", content: "Larissa, sua reserva está a mais de 30 dias da data — cancelamento com reembolso integral de R$ 1.860. Já abri a solicitação e o estorno cai em até 7 dias úteis no cartão final 4412.", timestamp: ago(56), status: "delivered", aiReasoning: "Base: Política de reembolso — cancelamento >30 dias = 100% do valor." },
      { id: "d5m3", author: "ai", content: "Protocolo REF-20841 criado. Você recebe a confirmação por e-mail.", timestamp: ago(52), status: "delivered" },
    ],
    context: {
      ltv: 6540,
      averageTicket: 1635,
      totalOrders: 4,
      lastPurchases: [{ id: "r1", item: "Chalé Serra · 4 diárias", date: "2026-09-18", amount: 1860 }],
      tags: ["Reembolso em curso"],
      source: "Site próprio",
      automations: [
        { id: "d5a1", type: "reverse_logistics", title: "Reembolso solicitado", description: "Estorno integral disparado no gateway.", status: "success", timestamp: ago(52), payload: { protocol: "REF-20841", amount: 1860 } },
        { id: "d5a2", type: "ai_response", title: "Resposta automatizada", description: "Política de cancelamento aplicada sem intervenção humana.", status: "success", timestamp: ago(56) },
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
    preview: "Show, obrigado!",
    unread: 0,
    updatedAt: ago(88),
    aiHandling: true,
    messages: [
      { id: "d6m1", author: "customer", content: "Tem estacionamento no local? E como chego vindo da rodoviária?", timestamp: ago(95), status: "delivered" },
      { id: "d6m2", author: "ai", content: "Temos, sim: 1 vaga coberta por unidade, entrada pela Rua das Acácias, 210. Da rodoviária são 12 min de carro ou a linha 402 até o ponto 'Praça Central', a 300m da pousada.", timestamp: ago(94), status: "delivered", aiReasoning: "Base: Regras da casa — estacionamento e acesso." },
      { id: "d6m3", author: "customer", content: "Show, obrigado!", timestamp: ago(88), status: "delivered" },
    ],
    context: {
      ltv: 1520,
      averageTicket: 760,
      totalOrders: 2,
      lastPurchases: [],
      tags: ["Instagram"],
      source: "Instagram Direct",
      automations: [
        { id: "d6a1", type: "ai_response", title: "Resposta automatizada", description: "Rota e estacionamento respondidos pela IA.", status: "success", timestamp: ago(94) },
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
    preview: "O ar-condicionado do quarto não liga.",
    unread: 1,
    updatedAt: ago(4),
    aiHandling: false,
    messages: [
      { id: "d7m1", author: "customer", content: "O ar-condicionado do quarto não liga.", timestamp: ago(7), status: "delivered" },
      { id: "d7m2", author: "ai", content: "Vamos resolver. Confira se o disjuntor branco do painel ao lado da porta está para cima e se o controle está no modo COOL. Se continuar, aciono a manutenção agora.", timestamp: ago(6), status: "delivered", aiReasoning: "Base: Wi-Fi e eletrodomésticos — troubleshooting de ar-condicionado." },
      { id: "d7m3", author: "customer", content: "Já verifiquei, continua sem ligar.", timestamp: ago(4), status: "delivered" },
    ],
    context: {
      ltv: 980,
      averageTicket: 980,
      totalOrders: 1,
      lastPurchases: [{ id: "r1", item: "Studio Centro · 2 diárias", date: "2026-08-14", amount: 980 }],
      tags: ["Manutenção"],
      source: "Chat do site",
      automations: [
        { id: "d7a1", type: "handover", title: "Transbordo para humano", description: "Troubleshooting sem sucesso — chamado de manutenção encaminhado ao time.", status: "success", timestamp: ago(4) },
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
    preview: "Tem festa no quarto ao lado às 2h da manhã. Ninguém responde.",
    unread: 3,
    updatedAt: ago(47),
    aiHandling: true,
    messages: [
      { id: "d8m1", author: "customer", content: "Tem festa no quarto ao lado às 2h da manhã. Ninguém responde.", timestamp: ago(47), status: "delivered" },
    ],
    context: {
      ltv: 5210,
      averageTicket: 1042,
      totalOrders: 5,
      lastPurchases: [{ id: "r1", item: "Suíte Jardim · 3 diárias", date: "2026-08-13", amount: 1560 }],
      tags: ["VIP", "SLA estourado"],
      aiReasoning: "Hóspede VIP sem resposta há 47 minutos. Prioridade máxima na fila.",
      source: "Booking",
      automations: [],
    },
  },
];

export const demoKnowledgeDocs: KnowledgeDoc[] = [
  { id: "demo-doc-1", name: "Regras_da_Casa.pdf", type: "PDF", size: "318 KB", status: "indexed", updatedAt: "2026-07-02" },
  { id: "demo-doc-2", name: "WiFi_e_Eletrodomesticos.pdf", type: "PDF", size: "142 KB", status: "indexed", updatedAt: "2026-07-19" },
  { id: "demo-doc-3", name: "CheckIn_CheckOut.docx", type: "DOCX", size: "96 KB", status: "indexed", updatedAt: "2026-08-01" },
  { id: "demo-doc-4", name: "Politica_de_Reembolso.pdf", type: "PDF", size: "204 KB", status: "indexed", updatedAt: "2026-08-05" },
  { id: "demo-doc-5", name: "Guia_do_Bairro_2026.pdf", type: "PDF", size: "1.1 MB", status: "indexing", updatedAt: "2026-08-14" },
];

export const demoQA: QAPair[] = [
  { id: "demo-qa-1", question: "Qual a senha do wi-fi?", answer: "Rede Anfitriao_5G, senha bemvindo2026.", updatedAt: "2026-07-19" },
  { id: "demo-qa-2", question: "Aceitam pets?", answer: "Sim, até 10kg, com taxa de higienização de R$ 80 por estadia.", updatedAt: "2026-07-02" },
  { id: "demo-qa-3", question: "Qual o horário do café da manhã?", answer: "Das 7h às 10h no salão térreo; cesta antecipada mediante aviso na véspera.", updatedAt: "2026-08-01" },
  { id: "demo-qa-4", question: "Como funciona o late checkout?", answer: "Até 13h sem custo; até 16h com taxa de 50% da diária, sujeito a disponibilidade.", updatedAt: "2026-08-01" },
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
  if (q.includes("wi-fi") || q.includes("wifi") || q.includes("senha"))
    return { answer: "Rede Anfitriao_5G, senha bemvindo2026. O roteador fica no armário do corredor.", source: "WiFi_e_Eletrodomesticos.pdf" };
  if (q.includes("check-in") || q.includes("checkin") || q.includes("chegada"))
    return { answer: "Check-in a partir das 15h; antecipação gratuita a partir das 12h quando a unidade está livre.", source: "CheckIn_CheckOut.docx" };
  if (q.includes("checkout") || q.includes("check-out") || q.includes("saída"))
    return { answer: "Checkout até 11h. Late checkout até 13h sem custo e até 16h com taxa de 50% da diária.", source: "CheckIn_CheckOut.docx" };
  if (q.includes("reembolso") || q.includes("cancel"))
    return { answer: "Cancelamento com mais de 30 dias: reembolso integral. Entre 7 e 30 dias: 50%. Menos de 7 dias: sem reembolso.", source: "Politica_de_Reembolso.pdf" };
  if (q.includes("pet") || q.includes("cachorro") || q.includes("gato"))
    return { answer: "Pets até 10kg são aceitos, com taxa de higienização de R$ 80 por estadia.", source: "Regras_da_Casa.pdf" };
  if (q.includes("estacion") || q.includes("carro") || q.includes("vaga"))
    return { answer: "Uma vaga coberta por unidade, com entrada pela Rua das Acácias, 210.", source: "Regras_da_Casa.pdf" };
  return {
    answer: "Com base nos documentos indexados, o procedimento padrão é acionar a recepção pelo WhatsApp da casa; se for urgência de manutenção, a equipe atende em até 30 minutos.",
    source: "Regras_da_Casa.pdf",
  };
}
