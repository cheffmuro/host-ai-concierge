/**
 * Server functions que leem as credenciais das integrações a partir de
 * `app_settings` (RLS: qualquer autenticado consegue ler). Substituem a
 * leitura direta de `import.meta.env.VITE_*` nos services do front.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ChatwootConfig {
  url?: string;
  user_token?: string;
  account_id?: string;
  inbox_id?: string;
  pubsub_token?: string;
}

export interface DifyConfig {
  url?: string;
  api_key?: string;
  dataset_id?: string;
}

async function loadSetting<T>(key: string): Promise<T> {
  // Usa admin client após verificação de auth (feita pelo middleware).
  // A tabela `app_settings` tem SELECT restrito a admin por RLS; os operadores
  // não-admin ainda precisam operar o Chatwoot/Dify (enviar mensagens etc.),
  // por isso lemos via service role aqui, depois do middleware validar o token.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return ((data?.value as T) ?? ({} as T));
}

export const getChatwootConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return loadSetting<ChatwootConfig>("chatwoot");
  });

export const getDifyConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return loadSetting<DifyConfig>("dify");
  });

