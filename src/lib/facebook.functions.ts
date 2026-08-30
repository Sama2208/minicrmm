import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import type { FacebookFormFieldMapping } from "./facebook";

const OAUTH_SCOPE =
  "pages_show_list,pages_manage_metadata,pages_manage_ads,leads_retrieval,business_management,pages_read_engagement," +
  "instagram_basic,instagram_manage_messages";

async function requireClinicAdmin(supabase: SupabaseClient<Database>) {
  const { data: isAdmin } = await supabase.rpc("has_role", { _role: "admin" });
  if (!isAdmin) throw new Error("Faqat admin Facebook ulanishini boshqara oladi");
}

async function resolveWriteClinicId(
  supabase: SupabaseClient<Database>,
  explicitClinicId?: string,
): Promise<string> {
  if (explicitClinicId) {
    const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
    if (!isPlatformAdmin) throw new Error("Ruxsat yo'q");
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
      .select("clinic_id, pages, expires_at, facebook_user_id_hash")
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
          facebook_user_id_hash: session.facebook_user_id_hash,
          is_active: true,
        },
        { onConflict: "clinic_id,page_id" },
      )
      .select("id")
      .single();
    if (connErr) throw new Error(connErr.message);
    const { listLeadFormsForPage, subscribePageToLeadgen, getPageInstagramAccount } =
      await import("./facebook-graph.server");
    const { subscribeInstagramAccountToMessaging, resolveInstagramEnabled } =
      await import("./instagram-graph.server");

    // Sahifaga ulangan Instagram Professional akkauntini aniqlaymiz (ixtiyoriy).
    const igAccount = await getPageInstagramAccount(page.id, page.access_token);
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

    // 1) Lead Ads: Page edge FAQAT leadgen maydoniga obuna bo'ladi.
    let leadgenError: string | null = null;
    try {
      await subscribePageToLeadgen(page.id, page.access_token, ["leadgen"]);
    } catch (err) {
      leadgenError = err instanceof Error ? err.message : "Noma'lum xatolik";
      console.error("Facebook leadgen obuna xatosi");
    }

    // 2) Instagram Direct: alohida Instagram akkaunt edge'i.
    let instagramError: string | null = null;
    let instagramSubscribed = false;
    if (igAccount) {
      try {
        instagramSubscribed = await subscribeInstagramAccountToMessaging(
          igAccount.id,
          page.access_token,
        );
      } catch (err) {
        instagramError = err instanceof Error ? err.message : "Noma'lum xatolik";
        console.error("Instagram obuna xatosi");
      }
    }

    if (igAccount) {
      await supabaseAdmin
        .from("facebook_connections")
        .update({
          instagram_business_account_id: igAccount.id,
          instagram_username: igAccount.username,
          instagram_enabled: resolveInstagramEnabled(true, instagramSubscribed),
        })
        .eq("id", connection.id);
    }

    const subscribeError =
      [
        leadgenError ? `Lead Ads obunasi: ${leadgenError}` : null,
        instagramError ? `Instagram Direct obunasi: ${instagramError}` : null,
      ]
        .filter(Boolean)
        .join(" | ") || null;

    await supabaseAdmin.from("facebook_oauth_sessions").delete().eq("state", data.state);
    return {
      ok: true,
      pageName: page.name,
      subscribeError,
      instagramUsername: igAccount?.username ?? null,
      instagramEnabled: resolveInstagramEnabled(Boolean(igAccount), instagramSubscribed),
    };
  });


// O'ZGARTIRILDI: barcha faol page'larni qaytaradi (oldin faqat bitta)
export const getFacebookConnectionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ClinicIdInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const clinicId = await resolveReadClinicId(context.supabase, data.clinicId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: connections } = await supabaseAdmin
      .from("facebook_connections")
      .select(
        "id, page_id, page_name, instagram_business_account_id, instagram_username, instagram_enabled",
      )
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .order("page_name");

    if (!connections || connections.length === 0) {
      return { connected: false as const, pages: [] };
    }

    const pages = await Promise.all(
      connections.map(async (conn) => {
        const { data: forms } = await supabaseAdmin
          .from("facebook_lead_forms")
          .select("id, form_id, form_name, is_syncing, field_mapping")
          .eq("connection_id", conn.id)
          .order("form_name");
        return {
          connectionId: conn.id,
          pageId: conn.page_id,
          pageName: conn.page_name,
          instagramBusinessAccountId: conn.instagram_business_account_id,
          instagramUsername: conn.instagram_username,
          instagramEnabled: conn.instagram_enabled,
          forms: forms ?? [],
        };
      }),
    );

    return { connected: true as const, pages };
  });

