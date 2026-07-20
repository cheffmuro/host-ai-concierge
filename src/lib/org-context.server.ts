/**
 * Helpers server-only para resolver a organização do usuário logado
 * a partir do JWT enviado pelo cliente e carregar linhas de app_settings
 * escopadas por org.
 */
import { getRequest } from "@tanstack/react-start/server";

function decodeJwt(token: string): { sub?: string } | null {
  try {
    const p = token.split(".")[1];
    if (!p) return null;
    const b64 = p.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    return JSON.parse(atob(b64 + pad));
  } catch {
    return null;
  }
}

export function getCallerUserId(): string | null {
  try {
    const req = getRequest();
    const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!auth?.toLowerCase().startsWith("bearer ")) return null;
    const payload = decodeJwt(auth.slice(7).trim());
    return payload?.sub ?? null;
  } catch {
    return null;
  }
}

export async function getCallerOrgId(): Promise<string | null> {
  const uid = getCallerUserId();
  if (!uid) return null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("organization_members")
      .select("org_id")
      .eq("user_id", uid)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return (data as { org_id: string } | null)?.org_id ?? null;
  } catch (e) {
    console.error("[org-context] getCallerOrgId failed:", e);
    return null;
  }
}

export async function loadOrgSetting<T = Record<string, string>>(
  key: string,
): Promise<T | null> {
  const orgId = await getCallerOrgId();
  if (!orgId) return null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", key)
      .eq("org_id", orgId)
      .maybeSingle();
    if (error) {
      console.error(`[org-context] loadOrgSetting(${key}) error:`, error.message);
      return null;
    }
    return (data?.value ?? null) as T | null;
  } catch (e) {
    console.error(`[org-context] loadOrgSetting(${key}) threw:`, e);
    return null;
  }
}
