/**
 * Hook que conecta no ActionCable do Chatwoot e entrega eventos em tempo real
 * (message.created, message.updated, conversation.updated, status_changed).
 *
 * Inativo se VITE_CHATWOOT_URL ou VITE_CHATWOOT_PUBSUB_TOKEN não estiverem
 * definidos — preview Vercel em modo mock continua funcionando.
 */
import { useEffect, useRef } from "react";
import { chatwootRealtimeConfig, mapMessage, mapConversation } from "@/services/chatwootService";
import type { Conversation, Message } from "@/services/types";

interface Handlers {
  onMessage?: (conversationId: string, message: Message) => void;
  onConversationUpdated?: (conversationId: string, patch: Partial<Conversation>) => void;
}

export function useChatwootRealtime(handlers: Handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const { baseUrl, pubsubToken } = chatwootRealtimeConfig;
    if (!baseUrl || !pubsubToken) return;

    const wsUrl = baseUrl.replace(/^http/, "ws") + "/cable";
    let ws: WebSocket | null = null;
    let attempts = 0;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const subscribe = () => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          command: "subscribe",
          identifier: JSON.stringify({ channel: "RoomChannel", pubsub_token: pubsubToken }),
        }),
      );
    };

    const handleEvent = (event: string, data: unknown) => {
      const h = handlersRef.current;
      if (!data || typeof data !== "object") return;
      const d = data as Record<string, unknown>;

      if (event === "message.created" || event === "message.updated") {
        const cid = String(d.conversation_id ?? (d.conversation as { id?: number })?.id ?? "");
        if (!cid) return;
        h.onMessage?.(cid, mapMessage(d as Parameters<typeof mapMessage>[0]));
      } else if (event === "conversation.updated" || event === "conversation.status_changed") {
        const cid = String(d.id ?? "");
        if (!cid) return;
        const patch = mapConversation(d as Parameters<typeof mapConversation>[0]);
        h.onConversationUpdated?.(cid, {
          aiHandling: patch.aiHandling,
          sentiment: patch.sentiment,
          unread: patch.unread,
          updatedAt: patch.updatedAt,
        });
      }
    };

    const connect = () => {
      if (closed) return;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        attempts = 0;
        subscribe();
        pingTimer = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25_000);
      };

      ws.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          if (!payload || payload.type === "ping" || payload.type === "welcome") return;
          if (payload.type === "confirm_subscription") return;
          // Eventos vêm em payload.message: { event, data }
          const inner = payload.message;
          if (inner && typeof inner === "object" && "event" in inner) {
            handleEvent(inner.event as string, inner.data);
          }
        } catch {
          /* noop */
        }
      };

      ws.onclose = () => {
        if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
        if (closed) return;
        attempts += 1;
        const delay = Math.min(30_000, 1000 * 2 ** Math.min(attempts, 5));
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => ws?.close();
    };

    connect();

    return () => {
      closed = true;
      if (pingTimer) clearInterval(pingTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);
}
