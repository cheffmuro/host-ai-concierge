import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getFreshSession } from "@/lib/auth-session";

export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsAdmin(false); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const session = await getFreshSession();
      if (!session) {
        if (!cancelled) { setIsAdmin(false); setLoading(false); }
        return;
      }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!cancelled) { setIsAdmin(!!data); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return { isAdmin, loading };
}