// Instagram Direct qabul qilishni bitta Page bilan cheklaydi. O'chirilgan
// Page'lar Meta'dan webhook olayotgan bo'lsa ham CRM ularni qayta ishlamaydi.
const ToggleInstagramDirectInput = z.object({
  connectionId: z.string().uuid(),
  enabled: z.boolean(),
  clinicId: z.string().uuid().optional(),
});

export const toggleInstagramDirect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ToggleInstagramDirectInput.parse(input))
  .handler(async ({ data, context }) => {
    const clinicId = await resolveWriteClinicId(context.supabase, data.clinicId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: connection, error: connectionError } = await supabaseAdmin
      .from("facebook_connections")
      .select("id, page_id, page_access_token")
      .eq("id", data.connectionId)
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .single();
    if (connectionError || !connection) throw new Error("Faol Facebook Page topilmadi");

    if (!data.enabled) {
      const { error } = await supabaseAdmin
        .from("facebook_connections")
        .update({ instagram_enabled: false })
        .eq("id", connection.id)
        .eq("clinic_id", clinicId);
      if (error) throw new Error(error.message);
      return { ok: true, enabled: false, instagramUsername: null };
    }

    const { getPageInstagramAccount } = await import("./facebook-graph.server");
    const { subscribeInstagramAccountToMessaging } = await import("./instagram-graph.server");
    const instagramAccount = await getPageInstagramAccount(
      connection.page_id,
      connection.page_access_token,
    );

    if (!instagramAccount) {
      await supabaseAdmin
        .from("facebook_connections")
        .update({
          instagram_business_account_id: null,
          instagram_username: null,
          instagram_enabled: false,
        })
        .eq("id", connection.id)
        .eq("clinic_id", clinicId);
      throw new Error("Bu Facebook Page'ga Instagram Professional akkaunti ulanmagan");
    }

    let subscribed = false;
    try {
      subscribed = await subscribeInstagramAccountToMessaging(
        instagramAccount.id,
        connection.page_access_token,
      );
    } catch (err) {
      await supabaseAdmin
        .from("facebook_connections")
        .update({ instagram_enabled: false })
        .eq("id", connection.id)
        .eq("clinic_id", clinicId);
      const message = err instanceof Error ? err.message : "Instagram Direct obunasida xato";
      if (/access token|oauth token/i.test(message)) {
        throw new Error(
          "Facebook Page tokeni yangilanishi kerak. Page'ni uzib, Facebook orqali qaytadan ulang.",
        );
      }
      throw err;
    }
    if (!subscribed) {
      await supabaseAdmin
        .from("facebook_connections")
        .update({ instagram_enabled: false })
        .eq("id", connection.id)
        .eq("clinic_id", clinicId);
      throw new Error("Instagram Direct obunasi tasdiqlanmadi");
    }

    // Faqat tanlangan Page Direct xabarlarini CRM'ga kiritadi. Lead Ads
    // ulanishlari va boshqa Page'larning formalari o'z holicha qoladi.
    const { error: disableOthersError } = await supabaseAdmin
      .from("facebook_connections")
      .update({ instagram_enabled: false })
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .neq("id", connection.id);
    if (disableOthersError) throw new Error(disableOthersError.message);

    const { error: enableError } = await supabaseAdmin
      .from("facebook_connections")
      .update({
        instagram_business_account_id: instagramAccount.id,
        instagram_username: instagramAccount.username,
        instagram_enabled: true,
      })
      .eq("id", connection.id)
      .eq("clinic_id", clinicId);
    if (enableError) throw new Error(enableError.message);

    return {
      ok: true,
      enabled: true,
      instagramUsername: instagramAccount.username,
    };
  });

