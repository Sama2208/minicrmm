import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

const TRIAL_DAYS = 14;
const PLAN_SLUGS = ["basic", "pro", "premium"] as const;
const SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due", "canceled"] as const;

async function requirePlatformAdmin(supabase: SupabaseClient<Database>) {
  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  if (!isPlatformAdmin) {
    throw new Error("Ruxsat yo'q: faqat platforma egasi bu amalni bajara oladi");
  }
}

const CreateClinicInput = z.object({
  clinicName: z.string().trim().min(2).max(120),
  clinicSlug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Faqat kichik lotin harflari, raqamlar va tire (-)"),
  planSlug: z.enum(PLAN_SLUGS).default("basic"),
  adminEmail: z.string().trim().email().max(255),
  adminPassword: z.string().min(6).max(128),
  adminFullName: z.string().trim().min(1).max(255),
});

export const createClinic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateClinicInput.parse(input))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context.supabase);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: plan, error: planErr } = await supabaseAdmin
      .from("plans")
      .select("id")
      .eq("slug", data.planSlug)
      .single();
    if (planErr || !plan) throw new Error("Tarif topilmadi");

    const trialEnd = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: clinic, error: clinicErr } = await supabaseAdmin
      .from("clinics")
      .insert({
        name: data.clinicName,
        slug: data.clinicSlug,
        plan_id: plan.id,
        subscription_status: "trialing",
        subscription_current_period_end: trialEnd,
      })
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
    await requirePlatformAdmin(context.supabase);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("clinics")
      .select(
        "id, name, slug, is_active, created_at, plan_id, subscription_status, subscription_current_period_end, subscription_notes",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const listPlans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context.supabase);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("plans")
      .select("id, slug, name, price_monthly, max_operators")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  });

const UpdateClinicSubscriptionInput = z.object({
  clinicId: z.string().uuid(),
  planSlug: z.enum(PLAN_SLUGS),
  subscriptionStatus: z.enum(SUBSCRIPTION_STATUSES),
  periodEnd: z.string().trim().min(1).nullable(),
  notes: z.string().trim().max(2000).nullable(),
});

export const updateClinicSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateClinicSubscriptionInput.parse(input))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context.supabase);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: plan, error: planErr } = await supabaseAdmin
      .from("plans")
      .select("id")
      .eq("slug", data.planSlug)
      .single();
    if (planErr || !plan) throw new Error("Tarif topilmadi");

    const { error } = await supabaseAdmin
      .from("clinics")
      .update({
        plan_id: plan.id,
        subscription_status: data.subscriptionStatus,
        subscription_current_period_end: data.periodEnd,
        subscription_notes: data.notes,
      })
      .eq("id", data.clinicId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
