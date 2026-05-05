import type { Conversation, KnowledgeDoc, QAPair } from "@/services/types";

export const mockConversations: Conversation[] = [
  {
    id: "c1",
    customerName: "Helena Vasconcellos",
    customerInitials: "HV",
    channel: "whatsapp",
    sentiment: "frustrated",
    preview: "Recebi a peça com um defeito na costura interna…",
    unread: 2,
    updatedAt: "2026-05-05T13:42:00Z",
    aiHandling: true,
    messages: [
      { id: "m1", author: "customer", content: "Boa tarde. Recebi o vestido ontem mas há um defeito na costura interna.", timestamp: "2026-05-05T13:30:00Z" },
      { id: "m2", author: "ai", content: "Sinto muito, Helena. Posso providenciar a coleta sem custo e o reembolso integral, conforme nossa política de troca. Confirma o endereço de origem?", timestamp: "2026-05-05T13:31:00Z", aiReasoning: "Política de troca art. 3 — defeito de fabricação em até 7 dias autoriza coleta + reembolso." },
      { id: "m3", author: "customer", content: "Sim, mesmo endereço. Mas eu queria entender por que isso aconteceu.", timestamp: "2026-05-05T13:42:00Z" },
    ],
    context: {
      ltv: 84200,
      averageTicket: 4210,
      totalOrders: 20,
      lastPurchases: [
        { id: "o1", item: "Vestido seda Toile", date: "2026-05-02", amount: 3890 },
        { id: "o2", item: "Bolsa couro Nappa", date: "2026-04-12", amount: 6200 },
      ],
      tags: ["VIP", "Atelier SP"],
      aiReasoning: "Cliente VIP com histórico positivo. Priorizar resolução com coleta + reembolso e oferecer voucher de cortesia.", automations: [
      { id: "a1", type: "handover", title: "Transbordo para humano", description: "IA encaminhou ao time após detectar frustração.", status: "success", timestamp: "2026-04-21T15:14:00Z", payload: { agent: "Júlia Vianna", reason: "sentiment=frustrated" } },
      { id: "a2", type: "reverse_logistics", title: "Logística reversa disparada", description: "Coleta agendada com transportadora premium.", status: "success", timestamp: "2026-03-18T11:02:00Z", payload: { trackingId: "RL77821", courier: "Premium Express" } },
      { id: "a3", type: "ai_response", title: "Resposta automatizada", description: "IA respondeu com base em política de troca art. 3.", status: "success", timestamp: "2026-05-05T13:31:00Z" }
    ] },
  },
  {
    id: "c2",
    customerName: "Rafael Otaviano",
    customerInitials: "RO",
    channel: "email",
    sentiment: "neutral",
    preview: "Gostaria de confirmar o prazo de entrega para Lisboa…",
    unread: 0,
    updatedAt: "2026-05-05T12:10:00Z",
    aiHandling: true,
    messages: [
      { id: "m1", author: "customer", content: "Olá, gostaria de confirmar o prazo de entrega internacional para Lisboa.", timestamp: "2026-05-05T11:50:00Z" },
      { id: "m2", author: "ai", content: "Bom dia, Rafael. Para Lisboa o prazo médio é de 7 a 10 dias úteis via courier expresso, com rastreio dedicado.", timestamp: "2026-05-05T11:51:00Z", aiReasoning: "Tabela de prazos internacionais — zona EU." },
    ],
    context: { ltv: 12400, averageTicket: 3100, totalOrders: 4, lastPurchases: [{ id: "o1", item: "Sapato Oxford", date: "2026-03-20", amount: 3100 }], tags: ["Internacional"], automations: [
      { id: "a1", type: "handover", title: "Transbordo para humano", description: "IA encaminhou ao time após detectar frustração.", status: "success", timestamp: "2026-04-21T15:14:00Z", payload: { agent: "Júlia Vianna", reason: "sentiment=frustrated" } },
      { id: "a2", type: "reverse_logistics", title: "Logística reversa disparada", description: "Coleta agendada com transportadora premium.", status: "success", timestamp: "2026-03-18T11:02:00Z", payload: { trackingId: "RL77821", courier: "Premium Express" } },
      { id: "a3", type: "ai_response", title: "Resposta automatizada", description: "IA respondeu com base em política de troca art. 3.", status: "success", timestamp: "2026-05-05T13:31:00Z" }
    ] },
  },
  {
    id: "c3",
    customerName: "Marina Lippi",
    customerInitials: "ML",
    channel: "web",
    sentiment: "satisfied",
    preview: "Obrigada pelo atendimento impecável!",
    unread: 0,
    updatedAt: "2026-05-05T10:05:00Z",
    aiHandling: false,
    messages: [
      { id: "m1", author: "customer", content: "Obrigada pelo atendimento impecável! Vocês superaram a expectativa.", timestamp: "2026-05-05T10:05:00Z" },
      { id: "m2", author: "agent", content: "Marina, obrigada. É um prazer atendê-la.", timestamp: "2026-05-05T10:08:00Z" },
    ],
    context: { ltv: 32000, averageTicket: 2666, totalOrders: 12, lastPurchases: [{ id: "o1", item: "Lenço seda", date: "2026-04-30", amount: 980 }], tags: ["Recorrente"], automations: [
      { id: "a1", type: "handover", title: "Transbordo para humano", description: "IA encaminhou ao time após detectar frustração.", status: "success", timestamp: "2026-04-21T15:14:00Z", payload: { agent: "Júlia Vianna", reason: "sentiment=frustrated" } },
      { id: "a2", type: "reverse_logistics", title: "Logística reversa disparada", description: "Coleta agendada com transportadora premium.", status: "success", timestamp: "2026-03-18T11:02:00Z", payload: { trackingId: "RL77821", courier: "Premium Express" } },
      { id: "a3", type: "ai_response", title: "Resposta automatizada", description: "IA respondeu com base em política de troca art. 3.", status: "success", timestamp: "2026-05-05T13:31:00Z" }
    ] },
  },
  {
    id: "c4",
    customerName: "Bernardo Aché",
    customerInitials: "BA",
    channel: "whatsapp",
    sentiment: "frustrated",
    preview: "Já é a segunda vez que peço uma posição…",
    unread: 3,
    updatedAt: "2026-05-05T09:33:00Z",
    aiHandling: false,
    messages: [
      { id: "m1", author: "customer", content: "Já é a segunda vez que peço posição do meu pedido #88421.", timestamp: "2026-05-05T09:30:00Z" },
    ],
    context: { ltv: 5400, averageTicket: 5400, totalOrders: 1, lastPurchases: [{ id: "o1", item: "Casaco lã", date: "2026-04-29", amount: 5400 }], tags: ["Primeira compra"], automations: [
      { id: "a1", type: "handover", title: "Transbordo para humano", description: "IA encaminhou ao time após detectar frustração.", status: "success", timestamp: "2026-04-21T15:14:00Z", payload: { agent: "Júlia Vianna", reason: "sentiment=frustrated" } },
      { id: "a2", type: "reverse_logistics", title: "Logística reversa disparada", description: "Coleta agendada com transportadora premium.", status: "success", timestamp: "2026-03-18T11:02:00Z", payload: { trackingId: "RL77821", courier: "Premium Express" } },
      { id: "a3", type: "ai_response", title: "Resposta automatizada", description: "IA respondeu com base em política de troca art. 3.", status: "success", timestamp: "2026-05-05T13:31:00Z" }
    ] },
  },
  {
    id: "c5",
    customerName: "Sophia Khouri",
    customerInitials: "SK",
    channel: "email",
    sentiment: "neutral",
    preview: "Existe lista de espera para a coleção cápsula?",
    unread: 1,
    updatedAt: "2026-05-04T19:20:00Z",
    aiHandling: true,
    messages: [
      { id: "m1", author: "customer", content: "Existe lista de espera para a coleção cápsula de outono?", timestamp: "2026-05-04T19:20:00Z" },
    ],
    context: { ltv: 21000, averageTicket: 3500, totalOrders: 6, lastPurchases: [], tags: ["Aficionada"], automations: [
      { id: "a1", type: "handover", title: "Transbordo para humano", description: "IA encaminhou ao time após detectar frustração.", status: "success", timestamp: "2026-04-21T15:14:00Z", payload: { agent: "Júlia Vianna", reason: "sentiment=frustrated" } },
      { id: "a2", type: "reverse_logistics", title: "Logística reversa disparada", description: "Coleta agendada com transportadora premium.", status: "success", timestamp: "2026-03-18T11:02:00Z", payload: { trackingId: "RL77821", courier: "Premium Express" } },
      { id: "a3", type: "ai_response", title: "Resposta automatizada", description: "IA respondeu com base em política de troca art. 3.", status: "success", timestamp: "2026-05-05T13:31:00Z" }
    ] },
  },
  {
    id: "c6",
    customerName: "Tomás Albuquerque",
    customerInitials: "TA",
    channel: "whatsapp",
    sentiment: "neutral",
    preview: "Posso reservar para retirada em loja?",
    unread: 0,
    updatedAt: "2026-05-04T16:11:00Z",
    aiHandling: true,
    messages: [{ id: "m1", author: "customer", content: "Posso reservar a peça para retirada em loja?", timestamp: "2026-05-04T16:11:00Z" }],
    context: { ltv: 9900, averageTicket: 3300, totalOrders: 3, lastPurchases: [], tags: [], automations: [
      { id: "a1", type: "handover", title: "Transbordo para humano", description: "IA encaminhou ao time após detectar frustração.", status: "success", timestamp: "2026-04-21T15:14:00Z", payload: { agent: "Júlia Vianna", reason: "sentiment=frustrated" } },
      { id: "a2", type: "reverse_logistics", title: "Logística reversa disparada", description: "Coleta agendada com transportadora premium.", status: "success", timestamp: "2026-03-18T11:02:00Z", payload: { trackingId: "RL77821", courier: "Premium Express" } },
      { id: "a3", type: "ai_response", title: "Resposta automatizada", description: "IA respondeu com base em política de troca art. 3.", status: "success", timestamp: "2026-05-05T13:31:00Z" }
    ] },
  },
  {
    id: "c7",
    customerName: "Isadora Penteado",
    customerInitials: "IP",
    channel: "web",
    sentiment: "satisfied",
    preview: "A embalagem foi um espetáculo à parte.",
    unread: 0,
    updatedAt: "2026-05-04T11:02:00Z",
    aiHandling: false,
    messages: [{ id: "m1", author: "customer", content: "A embalagem foi um espetáculo à parte. Parabéns à equipe.", timestamp: "2026-05-04T11:02:00Z" }],
    context: { ltv: 41200, averageTicket: 4120, totalOrders: 10, lastPurchases: [], tags: ["VIP"], automations: [
      { id: "a1", type: "handover", title: "Transbordo para humano", description: "IA encaminhou ao time após detectar frustração.", status: "success", timestamp: "2026-04-21T15:14:00Z", payload: { agent: "Júlia Vianna", reason: "sentiment=frustrated" } },
      { id: "a2", type: "reverse_logistics", title: "Logística reversa disparada", description: "Coleta agendada com transportadora premium.", status: "success", timestamp: "2026-03-18T11:02:00Z", payload: { trackingId: "RL77821", courier: "Premium Express" } },
      { id: "a3", type: "ai_response", title: "Resposta automatizada", description: "IA respondeu com base em política de troca art. 3.", status: "success", timestamp: "2026-05-05T13:31:00Z" }
    ] },
  },
  {
    id: "c8",
    customerName: "Gabriel Fontoura",
    customerInitials: "GF",
    channel: "email",
    sentiment: "frustrated",
    preview: "Tive cobrança duplicada no cartão.",
    unread: 1,
    updatedAt: "2026-05-03T22:45:00Z",
    aiHandling: false,
    messages: [{ id: "m1", author: "customer", content: "Tive uma cobrança duplicada no cartão referente ao pedido #88002.", timestamp: "2026-05-03T22:45:00Z" }],
    context: { ltv: 7600, averageTicket: 3800, totalOrders: 2, lastPurchases: [], tags: [], automations: [
      { id: "a1", type: "handover", title: "Transbordo para humano", description: "IA encaminhou ao time após detectar frustração.", status: "success", timestamp: "2026-04-21T15:14:00Z", payload: { agent: "Júlia Vianna", reason: "sentiment=frustrated" } },
      { id: "a2", type: "reverse_logistics", title: "Logística reversa disparada", description: "Coleta agendada com transportadora premium.", status: "success", timestamp: "2026-03-18T11:02:00Z", payload: { trackingId: "RL77821", courier: "Premium Express" } },
      { id: "a3", type: "ai_response", title: "Resposta automatizada", description: "IA respondeu com base em política de troca art. 3.", status: "success", timestamp: "2026-05-05T13:31:00Z" }
    ] },
  },
];

