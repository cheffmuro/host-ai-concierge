import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-medium text-slate-900">404</h1>
        <h2 className="mt-4 text-xl font-medium text-slate-900">Página não encontrada</h2>
        <p className="mt-2 text-sm text-slate-500">A rota solicitada não existe.</p>
        <div className="mt-6">
          <Link to="/dashboard" className="inline-flex items-center justify-center rounded-sm bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 hover:bg-slate-800">
            Ir para o Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Anfitrião — Concierge OS" },
      { name: "description", content: "Painel omnichannel de atendimento ao cliente para o mercado de luxo." },
      { name: "theme-color", content: "#0f172a" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon-192.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

const titles: Record<string, string> = {
  "/dashboard": "Visão de Comando",
  "/inbox": "Caixa Omnichannel",
  "/brain": "Base de Conhecimento",
};

function AppHeader() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const title = titles[path] ?? "Anfitrião";
  return (
    <header className="flex h-12 items-center gap-3 border-b border-border/60 bg-white px-4">
      <SidebarTrigger className="text-slate-700" />
      <div className="h-4 w-px bg-border/60" />
      <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Anfitrião</span>
      <span className="text-slate-300">/</span>
      <span className="text-sm font-medium text-slate-900">{title}</span>
    </header>
  );
}

function RootComponent() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 min-h-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
