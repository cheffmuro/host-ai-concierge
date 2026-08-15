/**
 * Atendimento ao vivo simulado — um cliente novo chega no WhatsApp com um
 * problema real (frasco vazando) e a plataforma resolve ponta a ponta:
 * IA responde com base na política, abre a logística reversa, emite etiqueta
 * e confirma o reembolso. Só roda em Modo Demonstração.
 */
import { create } from "zustand";
import type { AutomationEvent, Conversation, Message } from "@/services/types";
import { useReverseStore } from "@/lib/reverse-logistics";

const LIVE_ID = "demo-live";

const uid = () => `lv-${Math.random().toString(36).slice(2, 9)}`;

function baseConversation(): Conversation {
  const nowIso = new Date().toISOString();
  return {
    id: LIVE_ID,
    customerName: "Juliana Costa",
    customerInitials: "JC",
    customerIdentifier: "+5511974410388",
    channel: "whatsapp",
    sentiment: "frustrated",
    preview: "…",
    unread: 1,
    updatedAt: nowIso,
    aiHandling: true,
    messages: [],
    context: {
      ltv: 2140,
      averageTicket: 428,
      totalOrders: 5,
      lastPurchases: [
        { id: "lp1", item: "Rose Poudrée EDP 50ml", date: "2026-08-11", amount: 429 },
        { id: "lp2", item: "Noir Absolu EDP 50ml", date: "2026-04-03", amount: 389 },
      ],
      tags: ["Cliente recorrente", "Atendimento ao vivo"],
      source: "Loja própria",
      aiReasoning: "Cliente com 5 pedidos e nenhuma devolução anterior. Elegível a reversa automática.",
      automations: [],
    },
  };
}

type Step =
  | { kind: "message"; delay: number; typing?: number; message: Omit<Message, "id" | "timestamp"> }
  | { kind: "automation"; delay: number; event: Omit<AutomationEvent, "id" | "timestamp"> }
  | { kind: "case"; delay: number }
  | { kind: "sentiment"; delay: number; value: Conversation["sentiment"] };

const script: Step[] = [
  {
    kind: "message",
    delay: 400,
    message: {
      author: "customer",
      content: "Oi, boa tarde. Recebi hoje o Rose Poudrée 50ml e o frasco chegou vazando, a caixa toda encharcada. Pedido #48511. Sinceramente, fiquei bem chateada.",
      status: "delivered",
    },
  },
  {
    kind: "message",
    delay: 1200,
    typing: 2200,
    message: {
      author: "ai",
      content:
        "Oi, Juliana! Sinto muito por isso — não era para ter acontecido. Já localizei o pedido #48511 (Rose Poudrée EDP 50ml, R$ 429, entregue hoje). Avaria de transporte dá direito a troca imediata sem nenhum custo pra você. Prefere receber outro frasco igual ou o reembolso integral?",
      status: "delivered",
      aiReasoning: "Base: Política de Trocas e Devoluções — avaria de transporte em até 7 dias = coleta + reenvio ou estorno integral.",
    },
  },
  {
    kind: "automation",
    delay: 200,
    event: {
      type: "ai_response",
      title: "Pedido identificado",
      description: "IA cruzou o número do WhatsApp com o pedido #48511 e validou o prazo de 7 dias.",
      status: "success",
    },
  },
  {
    kind: "message",
    delay: 3200,
    message: { author: "customer", content: "Quero outro frasco igual, mas preciso que venha bem embalado dessa vez.", status: "delivered" },
  },
  { kind: "sentiment", delay: 200, value: "neutral" },
  {
    kind: "message",
    delay: 1000,
    typing: 2000,
    message: {
      author: "ai",
      content:
        "Combinado. Vou registrar como avaria com reenvio e sinalizar embalagem reforçada com proteção extra no frasco. Só confirmando o endereço de coleta: Rua Haddock Lobo, 1210 — Jardins, São Paulo/SP?",
      status: "delivered",
      aiReasoning: "Base: Guia de Embalagem — pedidos com avaria anterior seguem com proteção reforçada.",
    },
  },
  { kind: "message", delay: 2800, message: { author: "customer", content: "Isso mesmo, esse endereço.", status: "delivered" } },
  { kind: "case", delay: 1400 },
  {
    kind: "message",
    delay: 200,
    typing: 1800,
    message: {
      author: "ai",
      content: "Prontinho ✅ Protocolo aberto e etiqueta de logística reversa emitida — a coleta passa amanhã entre 9h e 18h, você não precisa imprimir nada. Assim que o frasco for conferido, o novo sai no mesmo dia com envio expresso por nossa conta.",
      status: "delivered",
      aiReasoning: "Ação executada: emissão de etiqueta pré-paga (coleta domiciliar) + reserva de estoque do SKU.",
    },
  },
  {
    kind: "message",
    delay: 1400,
    message: {
      author: "ai",
      content: "E pelo transtorno, adicionei um cupom de R$ 50 (AROMA50) na sua conta, válido por 90 dias. Precisa de mais alguma coisa?",
      status: "delivered",
    },
  },
  {
    kind: "automation",
    delay: 200,
    event: {
      type: "ai_response",
      title: "Cortesia aplicada",
      description: "Cupom AROMA50 gerado automaticamente por avaria confirmada.",
      status: "success",
      payload: { coupon: "AROMA50", value: 50 },
    },
  },
  {
    kind: "message",
    delay: 3000,
    message: { author: "customer", content: "Nossa, que rápido! Resolvido então. Muito obrigada 🙏", status: "delivered" },
  },
  { kind: "sentiment", delay: 200, value: "satisfied" },
];

