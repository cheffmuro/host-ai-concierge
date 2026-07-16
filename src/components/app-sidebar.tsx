import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Inbox, BrainCircuit, Workflow, Plug, LogOut, Settings, User, BookOpen, Users } from "lucide-react";
import { useIsAdmin } from "@/hooks/useRole";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Inbox", url: "/inbox", icon: Inbox },
  { title: "Canais", url: "/channels", icon: Plug },
  { title: "Brain", url: "/brain", icon: BrainCircuit },
  { title: "Workflows", url: "/workflows", icon: Workflow },
  { title: "Integrações", url: "/settings/integrations", icon: Settings },
  { title: "Manual", url: "/settings/guide", icon: BookOpen },
  { title: "Perfil", url: "/profile", icon: User },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => currentPath === p || currentPath.startsWith(p + "/");
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const initials = (user?.user_metadata?.display_name || user?.email || "?").slice(0, 2).toUpperCase();
  const name = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Usuário";
  const navItems = isAdmin
    ? [...items.slice(0, 7), { title: "Usuários", url: "/settings/users", icon: Users }, ...items.slice(7)]
    : items;

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarHeader className="border-b border-border/60">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-slate-900 text-slate-50 font-medium">
            A
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium tracking-tight text-slate-900">Anfitrião</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Concierge OS</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" strokeWidth={1.5} />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border/60">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-700 shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm text-slate-900">{name}</span>
                <span className="truncate text-[10px] uppercase tracking-[0.18em] text-slate-500">{user?.email}</span>
              </div>
              <button
                onClick={async () => { await signOut(); navigate({ to: "/" }); }}
                className="text-slate-500 hover:text-slate-900 shrink-0"
                aria-label="Sair"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
