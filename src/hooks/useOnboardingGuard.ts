/**
 * OnboardingGuard: redireciona o admin para /settings/integrations quando
 * Chatwoot ou Dify ainda não estão configurados. Não-admins veem o banner
 * inline, mas não são redirecionados (não podem editar).
 */
import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useIntegrationsStore } from "@/stores/integrationsStore";
import { useIsAdmin } from "@/hooks/useRole";

const ALLOW = ["/settings/integrations", "/settings/guide", "/settings/users", "/settings/branding", "/profile"];

export function useOnboardingGuard() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const loaded = useIntegrationsStore((s) => s.loaded);
  const chatwoot = useIntegrationsStore((s) => s.chatwoot.configured);
  const dify = useIntegrationsStore((s) => s.dify.configured);

  useEffect(() => {
    if (!loaded || roleLoading) return;
    if (!isAdmin) return;
    if (chatwoot && dify) return;
    if (ALLOW.some((p) => path.startsWith(p))) return;
    navigate({ to: "/settings/integrations" });
  }, [loaded, roleLoading, isAdmin, chatwoot, dify, path, navigate]);
}
