import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const SKEW_SECONDS = 60;

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return atob(padded);
  } catch {
    return null;
  }
}

function getJwtExp(token?: string | null): number | null {
  if (!token) return null;
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const parsed = JSON.parse(decodeBase64Url(payload) ?? "{}") as { exp?: unknown };
    return typeof parsed.exp === "number" ? parsed.exp : null;
  } catch {
    return null;
  }
}

function isStale(session: Session | null) {
  if (!session?.access_token) return true;
  const exp = getJwtExp(session.access_token) ?? session.expires_at ?? 0;
  return exp - SKEW_SECONDS <= Math.floor(Date.now() / 1000);
}

export function isJwtExpiredError(error: { message?: string; code?: string } | null | undefined) {
  const msg = error?.message?.toLowerCase() ?? "";
  return error?.code === "PGRST303" || msg.includes("jwt expired") || msg.includes("invalid jwt");
}

export async function ensureActiveSession(): Promise<Session | null> {
  const current = await supabase.auth.getSession().catch(() => null);
  let session = current?.data.session ?? null;

  if (session && isStale(session)) {
    const refreshed = await supabase.auth.refreshSession().catch(() => null);
    if (refreshed && !refreshed.error && refreshed.data.session) {
      session = refreshed.data.session;
    }
  }

  return session;
}

export async function refreshSessionForRetry() {
  await supabase.auth.refreshSession().catch(() => null);
}