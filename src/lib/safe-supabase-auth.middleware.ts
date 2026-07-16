import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function unauthorized(message = "Unauthorized") {
  return new Response(message, { status: 401 });
}

export const requireFreshSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Response("Missing backend environment variables", { status: 500 });
    }

    const authHeader = getRequest()?.headers?.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) throw unauthorized("Unauthorized: No bearer token");

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) throw unauthorized("Unauthorized: No token provided");

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const claimsResult = await supabase.auth.getClaims(token).catch(() => null);
    const claims = claimsResult?.data?.claims;
    if (claimsResult?.error || !claims?.sub) throw unauthorized("Unauthorized: Invalid or expired token");

    return next({
      context: {
        supabase,
        userId: claims.sub,
        claims,
      },
    });
  },
);