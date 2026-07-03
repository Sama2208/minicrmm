import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CreateClinicInput = z.object({
  clinicName: z.string().trim().min(2).max(120),
  clinicSlug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Faqat kichik lotin harflari, raqamlar va tire (-)"),
  adminEmail: z.string().trim().email().max(255),
  adminPassword: z.string().min(6).max(128),
  adminFullName: z.string().trim().min(1).max(255),
});

export const createClinic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateClinicInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isPlatformAdmin } = await context.supabase.rpc("is_platform_admin");
    if (!isPlatformAdmin) {
      throw new Error("Ruxsat yo'q: faqat platforma egasi yangi klinika qo'sha oladi");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: clinic, error: clinicErr } = await supabaseAdmin
      .from("clinics")
      .insert({ name: data.clinicName, slug: data.clinicSlug })
      .select("id")
      .single();
    if (clinicErr) {
      throw new Error(
        clinicErr.message.includes("duplicate")
          ? "Bu slug band — boshqasini tanlang"
          : clinicErr.message,
      );
    }

    const { data: created, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.adminEmail,
      password: data.adminPassword,
      email_confirm: true,
      user_metadata: { full_name: data.adminFullName },
    });
    if (userErr || !created.user) {
      await supabaseAdmin.from("clinics").delete().eq("id", clinic.id);
      throw new Error(userErr?.message ?? "Admin foydalanuvchi yaratilmadi");
    }

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "admin", clinic_id: clinic.id });
    if (roleErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      await supabaseAdmin.from("clinics").delete().eq("id", clinic.id);
      throw new Error(roleErr.message);
    }

    return { ok: true, clinicId: clinic.id, adminUserId: created.user.id };
  });

export const listClinicsForPlatform = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isPlatformAdmin } = await context.supabase.rpc("is_platform_admin");
    if (!isPlatformAdmin) throw new Error("Ruxsat yo'q");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("clinics")
      .select("id, name, slug, is_active, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });
