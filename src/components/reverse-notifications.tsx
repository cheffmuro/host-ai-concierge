/**
 * Notificações automáticas de logística reversa no Inbox:
 * SLA (em risco / estourado), aprovações pendentes e avanços na linha do tempo.
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Bell, Clock, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReverseStore, type ReverseNotification } from "@/lib/reverse-logistics";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Dispara um toast para cada notificação nova. */
export function useReverseNotificationToasts() {
  const notifications = useReverseStore((s) => s.notifications);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const n of [...notifications].reverse()) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      const opts = { description: n.description };
      if (n.severity === "critical") toast.error(n.title, opts);
      else if (n.severity === "warning") toast.warning(n.title, opts);
      else if (n.severity === "success") toast.success(n.title, opts);
      else toast(n.title, opts);
    }
  }, [notifications]);
}

const icon = (n: ReverseNotification) =>
  n.type === "sla" ? Clock : n.type === "approval" ? ShieldCheck : Truck;

const tone: Record<ReverseNotification["severity"], string> = {
  critical: "text-rose-600",
  warning: "text-amber-600",
  success: "text-emerald-600",
  info: "text-slate-500",
};

export function ReverseNotifications({ onSelectConversation }: { onSelectConversation?: (id: string) => void }) {
  const notifications = useReverseStore((s) => s.notifications);
  const markAllRead = useReverseStore((s) => s.markAllRead);
  const clearNotifications = useReverseStore((s) => s.clearNotifications);
  const unread = notifications.filter((n) => !n.read).length;

  useReverseNotificationToasts();

  return (
    <Popover onOpenChange={(open) => open && markAllRead()}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-full justify-between rounded-sm text-xs">
          <span className="inline-flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5" strokeWidth={1.5} />
            Alertas de reversa & SLA
          </span>
          {unread > 0 && (
            <span className="rounded-full bg-rose-600 px-1.5 text-[10px] font-medium text-white">{unread}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 rounded-sm p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Notificações</p>
          {notifications.length > 0 && (
            <button onClick={clearNotifications} className="text-[11px] text-slate-500 hover:text-slate-900">
              Limpar
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-slate-400">
              Sem alertas. Aprovações, SLA e avanços de reversa aparecem aqui.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {notifications.map((n) => {
                const Icon = icon(n);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => n.conversationId && onSelectConversation?.(n.conversationId)}
                      className="flex w-full gap-2 px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tone[n.severity]}`} strokeWidth={1.5} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-900">{n.title}</p>
                        <p className="text-[11px] text-slate-500">{n.description}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          há {formatDistanceToNow(new Date(n.at), { locale: ptBR })}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
