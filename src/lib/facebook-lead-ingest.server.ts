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
}): Promise<{ inserted: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Idempotentlik: bitta leadgen_id uchun faqat bir marta ishlov beriladi.
  // UNIQUE cheklov ikkinchi urinishni rad etadi — Meta webhookni qayta
  // yuborishi yoki bir lidni ikki marta import qilish normal holat.
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

  const { fullName, phone } = extractFacebookLeadFields(params.fieldData);
  if (!fullName && !phone) return { inserted: false };

  const normalizedPhone = phone ? (normalizeUzPhone(phone) ?? phone) : null;

  // .maybeSingle(): prevent_duplicate_phone trigger'i takroriy raqamda
  // NULL qaytaradi (yozuv qo'shilmaydi, mavjud lidga izoh qo'shiladi) —
  // bu xatolik emas, shuning uchun bu holatda ham jim yakunlanadi.
  const { data: lead } = await supabaseAdmin
    .from("leads")
    .insert({
      full_name: fullName || "Facebook lid",
      phone: normalizedPhone,
      source: "facebook",
      source_detail: "Lead Ads",
      status: "yangi",
      clinic_id: params.clinicId,
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
