/**
 * Server function que agrega métricas reais do Chatwoot para o Dashboard.
 * Lê credenciais server-side (app_settings via admin client, após auth),
 * chama a Reports API v2 e devolve DTO simples ao cliente. Tokens nunca
 * saem do server.
 *
 * Chatwoot Reports API:
 * - GET /api/v2/accounts/{id}/reports/summary?type=account
 * - GET /api/v2/accounts/{id}/reports/conversations_filter?type=account
 * - GET /api/v2/accounts/{id}/reports?metric=conversations_count&type=account&since=&until=
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface DashboardMetrics {
  configured: boolean;
  resolutionRate: number;          // 0..1
  iaResolution?: number;           // compat fallback solicitado pela UI
  avgHandleTime: string;           // ex "2m 14s"
  avgTime?: number;                 // seconds, compat fallback solicitado pela UI
  humanHandoffs: number;
  activeConversations: number;
  weeklyVolume: Array<{ day: string; automated: number; human: number }>;
  error?: string;
}

const EMPTY: DashboardMetrics = {
  configured: false,
  resolutionRate: 0,
  iaResolution: 0,
  avgHandleTime: "—",
  avgTime: 0,
  humanHandoffs: 0,
  activeConversations: 0,
  weeklyVolume: [],
};

function fallback(error?: string): DashboardMetrics {
  return error ? { ...EMPTY, error } : { ...EMPTY };
}

function fmtDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

async function jsonOrNull<T>(input: string, headers: HeadersInit): Promise<T | null> {
  try {
    const res = await fetch(input, { headers });
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Chatwoot API error: ${res.status} ${res.statusText} - ${errorText}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.error(`Chatwoot fetch error: ${input}`, error);
    return null;
  }
}

function decodeJwtPayload(token: string): { sub?: string; exp?: number } | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "="));
    return JSON.parse(decoded) as { sub?: string; exp?: number };
  } catch {
    return null;
  }
}

async function hasValidCallerSession(): Promise<boolean> {
  try {
    const authHeader = getRequest()?.headers?.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return false;

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) return false;

    const payload = decodeJwtPayload(token);
    if (!payload?.sub || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
      console.error("getDashboardMetrics: sessão ausente ou expirada");
      return false;
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return false;

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", payload.sub)
      .maybeSingle();

    if (error) {
      console.error("getDashboardMetrics: sessão inválida", error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error("getDashboardMetrics: falha ao validar sessão", error);
    return false;
  }
}

export const getDashboardMetrics = createServerFn({ method: "GET" })
  .handler(async (): Promise<DashboardMetrics> => {
    try {
      const isAuthenticated = await hasValidCallerSession();
      if (!isAuthenticated) return fallback("Sessão expirada");

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", "chatwoot")
        .maybeSingle();

      if (error) {
        console.error("getDashboardMetrics: falha ao ler configuração", error.message);
        return fallback("Configuração indisponível");
      }

      const cfg = (data?.value ?? {}) as {
        url?: string; user_token?: string; account_id?: string;
      };
      if (!cfg.url || !cfg.user_token || !cfg.account_id) return fallback();

      const base = cfg.url.replace(/\/+$/, "");
      const acc = cfg.account_id;
      const H: HeadersInit = { api_access_token: cfg.user_token, "Content-Type": "application/json" };

      // Janela: 7 dias
      const now = Math.floor(Date.now() / 1000);
      const sevenDays = 7 * 24 * 3600;
      const since = now - sevenDays;

      // Summary (resolutions_count, conversations_count, avg_resolution_time)
      type Summary = {
        conversations_count?: number;
        resolutions_count?: number;
        avg_resolution_time?: number;   // seconds
        avg_first_response_time?: number;
      };
      const summary = await jsonOrNull<Summary>(
        `${base}/api/v2/accounts/${acc}/reports/summary?type=account&since=${since}&until=${now}`,
        H,
      );

      // Conversations open agora (para "Conversas Ativas")
      type CountResp = { meta?: { all_count?: number } };
      const open = await jsonOrNull<CountResp>(
        `${base}/api/v1/accounts/${acc}/conversations?status=open&page=1`,
        H,
      );

      // Série diária: chamamos "conversations_count" e usamos length dos últimos 7 dias.
      // Fallback: se falhar, entrega array vazio.
      type Point = { value: number; timestamp: number };
      const [totalSeries, resolvedSeries] = await Promise.all([
        jsonOrNull<Point[]>(
          `${base}/api/v2/accounts/${acc}/reports?metric=conversations_count&type=account&since=${since}&until=${now}`,
          H,
        ),
        jsonOrNull<Point[]>(
          `${base}/api/v2/accounts/${acc}/reports?metric=resolutions_count&type=account&since=${since}&until=${now}`,
          H,
        ),
      ]);

      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date((now - (6 - i) * 24 * 3600) * 1000);
        return {
          key: Math.floor(d.setHours(0, 0, 0, 0) / 1000),
          label: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        };
      });

      const weeklyVolume = days.map((d) => {
        const total = totalSeries?.find((p) => Math.abs(p.timestamp - d.key) < 43200)?.value ?? 0;
        const resolved = resolvedSeries?.find((p) => Math.abs(p.timestamp - d.key) < 43200)?.value ?? 0;
        // "automated" = resolvidas sem handoff; "human" = total - resolved (aproximação).
        const human = Math.max(0, total - resolved);
        return { day: d.label, automated: resolved, human };
      });

      const convsCount = summary?.conversations_count ?? 0;
      const resolutions = summary?.resolutions_count ?? 0;
      const resolutionRate = convsCount > 0 ? resolutions / convsCount : 0;

      return {
        configured: true,
        resolutionRate,
        iaResolution: resolutionRate,
        avgHandleTime: fmtDuration(summary?.avg_resolution_time ?? 0),
        avgTime: summary?.avg_resolution_time ?? 0,
        humanHandoffs: Math.max(0, convsCount - resolutions),
        activeConversations: open?.meta?.all_count ?? 0,
        weeklyVolume,
      };
    } catch (error) {
      console.error("getDashboardMetrics: falha ao buscar métricas do Chatwoot", error);
      return fallback(error instanceof Error ? error.message : "Chatwoot indisponível");
    }
  });
