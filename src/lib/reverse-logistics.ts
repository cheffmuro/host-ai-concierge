/**
 * Logística reversa — casos de devolução/troca da loja de perfumes.
 *
 * Em Modo Demonstração tudo roda em memória (nenhuma escrita no banco e
 * nenhuma chamada a transportadora/gateway). O formato dos casos já é o que
 * será persistido quando a integração real de transportadora e de estorno
 * for ligada.
 */
import { create } from "zustand";
import type { Channel } from "@/services/types";

export type ReverseReason =
  | "vazamento"
  | "produto_errado"
  | "avaria"
  | "arrependimento"
  | "alergia"
  | "atraso";

export const reverseReasonLabel: Record<ReverseReason, string> = {
  vazamento: "Frasco vazando",
  produto_errado: "Produto errado",
  avaria: "Avaria no transporte",
  arrependimento: "Arrependimento (7 dias)",
  alergia: "Reação alérgica",
  atraso: "Atraso / extravio",
};

export type ReverseStatus =
  | "requested"
  | "label_issued"
  | "in_transit"
  | "received"
  | "inspected"
  | "refunded";

export const reverseStatusOrder: ReverseStatus[] = [
  "requested",
  "label_issued",
  "in_transit",
  "received",
  "inspected",
  "refunded",
];

export const reverseStatusLabel: Record<ReverseStatus, string> = {
  requested: "Solicitado",
  label_issued: "Etiqueta emitida",
  in_transit: "Em trânsito",
  received: "Recebido na loja",
  inspected: "Conferido",
  refunded: "Resolvido",
};

export type RefundMethod = "cartao" | "pix" | "credito";
export const refundMethodLabel: Record<RefundMethod, string> = {
  cartao: "Estorno no cartão",
  pix: "Pix",
  credito: "Crédito na loja (+10%)",
};

export type PickupMethod = "coleta" | "agencia";
export const pickupMethodLabel: Record<PickupMethod, string> = {
  coleta: "Coleta domiciliar",
  agencia: "Postagem em agência",
};

export interface RefundInfo {
  protocol: string;
  amount: number;
  method: RefundMethod;
  createdAt: string;
  partial: boolean;
}

export interface ReverseCase {
  id: string;
  protocol: string;
  conversationId: string;
  customerName: string;
  customerIdentifier?: string;
  channel: Channel;
  reason: ReverseReason;
  item: string;
  amount: number;
  pickup: PickupMethod;
  courier: string;
  tracking: string;
  status: ReverseStatus;
  createdAt: string;
  history: { status: ReverseStatus; at: string }[];
  refund?: RefundInfo;
  notes?: string;
}

const rand = (n: number) => Math.floor(Math.random() * n);
const pad = (n: number, len: number) => String(n).padStart(len, "0");

export const newProtocol = () => `RMA-${pad(rand(90000) + 10000, 5)}`;
export const newRefundProtocol = () => `REF-${pad(rand(90000) + 10000, 5)}`;
const newTracking = (courier: string) =>
  courier === "Correios"
    ? `BR${pad(rand(999999999), 9)}BR`
    : `LG${pad(rand(999999), 6)}${pad(rand(99), 2)}BR`;

export interface CreateCaseInput {
  conversationId: string;
  customerName: string;
  customerIdentifier?: string;
  channel: Channel;
  reason: ReverseReason;
  item: string;
  amount: number;
  pickup: PickupMethod;
  notes?: string;
}

interface ReverseState {
  cases: ReverseCase[];
  createCase: (input: CreateCaseInput) => ReverseCase;
  registerRefund: (caseId: string, refund: Omit<RefundInfo, "createdAt">) => void;
  advance: (caseId: string) => void;
  setStatus: (caseId: string, status: ReverseStatus) => void;
  clear: () => void;
}

export const useReverseStore = create<ReverseState>((set, get) => ({
  cases: [],

  createCase: (input) => {
    const courier = input.pickup === "coleta" ? "Loggi" : "Correios";
    const nowIso = new Date().toISOString();
    const item: ReverseCase = {
      id: `rc-${Date.now()}-${rand(9999)}`,
      protocol: newProtocol(),
      conversationId: input.conversationId,
      customerName: input.customerName,
      customerIdentifier: input.customerIdentifier,
      channel: input.channel,
      reason: input.reason,
      item: input.item,
      amount: input.amount,
      pickup: input.pickup,
      courier,
      tracking: newTracking(courier),
      status: "label_issued",
      createdAt: nowIso,
      history: [
        { status: "requested", at: nowIso },
        { status: "label_issued", at: nowIso },
      ],
      notes: input.notes,
    };
    set((s) => ({ cases: [item, ...s.cases] }));
    scheduleProgression(item.id);
    return item;
  },

  registerRefund: (caseId, refund) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId ? { ...c, refund: { ...refund, createdAt: new Date().toISOString() } } : c,
      ),
    })),

  setStatus: (caseId, status) =>
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId
          ? { ...c, status, history: [...c.history, { status, at: new Date().toISOString() }] }
          : c,
      ),
    })),

  advance: (caseId) => {
    const c = get().cases.find((x) => x.id === caseId);
    if (!c) return;
    const idx = reverseStatusOrder.indexOf(c.status);
    const next = reverseStatusOrder[idx + 1];
    if (!next) return;
    get().setStatus(caseId, next);
  },

  clear: () => set({ cases: [] }),
}));

/** Avanço automático dos status durante a demonstração. */
function scheduleProgression(caseId: string) {
  if (typeof window === "undefined") return;
  const steps: ReverseStatus[] = ["in_transit", "received", "inspected", "refunded"];
  steps.forEach((status, i) => {
    window.setTimeout(() => {
      const c = useReverseStore.getState().cases.find((x) => x.id === caseId);
      if (!c) return;
      if (reverseStatusOrder.indexOf(c.status) >= reverseStatusOrder.indexOf(status)) return;
      useReverseStore.getState().setStatus(caseId, status);
    }, (i + 1) * 15_000);
  });
}

/** Casos de um cliente/conversa. */
export const casesForConversation = (cases: ReverseCase[], conversationId: string) =>
  cases.filter((c) => c.conversationId === conversationId);

export function reverseMetrics(cases: ReverseCase[]) {
  const open = cases.filter((c) => c.status !== "refunded");
  const refunded = cases.filter((c) => c.refund);
  const refundValue = refunded.reduce((sum, c) => sum + (c.refund?.amount ?? 0), 0);
  const byReason = cases.reduce<Record<string, number>>((acc, c) => {
    acc[c.reason] = (acc[c.reason] ?? 0) + 1;
    return acc;
  }, {});
  const topReason = Object.entries(byReason).sort((a, b) => b[1] - a[1])[0];
  return {
    total: cases.length,
    open: open.length,
    refundValue,
    topReason: topReason ? reverseReasonLabel[topReason[0] as ReverseReason] : "—",
  };
}
