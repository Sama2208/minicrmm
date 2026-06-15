import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "operator";

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  operatorId: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [operatorId, setOperatorId] = useState<string | null>(null);

  async function loadRole(userId: string) {
    const [{ data: roles }, { data: op }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("operators").select("id").eq("user_id", userId).maybeSingle(),
    ]);
    const list = (roles ?? []).map((r: { role: string }) => r.role);
    const r: AppRole | null = list.includes("admin") ? "admin" : list.includes("operator") ? "operator" : null;
    setRole(r);
    setOperatorId(op?.id ?? null);
  }

  async function refresh() {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session?.user) await loadRole(data.session.user.id);
    else { setRole(null); setOperatorId(null); }
    setLoading(false);
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) loadRole(s.user.id); else { setRole(null); setOperatorId(null); }
    });
    refresh();
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{
      loading, session, user: session?.user ?? null, role, operatorId,
      refresh,
      signOut: async () => { await supabase.auth.signOut(); },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
