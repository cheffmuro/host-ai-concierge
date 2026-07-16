import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getFreshSession, isSessionExpiredOrStale } from "@/lib/auth-session";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const protectedPaths = ["/dashboard", "/inbox", "/channels", "/brain", "/workflows", "/settings", "/profile"];

function redirectProtectedPathToLogin() {
  if (typeof window === "undefined") return;
  if (!protectedPaths.some((path) => window.location.pathname.startsWith(path))) return;
  const redirect = `${window.location.pathname}${window.location.search}`;
  sessionStorage.setItem("post-auth-redirect", redirect);
  window.location.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
}

const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      if (s && isSessionExpiredOrStale(s, 0)) {
        getFreshSession().then((fresh) => {
          if (!mounted) return;
          setSession(fresh);
          setLoading(false);
        });
        return;
      }
      setSession(s);
      setLoading(false);
    });
    getFreshSession().then((fresh) => {
      if (!mounted) return;
      setSession(fresh);
      setLoading(false);
      if (!fresh) redirectProtectedPathToLogin();
    }).catch(() => {
      if (!mounted) return;
      setSession(null);
      setLoading(false);
      redirectProtectedPathToLogin();
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <Ctx.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      signOut: async () => { await supabase.auth.signOut(); },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
