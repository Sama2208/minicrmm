import { createContext, useContext, type ReactNode } from "react";

export type AppRole = "admin" | "operator";

type AuthState = {
  loading: boolean;
  session: null;
  user: null;
  role: AppRole;
  operatorId: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const VALUE: AuthState = {
  loading: false,
  session: null,
  user: null,
  role: "admin",
  operatorId: null,
  refresh: async () => {},
  signOut: async () => {},
};

const Ctx = createContext<AuthState>(VALUE);

export function AuthProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={VALUE}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
