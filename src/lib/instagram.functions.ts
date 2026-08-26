import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type InstagramMessageDto = {
  id: string;
  direction: "inbound" | "outbound";
  message_text: string | null;
  media_type: string | null;
  media_url: string | null;
  sent_at: string;
};

export type InstagramThreadDto = {
  conversationId: string;
  username: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
  messages: InstagramMessageDto[];
} | null;

const LeadInput = z.object({ leadId: z.string().uuid() });
const ConversationInput = z.object({ conversationId: z.string().uuid() });
const SendInput = z.object({
  conversationId: z.string().uuid(),
  text: z.string().trim().min(1).max(1000),
});

/**
 * Suhbatga ruxsatni tekshiradi: foydalanuvchining klinikasi mos kelishi shart,
 * operator bo'lsa — suhbat unga (yoki lidi unga) biriktirilgan bo'lishi kerak.
 */
async function authorizeConversation(
  supabase: SupabaseClient<Database>,
  userId: string,
  conversationId: string,
) {
  const { data: clinicId } = await supabase.rpc("current_clinic_id");
  if (!clinicId) throw new Error("Klinika aniqlanmadi");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: conv } = await supabaseAdmin
    .from("instagram_conversations")
    .select(
      "id, clinic_id, lead_id, assigned_to, instagram_username, unread_count, last_message_at, instagram_user_id, instagram_business_account_id, facebook_connection_id",
    )
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv || conv.clinic_id !== clinicId) throw new Error("Suhbat topilmadi");

  const { data: isAdmin } = await supabase.rpc("has_role", { _role: "admin" });
  if (isAdmin) return { conv, supabaseAdmin };

  // Operator faqat o'ziga biriktirilgan suhbat/lidni ko'radi.
  const { data: operator } = await supabaseAdmin
    .from("operators")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("user_id", userId)
    .maybeSingle();
  const operatorId = operator?.id ?? null;

  let allowed = !!operatorId && conv.assigned_to === operatorId;
  if (!allowed && conv.lead_id && operatorId) {
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("assigned_to")
      .eq("id", conv.lead_id)
      .maybeSingle();
    allowed = lead?.assigned_to === operatorId;
  }
  if (!allowed) throw new Error("Ruxsat yo'q");
  return { conv, supabaseAdmin };
}

export const getInstagramThreadForLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LeadInput.parse(input))
  .handler(async ({ data, context }): Promise<InstagramThreadDto> => {
    const { data: clinicId } = await context.supabase.rpc("current_clinic_id");
    if (!clinicId) return null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conv } = await supabaseAdmin
      .from("instagram_conversations")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("lead_id", data.leadId)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!conv) return null;

    const { conv: authorized } = await authorizeConversation(
      context.supabase,
      context.userId,
      conv.id,
    );

    const { data: messages } = await supabaseAdmin
      .from("instagram_messages")
      .select("id, direction, message_text, media_type, media_url, sent_at")
      .eq("conversation_id", conv.id)
      .order("sent_at", { ascending: true })
      .limit(200);

    return {
      conversationId: authorized.id,
      username: authorized.instagram_username,
      unreadCount: authorized.unread_count ?? 0,
      lastMessageAt: authorized.last_message_at,
      messages: (messages ?? []) as InstagramMessageDto[],
    };
  });

export const markInstagramConversationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ConversationInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await authorizeConversation(
      context.supabase,
      context.userId,
      data.conversationId,
    );
    await supabaseAdmin
      .from("instagram_conversations")
      .update({ unread_count: 0, updated_at: new Date().toISOString() })
      .eq("id", data.conversationId);
    return { ok: true };
  });

export const sendInstagramReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SendInput.parse(input))
  .handler(async ({ data, context }) => {
    const { conv, supabaseAdmin } = await authorizeConversation(
      context.supabase,
      context.userId,
      data.conversationId,
    );

    const { data: connection } = await supabaseAdmin
      .from("facebook_connections")
      .select("page_id, page_access_token, is_active, instagram_enabled")
      .eq("id", conv.facebook_connection_id)
      .maybeSingle();
    if (!connection || !connection.is_active || !connection.instagram_enabled) {
      throw new Error("Instagram ulanishi faol emas");
    }

    const { sendInstagramMessage } = await import("./instagram-graph.server");
    const { messageId } = await sendInstagramMessage({
      pageId: connection.page_id,
      pageAccessToken: connection.page_access_token,
      recipientId: conv.instagram_user_id,
      text: data.text,
    });

    const sentAt = new Date().toISOString();
    await supabaseAdmin.from("instagram_messages").insert({
      clinic_id: conv.clinic_id,
      conversation_id: conv.id,
      instagram_message_id: messageId ?? `local-${crypto.randomUUID()}`,
      direction: "outbound",
      sender_id: conv.instagram_business_account_id ?? null,
      recipient_id: conv.instagram_user_id,
      message_text: data.text,
      sent_at: sentAt,
    });

    await supabaseAdmin
      .from("instagram_conversations")
      .update({
        last_message_at: sentAt,
        last_message_preview: data.text.slice(0, 120),
        unread_count: 0,
        updated_at: sentAt,
      })
      .eq("id", conv.id);

    if (conv.lead_id) {
      await supabaseAdmin
        .from("leads")
        .update({ last_contact_at: sentAt })
        .eq("id", conv.lead_id);
    }

    return { ok: true };
  });
