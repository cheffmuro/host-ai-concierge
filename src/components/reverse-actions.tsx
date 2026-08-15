/**
 * Ações funcionais de logística reversa dentro do Inbox:
 * solicitação de etiqueta (RMA) e reembolso, ambas sujeitas à aprovação
 * de um supervisor antes de serem efetivadas.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Undo2, RefreshCcw, Truck, Copy, CheckCircle2, ShieldCheck, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useReverseStore, reverseReasonLabel, reverseStatusLabel, reverseStatusOrder,
  refundMethodLabel, pickupMethodLabel, approvalKindLabel,
  type ReverseCase, type ReverseReason, type RefundMethod, type PickupMethod,
} from "@/lib/reverse-logistics";
import type { AutomationEvent, Conversation, Message } from "@/services/types";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const uid = () => `rl-${Math.random().toString(36).slice(2, 9)}`;

export interface ReverseHandlers {
  onMessage?: (msg: Message) => void;
  onAutomation?: (evt: AutomationEvent) => void;
}

export function ReverseActions({
  conversation, onMessage, onAutomation,
}: { conversation: Conversation } & ReverseHandlers) {
  const cases = useReverseStore((s) => s.cases);
  const createCase = useReverseStore((s) => s.createCase);
  const requestRefund = useReverseStore((s) => s.requestRefund);

  const convCases = useMemo(
    () => cases.filter((c) => c.conversationId === conversation.id),
    [cases, conversation.id],
  );
  const activeCase = convCases[0];

  const purchases = conversation.context.lastPurchases;
  const defaultItem = purchases[0];

  const [labelOpen, setLabelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  const [reason, setReason] = useState<ReverseReason>("vazamento");
  const [pickup, setPickup] = useState<PickupMethod>("coleta");
  const [item, setItem] = useState(defaultItem?.item ?? "");
  const [amount, setAmount] = useState(String(defaultItem?.amount ?? 0));
  const [notes, setNotes] = useState("");

  const [refundMethod, setRefundMethod] = useState<RefundMethod>("cartao");
  const [refundAmount, setRefundAmount] = useState(String(activeCase?.amount ?? defaultItem?.amount ?? 0));

  const submitLabel = () => {
    const value = Number(amount) || 0;
    if (!item.trim()) {
      toast.error("Informe o produto da reversa");
      return;
    }
    const { reverseCase: created } = createCase({
      conversationId: conversation.id,
      customerName: conversation.customerName,
      customerIdentifier: conversation.customerIdentifier,
      channel: conversation.channel,
      reason,
      item: item.trim(),
      amount: value,
      pickup,
      notes: notes.trim() || undefined,
    });
    setLabelOpen(false);
    setNotes("");
    setRefundAmount(String(value));

    onAutomation?.({
      id: uid(),
      type: "reverse_logistics",
      title: "Etiqueta aguardando aprovação do supervisor",
      description: `${reverseReasonLabel[reason]} · ${pickupMethodLabel[pickup]} (${created.courier}).`,
      status: "pending",
      timestamp: new Date().toISOString(),
      payload: { protocol: created.protocol },
    });
    onMessage?.({
      id: uid(),
      author: "agent",
      content: `Abri o protocolo ${created.protocol} para o ${created.item}. A emissão da etiqueta está em aprovação com a supervisão e você recebe o rastreio assim que for liberada — normalmente em poucos minutos.`,
      timestamp: new Date().toISOString(),
      status: "delivered",
    });
    toast.warning(`Reversa ${created.protocol} aguardando supervisor`, {
      description: "Aprove no cartão do caso para emitir a etiqueta final.",
    });
  };

  const submitRefund = () => {
    const value = Number(refundAmount) || 0;
    if (value <= 0) {
      toast.error("Informe o valor do reembolso");
      return;
    }
    if (!activeCase) {
      toast.error("Abra uma reversa antes de solicitar o reembolso");
      return;
    }
    const partial = value < activeCase.amount;
    requestRefund({ caseId: activeCase.id, amount: value, method: refundMethod, partial });
    setRefundOpen(false);

    onAutomation?.({
      id: uid(),
      type: "reverse_logistics",
      title: `Reembolso ${partial ? "parcial" : "total"} aguardando aprovação`,
      description: `${brl(value)} via ${refundMethodLabel[refundMethod]}.`,
      status: "pending",
      timestamp: new Date().toISOString(),
      payload: { amount: value, method: refundMethod, partial },
    });
    onMessage?.({
      id: uid(),
      author: "agent",
      content: `Registrei o pedido de reembolso de ${brl(value)} via ${refundMethodLabel[refundMethod].toLowerCase()}. Está em aprovação com a supervisão e confirmo aqui assim que for liberado.`,
      timestamp: new Date().toISOString(),
      status: "delivered",
    });
    toast.warning(`Reembolso de ${brl(value)} em aprovação`, {
      description: "Um supervisor precisa liberar antes do processamento.",
    });
  };

  return (
    <div className="space-y-2 border-t border-border/60 pt-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Ações rápidas · SAC</p>

      <Dialog open={labelOpen} onOpenChange={setLabelOpen}>
        <DialogTrigger asChild>
          <Button className="w-full justify-start gap-2 rounded-sm">
            <Undo2 className="h-4 w-4" strokeWidth={1.5} /> Gerar etiqueta de reversa
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Nova logística reversa</DialogTitle>
            <DialogDescription>
              Abre o protocolo RMA para {conversation.customerName}. A etiqueta final só é emitida após aprovação do supervisor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Motivo</Label>
              <Select value={reason} onValueChange={(v) => setReason(v as ReverseReason)}>
                <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(reverseReasonLabel).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Produto</Label>
              {purchases.length > 0 ? (
                <Select
                  value={item}
                  onValueChange={(v) => {
                    setItem(v);
                    const p = purchases.find((x) => x.item === v);
                    if (p) setAmount(String(p.amount));
                  }}
                >
                  <SelectTrigger className="rounded-sm"><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                  <SelectContent>
                    {purchases.map((p) => (
                      <SelectItem key={p.id} value={p.item}>{p.item} · {brl(p.amount)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Ex.: Noir Absolu EDP 100ml" className="rounded-sm" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Valor (R$)</Label>
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="rounded-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Postagem</Label>
                <Select value={pickup} onValueChange={(v) => setPickup(v as PickupMethod)}>
                  <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(pickupMethodLabel).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observações (opcional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="rounded-sm resize-none" placeholder="Ex.: embalar com proteção reforçada" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-sm" onClick={() => setLabelOpen(false)}>Cancelar</Button>
            <Button className="rounded-sm gap-2" onClick={submitLabel}>
              <Truck className="h-4 w-4" strokeWidth={1.5} /> Enviar para aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" className="w-full justify-start gap-2 rounded-sm">
            <RefreshCcw className="h-4 w-4" strokeWidth={1.5} /> Solicitar reembolso
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Reembolso</DialogTitle>
            <DialogDescription>
              {activeCase
                ? `Vinculado ao protocolo ${activeCase.protocol} · ${activeCase.item} — total ou parcial, o valor só é processado após aprovação do supervisor.`
                : "Abra uma reversa nesta conversa antes de solicitar o reembolso."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Valor (R$)</Label>
              <Input value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} inputMode="decimal" className="rounded-sm" />
              {activeCase && Number(refundAmount) > 0 && Number(refundAmount) < activeCase.amount && (
                <p className="text-[11px] text-amber-600">Reembolso parcial ({brl(Number(refundAmount))} de {brl(activeCase.amount)}).</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Forma</Label>
              <Select value={refundMethod} onValueChange={(v) => setRefundMethod(v as RefundMethod)}>
                <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(refundMethodLabel).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-sm" onClick={() => setRefundOpen(false)}>Cancelar</Button>
            <Button className="rounded-sm gap-2" onClick={submitRefund} disabled={!activeCase}>
              <ShieldCheck className="h-4 w-4" strokeWidth={1.5} /> Enviar para aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {convCases.length > 0 && (
        <div className="space-y-3 pt-2">
          {convCases.map((c) => (
            <ReverseCaseCard key={c.id} item={c} onMessage={onMessage} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ReverseCaseCard({ item, onMessage }: { item: ReverseCase; onMessage?: (msg: Message) => void }) {
  const advance = useReverseStore((s) => s.advance);
  const approvals = useReverseStore((s) => s.approvals);
  const approve = useReverseStore((s) => s.approve);
  const reject = useReverseStore((s) => s.reject);
  const currentIdx = reverseStatusOrder.indexOf(item.status);

  const pending = approvals.find((a) => a.caseId === item.id && a.status === "pending");

  const handleApprove = () => {
    if (!pending) return;
    approve(pending.id);
    if (pending.kind === "label") {
      onMessage?.({
        id: uid(),
        author: "agent",
        content:
          item.pickup === "coleta"
            ? `Etiqueta aprovada! A coleta ${item.courier} passa no seu endereço no próximo dia útil, das 9h às 18h. Rastreio: ${item.tracking}.`
            : `Etiqueta aprovada e enviada: é só levar o volume em qualquer agência dos ${item.courier}. Rastreio: ${item.tracking}.`,
        timestamp: new Date().toISOString(),
        status: "delivered",
      });
      toast.success(`Etiqueta ${item.protocol} aprovada`, { description: `${item.courier} · ${item.tracking}` });
    } else {
      onMessage?.({
        id: uid(),
        author: "agent",
        content: `Reembolso ${pending.partial ? "parcial " : ""}de ${brl(pending.amount ?? 0)} aprovado via ${refundMethodLabel[pending.method ?? "cartao"].toLowerCase()}. O valor cai em até 7 dias úteis.`,
        timestamp: new Date().toISOString(),
        status: "delivered",
      });
      toast.success("Reembolso aprovado", { description: brl(pending.amount ?? 0) });
    }
  };

  const handleReject = () => {
    if (!pending) return;
    reject(pending.id, "Recusado pelo supervisor — revisar evidências.");
    toast.error(`${approvalKindLabel[pending.kind]} recusada`, { description: item.protocol });
  };

  return (
    <div className="rounded-sm border border-border/60 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-900">{item.protocol}</p>
          <p className="truncate text-[11px] text-slate-500">{item.item} · {reverseReasonLabel[item.reason]}</p>
        </div>
        <Badge
          variant="outline"
          className={`shrink-0 rounded-sm text-[10px] font-normal ${
            item.status === "pending_approval"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-sky-200 bg-sky-50 text-sky-700"
          }`}
        >
          {reverseStatusLabel[item.status]}
        </Badge>
      </div>

      {item.slaState !== "on_track" && item.status !== "refunded" && (
        <p
          className={`mt-2 inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[11px] ${
            item.slaState === "breached" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          <Clock className="h-3 w-3" strokeWidth={1.5} />
          {item.slaState === "breached" ? "SLA estourado" : "SLA em risco"}
        </p>
      )}

      {pending && (
        <div className="mt-2 rounded-sm border border-amber-200 bg-amber-50/60 p-2">
          <p className="text-[11px] font-medium text-amber-800">
            {approvalKindLabel[pending.kind]} — aprovação pendente
          </p>
          <p className="mt-0.5 text-[11px] text-amber-700">
            {pending.kind === "refund"
              ? `${pending.partial ? "Parcial" : "Total"} · ${brl(pending.amount ?? 0)} · ${refundMethodLabel[pending.method ?? "cartao"]}`
              : `${item.courier} · ${pickupMethodLabel[item.pickup]}`}
            {" · solicitado por "}
            {pending.requestedBy}
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" className="h-7 flex-1 rounded-sm text-[11px] gap-1" onClick={handleApprove}>
              <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} /> Aprovar
            </Button>
            <Button size="sm" variant="outline" className="h-7 flex-1 rounded-sm text-[11px] gap-1" onClick={handleReject}>
              <X className="h-3 w-3" strokeWidth={1.5} /> Recusar
            </Button>
          </div>
        </div>
      )}

      {item.labelIssued && (
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(item.tracking);
            toast.success("Rastreio copiado", { description: item.tracking });
          }}
          className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-900"
        >
          <Truck className="h-3 w-3" strokeWidth={1.5} /> {item.courier} · {item.tracking}
          <Copy className="h-3 w-3" strokeWidth={1.5} />
        </button>
      )}

      <ol className="mt-3 space-y-1">
        {reverseStatusOrder.map((s, i) => (
          <li key={s} className={`flex items-center gap-2 text-[11px] ${i <= currentIdx ? "text-slate-800" : "text-slate-400"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${i <= currentIdx ? "bg-emerald-600" : "bg-slate-300"}`} />
            {reverseStatusLabel[s]}
          </li>
        ))}
      </ol>

      {item.refund && (
        <p className="mt-2 rounded-sm bg-white px-2 py-1.5 text-[11px] text-slate-700">
          {item.refund.partial ? "Reembolso parcial" : "Reembolso"} {brl(item.refund.amount)} · {refundMethodLabel[item.refund.method]} · {item.refund.protocol}
        </p>
      )}

      {item.labelIssued && item.status !== "refunded" && (
        <Button variant="outline" size="sm" className="mt-2 h-7 w-full rounded-sm text-[11px]" onClick={() => advance(item.id)}>
          Avançar status
        </Button>
      )}
    </div>
  );
}
