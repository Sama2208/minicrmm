// Instagram Direct xabarlarini CRM'ga kiritish mantiqi (server-only).
// Idempotent: bitta instagram_message_id faqat bir marta saqlanadi.

import { extractPhoneFromText, instagramLeadName, messagePreview } from "./instagram";

export type IncomingInstagramMessage = {
  /** Xabarni qabul qilgan biznes akkaunt (IG business account id yoki page id) */
  entryId: string;
  senderId: string;
  recipientId: string;
  messageId: string;
  text: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  timestampMs: number;
  /** Biznes tomondan yuborilgan aks-sado (echo) xabarmi */
  isEcho: boolean;
  payload: unknown;
};

// Bu statuslarga yetgan lid Direct xabari sababli orqaga qaytarilmaydi.
const TERMINAL_STATUSES = new Set([
  "yotdi",
  "qatnadi",
  "bekor_qilindi",
  "sifatsiz",
  "konsultatsiyaga_keldi",
]);

export async function ingestInstagramMessage(
  msg: IncomingInstagramMessage,
): Promise<{ stored: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Sahifani entry.id yoki qarshi tomon ID'lari orqali topamiz.
  const candidates = [msg.entryId, msg.recipientId, msg.senderId].filter(Boolean);
  const { data: connections } = await supabaseAdmin
    .from("facebook_connections")
    .select(
      "id, clinic_id, page_id, page_access_token, is_active, instagram_enabled, instagram_business_account_id, instagram_username",
    )
    .or(
      [
        `page_id.in.(${candidates.join(",")})`,
        `instagram_business_account_id.in.(${candidates.join(",")})`,
      ].join(","),
    );

  const connection = (connections ?? []).find((c) => c.is_active && c.instagram_enabled);
  if (!connection) return { stored: false };

  const igAccountId = connection.instagram_business_account_id ?? connection.page_id;
  // Suhbatdoshning ID'si: echo bo'lsa qabul qiluvchi, aks holda yuboruvchi.
  const contactId = msg.isEcho ? msg.recipientId : msg.senderId;
  if (!contactId) return { stored: false };

  // ── Suhbat (conversation) ────────────────────────────────────────────────
  let { data: conversation } = await supabaseAdmin
    .from("instagram_conversations")
    .select("id, clinic_id, lead_id, assigned_to, unread_count, instagram_username")
    .eq("clinic_id", connection.clinic_id)
    .eq("instagram_business_account_id", igAccountId)
    .eq("instagram_user_id", contactId)
    .maybeSingle();

  let username: string | null = conversation?.instagram_username ?? null;
  if (!username && !msg.isEcho) {
    const { getInstagramUserProfile } = await import("./instagram-graph.server");
    const profile = await getInstagramUserProfile(contactId, connection.page_access_token);
    username = profile.username ?? profile.name;
  }

  if (!conversation) {
    const { data: created } = await supabaseAdmin
      .from("instagram_conversations")
      .insert({
        clinic_id: connection.clinic_id,
        facebook_connection_id: connection.id,
        instagram_business_account_id: igAccountId,
        instagram_user_id: contactId,
        instagram_username: username,
        status: "open",
        unread_count: 0,
      })
      .select("id, clinic_id, lead_id, assigned_to, unread_count, instagram_username")
      .maybeSingle();
    if (!created) {
      // Parallel webhook — takroriy insert; mavjudini o'qib olamiz.
      const { data: existing } = await supabaseAdmin
        .from("instagram_conversations")
        .select("id, clinic_id, lead_id, assigned_to, unread_count, instagram_username")
        .eq("clinic_id", connection.clinic_id)
        .eq("instagram_business_account_id", igAccountId)
        .eq("instagram_user_id", contactId)
        .maybeSingle();
      if (!existing) return { stored: false };
      conversation = existing;
    } else {
      conversation = created;
    }
  }

  // ── Xabar (idempotent) ───────────────────────────────────────────────────
  const { data: inserted, error: msgErr } = await supabaseAdmin
    .from("instagram_messages")
    .insert({
      clinic_id: conversation.clinic_id,
      conversation_id: conversation.id,
      instagram_message_id: msg.messageId,
      direction: msg.isEcho ? "outbound" : "inbound",
      sender_id: msg.senderId,
      recipient_id: msg.recipientId,
      message_text: msg.text,
      media_type: msg.mediaType,
      media_url: msg.mediaUrl,
      payload: msg.payload as never,
      sent_at: new Date(msg.timestampMs || Date.now()).toISOString(),
    })
    .select("id")
    .maybeSingle();

  // Takroriy instagram_message_id — unique buzilishi; jimgina chiqamiz.
  if (msgErr || !inserted) return { stored: false };

  // ── Lid ──────────────────────────────────────────────────────────────────
  let leadId: string | null = conversation.lead_id;
  let assignedTo: string | null = conversation.assigned_to;

  if (!leadId && !msg.isEcho) {
    // Matnda telefon bo'lsa — mavjud lidga bog'lashga urinamiz.
    const phone = extractPhoneFromText(msg.text);
    if (phone) {
      const { data: match } = await supabaseAdmin
        .from("leads")
        .select("id, assigned_to")
        .eq("clinic_id", conversation.clinic_id)
        .or(`phone.eq.${phone},nomer_asosiy.eq.${phone}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (match) {
        leadId = match.id;
        assignedTo = assignedTo ?? match.assigned_to;
      }
    }

    if (!leadId) {
      if (!assignedTo) {
        const { data: nextOp } = await supabaseAdmin.rpc("get_next_operator", {
          p_clinic_id: conversation.clinic_id,
        });
        assignedTo = (nextOp as string | null) ?? null;
      }
      const { data: lead } = await supabaseAdmin
        .from("leads")
        .insert({
          full_name: instagramLeadName(username),
          phone,
          source: "instagram",
          source_detail: "Direct",
          status: "instagram_direct",
          clinic_id: conversation.clinic_id,
          assigned_to: assignedTo,
        })
        .select("id")
        .maybeSingle();
      leadId = lead?.id ?? null;
    }
  }

  // Mavjud lidning statusi hech qachon orqaga qaytarilmaydi — faqat hali
  // ishlov berilmagan ("yangi") lid Direct ustuniga ko'chiriladi.
  if (leadId && !msg.isEcho) {
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("status")
      .eq("id", leadId)
      .maybeSingle();
    if (lead && lead.status === "yangi" && !TERMINAL_STATUSES.has(lead.status)) {
      await supabaseAdmin.from("leads").update({ status: "instagram_direct" }).eq("id", leadId);
    }
  }

  await supabaseAdmin
    .from("instagram_conversations")
    .update({
      lead_id: leadId,
      assigned_to: assignedTo,
      instagram_username: username ?? conversation.instagram_username,
      last_message_at: new Date(msg.timestampMs || Date.now()).toISOString(),
      last_message_preview: messagePreview(msg.text),
      unread_count: msg.isEcho ? 0 : (conversation.unread_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversation.id);

  return { stored: true };
}
