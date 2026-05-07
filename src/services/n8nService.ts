/**
 * n8n webhook triggers + validação dos workflows.
 * URLs e token podem vir de env vars (build) ou serem configurados em runtime via localStorage.
 */

const ENV_HANDOFF = import.meta.env.VITE_N8N_WEBHOOK_HANDOFF as string | undefined;
const ENV_REVERSE = import.meta.env.VITE_N8N_WEBHOOK_REVERSE_LOGISTICS as string | undefined;
const ENV_WHATSAPP = import.meta.env.VITE_N8N_WEBHOOK_WHATSAPP as string | undefined;
const ENV_TOKEN = import.meta.env.VITE_N8N_WEBHOOK_TOKEN as string | undefined;

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

export type WorkflowKey = "handoff" | "reverse-logistics" | "whatsapp-rag-chatwoot";

const ENV_URLS: Record<WorkflowKey, string | undefined> = {
  "handoff": ENV_HANDOFF,
  "reverse-logistics": ENV_REVERSE,
  "whatsapp-rag-chatwoot": ENV_WHATSAPP,
};

const LS_URL = (key: WorkflowKey) => `n8n:webhook:${key}`;
const LS_TOKEN = "n8n:token";

function ls(): Storage | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

export function getWorkflowUrl(key: WorkflowKey): string | undefined {
  const stored = ls()?.getItem(LS_URL(key)) ?? undefined;
  return (stored && stored.trim()) || ENV_URLS[key];
}

export function setWorkflowUrl(key: WorkflowKey, url: string): void {
  const s = ls(); if (!s) return;
  if (url.trim()) s.setItem(LS_URL(key), url.trim());
  else s.removeItem(LS_URL(key));
}

export function getWebhookToken(): string | undefined {
  const stored = ls()?.getItem(LS_TOKEN) ?? undefined;
  return (stored && stored.trim()) || ENV_TOKEN;
}

export function setWebhookToken(token: string): void {
  const s = ls(); if (!s) return;
  if (token.trim()) s.setItem(LS_TOKEN, token.trim());
  else s.removeItem(LS_TOKEN);
}

function buildHeaders(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const token = getWebhookToken();
  if (token) h["X-Webhook-Token"] = token;
  return h;
}

async function post<T>(url: string | undefined, body: unknown, mock: T): Promise<T> {
  if (!url) { await delay(); return mock; }
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`n8n_${res.status}`);
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : mock;
}

export async function triggerHandoff(conversationId: string): Promise<{ ok: true }> {
  return post<{ ok: true }>(
    getWorkflowUrl("handoff"),
    { conversationId, source: "host-ai-concierge", at: new Date().toISOString() },
    { ok: true },
  );
}

export async function triggerReverseLogistics(orderId: string): Promise<{ ok: true; trackingId: string }> {
  return post<{ ok: true; trackingId: string }>(
    getWorkflowUrl("reverse-logistics"),
    { orderId, source: "host-ai-concierge", at: new Date().toISOString() },
    { ok: true, trackingId: `RL${Date.now()}` },
  );
}

// ---------------- Workflows manager ----------------

export interface WorkflowMeta {
  key: WorkflowKey;
  label: string;
  description: string;
  webhookPath: string;
  jsonPath: string; // download path under /public
  envVar: string;
  samplePayload: Record<string, unknown>;
}

export const WORKFLOWS: WorkflowMeta[] = [
  {
    key: "handoff",
    label: "Handoff humano",
    description: "Desativa o flag ai_handling no Chatwoot e grava nota privada quando o atendente assume.",
    webhookPath: "/webhook/handoff",
    jsonPath: "/n8n/handoff.json",
    envVar: "VITE_N8N_WEBHOOK_HANDOFF",
    samplePayload: { conversationId: "test-conv-1", source: "host-ai-concierge", at: new Date().toISOString() },
  },
  {
    key: "reverse-logistics",
    label: "Logística reversa",
    description: "Gera trackingId para devolução; ponto de integração com ERP/Shopify.",
    webhookPath: "/webhook/reverse-logistics",
    jsonPath: "/n8n/reverse-logistics.json",
    envVar: "VITE_N8N_WEBHOOK_REVERSE_LOGISTICS",
    samplePayload: { orderId: "TEST-123", source: "host-ai-concierge", at: new Date().toISOString() },
  },
  {
    key: "whatsapp-rag-chatwoot",
    label: "WhatsApp · RAG · Chatwoot",
    description: "Recebe mensagens da Evolution, consulta Dify (RAG) e responde via WhatsApp + Chatwoot.",
    webhookPath: "/webhook/whatsapp",
    jsonPath: "/n8n/whatsapp-rag-chatwoot.json",
    envVar: "VITE_N8N_WEBHOOK_WHATSAPP",
    samplePayload: {
      event: "messages.upsert",
      instance: "test",
      data: {
        key: { remoteJid: "5511999999999@s.whatsapp.net", fromMe: false, id: "TEST" },
        message: { conversation: "ping de teste do painel" },
        pushName: "Teste Painel",
      },
    },
  },
];

export interface WebhookResult {
  ok: boolean;
  status: number;
  ms: number;
  body: string;
  error?: string;
}

export async function callWebhook(url: string, payload: unknown): Promise<WebhookResult> {
  const start = performance.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      ms: Math.round(performance.now() - start),
      body: text.slice(0, 500),
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      ms: Math.round(performance.now() - start),
      body: "",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function validateWebhook(url: string): Promise<WebhookResult> {
  return callWebhook(url, { ping: true, source: "host-ai-concierge", at: new Date().toISOString() });
}
