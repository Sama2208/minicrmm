import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const UpdateBrandingInput = z.object({
  logoUrl: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => v === "" || /^https?:\/\//.test(v), {
      message: "Logo manzili http(s):// bilan boshlanishi kerak",
    }),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Rang #RRGGBB ko'rinishida bo'lishi kerak"),
});

export const updateClinicBranding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateBrandingInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _role: "admin" });
    if (!isAdmin) throw new Error("Faqat admin brandingni o'zgartira oladi");

    const { data: clinicId } = await context.supabase.rpc("current_clinic_id");
    if (!clinicId) throw new Error("Klinika aniqlanmadi");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("clinics")
      .update({
        logo_url: data.logoUrl || null,
        primary_color: data.primaryColor,
      })
      .eq("id", clinicId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
