import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

// Talab qilinadigan Meta ruxsatlari — real Meta App yaratilganda App
// Review'da aynan shu ro'yxat so'raladi.
const OAUTH_SCOPE =
  "pages_show_list,pages_manage_metadata,pages_manage_ads,leads_retrieval,business_management";

async function requireClinicAdmin(supabase: SupabaseClient<Database>) {
  const { data: isAdmin } = await supabase.rpc("has_role", { _role: "admin" });
  if (!isAdmin) throw new Error("Faqat admin Facebook ulanishini boshqara oladi");
}

// `clinicId` berilsa — bu platforma admin boshqa klinika uchun ulanishni
// boshqarmoqchi (masalan klinika yangi yaratilgandan keyin darhol Facebook
// ulash uchun). Bu holda faqat platforma egasiga ruxsat beriladi. Berilmasa —
// odatiy holat: klinikaning o'z admini o'zining klinikasini boshqaradi.
async function resolveWriteClinicId(
  supabase: SupabaseClient<Database>,
  explicitClinicId?: string,
): Promise<string> {
  if (explicitClinicId) {
    const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
    if (!isPlatformAdmin) {
      throw new Error("Ruxsat yo'q: faqat platforma egasi boshqa klinika uchun amal bajara oladi");
    }
    return explicitClinicId;
  }
  await requireClinicAdmin(supabase);
  const { data: clinicId } = await supabase.rpc("current_clinic_id");
  if (!clinicId) throw new Error("Klinika aniqlanmadi");
  return clinicId;
}

async function resolveReadClinicId(
  supabase: SupabaseClient<Database>,
  explicitClinicId?: string,
): Promise<string> {
  if (explicitClinicId) {
    const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
    if (!isPlatformAdmin) throw new Error("Ruxsat yo'q");
    return explicitClinicId;
  }
  const { data: clinicId } = await supabase.rpc("current_clinic_id");
  if (!clinicId) throw new Error("Klinika aniqlanmadi");
  return clinicId;
}

// OAuth sessiyasi allaqachon aniq klinikaga bog'langan (yaratilgan paytda
// yozilgan). Shuning uchun bu yerda faqat: chaqiruvchi o'sha klinikaning o'zi
// (current_clinic_id mos keladi) yoki platforma admin ekanini tekshiramiz.
async function authorizeClinicAccess(
  supabase: SupabaseClient<Database>,
  targetClinicId: string,
): Promise<void> {
  const { data: clinicId } = await supabase.rpc("current_clinic_id");
  if (clinicId === targetClinicId) return;
  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  if (!isPlatformAdmin) throw new Error("Ruxsat yo'q");
}

const ClinicIdInput = z.object({ clinicId: z.string().uuid().optional() });

export const createFacebookOAuthState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ClinicIdInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const clinicId = await resolveWriteClinicId(context.supabase, data.clinicId);

    const appId = process.env.FACEBOOK_APP_ID;
    if (!appId) throw new Error("FACEBOOK_APP_ID sozlanmagan");

    const request = getRequest();
    const origin = new URL(request.url).origin;
    const redirectUri = `${origin}/api/facebook/oauth-callback`;

    // Platforma admin (clinicId ko'rsatib) ulanishni boshlasa, callback
    // qaytishi kerak bo'lgan sahifani bilishi uchun state'ga belgi qo'shamiz.
    const state = data.clinicId ? `${crypto.randomUUID()}::platforma` : crypto.randomUUID();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("facebook_oauth_sessions")
      .insert({ state, clinic_id: clinicId, user_id: context.userId });
    if (error) throw new Error(error.message);

    const authorizeUrl =
      `https://www.facebook.com/v21.0/dialog/oauth?client_id=${encodeURIComponent(appId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}` +
      `&scope=${encodeURIComponent(OAUTH_SCOPE)}`;

    return { authorizeUrl };
  });

const StateInput = z.object({ state: z.string().min(1) });

export const listPendingFacebookPages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => StateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: session, error } = await supabaseAdmin
      .from("facebook_oauth_sessions")
      .select("clinic_id, pages, expires_at")
      .eq("state", data.state)
      .single();
    if (error || !session) throw new Error("Sessiya topilmadi");
    await authorizeClinicAccess(context.supabase, session.clinic_id);
    if (new Date(session.expires_at) < new Date()) throw new Error("Sessiya muddati tugagan");

    const pages =
      (session.pages as { id: string; name: string; access_token: string }[] | null) ?? [];
    return pages.map((p) => ({ id: p.id, name: p.name }));
  });

const ConfirmInput = z.object({ state: z.string().min(1), pageId: z.string().min(1) });

