import { createStart } from "@tanstack/react-start";
import { attachFreshSupabaseAuth } from "@/lib/valid-supabase-auth.middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth, attachFreshSupabaseAuth],
}));
