/**
 * Server functions para gestão de usuários da empresa.
 * Somente admins podem listar e alterar papéis.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = "admin" | "member";

export interface CompanyUser {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: AppRole;
  created_at: string | null;
  last_sign_in_at: string | null;
}

function decodeJwtPayload(token: string): { sub?: string; exp?: number } | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    return JSON.parse(atob(b64 + pad));
  } catch {
    return null;
  }
}

async function requireAdminCaller(): Promise<{ userId: string } | { error: string }> {
  try {
    const req = getRequest();
    const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!auth?.toLowerCase().startsWith("bearer ")) return { error: "Não autenticado" };
    const token = auth.slice(7).trim();
    const payload = decodeJwtPayload(token);
    if (!payload?.sub) return { error: "Sessão inválida" };
    if (payload.exp && payload.exp * 1000 < Date.now()) return { error: "Sessão expirada" };

    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.rpc("has_role", {
      _user_id: payload.sub,
      _role: "admin",
    });
    if (error) {
      console.error("[users] has_role rpc error:", error.message);
      return { error: "Falha ao verificar permissão" };
    }
    if (!data) return { error: "Acesso restrito a administradores" };
    return { userId: payload.sub };
  } catch (e) {
    console.error("[users] requireAdminCaller threw:", e);
    return { error: "Erro inesperado" };
  }
}

export const listCompanyUsers = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ users: CompanyUser[]; error?: string }> => {
    try {
      const check = await requireAdminCaller();
      if ("error" in check) return { users: [], error: check.error };

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: authList, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (authErr) {
        console.error("[users] listUsers error:", authErr.message);
        return { users: [], error: "Falha ao carregar usuários" };
      }

      const [{ data: roles }, { data: profiles }] = await Promise.all([
        supabaseAdmin.from("user_roles").select("user_id, role"),
        supabaseAdmin.from("profiles").select("id, display_name, avatar_url"),
      ]);

      const roleMap = new Map<string, AppRole>();
      roles?.forEach((r) => roleMap.set(r.user_id, r.role as AppRole));
      const profMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
      profiles?.forEach((p) =>
        profMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url }),
      );

      const users: CompanyUser[] = authList.users.map((u) => ({
        id: u.id,
        email: u.email ?? null,
        display_name: profMap.get(u.id)?.display_name ?? null,
        avatar_url: profMap.get(u.id)?.avatar_url ?? null,
        role: roleMap.get(u.id) ?? "member",
        created_at: u.created_at ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
      }));

      users.sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));
      return { users };
    } catch (e) {
      console.error("[users] listCompanyUsers failed:", e);
      return { users: [], error: "Erro inesperado" };
    }
  },
);

export const setUserRole = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string; role: AppRole }) => {
    if (!d?.userId || (d.role !== "admin" && d.role !== "member")) {
      throw new Error("Parâmetros inválidos");
    }
    return d;
  })
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const check = await requireAdminCaller();
      if ("error" in check) return { ok: false, error: check.error };

      // Impede que o admin se rebaixe e fique sem nenhum admin no sistema.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      if (check.userId === data.userId && data.role !== "admin") {
        const { data: admins } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");
        if (!admins || admins.length <= 1) {
          return { ok: false, error: "Deve haver pelo menos um administrador" };
        }
      }

      // Substitui o papel atual (uma linha por usuário).
      const { error: delErr } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId);
      if (delErr) {
        console.error("[users] delete role error:", delErr.message);
        return { ok: false, error: "Falha ao atualizar papel" };
      }
      const { error: insErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role });
      if (insErr) {
        console.error("[users] insert role error:", insErr.message);
        return { ok: false, error: "Falha ao gravar novo papel" };
      }
      return { ok: true };
    } catch (e) {
      console.error("[users] setUserRole failed:", e);
      return { ok: false, error: "Erro inesperado" };
    }
  });
