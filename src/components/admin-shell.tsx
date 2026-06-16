import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Users, BarChart3, UserCog, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

const NAV = [
  { to: "/admin/leads", label: "Lidlar", icon: Users },
  { to: "/admin/hisobotlar", label: "Hisobotlar", icon: BarChart3 },
  { to: "/admin/operatorlar", label: "Operatorlar", icon: UserCog },
];

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-60 bg-slate-900 text-slate-100 flex flex-col">
        <div className="px-4 py-4 border-b border-slate-800 flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-emerald-600 flex items-center justify-center font-bold">A</div>
          <span className="font-semibold">Admin Panel</span>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV.map((n) => {
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
          <Button variant="ghost" className="w-full justify-start text-slate-100 hover:bg-slate-800 hover:text-white" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Chiqish
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b px-6 py-4">
          <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

export async function requireAdmin(): Promise<{ ok: true } | { ok: false; reason: "no-user" | "no-admin" }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "no-user" };
  const { data, error } = await supabase.rpc("has_role", { _role: "admin" });
  if (error || !data) return { ok: false, reason: "no-admin" };
  return { ok: true };
}
