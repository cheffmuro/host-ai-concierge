/**
 * Chatwoot service — chama a API real do Chatwoot quando configurada.
 * Se VITE_CHATWOOT_URL/USER_TOKEN/ACCOUNT_ID estiverem ausentes, cai em mock
 * (útil para preview na Vercel antes do back-end estar no ar).
 *
 * Docs: https://www.chatwoot.com/developers/api/
 */
import { mockConversations } from "@/mocks/data";
import { USE_MOCKS } from "@/lib/mocks";
import type {
  Attachment,
  AutomationEvent,
  Channel,
  Conversation,
  Message,
  Sentiment,
} from "@/services/types";

const BASE = import.meta.env.VITE_CHATWOOT_URL as string | undefined;
const TOKEN = import.meta.env.VITE_CHATWOOT_USER_TOKEN as string | undefined;
const ACCOUNT_ID = import.meta.env.VITE_CHATWOOT_ACCOUNT_ID as string | undefined;
const INBOX_ID = import.meta.env.VITE_CHATWOOT_INBOX_ID as string | undefined;

const isLive = Boolean(BASE && TOKEN && ACCOUNT_ID);
const useMockFallback = () => !isLive && USE_MOCKS;
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

const api = (path: string) => `${BASE}/api/v1/accounts/${ACCOUNT_ID}${path}`;
const headers = (extra: Record<string, string> = {}): HeadersInit => ({
  api_access_token: TOKEN!,
  "Content-Type": "application/json",
  ...extra,
});

async function http<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Chatwoot ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

// --- Mappers ----------------------------------------------------------------

function mapChannel(channel?: string): Channel {
  if (!channel) return "web";
  const c = channel.toLowerCase();
  if (c.includes("whatsapp")) return "whatsapp";
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

// --- Public API -------------------------------------------------------------

export async function listConversations(): Promise<Conversation[]> {
  if (!isLive) { await delay(); return useMockFallback() ? mockConversations : []; }
  const data = await http<{ data: { payload: CwConversation[] } }>(
    api(`/conversations?status=open&assignee_type=me&page=1`),
    { headers: headers() },
  );
  return data.data.payload.map(mapConversation);
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  if (!isLive) { await delay(); return useMockFallback() ? mockConversations.find((c) => c.id === id) : undefined; }
  const c = await http<CwConversation>(api(`/conversations/${id}`), { headers: headers() });
  const msgs = await http<{ payload: CwMessage[] }>(api(`/conversations/${id}/messages`), { headers: headers() });
  return mapConversation({ ...c, messages: msgs.payload });
}

export async function sendMessage(
  conversationId: string,
  content: string,
  attachments?: Attachment[],
): Promise<Message> {
  if (!isLive) {
    await delay(450);
    if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("offline");
    if (Math.random() < 0.25) throw new Error("network_unstable");
    return {
      id: `srv_${Date.now()}`, author: "agent", content,
      timestamp: new Date().toISOString(), status: "delivered", attachments,
    };
  }

  let res: Response;
  if (attachments && attachments.length > 0) {
    const fd = new FormData();
    fd.append("content", content);
    fd.append("message_type", "outgoing");
    for (const a of attachments) {
      const blob = await fetch(a.url).then((r) => r.blob());
      fd.append("attachments[]", blob, a.name);
    }
    res = await fetch(api(`/conversations/${conversationId}/messages`), {
      method: "POST",
      headers: { api_access_token: TOKEN! },
      body: fd,
    });
  } else {
    res = await fetch(api(`/conversations/${conversationId}/messages`), {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ content, message_type: "outgoing", private: false }),
    });
  }
  if (!res.ok) throw new Error(`chatwoot_${res.status}`);
  return mapMessage((await res.json()) as CwMessage);
}

export async function assignAgent(conversationId: string, agentId: string): Promise<void> {
  if (!isLive) return;
  await http(api(`/conversations/${conversationId}/assignments`), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ assignee_id: agentId }),
  });
}

export async function listAutomations(conversationId: string): Promise<AutomationEvent[]> {
  if (!isLive) return useMockFallback() ? (mockConversations.find((c) => c.id === conversationId)?.context.automations ?? []) : [];
  return [];
}

export const chatwootInboxId = INBOX_ID;

/** Liga/desliga IA para uma conversa via custom_attributes. */
export async function setAiHandling(conversationId: string, enabled: boolean): Promise<void> {
  if (!isLive) return;
  await http(api(`/conversations/${conversationId}/custom_attributes`), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ custom_attributes: { ai_handling: enabled } }),
  });
}

/** Configuração para o consumer realtime. */
export const chatwootRealtimeConfig = {
  baseUrl: BASE,
  pubsubToken: import.meta.env.VITE_CHATWOOT_PUBSUB_TOKEN as string | undefined,
  accountId: ACCOUNT_ID,
};

