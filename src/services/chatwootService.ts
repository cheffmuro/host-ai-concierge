/**
 * Chatwoot service — hoje é um wrapper fino sobre server functions em
 * `@/lib/chatwoot.functions.ts`. Os tokens ficam no servidor.
 * Mantemos os mappers exportados para o consumer realtime (ActionCable).
 */
import { mockConversations } from "@/mocks/data";
import { USE_MOCKS } from "@/lib/mocks";
import { isChatwootLive, useIntegrationsStore } from "@/stores/integrationsStore";
import type {
  Attachment,
  AutomationEvent,
  Channel,
  Conversation,
  Message,
  Sentiment,
} from "@/services/types";
import {
  chatwootListConversations,
  chatwootGetConversation,
  chatwootSendMessage,
  chatwootSetAiHandling,
  chatwootAssignAgent,
  chatwootPing,
} from "@/lib/chatwoot.functions";

const cfg = () => useIntegrationsStore.getState().chatwoot;
const isLive = () => isChatwootLive(cfg());
const useMockFallback = () => !isLive() && USE_MOCKS;
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

// --- Mappers ----------------------------------------------------------------

function mapChannel(channel?: string): Channel {
  if (!channel) return "web";
  const c = channel.toLowerCase();
  if (c.includes("whatsapp")) return "whatsapp";
  if (c.includes("instagram")) return "instagram";
  if (c.includes("facebook") || c.includes("messenger")) return "facebook";
  if (c.includes("email")) return "email";
  return "web";
}

function mapSentiment(labels: string[] = []): Sentiment {
  if (labels.includes("frustrated")) return "frustrated";
  if (labels.includes("satisfied")) return "satisfied";
  return "neutral";
}

interface CwAttachment { id: number; file_type: string; data_url: string; file_size?: number }
interface CwMessage {
  id: number;
  content: string | null;
  message_type: 0 | 1 | 2;
  created_at: number;
  status?: string;
  attachments?: CwAttachment[];
  content_attributes?: { ai?: boolean; reasoning?: string };
}
interface CwConversation {
  id: number;
  inbox_id: number;
  status: string;
  unread_count: number;
  last_activity_at: number;
  meta: { sender: { name: string; identifier?: string } };
  labels?: string[];
  custom_attributes?: Record<string, unknown>;
  messages?: CwMessage[];
  channel?: string;
}

const initials = (name: string) =>
  name.split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

export function mapMessage(m: CwMessage): Message {
  const author = m.message_type === 0 ? "customer" : m.content_attributes?.ai ? "ai" : "agent";
  return {
    id: String(m.id),
    author,
    content: m.content ?? "",
    timestamp: new Date(m.created_at * 1000).toISOString(),
    status: "delivered",
    aiReasoning: m.content_attributes?.reasoning,
    attachments: m.attachments?.map((a) => ({
      id: String(a.id),
      name: a.data_url.split("/").pop() ?? "anexo",
      mime: a.file_type,
      size: a.file_size ?? 0,
      url: a.data_url,
      kind: a.file_type.startsWith("image") ? "image" : "file",
    })),
  };
}

export function mapConversation(c: CwConversation): Conversation {
  const name = c.meta?.sender?.name || "Cliente";
  return {
    id: String(c.id),
    customerName: name,
    customerInitials: initials(name),
    channel: mapChannel(c.channel),
    sentiment: mapSentiment(c.labels),
    preview: c.messages?.[c.messages.length - 1]?.content ?? "",
    unread: c.unread_count,
    updatedAt: new Date(c.last_activity_at * 1000).toISOString(),
    aiHandling: c.custom_attributes?.ai_handling !== false,
    messages: (c.messages ?? []).map(mapMessage),
    context: {
      ltv: Number(c.custom_attributes?.ltv ?? 0),
      averageTicket: Number(c.custom_attributes?.avg_ticket ?? 0),
      totalOrders: Number(c.custom_attributes?.total_orders ?? 0),
      lastPurchases: [],
      tags: c.labels ?? [],
      automations: [],
    },
  };
}

// --- Helpers ----------------------------------------------------------------

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function attachmentsToPayload(atts?: Attachment[]) {
  if (!atts || atts.length === 0) return undefined;
  return Promise.all(
    atts.map(async (a) => {
      const blob = await fetch(a.url).then((r) => r.blob());
      return { name: a.name, mime: a.mime, contentBase64: await blobToBase64(blob) };
    }),
  );
}

// --- Public API -------------------------------------------------------------

export async function listConversations(): Promise<Conversation[]> {
  if (!isLive()) { await delay(); return useMockFallback() ? mockConversations : []; }
  const data = await chatwootListConversations();
  const payload = (data as { data: { payload: CwConversation[] } }).data.payload;
  return payload.map(mapConversation);
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  if (!isLive()) { await delay(); return useMockFallback() ? mockConversations.find((c) => c.id === id) : undefined; }
  const res = await chatwootGetConversation({ data: { id } });
  const { conversation, messages } = res as { conversation: CwConversation; messages: CwMessage[] };
  return mapConversation({ ...conversation, messages });
}

export async function sendMessage(
  conversationId: string,
  content: string,
  attachments?: Attachment[],
): Promise<Message> {
  if (!isLive()) {
    await delay(450);
    if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("offline");
    if (Math.random() < 0.25) throw new Error("network_unstable");
    return {
      id: `srv_${Date.now()}`, author: "agent", content,
      timestamp: new Date().toISOString(), status: "delivered", attachments,
    };
  }
  const payload = await attachmentsToPayload(attachments);
  const result = await chatwootSendMessage({
    data: { conversationId, content, attachments: payload },
  });
  return mapMessage(result as CwMessage);
}

export async function assignAgent(conversationId: string, agentId: string): Promise<void> {
  if (!isLive()) return;
  await chatwootAssignAgent({ data: { conversationId, agentId } });
}

export async function listAutomations(conversationId: string): Promise<AutomationEvent[]> {
  if (!isLive()) return useMockFallback() ? (mockConversations.find((c) => c.id === conversationId)?.context.automations ?? []) : [];
  return [];
}

export const chatwootInboxId = () => cfg().inbox_id;

/** Liga/desliga IA para uma conversa via custom_attributes. */
export async function setAiHandling(conversationId: string, enabled: boolean): Promise<void> {
  if (!isLive()) return;
  await chatwootSetAiHandling({ data: { conversationId, enabled } });
}

/** Configuração para o consumer realtime (lida do store no momento do uso). */
export const getChatwootRealtimeConfig = () => {
  const c = cfg();
  return { baseUrl: c.url, pubsubToken: c.pubsub_token, accountId: c.account_id };
};

/**
 * Ping (usado no formulário de integrações). Roda no servidor com as
 * credenciais informadas pelo admin — não persiste nada.
 */
export async function pingChatwoot(input: {
  url?: string; user_token?: string; account_id?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { url, user_token, account_id } = input;
  if (!url || !user_token || !account_id) return { ok: false, error: "URL, User Token e Account ID são obrigatórios." };
  return chatwootPing({ data: { url, user_token, account_id } });
}
