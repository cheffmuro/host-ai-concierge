import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ensureActiveSession, isJwtExpiredError, refreshSessionForRetry } from "@/lib/client-session";

export function useIsAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // Re-run when the token is refreshed or the user signs in, so we recover
  // after any transient JWT-expired state without forcing a signout.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN" || event === "USER_UPDATED") {
        setTick((n) => n + 1);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      await ensureActiveSession();
      const fetchRole = () => supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

      let { data, error } = await fetchRole();
      if (isJwtExpiredError(error)) {
        await refreshSessionForRetry();
        ({ data, error } = await fetchRole());
      }
      if (cancelled) return;
      if (error) {
        // Não força signout — apenas marca como não-admin até o próximo refresh.
        console.warn("[useIsAdmin] role lookup failed:", error.message);
        setIsAdmin(false);
      } else {
        setIsAdmin(!!data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading, tick]);

  return { isAdmin, loading };
}
