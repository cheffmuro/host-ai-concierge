import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bot, Search, Send, Paperclip, Sparkles, ArrowLeft, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useInboxStore } from "@/stores/inboxStore";
import { mockConversations } from "@/mocks/data";
import type { Conversation, Sentiment } from "@/services/types";
import { ChannelIcon, channelLabel } from "@/components/channel-icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage } from "@/services/chatwootService";
import { triggerHandoff } from "@/services/n8nService";

export const Route = createFileRoute("/inbox")({
  head: () => ({
    meta: [
      { title: "Inbox — Anfitrião" },
      { name: "description", content: "Caixa unificada omnichannel com handover humanizado." },
      { property: "og:title", content: "Inbox — Anfitrião" },
      { property: "og:description", content: "Caixa unificada omnichannel com handover humanizado." },
    ],
  }),
  component: InboxPage,
});

const sentimentStyles: Record<Sentiment, string> = {
  frustrated: "border-rose-200 bg-rose-50 text-rose-700",
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
  satisfied: "border-emerald-200 bg-emerald-50 text-emerald-700",
};
const sentimentLabel: Record<Sentiment, string> = {
  frustrated: "Frustrado",
  neutral: "Neutro",
  satisfied: "Satisfeito",
};

function InboxPage() {
  const { selectedId, setSelected, search, setSearch, channelFilter, setChannelFilter, contextOpen, setContextOpen } = useInboxStore();
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && conversations.length > 0 && typeof window !== "undefined" && window.innerWidth >= 1024) {
      setSelected(conversations[0].id);
    }
  }, [selectedId, conversations, setSelected]);

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (channelFilter !== "all" && c.channel !== channelFilter) return false;
      if (search && !c.customerName.toLowerCase().includes(search.toLowerCase()) && !c.preview.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [conversations, channelFilter, search]);

  return (
    <div className="flex h-[calc(100vh-3rem)] min-h-0 bg-slate-50">
      {/* List */}
      <aside className={`${selected ? "hidden lg:flex" : "flex"} w-full lg:w-[30%] lg:max-w-sm flex-col border-r border-border/60 bg-white`}>
        <div className="border-b border-border/60 p-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" strokeWidth={1.5} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversas"
              className="h-8 rounded-sm border-border/60 pl-8 text-sm"
            />
          </div>
          <div className="flex gap-1">
            {(["all", "whatsapp", "email", "web"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setChannelFilter(c)}
                className={`text-[11px] uppercase tracking-wider px-2 py-1 rounded-sm transition ${
                  channelFilter === c ? "bg-slate-900 text-slate-50" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {c === "all" ? "Todos" : channelLabel[c]}
              </button>
            ))}
          </div>
        </div>
        <ScrollArea className="flex-1">
          <ul className="divide-y divide-border/60">
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setSelected(c.id)}
                  className={`w-full text-left px-3 py-3 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none transition ${
                    selectedId === c.id ? "bg-slate-50 border-l-2 border-slate-900 -ml-px pl-[11px]" : "border-l-2 border-transparent"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-700">
                      {c.customerInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-slate-900">{c.customerName}</span>
                        <span className="shrink-0 text-[10px] text-slate-400">
                          {formatDistanceToNow(new Date(c.updatedAt), { locale: ptBR, addSuffix: false })}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{c.preview}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="rounded-sm border-border/60 px-1.5 py-0 text-[10px] font-normal text-slate-500 gap-1">
                          <ChannelIcon channel={c.channel} className="h-3 w-3" />
                          {channelLabel[c.channel]}
                        </Badge>
                        <Badge variant="outline" className={`rounded-sm px-1.5 py-0 text-[10px] font-normal ${sentimentStyles[c.sentiment]}`}>
                          {sentimentLabel[c.sentiment]}
                        </Badge>
                        {c.aiHandling && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Bot className="h-3 w-3" strokeWidth={1.5} /> IA
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="p-6 text-center text-xs text-slate-400">Nenhuma conversa</li>
            )}
          </ul>
        </ScrollArea>
      </aside>

      {/* Chat */}
      <section className={`${selected ? "flex" : "hidden lg:flex"} flex-1 min-w-0 flex-col bg-slate-50`}>
        {selected ? (
          <ChatArea conversation={selected} onBack={() => setSelected(null)} onOpenContext={() => setContextOpen(true)} onSend={async (text) => {
            const m = await sendMessage(selected.id, text);
            setConversations((prev) => prev.map((c) => c.id === selected.id ? { ...c, messages: [...c.messages, m], aiHandling: false, preview: text } : c));
          }} onAssume={async () => {
            await triggerHandoff(selected.id);
            setConversations((prev) => prev.map((c) => c.id === selected.id ? { ...c, aiHandling: false } : c));
          }} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            Selecione uma conversa
          </div>
        )}
      </section>

      {/* Context (desktop) */}
      {selected && (
        <aside className="hidden lg:flex w-[20%] max-w-xs flex-col border-l border-border/60 bg-white">
          <ContextPanel conversation={selected} />
        </aside>
      )}

      {/* Context (mobile) */}
      <Sheet open={contextOpen} onOpenChange={setContextOpen}>
        <SheetContent side="right" className="w-[88%] sm:max-w-sm p-0">
          <SheetHeader className="border-b border-border/60 p-4">
            <SheetTitle className="text-sm font-medium">Contexto do Cliente</SheetTitle>
          </SheetHeader>
          {selected && <ContextPanel conversation={selected} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ChatArea({
  conversation,
  onBack,
  onOpenContext,
  onSend,
  onAssume,
}: {
  conversation: Conversation;
  onBack: () => void;
  onOpenContext: () => void;
  onSend: (text: string) => void | Promise<void>;
  onAssume: () => void | Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [assuming, setAssuming] = useState(false);

  const submit = async () => {
    const t = draft.trim();
    if (!t || sending) return;
    setDraft("");
    setSending(true);
    try {
      await onSend(t);
      toast.success("Mensagem enviada", { description: `Entregue via ${channelLabel[conversation.channel]}` });
    } catch {
      toast.error("Falha ao enviar mensagem");
      setDraft(t);
    } finally {
      setSending(false);
    }
  };

  const assume = async () => {
    if (assuming) return;
    setAssuming(true);
    toast.loading("Acionando handover…", { id: "handover" });
    try {
      await onAssume();
      toast.success("Conversa assumida pelo time humano", { id: "handover", description: "Automação n8n disparada com sucesso" });
    } catch {
      toast.error("Não foi possível acionar o handover", { id: "handover" });
    } finally {
      setAssuming(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-white px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="lg:hidden text-slate-500 hover:text-slate-900" aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-700">
            {conversation.customerInitials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{conversation.customerName}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <ChannelIcon channel={conversation.channel} className="h-3 w-3" />
              {channelLabel[conversation.channel]}
              {conversation.aiHandling && <span className="ml-2 flex items-center gap-1 text-slate-400"><Bot className="h-3 w-3" strokeWidth={1.5} /> Concierge IA ativa</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {conversation.aiHandling && (
            <Button onClick={assume} disabled={assuming} size="sm" variant="outline" className="rounded-sm h-8 text-xs gap-1.5">
              {assuming ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} /> : <Sparkles className="h-3 w-3" strokeWidth={1.5} />}
              {assuming ? "Acionando…" : "Assumir conversa"}
            </Button>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <Button onClick={onOpenContext} size="sm" variant="ghost" className="lg:hidden h-8 w-8 p-0" aria-label="Contexto">
                <Info className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </SheetTrigger>
          </Sheet>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
          {conversation.messages.map((m) => {
            const isCustomer = m.author === "customer";
            const isAI = m.author === "ai";
            return (
              <div key={m.id} className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] ${isCustomer ? "" : "items-end"}`}>
                  <div className={`rounded-sm px-3.5 py-2.5 text-sm leading-relaxed ${
                    isCustomer
                      ? "bg-white border border-border/60 text-slate-900"
                      : isAI
                        ? "bg-slate-100 text-slate-900 border border-slate-200"
                        : "bg-slate-900 text-slate-50"
                  }`}>
                    {m.content}
                  </div>
                  <div className={`mt-1 flex items-center gap-1.5 text-[10px] text-slate-400 ${isCustomer ? "" : "justify-end"}`}>
                    {isAI && <><Bot className="h-3 w-3" strokeWidth={1.5} /><span>Concierge IA</span><span>·</span></>}
                    <span>{new Date(m.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {isAI && m.aiReasoning && (
                    <p className={`mt-1 text-[10px] italic text-slate-400 ${isCustomer ? "" : "text-right"}`}>
                      {m.aiReasoning}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="border-t border-border/60 bg-white p-3">
        <div className="mx-auto max-w-3xl flex items-end gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-slate-500" aria-label="Anexar">
            <Paperclip className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={sending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder="Escreva uma resposta…"
            className="min-h-[40px] max-h-40 resize-none rounded-sm border-border/60 text-sm"
            rows={1}
          />
          <Button onClick={submit} disabled={sending || !draft.trim()} className="h-9 rounded-sm bg-slate-900 hover:bg-slate-800 gap-1.5">
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <Send className="h-3.5 w-3.5" strokeWidth={1.5} />}
            {sending ? "Enviando…" : "Enviar"}
          </Button>
        </div>
      </div>
    </>
  );
}

function ContextPanel({ conversation }: { conversation: Conversation }) {
  const ctx = conversation.context;
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  return (
    <ScrollArea className="flex-1">
      <div className="p-5 space-y-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Cliente</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{conversation.customerName}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {ctx.tags.map((t) => (
              <Badge key={t} variant="outline" className="rounded-sm border-border/60 text-[10px] font-normal text-slate-600">{t}</Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">LTV</p>
            <p className="mt-1 text-base font-medium text-slate-900">{fmt(ctx.ltv)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Ticket médio</p>
            <p className="mt-1 text-base font-medium text-slate-900">{fmt(ctx.averageTicket)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Pedidos</p>
            <p className="mt-1 text-base font-medium text-slate-900">{ctx.totalOrders}</p>
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-2">Últimas compras</p>
          <ul className="space-y-2">
            {ctx.lastPurchases.map((p) => (
              <li key={p.id} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-none">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-900 truncate">{p.item}</p>
                  <p className="text-[10px] text-slate-400">{p.date}</p>
                </div>
                <span className="text-xs text-slate-700">{fmt(p.amount)}</span>
              </li>
            ))}
            {ctx.lastPurchases.length === 0 && <li className="text-xs text-slate-400">Sem compras anteriores</li>}
          </ul>
        </div>

        {ctx.aiReasoning && (
          <div className="rounded-sm border border-slate-200 bg-slate-50 p-3">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-500">
              <Bot className="h-3 w-3" strokeWidth={1.5} /> Raciocínio da IA
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-700">{ctx.aiReasoning}</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
