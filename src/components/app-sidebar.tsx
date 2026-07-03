import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Users,
  BarChart3,
  Settings,
  ClipboardList,
  LogOut,
  CalendarDays,
  Building2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  useClinicStatus,
  useIsPlatformAdmin,
  clinicInitial,
  DEFAULT_BRAND_COLOR,
} from "@/lib/clinic";
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
  { title: "Umumiy lidlar", url: "/lidlar", icon: Users },
  { title: "Qabul jadvali", url: "/kalendar", icon: CalendarDays },
  { title: "Ariza qoldirish", url: "/ariza", icon: ClipboardList },
  { title: "Hisobotlar", url: "/hisobotlar", icon: BarChart3 },
  { title: "Sozlamalar", url: "/sozlamalar", icon: Settings },
];

const PLATFORM_ITEM = { title: "Platforma", url: "/platforma", icon: Building2 };

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const clinicStatusQ = useClinicStatus();
  const isPlatformAdminQ = useIsPlatformAdmin();
  const clinic = clinicStatusQ.data;
  const items = isPlatformAdminQ.data ? [...ITEMS, PLATFORM_ITEM] : ITEMS;

  useEffect(() => {
    if (clinic?.clinic_name) document.title = clinic.clinic_name;
  }, [clinic?.clinic_name]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-2">
          {clinic?.logo_url ? (
            <img
              src={clinic.logo_url}
              alt={clinic.clinic_name}
              className="h-8 w-8 rounded-md object-cover shrink-0"
            />
          ) : (
            <div
              className="h-8 w-8 rounded-md flex items-center justify-center text-white font-bold shrink-0"
              style={{ backgroundColor: clinic?.primary_color ?? DEFAULT_BRAND_COLOR }}
            >
              {clinicInitial(clinic?.clinic_name ?? "C")}
            </div>
          )}
          <span className="font-semibold text-base truncate group-data-[collapsible=icon]:hidden">
            {clinic?.clinic_name ?? "CRM Dashboard"}
          </span>
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
