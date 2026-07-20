import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyBranding, type OrgBranding } from "@/lib/branding.functions";
import { useAuth } from "@/hooks/useAuth";

/**
 * Carrega o branding da organização do usuário logado. Cache em memória
 * para evitar múltiplas chamadas.
 */
let cache: OrgBranding | null | undefined = undefined;

export function useBranding() {
  const { user } = useAuth();
  const fetchBranding = useServerFn(getMyBranding);
  const [branding, setBranding] = useState<OrgBranding | null>(cache ?? null);
  const [loading, setLoading] = useState(cache === undefined);

  useEffect(() => {
    if (!user) return;
    if (cache !== undefined) { setBranding(cache); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const r = await fetchBranding();
      cache = r;
      if (!cancelled) { setBranding(r); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user, fetchBranding]);

  return { branding, loading };
}

export function invalidateBrandingCache() { cache = undefined; }
