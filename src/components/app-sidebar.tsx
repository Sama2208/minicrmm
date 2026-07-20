import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Users, BarChart3, Settings, ClipboardList, LogOut, TrendingUp, BarChart2, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/sidebar";

const ITEMS = [
  { title: "Umumiy lidlar",   url: "/lidlar",           icon: Users },
  { title: "Ariza qoldirish", url: "/ariza",            icon: ClipboardList },
  { title: "Hisobotlar",      url: "/hisobotlar",       icon: BarChart3 },
  { title: "Hisobot",         url: "/hisobot",          icon: BarChart2 },
  { title: "Attribution",     url: "/attribution",      icon: TrendingUp },
  { title: "Meta Sozlamalar", url: "/meta-sozlamalar",  icon: Settings2 },
  { title: "Sozlamalar",      url: "/sozlamalar",       icon: Settings },
];


export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const items = ITEMS;

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="h-8 w-8 rounded-md bg-emerald-600 flex items-center justify-center text-white font-bold">C</div>
          <span className="font-semibold text-base group-data-[collapsible=icon]:hidden">CRM Dashboard</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-slate-600 hover:text-red-600 hover:bg-red-50 group-data-[collapsible=icon]:justify-center"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">Chiqish</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
