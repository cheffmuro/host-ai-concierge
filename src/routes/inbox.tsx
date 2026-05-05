import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot, Search, Send, Paperclip, Sparkles, ArrowLeft, Info, Loader2,
  Check, CloudOff, AlertCircle, X, FileText, ImageIcon, RotateCw,
  CornerDownRight, Truck,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useInboxStore } from "@/stores/inboxStore";
import { mockConversations } from "@/mocks/data";
import type {
  Attachment, AutomationEvent, AutomationStatus, AutomationType,
  Conversation, Message, MessageStatus, Sentiment,
} from "@/services/types";
import { ChannelIcon, channelLabel } from "@/components/channel-icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage } from "@/services/chatwootService";
import { triggerHandoff } from "@/services/n8nService";
import { useOutboxStore } from "@/stores/outboxStore";
import { useOutboxFlusher } from "@/hooks/useOutboxFlusher";

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

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

function InboxPage() {
  const { selectedId, setSelected, search, setSearch, channelFilter, setChannelFilter, contextOpen, setContextOpen } = useInboxStore();
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && conversations.length > 0 && typeof window !== "undefined" && window.innerWidth >= 1024) {
      setSelected(conversations[0].id);
    }
  }, [selectedId, conversations, setSelected]);

  // Auto-flush outbox when network returns
  useOutboxFlusher({
    onDelivered: (item, _serverId, ts) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === item.conversationId
            ? { ...c, messages: c.messages.map((m) => (m.id === item.id ? { ...m, status: "delivered" as MessageStatus, timestamp: ts } : m)) }
            : c,
        ),
      );
    },
    onPermanentError: (item, error) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === item.conversationId
            ? { ...c, messages: c.messages.map((m) => (m.id === item.id ? { ...m, status: "error" as MessageStatus, error } : m)) }
            : c,
        ),
      );
      toast.error("Mensagem não pôde ser entregue", { description: item.content.slice(0, 60) });
    },
  });

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (channelFilter !== "all" && c.channel !== channelFilter) return false;
      if (search && !c.customerName.toLowerCase().includes(search.toLowerCase()) && !c.preview.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [conversations, channelFilter, search]);

  const updateMessage = (cid: string, mid: string, patch: Partial<Message>) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === cid ? { ...c, messages: c.messages.map((m) => (m.id === mid ? { ...m, ...patch } : m)) } : c)),
    );
  };

  const appendMessage = (cid: string, msg: Message) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === cid
          ? { ...c, messages: [...c.messages, msg], aiHandling: msg.author === "agent" ? false : c.aiHandling, preview: msg.content || "Anexo enviado" }
          : c,
      ),
    );
  };

  const appendAutomation = (cid: string, evt: AutomationEvent) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === cid ? { ...c, context: { ...c.context, automations: [evt, ...c.context.automations] } } : c)),
    );
  };

  const handleSend = async (cid: string, content: string, attachments?: Attachment[]) => {
    const msgId = uid();
    appendMessage(cid, {
      id: msgId,
      author: "agent",
      content,
      timestamp: new Date().toISOString(),
      status: "sending",
      attachments,
    });

    try {
      const m = await sendMessage(cid, content, attachments);
      updateMessage(cid, msgId, { status: "delivered", timestamp: m.timestamp });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "erro";
      // Enqueue for retry
      useOutboxStore.getState().enqueue({
        id: msgId,
        conversationId: cid,
        content,
        attachments: attachments?.map((a) => ({ id: a.id, name: a.name, mime: a.mime, size: a.size, kind: a.kind })),
        createdAt: new Date().toISOString(),
        lastError: reason,
      });
      updateMessage(cid, msgId, { status: "queued", error: reason });
      toast.info("Sem conexão estável — mensagem na fila", { description: "Será reenviada automaticamente." });
    }
  };

  const handleRetry = async (cid: string, msg: Message) => {
    updateMessage(cid, msg.id, { status: "sending", error: undefined });
    try {
      const m = await sendMessage(cid, msg.content, msg.attachments);
      useOutboxStore.getState().remove(msg.id);
      updateMessage(cid, msg.id, { status: "delivered", timestamp: m.timestamp });
      toast.success("Mensagem entregue");
    } catch (err) {
      const reason = err instanceof Error ? err.message : "erro";
      useOutboxStore.getState().enqueue({
        id: msg.id,
        conversationId: cid,
        content: msg.content,
        attachments: msg.attachments?.map((a) => ({ id: a.id, name: a.name, mime: a.mime, size: a.size, kind: a.kind })),
        createdAt: new Date().toISOString(),
        lastError: reason,
      });
      updateMessage(cid, msg.id, { status: "queued", error: reason });
    }
  };

  const handleAssume = async (cid: string) => {
    await triggerHandoff(cid);
    setConversations((prev) => prev.map((c) => (c.id === cid ? { ...c, aiHandling: false } : c)));
    appendAutomation(cid, {
      id: uid(),
      type: "handover",
      title: "Transbordo manual para humano",
      description: "Operador assumiu a conversa via painel.",
      status: "success",
      timestamp: new Date().toISOString(),
      payload: { source: "inbox", agent: "Júlia Vianna" },
    });
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] min-h-0 bg-slate-50">
      <aside className={`${selected ? "hidden lg:flex" : "flex"} w-full lg:w-[30%] lg:max-w-sm flex-col border-r border-border/60 bg-white`}>
        <div className="border-b border-border/60 p-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" strokeWidth={1.5} />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar conversas" className="h-8 rounded-sm border-border/60 pl-8 text-sm" />
          </div>
          <div className="flex gap-1">
            {(["all", "whatsapp", "email", "web"] as const).map((c) => (
              <button key={c} onClick={() => setChannelFilter(c)}
                className={`text-[11px] uppercase tracking-wider px-2 py-1 rounded-sm transition ${
                  channelFilter === c ? "bg-slate-900 text-slate-50" : "text-slate-500 hover:bg-slate-100"
                }`}>
                {c === "all" ? "Todos" : channelLabel[c]}
              </button>
            ))}
          </div>
        </div>
        <ScrollArea className="flex-1">
          <ul className="divide-y divide-border/60">
            {filtered.map((c) => (
              <li key={c.id}>
                <button onClick={() => setSelected(c.id)}
                  className={`w-full text-left px-3 py-3 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none transition ${
                    selectedId === c.id ? "bg-slate-50 border-l-2 border-slate-900 -ml-px pl-[11px]" : "border-l-2 border-transparent"
                  }`}>
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
            {filtered.length === 0 && <li className="p-6 text-center text-xs text-slate-400">Nenhuma conversa</li>}
          </ul>
        </ScrollArea>
      </aside>

      <section className={`${selected ? "flex" : "hidden lg:flex"} flex-1 min-w-0 flex-col bg-slate-50`}>
        {selected ? (
          <ChatArea
            conversation={selected}
            onBack={() => setSelected(null)}
            onOpenContext={() => setContextOpen(true)}
            onSend={(text, atts) => handleSend(selected.id, text, atts)}
            onRetry={(m) => handleRetry(selected.id, m)}
            onAssume={() => handleAssume(selected.id)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Selecione uma conversa</div>
        )}
      </section>

      {selected && (
        <aside className="hidden lg:flex w-[24%] max-w-sm flex-col border-l border-border/60 bg-white">
          <ContextPanel conversation={selected} />
        </aside>
      )}

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
  conversation, onBack, onOpenContext, onSend, onRetry, onAssume,
}: {
  conversation: Conversation;
  onBack: () => void;
  onOpenContext: () => void;
  onSend: (text: string, attachments?: Attachment[]) => void | Promise<void>;
  onRetry: (msg: Message) => void | Promise<void>;
  onAssume: () => void | Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Attachment[]>([]);
  const [assuming, setAssuming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs on unmount / when attachments removed
  useEffect(() => {
    return () => { pending.forEach((a) => URL.revokeObjectURL(a.url)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next: Attachment[] = [...pending];
    for (const f of Array.from(files)) {
      if (next.length >= MAX_ATTACHMENTS) {
        toast.error(`Máximo de ${MAX_ATTACHMENTS} anexos por mensagem`);
        break;
      }
      if (f.size > MAX_ATTACHMENT_SIZE) {
        toast.error(`Arquivo "${f.name}" excede 10MB`);
        continue;
      }
      const isImage = f.type.startsWith("image/");
      next.push({
        id: uid(),
        name: f.name,
        mime: f.type || "application/octet-stream",
        size: f.size,
        url: URL.createObjectURL(f),
        kind: isImage ? "image" : "file",
      });
    }
    setPending(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (id: string) => {
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  const submit = async () => {
    const text = draft.trim();
    if (!text && pending.length === 0) return;
    const attachments = pending.length > 0 ? pending : undefined;
    setDraft("");
    setPending([]);
    await onSend(text, attachments);
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
              {conversation.aiHandling && (
                <span className="ml-2 flex items-center gap-1 text-slate-400">
                  <Bot className="h-3 w-3" strokeWidth={1.5} /> Concierge IA ativa
                </span>
              )}
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
          {conversation.messages.map((m) => (
            <MessageBubble key={m.id} message={m} onRetry={onRetry} />
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-border/60 bg-white p-3">
        <div className="mx-auto max-w-3xl space-y-2">
          {pending.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pending.map((a) => (
                <div key={a.id} className="group relative flex items-center gap-2 rounded-sm border border-border/60 bg-slate-50 p-1.5 pr-2">
                  {a.kind === "image" ? (
                    <img src={a.url} alt={a.name} className="h-12 w-12 rounded-sm object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-white border border-border/60">
                      <FileText className="h-4 w-4 text-slate-500" strokeWidth={1.5} />
                    </div>
                  )}
                  <div className="min-w-0 max-w-[160px]">
                    <p className="text-xs font-medium text-slate-900 truncate">{a.name}</p>
                    <p className="text-[10px] text-slate-400">{formatBytes(a.size)}</p>
                  </div>
                  <button onClick={() => removeAttachment(a.id)} className="text-slate-400 hover:text-rose-600" aria-label={`Remover ${a.name}`}>
                    <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xlsx,.txt"
              className="hidden" onChange={(e) => addFiles(e.target.files)} />
            <Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-slate-500" aria-label="Anexar">
              <Paperclip className="h-4 w-4" strokeWidth={1.5} />
            </Button>
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); } }}
              placeholder="Escreva uma resposta…" rows={1}
              className="min-h-[40px] max-h-40 resize-none rounded-sm border-border/60 text-sm" />
            <Button onClick={submit} disabled={!draft.trim() && pending.length === 0}
              className="h-9 rounded-sm bg-slate-900 hover:bg-slate-800 gap-1.5">
              <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
              Enviar
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function MessageBubble({ message, onRetry }: { message: Message; onRetry: (m: Message) => void | Promise<void> }) {
  const isCustomer = message.author === "customer";
  const isAI = message.author === "ai";
  const isAgent = message.author === "agent";

  const bubbleClass = isCustomer
    ? "bg-white border border-border/60 text-slate-900"
    : isAI
      ? "bg-slate-100 text-slate-900 border border-slate-200"
      : "bg-slate-900 text-slate-50";

  return (
    <div className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[80%] ${isCustomer ? "" : "items-end"}`}>
        <div className={`rounded-sm px-3.5 py-2.5 text-sm leading-relaxed ${bubbleClass}`}>
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2 grid grid-cols-2 gap-1.5">
              {message.attachments.map((a) =>
                a.kind === "image" ? (
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block">
                    <img src={a.url} alt={a.name} className="h-24 w-full rounded-sm object-cover" />
                  </a>
                ) : (
                  <div key={a.id} className={`flex items-center gap-2 rounded-sm border px-2 py-1.5 ${
                    isAgent ? "border-slate-700 bg-slate-800" : "border-border/60 bg-white"
                  }`}>
                    <FileText className={`h-3.5 w-3.5 ${isAgent ? "text-slate-300" : "text-slate-500"}`} strokeWidth={1.5} />
                    <div className="min-w-0">
                      <p className={`text-[11px] font-medium truncate ${isAgent ? "text-slate-100" : "text-slate-900"}`}>{a.name}</p>
                      <p className={`text-[10px] ${isAgent ? "text-slate-400" : "text-slate-500"}`}>{formatBytes(a.size)}</p>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
          {message.content && <div className="whitespace-pre-wrap">{message.content}</div>}
        </div>
        <div className={`mt-1 flex items-center gap-1.5 text-[10px] text-slate-400 ${isCustomer ? "" : "justify-end"}`}>
          {isAI && <><Bot className="h-3 w-3" strokeWidth={1.5} /><span>Concierge IA</span><span>·</span></>}
          {isAgent && <MessageStatusIndicator status={message.status} />}
          <span>{format(new Date(message.timestamp), "HH:mm")}</span>
          {isAgent && message.status === "error" && (
            <button onClick={() => onRetry(message)} className="ml-1 inline-flex items-center gap-1 text-rose-600 hover:underline">
              <RotateCw className="h-3 w-3" strokeWidth={1.5} /> Tentar novamente
            </button>
          )}
        </div>
        {isAI && message.aiReasoning && (
          <p className={`mt-1 text-[10px] italic text-slate-400 ${isCustomer ? "" : "text-right"}`}>{message.aiReasoning}</p>
        )}
      </div>
    </div>
  );
}

function MessageStatusIndicator({ status }: { status?: MessageStatus }) {
  if (!status || status === "delivered") {
    return <Check className="h-3 w-3 text-slate-400" strokeWidth={1.5} />;
  }
  if (status === "sending") {
    return (
      <span className="inline-flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} /> Enviando
      </span>
    );
  }
  if (status === "queued") {
    return (
      <span className="inline-flex items-center gap-1 text-amber-600">
        <CloudOff className="h-3 w-3" strokeWidth={1.5} /> Na fila
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-rose-600">
      <AlertCircle className="h-3 w-3" strokeWidth={1.5} /> Erro
    </span>
  );
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

const automationIcons: Record<AutomationType, typeof Bot> = {
  handover: CornerDownRight,
  reverse_logistics: Truck,
  ai_response: Bot,
};
const automationLabel: Record<AutomationType, string> = {
  handover: "Handover",
  reverse_logistics: "Logística reversa",
  ai_response: "Resposta IA",
};
const automationStatusStyle: Record<AutomationStatus, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-rose-200 bg-rose-50 text-rose-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
};
const automationStatusLabel: Record<AutomationStatus, string> = {
  success: "Sucesso",
  error: "Erro",
  pending: "Pendente",
};

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

        <AutomationTimeline events={ctx.automations} />
      </div>
    </ScrollArea>
  );
}

function AutomationTimeline({ events }: { events: AutomationEvent[] }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-3">Histórico de automações</p>
      {events.length === 0 ? (
        <p className="text-xs text-slate-400">Nenhuma automação registrada.</p>
      ) : (
        <ol className="relative space-y-4 border-l border-border/60 pl-4">
          {events.map((e) => {
            const Icon = automationIcons[e.type] ?? ImageIcon;
            return (
              <li key={e.id} className="relative">
                <span className="absolute -left-[21px] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-white border border-border">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                </span>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3 w-3 text-slate-500" strokeWidth={1.5} />
                      <span className="text-[10px] uppercase tracking-wider text-slate-500">{automationLabel[e.type]}</span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-slate-900">{e.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">{e.description}</p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {format(new Date(e.timestamp), "dd MMM yyyy · HH:mm", { locale: ptBR })}
                    </p>
                    {e.payload && (
                      <details className="mt-1 group">
                        <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-slate-400 hover:text-slate-700 list-none">
                          Ver payload
                        </summary>
                        <pre className="mt-1 overflow-x-auto rounded-sm bg-slate-50 border border-border/60 p-2 text-[10px] text-slate-700 font-mono">
{JSON.stringify(e.payload, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  <Badge variant="outline" className={`shrink-0 rounded-sm text-[10px] font-normal ${automationStatusStyle[e.status]}`}>
                    {automationStatusLabel[e.status]}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
