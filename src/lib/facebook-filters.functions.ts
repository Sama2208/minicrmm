import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FbFilterOptions = {
  pages: { facebook_page_id: string; facebook_page_name: string }[];
  forms: { name: string; pageId: string | null; pageName: string }[];
};

// Filtr ro'yxatlari uchun. Klientga FAQAT nomlar qaytadi — page_access_token hech qachon qaytmaydi.
export const getFacebookFilterOptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FbFilterOptions> => {
    const { data: clinicId } = await context.supabase.rpc("current_clinic_id");
    if (!clinicId) return { pages: [], forms: [] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [connsRes, formsRes] = await Promise.all([
      supabaseAdmin
        .from("facebook_connections")
        .select("id, page_id, page_name, is_active")
        .eq("clinic_id", clinicId),
      supabaseAdmin
        .from("facebook_lead_forms")
        .select("form_name, connection_id, is_syncing")
        .eq("clinic_id", clinicId),
    ]);

    const conns = connsRes.data ?? [];
    const connById = new Map(conns.map((c) => [c.id, c]));

    const pages = conns
      .filter((c) => c.is_active && c.page_id)
      .map((c) => ({
        facebook_page_id: c.page_id as string,
        facebook_page_name: (c.page_name as string | null) ?? (c.page_id as string),
      }));

    const forms = (formsRes.data ?? [])
      .filter((f) => f.is_syncing && f.form_name)
      .map((f) => {
        const c = f.connection_id ? connById.get(f.connection_id) : null;
        return {
          name: f.form_name as string,
          pageId: (c?.page_id as string | null) ?? null,
          pageName: (c?.page_name as string | null) ?? "Boshqa",
        };
      });

    return { pages, forms };
  });
