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

  // Qaysi Facebook page dan kelganini formId orqali topamiz:
  // facebook_lead_forms.form_id → connection_id → facebook_connections.page_id/page_name
  const { data: formRow } = await supabaseAdmin
    .from("facebook_lead_forms")
    .select("connection_id")
    .eq("form_id", params.formId)
    .eq("clinic_id", params.clinicId)
    .maybeSingle();

  let facebookPageId: string | null = null;
  let facebookPageName: string | null = null;

  if (formRow?.connection_id) {
    const { data: conn } = await supabaseAdmin
      .from("facebook_connections")
      .select("page_id, page_name")
      .eq("id", formRow.connection_id)
      .maybeSingle();
    facebookPageId = conn?.page_id ?? null;
    facebookPageName = conn?.page_name ?? null;
  }

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
