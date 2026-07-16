import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const SKEW_SECONDS = 90;

let refreshPromise: Promise<Session | null> | null = null;

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    if (typeof atob !== "function") return null;
    return atob(padded);
  } catch {
    return null;
  }
}

export function getJwtExp(token?: string | null): number | null {
  if (!token) return null;
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const decoded = decodeBase64Url(payload);
    if (!decoded) return null;
    const parsed = JSON.parse(decoded) as { exp?: unknown };
    return typeof parsed.exp === "number" ? parsed.exp : null;
  } catch {
    return null;
  }
}

export function isSessionExpiredOrStale(session: Session | null, skewSeconds = SKEW_SECONDS) {
  if (!session?.access_token) return true;
  const exp = getJwtExp(session.access_token);
  if (!exp) return true;
  return exp - skewSeconds <= Math.floor(Date.now() / 1000);
}

async function clearLocalSession() {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Best effort: the route guard / next auth call will treat it as signed out.
  }
}

function refreshCurrentSession() {
  refreshPromise ??= supabase.auth
    .refreshSession()
    .then(({ data, error }) => {
      if (error || !data.session || isSessionExpiredOrStale(data.session, 0)) return null;
      return data.session;
    })
    .catch(() => null)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;
  const redirect = `${window.location.pathname}${window.location.search}`;
  window.location.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
}

export async function getFreshSession(options: { redirectOnFailure?: boolean } = {}) {
  const { redirectOnFailure = false } = options;

  const sessionResult = await supabase.auth.getSession().catch(() => null);
  let session = sessionResult?.error ? null : (sessionResult?.data.session ?? null);

  if (isSessionExpiredOrStale(session)) {
    session = await refreshCurrentSession();
  }

  if (!session || isSessionExpiredOrStale(session, 0)) {
    await clearLocalSession();
    if (redirectOnFailure) redirectToLogin();
    return null;
  }

  return session;
}

export async function getFreshAccessToken(options: { redirectOnFailure?: boolean } = {}) {
  const session = await getFreshSession(options);
  return session?.access_token;
}