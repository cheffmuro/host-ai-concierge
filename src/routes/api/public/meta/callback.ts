/**
 * Meta OAuth callback público. Recebe ?code&state, valida state HMAC, troca
 * o code por tokens de longa duração e persiste páginas / IG accounts / WA
 * numbers na org de origem. Redireciona para /settings/integrations com
 * ?meta=connected|error.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  META_GRAPH_VERSION,
  verifyMetaOAuthState,
  type MetaPage,
  type MetaWaNumber,
} from "@/lib/meta.functions";

function redirectBack(origin: string, status: "connected" | "error", detail?: string) {
  const url = new URL("/settings/integrations", origin);
  url.searchParams.set("meta", status);
  if (detail) url.searchParams.set("meta_detail", detail.slice(0, 240));
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}

async function graph<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  if (!res.ok) throw new Error(`meta_${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text) as T;
}

interface PagesResponse {
  data: Array<{
    id: string;
    name: string;
    access_token: string;
    category?: string;
    instagram_business_account?: { id: string; username?: string };
  }>;
}
interface WabaListResponse {
  data: Array<{
    id: string;
    phone_numbers?: { data: Array<{ id: string; display_phone_number?: string; verified_name?: string }> };
  }>;
}
interface BusinessesResponse {
  data: Array<{ id: string; name?: string; owned_whatsapp_business_accounts?: WabaListResponse }>;
}

export const Route = createFileRoute("/api/public/meta/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = url.origin;
        const code = url.searchParams.get("code");
        const stateRaw = url.searchParams.get("state");
        const err = url.searchParams.get("error");
        if (err) return redirectBack(origin, "error", url.searchParams.get("error_description") ?? err);
        if (!code || !stateRaw) return redirectBack(origin, "error", "missing_code_or_state");

        const state = await verifyMetaOAuthState(stateRaw);
        if (!state) return redirectBack(origin, "error", "invalid_state");

        // Carrega config Meta da org
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: appRow, error: appErr } = await supabaseAdmin
          .from("app_settings")
          .select("value")
          .eq("org_id", state.org_id)
          .eq("key", "meta_app")
          .maybeSingle();
        if (appErr) return redirectBack(origin, "error", appErr.message);
        const app = (appRow?.value ?? {}) as { app_id?: string; app_secret?: string; redirect_uri?: string };
        if (!app.app_id || !app.app_secret || !app.redirect_uri) {
          return redirectBack(origin, "error", "app_not_configured");
        }

        try {
          // 1) Troca code por token de curta duração
          const shortRes = await graph<{ access_token: string; expires_in?: number }>(
            `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?` +
              new URLSearchParams({
                client_id: app.app_id,
                client_secret: app.app_secret,
                redirect_uri: app.redirect_uri,
                code,
              }).toString(),
          );

          // 2) Troca por token de longa duração (~60 dias)
          const longRes = await graph<{ access_token: string; expires_in?: number }>(
            `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?` +
              new URLSearchParams({
                grant_type: "fb_exchange_token",
                client_id: app.app_id,
                client_secret: app.app_secret,
                fb_exchange_token: shortRes.access_token,
              }).toString(),
          ).catch(() => ({ access_token: shortRes.access_token, expires_in: shortRes.expires_in }));

          const userToken = longRes.access_token;

          // 3) Identidade do usuário
          const me = await graph<{ id: string; name?: string }>(
            `https://graph.facebook.com/${META_GRAPH_VERSION}/me?fields=id,name&access_token=${encodeURIComponent(userToken)}`,
          ).catch(() => ({ id: "", name: undefined }));

          // 4) Páginas + IG business accounts
          const pages: MetaPage[] = [];
          const pageTokens: Array<{ id: string; access_token: string }> = [];
          if (state.channels.includes("instagram") || state.channels.includes("messenger")) {
            try {
              const p = await graph<PagesResponse>(
                `https://graph.facebook.com/${META_GRAPH_VERSION}/me/accounts?` +
                  `fields=id,name,category,access_token,instagram_business_account{id,username}` +
                  `&access_token=${encodeURIComponent(userToken)}`,
              );
              for (const it of p.data ?? []) {
                pages.push({
                  id: it.id,
                  name: it.name,
                  category: it.category,
                  instagram: it.instagram_business_account
                    ? { id: it.instagram_business_account.id, username: it.instagram_business_account.username }
                    : undefined,
                });
                pageTokens.push({ id: it.id, access_token: it.access_token });
              }
            } catch (e) {
              console.error("[meta] fetch pages failed:", e);
            }
          }

          // 5) WhatsApp Business Numbers
          const waNumbers: MetaWaNumber[] = [];
          if (state.channels.includes("whatsapp")) {
            try {
              const biz = await graph<BusinessesResponse>(
                `https://graph.facebook.com/${META_GRAPH_VERSION}/me/businesses?` +
                  `fields=id,name,owned_whatsapp_business_accounts{id,phone_numbers{id,display_phone_number,verified_name}}` +
                  `&access_token=${encodeURIComponent(userToken)}`,
              );
              for (const b of biz.data ?? []) {
                for (const waba of b.owned_whatsapp_business_accounts?.data ?? []) {
                  for (const num of waba.phone_numbers?.data ?? []) {
                    waNumbers.push({
                      id: num.id,
                      display_phone_number: num.display_phone_number,
                      verified_name: num.verified_name,
                      waba_id: waba.id,
                    });
                  }
                }
              }
            } catch (e) {
              console.error("[meta] fetch waba failed:", e);
            }
          }

          // 6) Persiste
          const value = {
            user_access_token: userToken,
            page_tokens: pageTokens,
            expires_at: longRes.expires_in ? Math.floor(Date.now() / 1000) + longRes.expires_in : null,
            user_id: me.id,
            user_name: me.name,
            channels: state.channels,
            pages,
            wa_numbers: waNumbers,
            connected_at: new Date().toISOString(),
            connected_by: state.user_id,
          };
          const { error: upErr } = await supabaseAdmin
            .from("app_settings")
            .upsert({
              key: "meta_connection",
              value: value as unknown as Record<string, unknown>,
              org_id: state.org_id,
              updated_by: state.user_id,
            });
          if (upErr) return redirectBack(origin, "error", upErr.message);

          return redirectBack(origin, "connected");
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[meta] callback failed:", msg);
          return redirectBack(origin, "error", msg);
        }
      },
    },
  },
});
