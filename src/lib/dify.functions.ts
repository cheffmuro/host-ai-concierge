/**
 * Server functions para o Dify (RAG). Mantém `api_key` no servidor.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

interface DifyServerConfig {
  url: string;
  api_key: string;
  dataset_id: string;
}

async function loadCfg(): Promise<DifyServerConfig> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("app_settings").select("value").eq("key", "dify").maybeSingle();
  if (error) throw new Error(error.message);
  const v = (data?.value ?? {}) as Partial<DifyServerConfig>;
  if (!v.url || !v.api_key || !v.dataset_id) throw new Error("dify_not_configured");
  return v as DifyServerConfig;
}

const base = (cfg: DifyServerConfig) => cfg.url.replace(/\/+$/, "");
const auth = (cfg: DifyServerConfig) => ({ Authorization: `Bearer ${cfg.api_key}` });

async function dfFetch(cfg: DifyServerConfig, path: string, init?: RequestInit): Promise<Json> {
  const res = await fetch(`${base(cfg)}${path}`, {
    ...init,
    headers: { ...auth(cfg), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`dify_${res.status}:${body.slice(0, 160)}`);
  }
  return res.json();
}

export const difyListDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const cfg = await loadCfg();
    return dfFetch(cfg, `/v1/datasets/${cfg.dataset_id}/documents?page=1&limit=50`);
  });

export const difyUploadDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ name: z.string(), mime: z.string().optional(), contentBase64: z.string() }).parse(input),
  )
  .handler(async ({ data }) => {
    const cfg = await loadCfg();
    const bin = Uint8Array.from(atob(data.contentBase64), (c) => c.charCodeAt(0));
    const fd = new FormData();
    fd.append("file", new Blob([bin], { type: data.mime ?? "application/octet-stream" }), data.name);
    fd.append("data", JSON.stringify({
      indexing_technique: "high_quality",
      process_rule: { mode: "automatic" },
    }));
    const res = await fetch(`${base(cfg)}/v1/datasets/${cfg.dataset_id}/document/create-by-file`, {
      method: "POST",
      headers: auth(cfg),
      body: fd,
    });
    if (!res.ok) throw new Error(`dify_upload_${res.status}`);
    return res.json();
  });

export const difyRemoveDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const cfg = await loadCfg();
    const res = await fetch(`${base(cfg)}/v1/datasets/${cfg.dataset_id}/documents/${data.id}`, {
      method: "DELETE",
      headers: auth(cfg),
    });
    if (!res.ok) throw new Error(`dify_delete_${res.status}`);
    return { ok: true };
  });

export const difyAsk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      query: z.string(),
      user: z.string().optional(),
      conversationId: z.string().optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const cfg = await loadCfg();
    return dfFetch(cfg, `/v1/chat-messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs: {},
        query: data.query,
        user: data.user ?? "host-ai-concierge-agent",
        response_mode: "blocking",
        conversation_id: data.conversationId ?? "",
      }),
    });
  });

export const difyPing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      url: z.string().min(1),
      api_key: z.string().min(1),
      dataset_id: z.string().min(1),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const b = data.url.replace(/\/+$/, "");
    try {
      const res = await fetch(`${b}/v1/datasets/${data.dataset_id}/documents?page=1&limit=1`, {
        headers: { Authorization: `Bearer ${data.api_key}` },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { ok: false as const, error: `Dify ${res.status}: ${body.slice(0, 120) || "sem corpo"}` };
      }
      return { ok: true as const };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "falha de rede" };
    }
  });