interface LiveState {
  conversation: Conversation | null;
  typing: boolean;
  running: boolean;
  finished: boolean;
  start: () => string;
  stop: () => void;
  reset: () => void;
}

let timers: number[] = [];
const clearTimers = () => {
  timers.forEach((t) => window.clearTimeout(t));
  timers = [];
};

export const useDemoLiveStore = create<LiveState>((set, get) => ({
  conversation: null,
  typing: false,
  running: false,
  finished: false,

  start: () => {
    clearTimers();
    set({ conversation: baseConversation(), typing: false, running: true, finished: false });

    let at = 0;
    for (const step of script) {
      at += step.delay;
      if (step.kind === "message" && step.typing && step.message.author !== "customer") {
        const showTypingAt = at;
        at += step.typing;
        timers.push(
          window.setTimeout(() => {
            if (get().running) set({ typing: true });
          }, showTypingAt),
        );
      }
      const runAt = at;
      timers.push(
        window.setTimeout(() => {
          if (!get().running) return;
          apply(step, set, get);
        }, runAt),
      );
    }

    timers.push(
      window.setTimeout(() => set({ running: false, typing: false, finished: true }), at + 500),
    );

    return LIVE_ID;
  },

  stop: () => {
    clearTimers();
    set({ running: false, typing: false });
  },

  reset: () => {
    clearTimers();
    set({ conversation: null, typing: false, running: false, finished: false });
  },
}));

function apply(
  step: Step,
  set: (partial: Partial<LiveState>) => void,
  get: () => LiveState,
) {
  const conv = get().conversation;
  if (!conv) return;
  const nowIso = new Date().toISOString();

  if (step.kind === "message") {
    const msg: Message = { id: uid(), timestamp: nowIso, ...step.message };
    set({
      typing: false,
      conversation: {
        ...conv,
        messages: [...conv.messages, msg],
        preview: msg.content,
        updatedAt: nowIso,
        unread: msg.author === "customer" ? conv.unread + 1 : 0,
      },
    });
    return;
  }

  if (step.kind === "sentiment") {
    set({ conversation: { ...conv, sentiment: step.value } });
    return;
  }

  if (step.kind === "automation") {
    const evt: AutomationEvent = { id: uid(), timestamp: nowIso, ...step.event };
    set({ conversation: { ...conv, context: { ...conv.context, automations: [evt, ...conv.context.automations] } } });
    return;
  }

  // step.kind === "case" — cria o caso real de logística reversa
  const { reverseCase: created } = useReverseStore.getState().createCase({
    conversationId: conv.id,
    customerName: conv.customerName,
    customerIdentifier: conv.customerIdentifier,
    channel: conv.channel,
    reason: "vazamento",
    item: "Rose Poudrée EDP 50ml",
    amount: 429,
    pickup: "coleta",
    notes: "Avaria de transporte — reenvio com embalagem reforçada.",
  });
  const evt: AutomationEvent = {
    id: uid(),
    timestamp: nowIso,
    type: "reverse_logistics",
    title: "Reversa aguardando aprovação do supervisor",
    description: `Coleta domiciliar pré-agendada (${created.courier}) — etiqueta final pendente de aprovação.`,
    status: "pending",
    payload: { protocol: created.protocol, tracking: created.tracking },
  };

  set({
    conversation: {
      ...conv,
      context: {
        ...conv.context,
        tags: Array.from(new Set([...conv.context.tags, "Reversa aberta"])),
        automations: [evt, ...conv.context.automations],
      },
    },
  });
}

export const LIVE_CONVERSATION_ID = LIVE_ID;
