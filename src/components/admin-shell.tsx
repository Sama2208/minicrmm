import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Users, BarChart3, UserCog, LogOut, ArrowLeft, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useIsPlatformAdmin } from "@/lib/clinic";
import type { ReactNode } from "react";

const NAV = [
  { to: "/admin/leads", label: "Lidlar", icon: Users },
  { to: "/admin/hisobotlar", label: "Hisobotlar", icon: BarChart3 },
  { to: "/admin/operatorlar", label: "Operatorlar", icon: UserCog },
];

const PLATFORM_NAV = { to: "/admin/klinikalar", label: "Klinikalar", icon: Building2 };

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isPlatformAdminQ = useIsPlatformAdmin();
  const nav = isPlatformAdminQ.data ? [...NAV, PLATFORM_NAV] : NAV;

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-60 bg-slate-900 text-slate-100 flex flex-col">
        <div className="px-4 py-4 border-b border-slate-800 flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-emerald-600 flex items-center justify-center font-bold">
            A
          </div>
          <span className="font-semibold">Admin Panel</span>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {nav.map((n) => {
            const active = pathname === n.to || pathname.startsWith(n.to + "/");
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition ${
                  active ? "bg-emerald-600 text-white" : "hover:bg-slate-800"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t border-slate-800">
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-100 hover:bg-slate-800 hover:text-white"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" /> Chiqish
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
          {pathname !== "/admin" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -ml-2"
              onClick={() => typeof window !== "undefined" && window.history.back()}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Orqaga</span>
            </Button>
          )}
          <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