export const mockKnowledgeDocs: KnowledgeDoc[] = [
  { id: "d1", name: "Politica_Troca_2024.pdf", type: "PDF", size: "412 KB", status: "indexed", updatedAt: "2026-04-01" },
  { id: "d2", name: "Manual_Atendimento_VIP.pdf", type: "PDF", size: "1.2 MB", status: "indexed", updatedAt: "2026-03-22" },
  { id: "d3", name: "Tabela_Prazos_Internacionais.xlsx", type: "XLSX", size: "88 KB", status: "indexing", updatedAt: "2026-05-04" },
];

export const mockQA: QAPair[] = [
  { id: "q1", question: "Vocês fazem ajustes sob medida?", answer: "Sim, oferecemos ajustes no atelier sem custo para clientes VIP.", updatedAt: "2026-04-10" },
  { id: "q2", question: "Qual o prazo para reembolso?", answer: "Reembolso é processado em até 7 dias úteis após o recebimento da peça.", updatedAt: "2026-03-30" },
];

export const mockMetrics = {
  resolutionRate: 0.78,
  avgHandleTime: "2m 14s",
  humanHandoffs: 12,
  activeConversations: 34,
  weeklyVolume: [
    { day: "Qua", automated: 142, human: 38 },
    { day: "Qui", automated: 168, human: 41 },
    { day: "Sex", automated: 195, human: 52 },
    { day: "Sáb", automated: 220, human: 49 },
    { day: "Dom", automated: 180, human: 33 },
    { day: "Seg", automated: 210, human: 47 },
    { day: "Ter", automated: 244, human: 51 },
  ],
};
