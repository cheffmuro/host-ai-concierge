import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useIntegrationsBootstrap } from "@/hooks/useIntegrationsBootstrap";
import { useOnboardingGuard } from "@/hooks/useOnboardingGuard";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

const titles: Record<string, string> = {
  "/dashboard": "Visão de Comando",
  "/inbox": "Caixa Omnichannel",
  "/channels": "Canais de Atendimento",
  "/brain": "Base de Conhecimento",
  "/workflows": "Automações",
  "/settings/integrations": "Integrações",
  "/settings/guide": "Manual de Integrações",
  "/profile": "Perfil",
};

const protectedPaths = ["/dashboard", "/inbox", "/channels", "/brain", "/workflows", "/settings", "/profile"];

function AuthenticatedLayout() {
  const { loading, user, session } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const title = titles[path] ?? "Anfitrião";
  useIntegrationsBootstrap(Boolean(session));
  useOnboardingGuard();

  useEffect(() => {
    if (!loading && !user && protectedPaths.some((p) => path.startsWith(p))) {
      navigate({ to: "/login", search: { redirect: path }, replace: true });
    }
  }, [loading, user, navigate, path]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Carregando…</div>;
  }
  if (!user) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Redirecionando…</div>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 items-center gap-3 border-b border-border/60 bg-white px-4">
            <SidebarTrigger className="text-slate-700" />
            <div className="h-4 w-px bg-border/60" />
            <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Anfitrião</span>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-900">{title}</span>
          </header>
          <main className="flex-1 min-h-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
