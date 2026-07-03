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

export const createFacebookOAuthState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireClinicAdmin(context.supabase);

    const { data: clinicId } = await context.supabase.rpc("current_clinic_id");
    if (!clinicId) throw new Error("Klinika aniqlanmadi");

    const appId = process.env.FACEBOOK_APP_ID;
    if (!appId) throw new Error("FACEBOOK_APP_ID sozlanmagan");

    const request = getRequest();
    const origin = new URL(request.url).origin;
    const redirectUri = `${origin}/api/facebook/oauth-callback`;

    const state = crypto.randomUUID();
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
    const { data: clinicId } = await context.supabase.rpc("current_clinic_id");
    if (!clinicId) throw new Error("Klinika aniqlanmadi");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: session, error } = await supabaseAdmin
      .from("facebook_oauth_sessions")
      .select("clinic_id, pages, expires_at")
      .eq("state", data.state)
      .single();
    if (error || !session || session.clinic_id !== clinicId) throw new Error("Sessiya topilmadi");
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
    await requireClinicAdmin(context.supabase);

    const { data: clinicId } = await context.supabase.rpc("current_clinic_id");
    if (!clinicId) throw new Error("Klinika aniqlanmadi");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from("facebook_oauth_sessions")
      .select("clinic_id, pages, expires_at")
      .eq("state", data.state)
      .single();
    if (sessionErr || !session || session.clinic_id !== clinicId) {
      throw new Error("Sessiya topilmadi");
    }
    if (new Date(session.expires_at) < new Date()) throw new Error("Sessiya muddati tugagan");

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

    const { listLeadFormsForPage } = await import("./facebook-graph.server");
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

    try {
      await fetch(
        `https://graph.facebook.com/v21.0/${page.id}/subscribed_apps?subscribed_fields=leadgen&access_token=${encodeURIComponent(page.access_token)}`,
        { method: "POST" },
      );
    } catch {
      // Obuna so'rovi muvaffaqiyatsiz bo'lsa ham ulanish saqlanadi;
      // "Yangilash" bilan keyinroq qayta urinish mumkin.
    }

    await supabaseAdmin.from("facebook_oauth_sessions").delete().eq("state", data.state);

    return { ok: true, pageName: page.name };
  });

export const getFacebookConnectionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: clinicId } = await context.supabase.rpc("current_clinic_id");
    if (!clinicId) throw new Error("Klinika aniqlanmadi");

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

const ToggleInput = z.object({ formRowId: z.string().uuid(), enabled: z.boolean() });

export const toggleFacebookFormSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ToggleInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireClinicAdmin(context.supabase);

    const { data: clinicId } = await context.supabase.rpc("current_clinic_id");
    if (!clinicId) throw new Error("Klinika aniqlanmadi");

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
  .handler(async ({ context }) => {
    await requireClinicAdmin(context.supabase);

    const { data: clinicId } = await context.supabase.rpc("current_clinic_id");
    if (!clinicId) throw new Error("Klinika aniqlanmadi");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("facebook_connections")
      .update({ is_active: false })
      .eq("clinic_id", clinicId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
