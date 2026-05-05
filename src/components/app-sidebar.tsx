import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Inbox, BrainCircuit } from "lucide-react";
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

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Inbox", url: "/inbox", icon: Inbox },
  { title: "Brain", url: "/brain", icon: BrainCircuit },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => currentPath === p || currentPath.startsWith(p + "/");

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
              {items.map((item) => (
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
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-700">
            JV
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm text-slate-900">Júlia Vianna</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">On duty</span>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