export const confirmFacebookPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ConfirmInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from("facebook_oauth_sessions")
      .select("clinic_id, pages, expires_at")
      .eq("state", data.state)
      .single();
    if (sessionErr || !session) throw new Error("Sessiya topilmadi");
    await authorizeClinicAccess(context.supabase, session.clinic_id);
    if (new Date(session.expires_at) < new Date()) throw new Error("Sessiya muddati tugagan");

    const clinicId = session.clinic_id;
    const pages =
      (session.pages as { id: string; name: string; access_token: string }[] | null) ?? [];
    const page = pages.find((p) => p.id === data.pageId);
    if (!page) throw new Error("Page topilmadi");

    const { data: connection, error: connErr } = await supabaseAdmin
      .from("facebook_connections")
      .upsert(
        {
          clinic_id: clinicId,
          page_id: page.id,
          page_name: page.name,
          page_access_token: page.access_token,
          connected_by: context.userId,
          is_active: true,
        },
        { onConflict: "clinic_id,page_id" },
      )
      .select("id")
      .single();
    if (connErr) throw new Error(connErr.message);

    const { listLeadFormsForPage, subscribePageToLeadgen } =
      await import("./facebook-graph.server");
    const forms = await listLeadFormsForPage(page.id, page.access_token);
    if (forms.length > 0) {
      await supabaseAdmin.from("facebook_lead_forms").upsert(
        forms.map((f) => ({
          clinic_id: clinicId,
          connection_id: connection.id,
          form_id: f.id,
          form_name: f.name,
        })),
        { onConflict: "connection_id,form_id", ignoreDuplicates: true },
      );
    }

    let subscribeError: string | null = null;
    try {
      await subscribePageToLeadgen(page.id, page.access_token);
    } catch (err) {
      // Ulanish va formalar baribir saqlanadi — xatoni foydalanuvchiga
      // ko'rsatamiz, "Formalarni yangilash" bilan keyinroq qayta urinish mumkin.
      subscribeError = err instanceof Error ? err.message : "Noma'lum xatolik";
      console.error("Facebook leadgen obuna xatosi:", err);
    }

    await supabaseAdmin.from("facebook_oauth_sessions").delete().eq("state", data.state);

    return { ok: true, pageName: page.name, subscribeError };
  });

export const getFacebookConnectionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ClinicIdInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const clinicId = await resolveReadClinicId(context.supabase, data.clinicId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: connection } = await supabaseAdmin
      .from("facebook_connections")
      .select("id, page_name, is_active")
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .maybeSingle();

    if (!connection) return { connected: false as const, pageName: null, forms: [] };

    const { data: forms } = await supabaseAdmin
      .from("facebook_lead_forms")
      .select("id, form_id, form_name, is_syncing")
      .eq("connection_id", connection.id)
      .order("form_name");

    return { connected: true as const, pageName: connection.page_name, forms: forms ?? [] };
  });

const ToggleInput = z.object({
  formRowId: z.string().uuid(),
  enabled: z.boolean(),
  clinicId: z.string().uuid().optional(),
});

export const toggleFacebookFormSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ToggleInput.parse(input))
  .handler(async ({ data, context }) => {
    const clinicId = await resolveWriteClinicId(context.supabase, data.clinicId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("facebook_lead_forms")
      .update({ is_syncing: data.enabled })
      .eq("id", data.formRowId)
      .eq("clinic_id", clinicId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const disconnectFacebook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ClinicIdInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const clinicId = await resolveWriteClinicId(context.supabase, data.clinicId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("facebook_connections")
      .update({ is_active: false })
      .eq("clinic_id", clinicId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const syncFacebookForms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ClinicIdInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const clinicId = await resolveWriteClinicId(context.supabase, data.clinicId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: connection } = await supabaseAdmin
      .from("facebook_connections")
      .select("id, page_id, page_access_token")
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .maybeSingle();
    if (!connection) throw new Error("Faol Facebook ulanish topilmadi");

    const { listLeadFormsForPage, subscribePageToLeadgen } =
      await import("./facebook-graph.server");
    const forms = await listLeadFormsForPage(connection.page_id, connection.page_access_token);
    if (forms.length > 0) {
      await supabaseAdmin.from("facebook_lead_forms").upsert(
        forms.map((f) => ({
          clinic_id: clinicId,
          connection_id: connection.id,
          form_id: f.id,
          form_name: f.name,
        })),
        { onConflict: "connection_id,form_id", ignoreDuplicates: true },
      );
    }

    // Webhook obunasini ham yangilash
    let subscribeError: string | null = null;
    try {
      await subscribePageToLeadgen(connection.page_id, connection.page_access_token);
    } catch (err) {
      subscribeError = err instanceof Error ? err.message : "Noma'lum xatolik";
      console.error("Facebook leadgen obuna yangilash xatosi:", err);
    }

    return { ok: true, count: forms.length, subscribeError };
  });
