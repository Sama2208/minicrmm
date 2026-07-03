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

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

export type ClinicStatus = {
  clinic_id: string;
  clinic_name: string;
  is_active: boolean;
  subscription_status: string;
  subscription_current_period_end: string | null;
  plan_name: string | null;
};

export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trialing: "Sinov muddati",
  active: "Faol",
  past_due: "To'lov kutilmoqda",
  canceled: "Bekor qilingan",
};

export const SUBSCRIPTION_STATUS_BADGE: Record<SubscriptionStatus, string> = {
  trialing: "bg-amber-50 text-amber-700 border border-amber-200",
  active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  past_due: "bg-red-50 text-red-700 border border-red-200",
  canceled: "bg-slate-100 text-slate-600 border border-slate-200",
};

// current_clinic_id() ushbu shartlarga mos kelmasa NULL qaytaradi va RLS
// butun klinika ma'lumotiga kirishni yopadi — shu mantiqni UI'da oldindan
// ko'rsatish uchun aynan shu tekshiruv takrorlanadi.
export function isSubscriptionBlocked(status: ClinicStatus | null | undefined): boolean {
  if (!status) return true;
  if (!status.is_active) return true;
  if (status.subscription_status !== "trialing" && status.subscription_status !== "active") {
    return true;
  }
  if (
    status.subscription_current_period_end &&
    new Date(status.subscription_current_period_end) < new Date()
  ) {
    return true;
  }
  return false;
}

export function useClinicStatus() {
  return useQuery({
    queryKey: ["my-clinic-status"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_clinic_status");
      if (error) throw error;
      return (data?.[0] as ClinicStatus | undefined) ?? null;
    },
  });
}
