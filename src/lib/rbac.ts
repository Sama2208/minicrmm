import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: Infinity,
  });
}

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("current_user_is_admin");
      if (error) throw error;
      return data as boolean;
    },
    staleTime: Infinity,
  });
}

export function useHasPermission(code: string) {
  return useQuery({
    queryKey: ["has-permission", code],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_permission", { p_code: code });
      if (error) throw error;
      return data as boolean;
    },
    staleTime: Infinity,
  });
}

export type UserWithRole = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  status: string;
  created_at: string;
  role_name: string | null;
  role_id: string | null;
};

export function useUsers() {
  return useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const { data: users, error: usersErr } = await supabase
        .from("users")
        .select("id, email, full_name, phone, status, created_at")
        .is("deleted_at", null)
        .order("full_name");
      if (usersErr) throw usersErr;

      const { data: assignments, error: assignErr } = await supabase
        .from("user_roles_v2")
        .select("user_id, role_id, roles(name)")
        .order("created_at");
      if (assignErr) throw assignErr;

      const roleMap = new Map<string, { name: string; id: string }>();
      for (const a of assignments ?? []) {
        const roleName = (a as any).roles?.name ?? null;
        if (roleName) {
          roleMap.set(a.user_id, { name: roleName, id: a.role_id });
        }
      }

      return (users ?? []).map((u) => ({
        ...u,
        role_name: roleMap.get(u.id)?.name ?? null,
        role_id: roleMap.get(u.id)?.id ?? null,
      })) as UserWithRole[];
    },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("id, name, is_system")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
