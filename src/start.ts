import { createStart } from "@tanstack/react-start";
import { attachFreshSupabaseAuth } from "@/lib/valid-supabase-auth.middleware";

export const startInstance = createStart(() => ({
  functionMiddleware: [attachFreshSupabaseAuth],
}));
