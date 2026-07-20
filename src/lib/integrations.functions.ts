/**
 * Server functions expostas ao cliente para descobrir *quais* integrações
 * estão configuradas e obter dados NÃO sensíveis (URLs, ids, pubsub token).
 * Os tokens de admin (`user_token`, `api_key`) NÃO saem do servidor —
 * chamadas ao Chatwoot/Dify passam por `chatwoot.functions.ts` e
 * `dify.functions.ts`.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export interface ChatwootPublicConfig {
  url?: string;
  account_id?: string;
  inbox_id?: string;
  pubsub_token?: string;
  configured: boolean;
}

export interface DifyPublicConfig {
  url?: string;
  dataset_id?: string;
  configured: boolean;
}

// Compat aliases para código existente.
export type ChatwootConfig = ChatwootPublicConfig;
export type DifyConfig = DifyPublicConfig;

function decodeJwtPayload(token: string): { sub?: string; exp?: number } | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    const json = atob(b64 + pad);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

async function hasValidCallerSession(): Promise<boolean> {
  try {
    const req = getRequest();
    const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!auth?.toLowerCase().startsWith("bearer ")) return false;
    const token = auth.slice(7).trim();
    const payload = decodeJwtPayload(token);
    if (!payload?.sub) return false;
    if (payload.exp && payload.exp * 1000 < Date.now()) return false;
    return true;
  } catch (e) {
    console.error("[integrations] session check failed:", e);
    return false;
  }
}

async function loadRaw(key: string): Promise<Record<string, string> | null> {
  try {
    const { loadOrgSetting } = await import("@/lib/org-context.server");
    return await loadOrgSetting<Record<string, string>>(key);
  } catch (e) {
    console.error(`[integrations] loadRaw(${key}) threw:`, e);
    return null;
  }
}


export const getChatwootConfig = createServerFn({ method: "GET" })
  .handler(async (): Promise<ChatwootPublicConfig | null> => {
    try {
      if (!(await hasValidCallerSession())) return null;
      const v = await loadRaw("chatwoot");
      if (!v) return null;
      return {
        url: v.url,
        account_id: v.account_id,
        inbox_id: v.inbox_id,
        pubsub_token: v.pubsub_token,
        configured: Boolean(v.url && v.user_token && v.account_id),
      };
    } catch (e) {
      console.error("[integrations] getChatwootConfig failed:", e);
      return null;
    }
  });

export const getDifyConfig = createServerFn({ method: "GET" })
  .handler(async (): Promise<DifyPublicConfig | null> => {
    try {
      if (!(await hasValidCallerSession())) return null;
      const v = await loadRaw("dify");
      if (!v) return null;
      return {
        url: v.url,
        dataset_id: v.dataset_id,
        configured: Boolean(v.url && v.api_key && v.dataset_id),
      };
    } catch (e) {
      console.error("[integrations] getDifyConfig failed:", e);
      return null;
    }
  });