const ToggleInput = z.object({
  formRowId: z.string().uuid(),
  enabled: z.boolean(),
  clinicId: z.string().uuid().optional(),
});

const FieldMappingSchema = z
  .object({
    full_name: z.string().trim().min(1).max(500).optional(),
    phone: z.string().trim().min(1).max(500).optional(),
    nomer_asosiy: z.string().trim().min(1).max(500).optional(),
    region: z.string().trim().min(1).max(500).optional(),
    problem_type: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

const FormFieldMappingInput = z.object({
  formRowId: z.string().uuid(),
  mapping: FieldMappingSchema,
  clinicId: z.string().uuid().optional(),
});

function parseStoredFormQuestions(rawPayloads: unknown[]): { key: string; label: string | null }[] {
  const keys = new Set<string>();
  for (const rawPayload of rawPayloads) {
    if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) continue;
    const fieldData = (rawPayload as { field_data?: unknown }).field_data;
    if (!Array.isArray(fieldData)) continue;
    for (const field of fieldData) {
      if (!field || typeof field !== "object" || Array.isArray(field)) continue;
      const name = (field as { name?: unknown }).name;
      if (typeof name === "string" && name.trim()) keys.add(name.trim());
    }
  }
  return [...keys].map((key) => ({ key, label: null }));
}

// Forma savollarini Meta'dan oladi; Meta vaqtincha javob bermasa, oldingi
// lidlarda saqlangan savollarni qaytaradi. Token hech qachon brauzerga chiqmaydi.
export const getFacebookFormFieldMapping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ formRowId: z.string().uuid(), clinicId: z.string().uuid().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const clinicId = await resolveReadClinicId(context.supabase, data.clinicId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: form, error: formError } = await supabaseAdmin
      .from("facebook_lead_forms")
      .select("form_id, form_name, connection_id, field_mapping")
      .eq("id", data.formRowId)
      .eq("clinic_id", clinicId)
      .single();
    if (formError || !form) throw new Error("Forma topilmadi");

    const mapping = FieldMappingSchema.catch({}).parse(form.field_mapping) as FacebookFormFieldMapping;
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from("facebook_connections")
      .select("page_access_token")
      .eq("id", form.connection_id)
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .single();
    if (connectionError || !connection) throw new Error("Facebook ulanish topilmadi");

    let questions: { key: string; label: string | null }[] = [];
    let fromStoredLeads = false;
    try {
      const { getLeadFormQuestions } = await import("./facebook-graph.server");
      questions = await getLeadFormQuestions(form.form_id, connection.page_access_token);
    } catch (error) {
      console.error("Facebook forma savollarini olish xatosi:", error);
      const { data: events } = await supabaseAdmin
        .from("facebook_lead_events")
        .select("raw_payload")
        .eq("clinic_id", clinicId)
        .eq("form_id", form.form_id)
        .order("processed_at", { ascending: false })
        .limit(20);
      questions = parseStoredFormQuestions((events ?? []).map((event) => event.raw_payload));
      fromStoredLeads = true;
    }

    return { formName: form.form_name, mapping, questions, fromStoredLeads };
  });

