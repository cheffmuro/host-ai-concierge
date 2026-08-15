/**
 * Logística reversa — casos de devolução/troca da loja de perfumes.
 *
 * Em Modo Demonstração tudo roda em memória (nenhuma escrita no banco e
 * nenhuma chamada a transportadora/gateway). O formato dos casos já é o que
 * será persistido quando a integração real de transportadora e de estorno
 * for ligada.
 *
 * Fluxo com aprovação: a etiqueta final e qualquer reembolso (total ou
 * parcial) ficam pendentes até um supervisor aprovar. Cada evento relevante
 * (aprovação, avanço de status, SLA) vira notificação exibida no Inbox.
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
  | "pending_approval"
  | "requested"
  | "label_issued"
  | "in_transit"
  | "received"
  | "inspected"
  | "refunded";

export const reverseStatusOrder: ReverseStatus[] = [
  "requested",
  "pending_approval",
  "label_issued",
  "in_transit",
  "received",
  "inspected",
  "refunded",
];

export const reverseStatusLabel: Record<ReverseStatus, string> = {
  requested: "Solicitado",
  pending_approval: "Aguardando supervisor",
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
  /** Só fica true depois que o supervisor aprova a emissão. */
  labelIssued: boolean;
  status: ReverseStatus;
  createdAt: string;
  /** Prazo de SLA do caso (ISO). */
  slaDueAt: string;
  slaState: "on_track" | "at_risk" | "breached";
  history: { status: ReverseStatus; at: string }[];
  refund?: RefundInfo;
  notes?: string;
}

/* ---------------------------------- Aprovações --------------------------------- */

export type ApprovalKind = "label" | "refund";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export const approvalKindLabel: Record<ApprovalKind, string> = {
  label: "Emissão de etiqueta final",
  refund: "Processamento de reembolso",
};

export interface ApprovalRequest {
  id: string;
  caseId: string;
  kind: ApprovalKind;
  status: ApprovalStatus;
  requestedAt: string;
  requestedBy: string;
  decidedAt?: string;
  decidedBy?: string;
  reason?: string;
  /** Reembolso */
  amount?: number;
  method?: RefundMethod;
  partial?: boolean;
}

/* -------------------------------- Notificações -------------------------------- */

export type ReverseNotificationType = "approval" | "status" | "sla";

export interface ReverseNotification {
  id: string;
  type: ReverseNotificationType;
  severity: "info" | "warning" | "critical" | "success";
  title: string;
  description: string;
  at: string;
  read: boolean;
  caseId?: string;
  conversationId?: string;
}

const rand = (n: number) => Math.floor(Math.random() * n);
const pad = (n: number, len: number) => String(n).padStart(len, "0");

export const newProtocol = () => `RMA-${pad(rand(90000) + 10000, 5)}`;
export const newRefundProtocol = () => `REF-${pad(rand(90000) + 10000, 5)}`;
const newTracking = (courier: string) =>
  courier === "Correios"
    ? `BR${pad(rand(999999999), 9)}BR`
    : `LG${pad(rand(999999), 6)}${pad(rand(99), 2)}BR`;

/** SLA de resposta/tratativa da reversa (minutos). Curto para demonstração. */
export const SLA_MINUTES = 3;

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
  requestedBy?: string;
}

export interface RequestRefundInput {
  caseId: string;
  amount: number;
  method: RefundMethod;
  partial: boolean;
  requestedBy?: string;
}

interface ReverseState {
  cases: ReverseCase[];
  approvals: ApprovalRequest[];
  notifications: ReverseNotification[];
  createCase: (input: CreateCaseInput) => { reverseCase: ReverseCase; approval: ApprovalRequest };
  requestRefund: (input: RequestRefundInput) => ApprovalRequest;
  approve: (approvalId: string, by?: string) => ApprovalRequest | undefined;
  reject: (approvalId: string, reason?: string, by?: string) => ApprovalRequest | undefined;
  pendingApprovalFor: (caseId: string, kind?: ApprovalKind) => ApprovalRequest | undefined;
  registerRefund: (caseId: string, refund: Omit<RefundInfo, "createdAt">) => void;
  advance: (caseId: string) => void;
  setStatus: (caseId: string, status: ReverseStatus) => void;
  notify: (n: Omit<ReverseNotification, "id" | "at" | "read">) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
  clear: () => void;
}

const nid = () => `rn-${Date.now()}-${rand(99999)}`;

