/**
 * Server functions expostas ao cliente para descobrir *quais* integrações
 * estão configuradas e obter dados NÃO sensíveis (URLs, ids, pubsub token).
 * Os tokens de admin (`user_token`, `api_key`) NÃO saem do servidor —
 * chamadas ao Chatwoot/Dify passam por `chatwoot.functions.ts` e
 * `dify.functions.ts`.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

async function loadRaw(key: string): Promise<Record<string, string>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("app_settings").select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.value ?? {}) as Record<string, string>;
}

export const getChatwootConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<ChatwootPublicConfig> => {
    const v = await loadRaw("chatwoot");
    return {
      url: v.url,
      account_id: v.account_id,
      inbox_id: v.inbox_id,
      pubsub_token: v.pubsub_token,
      configured: Boolean(v.url && v.user_token && v.account_id),
    };
  });

export const getDifyConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<DifyPublicConfig> => {
    const v = await loadRaw("dify");
    return {
      url: v.url,
      dataset_id: v.dataset_id,
      configured: Boolean(v.url && v.api_key && v.dataset_id),
    };
  });
