import { extractFacebookLeadFields, type FacebookFieldDatum } from "./facebook";
import { normalizeUzPhone } from "./phone";

// Webhook orqali kelgan real-time hodisa va tarixiy (backfill) import — ikkalasi
// ham aynan shu funksiya orqali lidni yaratadi, shunda idempotentlik va
// maydonlarni ajratish mantig'i bitta joyda saqlanadi.
export async function ingestFacebookLead(params: {
  clinicId: string;
  formId: string;
  leadgenId: string;
  fieldData: FacebookFieldDatum[];
  // Webhook payload'idan kelgan haqiqiy page_id — yagona haqiqat manbai.
  pageId?: string;
  // Import yo'lida forma nomi allaqachon ma'lum bo'ladi.
  formName?: string | null;
  metaCampaignId?: string;
  metaAdsetId?: string;
  metaAdId?: string;
}): Promise<{ inserted: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Idempotentlik: bitta leadgen_id uchun faqat bir marta ishlov beriladi.
  const { error: insertEventErr } = await supabaseAdmin.from("facebook_lead_events").insert({
    clinic_id: params.clinicId,
    leadgen_id: params.leadgenId,
    form_id: params.formId,
    raw_payload: {
      leadgen_id: params.leadgenId,
      form_id: params.formId,
      field_data: params.fieldData,
    },
  });
  if (insertEventErr) return { inserted: false };

  const { fullName, phone, nomerAsosiy, problemType } = extractFacebookLeadFields(params.fieldData);
  if (!fullName && !phone) return { inserted: false };

  const normalizedPhone = phone ? (normalizeUzPhone(phone) ?? phone) : null;
  const normalizedNomerAsosiy = nomerAsosiy ? (normalizeUzPhone(nomerAsosiy) ?? nomerAsosiy) : null;

  // MUHIM: forma nomi FAQAT payload'dagi form_id bo'yicha topiladi.
  // Topilmasa — bo'sh qoladi, hech qachon boshqa formaning nomi yozilmaydi.
  let formName: string | null = params.formName ?? null;
  let connectionId: string | null = null;

  if (formName === null || !params.pageId) {
    const { data: formRow } = await supabaseAdmin
      .from("facebook_lead_forms")
      .select("connection_id, form_name")
      .eq("form_id", params.formId)
      .eq("clinic_id", params.clinicId)
      .maybeSingle();
    if (formRow) {
      connectionId = formRow.connection_id;
      if (formName === null) formName = formRow.form_name ?? null;
    }
  }

  // MUHIM: sahifa nomi FAQAT payload'dagi page_id bo'yicha topiladi.
  let facebookPageId: string | null = params.pageId ?? null;
  let facebookPageName: string | null = null;

  if (params.pageId) {
    const { data: conn } = await supabaseAdmin
      .from("facebook_connections")
      .select("page_name")
      .eq("page_id", params.pageId)
      .eq("clinic_id", params.clinicId)
      .maybeSingle();
    facebookPageName = conn?.page_name ?? null;
  } else if (connectionId) {
    const { data: conn } = await supabaseAdmin
      .from("facebook_connections")
      .select("page_id, page_name")
      .eq("id", connectionId)
      .maybeSingle();
    facebookPageId = conn?.page_id ?? null;
    facebookPageName = conn?.page_name ?? null;
  }


  // Round-robin: aylanma hisoblagich orqali navbatdagi operatorga beriladi.
  // Eski lidlar soni hisobga olinmaydi — faqat yangi lidlar teng taqsimlanadi.
  const { data: nextOp } = await supabaseAdmin.rpc("get_next_operator", {
    p_clinic_id: params.clinicId,
  });
  const assignedTo: string | null = (nextOp as string | null) ?? null;

  // .maybeSingle(): prevent_duplicate_phone trigger'i takroriy raqamda
  // NULL qaytaradi — bu xatolik emas.
  const { data: lead } = await supabaseAdmin
    .from("leads")
    .insert({
      full_name: fullName || "Facebook lid",
      phone: normalizedPhone,
      nomer_asosiy: normalizedNomerAsosiy,
      problem_type: problemType,
      source: "facebook",
      source_detail: "Lead Ads",
      status: "yangi",
      clinic_id: params.clinicId,
      meta_campaign_id: params.metaCampaignId ?? null,
      meta_adset_id: params.metaAdsetId ?? null,
      meta_ad_id: params.metaAdId ?? null,
      facebook_page_id: facebookPageId,
      facebook_page_name: facebookPageName,
      facebook_form_id: params.formId,
      facebook_form_name: formRow?.form_name ?? null,
      assigned_to: assignedTo,
    })
    .select("id")
    .maybeSingle();

  if (lead) {
    await supabaseAdmin
      .from("facebook_lead_events")
      .update({ lead_id: lead.id })
      .eq("leadgen_id", params.leadgenId);
  }

  return { inserted: !!lead };
}
