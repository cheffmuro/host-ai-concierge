/**
 * Ações funcionais de logística reversa dentro do Inbox:
 * geração de etiqueta (RMA) e reembolso, com estado real no store.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Undo2, RefreshCcw, Truck, Copy, CheckCircle2 } from "lucide-react";
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
  refundMethodLabel, pickupMethodLabel, newRefundProtocol,
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
  const registerRefund = useReverseStore((s) => s.registerRefund);

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
    const created = createCase({
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
      title: "Etiqueta de reversa emitida",
      description: `${reverseReasonLabel[reason]} · ${pickupMethodLabel[pickup]} (${created.courier}).`,
      status: "success",
      timestamp: new Date().toISOString(),
      payload: { protocol: created.protocol, tracking: created.tracking },
    });
    onMessage?.({
      id: uid(),
      author: "agent",
      content:
        pickup === "coleta"
          ? `Abri o protocolo ${created.protocol} para o ${created.item}. A coleta ${created.courier} passa no seu endereço no próximo dia útil, das 9h às 18h — não precisa imprimir nada. Rastreio: ${created.tracking}.`
          : `Abri o protocolo ${created.protocol} para o ${created.item}. Enviei a etiqueta pré-paga: é só levar o volume em qualquer agência dos ${created.courier}. Rastreio: ${created.tracking}.`,
      timestamp: new Date().toISOString(),
      status: "delivered",
    });
    toast.success(`Reversa ${created.protocol} criada`, {
      description: `${created.courier} · rastreio ${created.tracking}`,
    });
  };

  const submitRefund = () => {
    const value = Number(refundAmount) || 0;
    if (value <= 0) {
      toast.error("Informe o valor do reembolso");
      return;
    }
    const protocol = newRefundProtocol();
    const partial = activeCase ? value < activeCase.amount : false;
    if (activeCase) registerRefund(activeCase.id, { protocol, amount: value, method: refundMethod, partial });
    setRefundOpen(false);

    onAutomation?.({
      id: uid(),
      type: "reverse_logistics",
      title: partial ? "Reembolso parcial aprovado" : "Reembolso aprovado",
      description: `${brl(value)} via ${refundMethodLabel[refundMethod]}.`,
      status: "success",
      timestamp: new Date().toISOString(),
      payload: { protocol, amount: value, method: refundMethod },
    });
    onMessage?.({
      id: uid(),
      author: "agent",
      content:
        refundMethod === "credito"
          ? `Reembolso aprovado: ${brl(value)} em crédito na loja (+10% de bônus), já disponível na sua conta. Protocolo ${protocol}.`
          : `Reembolso de ${brl(value)} aprovado via ${refundMethodLabel[refundMethod].toLowerCase()}. Protocolo ${protocol} — o valor cai em até 7 dias úteis.`,
      timestamp: new Date().toISOString(),
      status: "delivered",
    });
    toast.success(`Reembolso ${protocol} registrado`, { description: brl(value) });
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
              Gera protocolo RMA, etiqueta pré-paga e código de rastreio para {conversation.customerName}.
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
              <Truck className="h-4 w-4" strokeWidth={1.5} /> Emitir etiqueta
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
                ? `Vinculado ao protocolo ${activeCase.protocol} · ${activeCase.item}`
                : "Sem reversa vinculada — o reembolso será registrado como avulso."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Valor (R$)</Label>
              <Input value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} inputMode="decimal" className="rounded-sm" />
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
            <Button className="rounded-sm gap-2" onClick={submitRefund}>
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} /> Aprovar reembolso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {convCases.length > 0 && (
        <div className="space-y-3 pt-2">
          {convCases.map((c) => (
            <ReverseCaseCard key={c.id} item={c} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ReverseCaseCard({ item }: { item: ReverseCase }) {
  const advance = useReverseStore((s) => s.advance);
  const currentIdx = reverseStatusOrder.indexOf(item.status);

  return (
    <div className="rounded-sm border border-border/60 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-900">{item.protocol}</p>
          <p className="truncate text-[11px] text-slate-500">{item.item} · {reverseReasonLabel[item.reason]}</p>
        </div>
        <Badge variant="outline" className="shrink-0 rounded-sm border-sky-200 bg-sky-50 text-[10px] font-normal text-sky-700">
          {reverseStatusLabel[item.status]}
        </Badge>
      </div>

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

      {item.status !== "refunded" && (
        <Button variant="outline" size="sm" className="mt-2 h-7 w-full rounded-sm text-[11px]" onClick={() => advance(item.id)}>
          Avançar status
        </Button>
      )}
    </div>
  );
}