export const useReverseStore = create<ReverseState>((set, get) => ({
  cases: [],
  approvals: [],
  notifications: [],

  notify: (n) =>
    set((s) => ({
      notifications: [
        { ...n, id: nid(), at: new Date().toISOString(), read: false },
        ...s.notifications,
      ].slice(0, 50),
    })),

  markAllRead: () =>
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

  clearNotifications: () => set({ notifications: [] }),

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
      labelIssued: false,
      status: "pending_approval",
      createdAt: nowIso,
      slaDueAt: new Date(Date.now() + SLA_MINUTES * 60_000).toISOString(),
      slaState: "on_track",
      history: [
        { status: "requested", at: nowIso },
        { status: "pending_approval", at: nowIso },
      ],
      notes: input.notes,
    };

    const approval: ApprovalRequest = {
      id: `ap-${Date.now()}-${rand(9999)}`,
      caseId: item.id,
      kind: "label",
      status: "pending",
      requestedAt: nowIso,
      requestedBy: input.requestedBy ?? "IA · Atendimento",
    };

    set((s) => ({ cases: [item, ...s.cases], approvals: [approval, ...s.approvals] }));

    get().notify({
      type: "approval",
      severity: "warning",
      title: "Aprovação pendente · etiqueta",
      description: `${item.protocol} — ${item.customerName}: ${reverseReasonLabel[item.reason]} (${item.item}).`,
      caseId: item.id,
      conversationId: item.conversationId,
    });

    scheduleSla(item.id);
    return { reverseCase: item, approval };
  },

  requestRefund: (input) => {
    const c = get().cases.find((x) => x.id === input.caseId);
    const approval: ApprovalRequest = {
      id: `ap-${Date.now()}-${rand(9999)}`,
      caseId: input.caseId,
      kind: "refund",
      status: "pending",
      requestedAt: new Date().toISOString(),
      requestedBy: input.requestedBy ?? "Operador · Inbox",
      amount: input.amount,
      method: input.method,
      partial: input.partial,
    };
    set((s) => ({ approvals: [approval, ...s.approvals] }));
    get().notify({
      type: "approval",
      severity: "warning",
      title: `Aprovação pendente · reembolso ${input.partial ? "parcial" : "total"}`,
      description: `${c?.protocol ?? "Reembolso avulso"} — ${input.amount.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })} via ${refundMethodLabel[input.method]}.`,
      caseId: input.caseId,
      conversationId: c?.conversationId,
    });
    return approval;
  },

  pendingApprovalFor: (caseId, kind) =>
    get().approvals.find(
      (a) => a.caseId === caseId && a.status === "pending" && (!kind || a.kind === kind),
    ),

  approve: (approvalId, by = "Supervisor") => {
    const approval = get().approvals.find((a) => a.id === approvalId);
    if (!approval || approval.status !== "pending") return undefined;
    const decidedAt = new Date().toISOString();
    const decided: ApprovalRequest = { ...approval, status: "approved", decidedAt, decidedBy: by };
    set((s) => ({ approvals: s.approvals.map((a) => (a.id === approvalId ? decided : a)) }));

    const c = get().cases.find((x) => x.id === approval.caseId);

    if (approval.kind === "label") {
      set((s) => ({
        cases: s.cases.map((x) => (x.id === approval.caseId ? { ...x, labelIssued: true } : x)),
      }));
      get().setStatus(approval.caseId, "label_issued");
      get().notify({
        type: "approval",
        severity: "success",
        title: "Etiqueta aprovada pelo supervisor",
        description: `${c?.protocol ?? ""} — ${c?.courier ?? ""} · rastreio ${c?.tracking ?? ""}.`,
        caseId: approval.caseId,
        conversationId: c?.conversationId,
      });
      scheduleProgression(approval.caseId);
    } else {
      get().registerRefund(approval.caseId, {
        protocol: newRefundProtocol(),
        amount: approval.amount ?? 0,
        method: approval.method ?? "cartao",
        partial: approval.partial ?? false,
      });
      get().notify({
        type: "approval",
        severity: "success",
        title: `Reembolso ${approval.partial ? "parcial" : "total"} aprovado`,
        description: `${c?.protocol ?? ""} — ${(approval.amount ?? 0).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })} via ${refundMethodLabel[approval.method ?? "cartao"]}.`,
        caseId: approval.caseId,
        conversationId: c?.conversationId,
      });
    }
    return decided;
  },

  reject: (approvalId, reason, by = "Supervisor") => {
    const approval = get().approvals.find((a) => a.id === approvalId);
    if (!approval || approval.status !== "pending") return undefined;
    const decided: ApprovalRequest = {
      ...approval,
      status: "rejected",
      reason,
      decidedAt: new Date().toISOString(),
      decidedBy: by,
    };
    set((s) => ({ approvals: s.approvals.map((a) => (a.id === approvalId ? decided : a)) }));
    const c = get().cases.find((x) => x.id === approval.caseId);
    get().notify({
      type: "approval",
      severity: "critical",
      title: `${approvalKindLabel[approval.kind]} recusada`,
      description: `${c?.protocol ?? ""}${reason ? ` — ${reason}` : " — revisar com o operador."}`,
      caseId: approval.caseId,
      conversationId: c?.conversationId,
    });
    return decided;
  },

  registerRefund: (caseId, refund) => {
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId ? { ...c, refund: { ...refund, createdAt: new Date().toISOString() } } : c,
      ),
    }));
    get().setStatus(caseId, "refunded");
  },

  setStatus: (caseId, status) => {
    const before = get().cases.find((c) => c.id === caseId);
    if (!before || before.status === status) return;
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId
          ? { ...c, status, history: [...c.history, { status, at: new Date().toISOString() }] }
          : c,
      ),
    }));
    get().notify({
      type: "status",
      severity: status === "refunded" ? "success" : "info",
      title: `${before.protocol} · ${reverseStatusLabel[status]}`,
      description: `${before.customerName} — ${before.item} avançou na linha do tempo da reversa.`,
      caseId,
      conversationId: before.conversationId,
    });
  },

  advance: (caseId) => {
    const c = get().cases.find((x) => x.id === caseId);
    if (!c) return;
    if (!c.labelIssued) return;
    const idx = reverseStatusOrder.indexOf(c.status);
    const next = reverseStatusOrder[idx + 1];
    if (!next) return;
    if (next === "refunded" && !c.refund) return;
    get().setStatus(caseId, next);
  },

  clear: () => set({ cases: [], approvals: [], notifications: [] }),
}));

