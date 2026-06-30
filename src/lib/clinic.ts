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
