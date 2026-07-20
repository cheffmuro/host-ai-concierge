/**
 * Server functions para gerenciamento de branding (white-label) da organização
 * do usuário logado. Escrita restringida a admins pela RLS.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getCallerOrgId } from "@/lib/org-context.server";

export interface OrgBranding {
  org_id: string;
  brand_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  custom_domain: string | null;
  support_email: string | null;
}

export const getMyBranding = createServerFn({ method: "GET" }).handler(
  async (): Promise<OrgBranding | null> => {
    try {
      const orgId = await getCallerOrgId();
      if (!orgId) return null;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin
        .from("org_branding")
        .select("org_id, brand_name, logo_url, primary_color, accent_color, custom_domain, support_email")
        .eq("org_id", orgId)
        .maybeSingle();
      if (error) {
        console.error("[branding] getMyBranding error:", error.message);
        return null;
      }
      return (data as OrgBranding | null) ?? { org_id: orgId, brand_name: null, logo_url: null, primary_color: null, accent_color: null, custom_domain: null, support_email: null };
    } catch (e) {
      console.error("[branding] getMyBranding threw:", e);
      return null;
    }
  },
);

const brandingSchema = z.object({
  brand_name: z.string().max(80).nullable().optional(),
  logo_url: z.string().url().nullable().optional().or(z.literal("")),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  custom_domain: z.string().max(120).nullable().optional(),
  support_email: z.string().email().nullable().optional().or(z.literal("")),
});

export const updateMyBranding = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => brandingSchema.parse(input))
  .handler(async ({ data }) => {
    const orgId = await getCallerOrgId();
    if (!orgId) throw new Error("no_org");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verifica admin
    const { data: member } = await supabaseAdmin
      .from("organization_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", (await import("@/lib/org-context.server")).getCallerUserId() ?? "")
      .maybeSingle();
    if (!member || (member as { role: string }).role !== "admin") {
      throw new Error("forbidden");
    }

    const payload = {
      org_id: orgId,
      brand_name: data.brand_name || null,
      logo_url: data.logo_url || null,
      primary_color: data.primary_color || null,
      accent_color: data.accent_color || null,
      custom_domain: data.custom_domain || null,
      support_email: data.support_email || null,
    };
    const { error } = await supabaseAdmin.from("org_branding").upsert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Resolver PÚBLICO por hostname: usado pela landing/login para descobrir
 * a marca antes do usuário se autenticar (white-label por domínio).
 */
export const getBrandingByHost = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ host: z.string() }).parse(input))
  .handler(async ({ data }): Promise<OrgBranding | null> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row } = await supabaseAdmin
        .from("org_branding")
        .select("org_id, brand_name, logo_url, primary_color, accent_color, custom_domain, support_email")
        .eq("custom_domain", data.host)
        .maybeSingle();
      return (row as OrgBranding | null) ?? null;
    } catch (e) {
      console.error("[branding] getBrandingByHost failed:", e);
      return null;
    }
  });
