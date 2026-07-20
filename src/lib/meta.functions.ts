/**
 * Meta OAuth (Instagram / Facebook Messenger / WhatsApp Cloud API).
 *
 * Fluxo: admin salva App ID + App Secret + Redirect URI (server-side em
 * app_settings), depois clica "Conectar" → geramos state HMAC-assinado e
 * devolvemos a URL de autorização do Facebook. O callback público em
 * /api/public/meta/callback troca `code` por tokens e persiste as páginas /
 * IG accounts / WA numbers autorizados na org do usuário que iniciou.
 */
import { createServerFn } from "@tanstack/react-start";
import { getCallerOrgId, getCallerUserId, loadOrgSetting } from "@/lib/org-context.server";

export const META_GRAPH_VERSION = "v21.0";

export const META_SCOPES = {
  instagram: [
    "instagram_basic",
    "instagram_manage_messages",
    "pages_manage_metadata",
    "pages_show_list",
    "pages_read_engagement",
  ],
  messenger: [
    "pages_messaging",
    "pages_manage_metadata",
    "pages_show_list",
    "pages_read_engagement",
  ],
  whatsapp: [
    "whatsapp_business_management",
    "whatsapp_business_messaging",
    "business_management",
  ],
} as const;

export type MetaChannel = keyof typeof META_SCOPES;

export interface MetaAppConfig {
  app_id?: string;
  redirect_uri?: string;
  configured: boolean;
}

export interface MetaPage {
  id: string;
  name: string;
  category?: string;
  instagram?: { id: string; username?: string };
}
export interface MetaWaNumber {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  waba_id?: string;
}
export interface MetaConnectionStatus {
  connected: boolean;
  connected_at?: string;
  connected_by?: string;
  scopes?: string[];
  channels?: MetaChannel[];
  pages: MetaPage[];
  wa_numbers: MetaWaNumber[];
  user_name?: string;
}

// ---------- helpers ---------------------------------------------------------

function b64url(input: Buffer | string): string {
  const b = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function b64urlDecode(input: string): Buffer {
  const s = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  return Buffer.from(s + pad, "base64");
}

async function hmac(payload: string): Promise<string> {
  const secret = process.env.META_OAUTH_STATE_SECRET;
  if (!secret) throw new Error("META_OAUTH_STATE_SECRET not set");
  const { createHmac } = await import("node:crypto");
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export interface MetaOAuthStatePayload {
  org_id: string;
  user_id: string;
  channels: MetaChannel[];
  exp: number;
  nonce: string;
}

export async function signMetaOAuthState(p: MetaOAuthStatePayload): Promise<string> {
  const body = b64url(JSON.stringify(p));
  const sig = await hmac(body);
  return `${body}.${sig}`;
}

export async function verifyMetaOAuthState(state: string): Promise<MetaOAuthStatePayload | null> {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = await hmac(body);
  if (expected.length !== sig.length) return null;
  const { timingSafeEqual } = await import("node:crypto");
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const p = JSON.parse(b64urlDecode(body).toString("utf8")) as MetaOAuthStatePayload;
    if (!p.org_id || !p.user_id || !p.exp || p.exp * 1000 < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

async function assertAdmin(orgId: string, userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("organization_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if ((data as { role?: string } | null)?.role !== "admin") {
    throw new Error("Apenas administradores podem gerenciar a integração Meta.");
  }
}

// ---------- server functions ------------------------------------------------

export const getMetaAppConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<MetaAppConfig | null> => {
    try {
      const cfg = await loadOrgSetting<Record<string, string>>("meta_app");
      if (!cfg) return { configured: false };
      return {
        app_id: cfg.app_id,
        redirect_uri: cfg.redirect_uri,
        configured: Boolean(cfg.app_id && cfg.app_secret && cfg.redirect_uri),
      };
    } catch (e) {
      console.error("[meta] getMetaAppConfig failed:", e);
      return null;
    }
  },
);

export const getMetaConnectionStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<MetaConnectionStatus> => {
    try {
      const raw = await loadOrgSetting<{
        user_access_token?: string;
        expires_at?: number;
        user_name?: string;
        scopes?: string[];
        channels?: MetaChannel[];
        connected_at?: string;
        connected_by?: string;
        pages?: MetaPage[];
        wa_numbers?: MetaWaNumber[];
      }>("meta_connection");
      if (!raw?.user_access_token) {
        return { connected: false, pages: [], wa_numbers: [] };
      }
      return {
        connected: true,
        connected_at: raw.connected_at,
        connected_by: raw.connected_by,
        scopes: raw.scopes,
        channels: raw.channels,
        pages: raw.pages ?? [],
        wa_numbers: raw.wa_numbers ?? [],
        user_name: raw.user_name,
      };
    } catch (e) {
      console.error("[meta] getMetaConnectionStatus failed:", e);
      return { connected: false, pages: [], wa_numbers: [] };
    }
  },
);

export const saveMetaAppConfig = createServerFn({ method: "POST" })
  .inputValidator((input: { app_id: string; app_secret: string; redirect_uri: string }) => input)
  .handler(async ({ data }) => {
    const orgId = await getCallerOrgId();
    const userId = getCallerUserId();
    if (!orgId || !userId) throw new Error("Sessão inválida.");
    await assertAdmin(orgId, userId);

    const value = {
      app_id: data.app_id.trim(),
      app_secret: data.app_secret.trim(),
      redirect_uri: data.redirect_uri.trim(),
    };
    if (!value.app_id || !value.app_secret || !value.redirect_uri) {
      throw new Error("app_id, app_secret e redirect_uri são obrigatórios.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert({ key: "meta_app", value, org_id: orgId, updated_by: userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const startMetaOAuth = createServerFn({ method: "POST" })
  .inputValidator((input: { channels: MetaChannel[] }) => input)
  .handler(async ({ data }) => {
    const orgId = await getCallerOrgId();
    const userId = getCallerUserId();
    if (!orgId || !userId) throw new Error("Sessão inválida.");
    await assertAdmin(orgId, userId);

    const cfg = await loadOrgSetting<Record<string, string>>("meta_app");
    if (!cfg?.app_id || !cfg?.app_secret || !cfg?.redirect_uri) {
      throw new Error("Configure App ID, App Secret e Redirect URI antes de conectar.");
    }
    const channels = (data.channels?.length ? data.channels : (["instagram", "messenger"] as MetaChannel[]));
    const scopeSet = new Set<string>();
    channels.forEach((c) => META_SCOPES[c].forEach((s) => scopeSet.add(s)));

    const { randomBytes } = await import("node:crypto");
    const state = await signMetaOAuthState({
      org_id: orgId,
      user_id: userId,
      channels,
      exp: Math.floor(Date.now() / 1000) + 15 * 60,
      nonce: randomBytes(8).toString("hex"),
    });

    const params = new URLSearchParams({
      client_id: cfg.app_id,
      redirect_uri: cfg.redirect_uri,
      response_type: "code",
      state,
      scope: Array.from(scopeSet).join(","),
      auth_type: "rerequest",
    });
    return {
      authorization_url: `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth?${params.toString()}`,
    };
  });

export const disconnectMeta = createServerFn({ method: "POST" }).handler(async () => {
  const orgId = await getCallerOrgId();
  const userId = getCallerUserId();
  if (!orgId || !userId) throw new Error("Sessão inválida.");
  await assertAdmin(orgId, userId);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("app_settings")
    .delete()
    .eq("org_id", orgId)
    .eq("key", "meta_connection");
  if (error) throw new Error(error.message);
  return { ok: true };
});
