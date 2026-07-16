/**
 * Server functions para o Chatwoot. Todo o token (`user_token`) fica no
 * servidor — o cliente chama estas fns via RPC autenticado.
 *
 * Fluxo:
 *   client -> useServerFn(chatwoot*) -> requireSupabaseAuth -> admin client
 *   carrega app_settings('chatwoot') -> chamada HTTP ao Chatwoot.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

interface ChatwootServerConfig {
  url: string;
  user_token: string;
  account_id: string;
  inbox_id?: string;
  pubsub_token?: string;
}

async function loadCfg(): Promise<ChatwootServerConfig> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("app_settings").select("value").eq("key", "chatwoot").maybeSingle();
  if (error) throw new Error(error.message);
  const v = (data?.value ?? {}) as Partial<ChatwootServerConfig>;
  if (!v.url || !v.user_token || !v.account_id) {
    throw new Error("chatwoot_not_configured");
  }
  return v as ChatwootServerConfig;
}

const api = (cfg: ChatwootServerConfig, path: string) =>
  `${cfg.url.replace(/\/+$/, "")}/api/v1/accounts/${cfg.account_id}${path}`;
const jsonHeaders = (cfg: ChatwootServerConfig) => ({
  api_access_token: cfg.user_token,
  "Content-Type": "application/json",
});

async function cwFetch<T>(cfg: ChatwootServerConfig, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(api(cfg, path), {
    ...init,
    headers: { ...jsonHeaders(cfg), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`chatwoot_${res.status}:${body.slice(0, 160)}`);
  }
  return res.json() as Promise<T>;
}

// --- Server fns ------------------------------------------------------------

export const chatwootListConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const cfg = await loadCfg();
    return cwFetch<{ data: { payload: unknown[] } }>(
      cfg,
      `/conversations?status=open&assignee_type=me&page=1`,
    );
  });

export const chatwootGetConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const cfg = await loadCfg();
    const conv = await cwFetch<unknown>(cfg, `/conversations/${data.id}`);
    const msgs = await cwFetch<{ payload: unknown[] }>(cfg, `/conversations/${data.id}/messages`);
    return { conversation: conv, messages: msgs.payload };
  });

const attachmentSchema = z.object({
  name: z.string(),
  mime: z.string(),
  contentBase64: z.string(),
});

export const chatwootSendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      conversationId: z.string(),
      content: z.string(),
      attachments: z.array(attachmentSchema).optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const cfg = await loadCfg();
    const path = `/conversations/${data.conversationId}/messages`;
    if (data.attachments && data.attachments.length > 0) {
      const fd = new FormData();
      fd.append("content", data.content);
      fd.append("message_type", "outgoing");
      for (const a of data.attachments) {
        const bin = Uint8Array.from(atob(a.contentBase64), (c) => c.charCodeAt(0));
        fd.append("attachments[]", new Blob([bin], { type: a.mime }), a.name);
      }
      const res = await fetch(api(cfg, path), {
        method: "POST",
        headers: { api_access_token: cfg.user_token },
        body: fd,
      });
      if (!res.ok) throw new Error(`chatwoot_${res.status}`);
      return res.json();
    }
    return cwFetch<unknown>(cfg, path, {
      method: "POST",
      body: JSON.stringify({ content: data.content, message_type: "outgoing", private: false }),
    });
  });

export const chatwootSetAiHandling = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ conversationId: z.string(), enabled: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    const cfg = await loadCfg();
    await cwFetch(cfg, `/conversations/${data.conversationId}/custom_attributes`, {
      method: "POST",
      body: JSON.stringify({ custom_attributes: { ai_handling: data.enabled } }),
    });
    return { ok: true };
  });

export const chatwootAssignAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ conversationId: z.string(), agentId: z.string() }).parse(input),
  )
  .handler(async ({ data }) => {
    const cfg = await loadCfg();
    await cwFetch(cfg, `/conversations/${data.conversationId}/assignments`, {
      method: "POST",
      body: JSON.stringify({ assignee_id: data.agentId }),
    });
    return { ok: true };
  });

/** Ping usado no formulário de integrações (admin) — não lê app_settings. */
export const chatwootPing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      url: z.string().min(1),
      user_token: z.string().min(1),
      account_id: z.string().min(1),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const base = data.url.replace(/\/+$/, "");
    try {
      const res = await fetch(`${base}/api/v1/accounts/${data.account_id}`, {
        headers: { api_access_token: data.user_token, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { ok: false as const, error: `Chatwoot ${res.status}: ${body.slice(0, 120) || "sem corpo"}` };
      }
      return { ok: true as const };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "falha de rede" };
    }
  });
