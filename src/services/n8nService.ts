/**
 * n8n webhook triggers. Sem token por padrão (URL secreta basta);
 * envia X-Webhook-Token quando VITE_N8N_WEBHOOK_TOKEN estiver definido,
 * para validação dentro do workflow.
 */

const HANDOFF = import.meta.env.VITE_N8N_WEBHOOK_HANDOFF as string | undefined;
const REVERSE = import.meta.env.VITE_N8N_WEBHOOK_REVERSE_LOGISTICS as string | undefined;
const TOKEN = import.meta.env.VITE_N8N_WEBHOOK_TOKEN as string | undefined;

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

function buildHeaders(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (TOKEN) h["X-Webhook-Token"] = TOKEN;
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
  // Webhooks podem responder vazio.
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : mock;
}

export async function triggerHandoff(conversationId: string): Promise<{ ok: true }> {
  return post<{ ok: true }>(
    HANDOFF,
    { conversationId, source: "host-ai-concierge", at: new Date().toISOString() },
    { ok: true },
  );
}

export async function triggerReverseLogistics(orderId: string): Promise<{ ok: true; trackingId: string }> {
  return post<{ ok: true; trackingId: string }>(
    REVERSE,
    { orderId, source: "host-ai-concierge", at: new Date().toISOString() },
    { ok: true, trackingId: `RL${Date.now()}` },
  );
}