/** Avanço automático dos status durante a demonstração. */
function scheduleProgression(caseId: string) {
  if (typeof window === "undefined") return;
  const steps: ReverseStatus[] = ["in_transit", "received", "inspected"];
  steps.forEach((status, i) => {
    window.setTimeout(() => {
      const c = useReverseStore.getState().cases.find((x) => x.id === caseId);
      if (!c) return;
      if (reverseStatusOrder.indexOf(c.status) >= reverseStatusOrder.indexOf(status)) return;
      useReverseStore.getState().setStatus(caseId, status);
    }, (i + 1) * 15_000);
  });
}

/** Monitoramento de SLA: alerta de risco e estouro. */
function scheduleSla(caseId: string) {
  if (typeof window === "undefined") return;
  const warnAt = SLA_MINUTES * 60_000 * 0.6;
  const breachAt = SLA_MINUTES * 60_000;

  window.setTimeout(() => {
    const st = useReverseStore.getState();
    const c = st.cases.find((x) => x.id === caseId);
    if (!c || c.status !== "pending_approval") return;
    useReverseStore.setState({
      cases: st.cases.map((x) => (x.id === caseId ? { ...x, slaState: "at_risk" } : x)),
    });
    st.notify({
      type: "sla",
      severity: "warning",
      title: `SLA em risco · ${c.protocol}`,
      description: `${c.customerName} aguarda aprovação do supervisor há mais de ${Math.round(
        (SLA_MINUTES * 0.6),
      )} min.`,
      caseId,
      conversationId: c.conversationId,
    });
  }, warnAt);

  window.setTimeout(() => {
    const st = useReverseStore.getState();
    const c = st.cases.find((x) => x.id === caseId);
    if (!c || c.status === "refunded") return;
    const breached = c.status === "pending_approval";
    if (!breached) return;
    useReverseStore.setState({
      cases: st.cases.map((x) => (x.id === caseId ? { ...x, slaState: "breached" } : x)),
    });
    st.notify({
      type: "sla",
      severity: "critical",
      title: `SLA estourado · ${c.protocol}`,
      description: `${c.customerName} — ${SLA_MINUTES} min sem decisão do supervisor. Priorizar agora.`,
      caseId,
      conversationId: c.conversationId,
    });
  }, breachAt);
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
    pendingApproval: cases.filter((c) => c.status === "pending_approval").length,
    slaBreached: cases.filter((c) => c.slaState === "breached").length,
  };
}
