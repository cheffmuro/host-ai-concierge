import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useOutboxStore, type OutboxItem } from "@/stores/outboxStore";
import { sendMessage } from "@/services/chatwootService";

interface FlusherCallbacks {
  onDelivered: (item: OutboxItem, serverId: string, timestamp: string) => void;
  onPermanentError: (item: OutboxItem, error: string) => void;
}

const MAX_ATTEMPTS = 4;
const POLL_MS = 15000;

export function useOutboxFlusher({ onDelivered, onPermanentError }: FlusherCallbacks) {
  const cbRef = useRef({ onDelivered, onPermanentError });
  cbRef.current = { onDelivered, onPermanentError };

  useEffect(() => {
    let cancelled = false;

    const flush = async (announce = false) => {
      const state = useOutboxStore.getState();
      if (state.flushing) return;
      const items = state.items;
      if (items.length === 0) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;

      state.setFlushing(true);
      if (announce) toast.info(`Conexão restabelecida — reenviando ${items.length} mensage${items.length === 1 ? "m" : "ns"}`);

      try {
        for (const item of items) {
          if (cancelled) break;
          try {
            const m = await sendMessage(item.conversationId, item.content);
            cbRef.current.onDelivered(item, m.id, m.timestamp);
            useOutboxStore.getState().remove(item.id);
            toast.success("Mensagem entregue", { description: item.content.slice(0, 60) });
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Falha desconhecida";
            useOutboxStore.getState().markAttempt(item.id, msg);
            const updated = useOutboxStore.getState().items.find((i) => i.id === item.id);
            if (updated && updated.attempts >= MAX_ATTEMPTS) {
              useOutboxStore.getState().remove(item.id);
              cbRef.current.onPermanentError(item, msg);
            }
          }
        }
      } finally {
        useOutboxStore.getState().setFlushing(false);
      }
    };

    const onOnline = () => void flush(true);
    const onOffline = () => toast.warning("Você está offline — mensagens ficarão na fila");

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    void flush(false);
    const interval = window.setInterval(() => void flush(false), POLL_MS);

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(interval);
    };
  }, []);
}