export const updateFacebookFormFieldMapping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FormFieldMappingInput.parse(input))
  .handler(async ({ data, context }) => {
    const clinicId = await resolveWriteClinicId(context.supabase, data.clinicId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("facebook_lead_forms")
      .update({ field_mapping: data.mapping })
      .eq("id", data.formRowId)
      .eq("clinic_id", clinicId);
    if (error) throw new Error(error.message);
    return { ok: true };
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

const ImportHistoricalInput = z.object({
  formRowId: z.string().uuid(),
  clinicId: z.string().uuid().optional(),
});

export const importHistoricalLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ImportHistoricalInput.parse(input))
  .handler(async ({ data, context }) => {
    const clinicId = await resolveWriteClinicId(context.supabase, data.clinicId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: form, error: formErr } = await supabaseAdmin
      .from("facebook_lead_forms")
      .select("form_id, form_name, connection_id")
      .eq("id", data.formRowId)
      .eq("clinic_id", clinicId)
      .single();
    if (formErr || !form) throw new Error("Forma topilmadi");
    const { data: connection, error: connErr } = await supabaseAdmin
      .from("facebook_connections")
      .select("page_id, page_access_token")
      .eq("id", form.connection_id)
      .single();
    if (connErr || !connection) throw new Error("Ulanish topilmadi");
    const { listLeadsForForm } = await import("./facebook-graph.server");
    const { ingestFacebookLead } = await import("./facebook-lead-ingest.server");
    let historicalLeads;
    try {
      historicalLeads = await listLeadsForForm(form.form_id, connection.page_access_token);
    } catch (err) {
      throw err;
    }
    let imported = 0;
    for (const lead of historicalLeads) {
      const { inserted } = await ingestFacebookLead({
        clinicId,
        formId: form.form_id,
        formName: form.form_name ?? null,
        pageId: connection.page_id,
        leadgenId: lead.id,
        fieldData: lead.field_data,
      });
      if (inserted) imported++;
    }
    return { ok: true, total: historicalLeads.length, imported };
  });

// O'ZGARTIRILDI: pageId qabul qiladi — faqat shu page uziladi (oldin hammasi)
const DisconnectInput = z.object({
  pageId: z.string().min(1),
  clinicId: z.string().uuid().optional(),
});

export const disconnectFacebook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DisconnectInput.parse(input))
  .handler(async ({ data, context }) => {
    const clinicId = await resolveWriteClinicId(context.supabase, data.clinicId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("facebook_connections")
      .update({ is_active: false })
      .eq("clinic_id", clinicId)
      .eq("page_id", data.pageId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// O'ZGARTIRILDI: connectionId qabul qiladi — shu connection formalarini yangilaydi
const SyncFormsInput = z.object({
  connectionId: z.string().uuid(),
  clinicId: z.string().uuid().optional(),
});

export const syncFacebookForms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SyncFormsInput.parse(input))
  .handler(async ({ data, context }) => {
    const clinicId = await resolveWriteClinicId(context.supabase, data.clinicId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: connection } = await supabaseAdmin
      .from("facebook_connections")
      .select("id, page_id, page_access_token, instagram_business_account_id, instagram_username")
      .eq("id", data.connectionId)
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .single();
    if (!connection) throw new Error("Faol Facebook ulanish topilmadi");
    const { listLeadFormsForPage, subscribePageToLeadgen, getPageInstagramAccount } =
      await import("./facebook-graph.server");
    const { subscribeInstagramAccountToMessaging, resolveInstagramEnabled } =
      await import("./instagram-graph.server");
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
    let leadgenError: string | null = null;
    try {
      await subscribePageToLeadgen(connection.page_id, connection.page_access_token, ["leadgen"]);
    } catch (err) {
      leadgenError = err instanceof Error ? err.message : "Noma'lum xatolik";
      console.error("Facebook leadgen obuna yangilash xatosi");
    }

    // Instagram Direct obunasini qayta urinib ko'ramiz (mavjud qatorni yangilaymiz).
    let instagramError: string | null = null;
    let instagramSubscribed = false;
    const igAccount =
      (await getPageInstagramAccount(connection.page_id, connection.page_access_token)) ??
      (connection.instagram_business_account_id
        ? { id: connection.instagram_business_account_id, username: connection.instagram_username }
        : null);
    if (igAccount) {
      try {
        instagramSubscribed = await subscribeInstagramAccountToMessaging(
          igAccount.id,
          connection.page_access_token,
        );
      } catch (err) {
        instagramError = err instanceof Error ? err.message : "Noma'lum xatolik";
        console.error("Instagram obuna yangilash xatosi");
      }
      await supabaseAdmin
        .from("facebook_connections")
        .update({
          instagram_business_account_id: igAccount.id,
          instagram_username: igAccount.username,
          instagram_enabled: resolveInstagramEnabled(true, instagramSubscribed),
        })
        .eq("id", connection.id);
    }

    const subscribeError =
      [
        leadgenError ? `Lead Ads obunasi: ${leadgenError}` : null,
        instagramError ? `Instagram Direct obunasi: ${instagramError}` : null,
      ]
        .filter(Boolean)
        .join(" | ") || null;

    return {
      ok: true,
      count: forms.length,
      subscribeError,
      instagramEnabled: resolveInstagramEnabled(Boolean(igAccount), instagramSubscribed),
    };

  });
