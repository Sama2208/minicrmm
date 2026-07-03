import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useClinicId() {
  return useQuery({
    queryKey: ["current-clinic-id"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("current_clinic_id");
      if (error) throw error;
      return data as string;
    },
    staleTime: Infinity,
  });
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function useIsPlatformAdmin() {
  return useQuery({
    queryKey: ["is-platform-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_platform_admin");
      if (error) throw error;
      return data as boolean;
    },
    staleTime: Infinity,
  });
}
