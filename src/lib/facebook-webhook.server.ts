import { getLeadData } from "./facebook-graph.server";
import { extractFacebookLeadFields } from "./facebook";
import { normalizeUzPhone } from "./phone";

type LeadgenChange = {
  field: string;
  value: { leadgen_id: string; page_id: string; form_id: string };
};

type FacebookWebhookPayload = {
  entry?: { id: string; changes?: LeadgenChange[] }[];
};

async function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const [algo, hash] = signatureHeader.split("=");
  if (algo !== "sha256" || !hash) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expectedHex = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expectedHex.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    diff |= expectedHex.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return diff === 0;
}

async function processLeadgenEvent(value: LeadgenChange["value"]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: connection } = await supabaseAdmin
    .from("facebook_connections")
    .select("id, clinic_id, page_access_token, is_active")
    .eq("page_id", value.page_id)
    .maybeSingle();
  if (!connection || !connection.is_active) return;

  const { data: form } = await supabaseAdmin
    .from("facebook_lead_forms")
    .select("id, is_syncing")
    .eq("connection_id", connection.id)
    .eq("form_id", value.form_id)
    .maybeSingle();
  if (!form || !form.is_syncing) return;

  // Idempotentlik: bitta leadgen_id uchun faqat bir marta ishlov beriladi.
  // UNIQUE cheklov ikkinchi urinishni rad etadi — Meta webhookni qayta
  // yuborishi normal holat.
  const { error: insertEventErr } = await supabaseAdmin.from("facebook_lead_events").insert({
    clinic_id: connection.clinic_id,
    leadgen_id: value.leadgen_id,
    form_id: value.form_id,
    raw_payload: value,
  });
  if (insertEventErr) return;

  const leadData = await getLeadData(value.leadgen_id, connection.page_access_token);
  const { fullName, phone } = extractFacebookLeadFields(leadData.field_data);
  if (!fullName && !phone) return;

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
      clinic_id: connection.clinic_id,
    })
    .select("id")
    .maybeSingle();

  if (lead) {
    await supabaseAdmin
      .from("facebook_lead_events")
      .update({ lead_id: lead.id })
      .eq("leadgen_id", value.leadgen_id);
  }
}

// Meta bu manzilga GET (obuna tasdiqlash) va POST (voqea) so'rovlarini
// yuboradi. createServerFn emas — bu tashqi (Meta) tomonidan chaqiriladigan
// xom HTTP endpoint. src/server.ts orqali ishga tushiriladi.
export async function handleFacebookWebhook(request: Request): Promise<Response> {
  if (request.method === "GET") {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expectedToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;
    if (mode === "subscribe" && challenge && expectedToken && token === expectedToken) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const rawBody = await request.text();
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const signature = request.headers.get("x-hub-signature-256");
  if (!appSecret || !(await verifySignature(rawBody, signature, appSecret))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: FacebookWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;
      try {
        await processLeadgenEvent(change.value);
      } catch (err) {
        console.error("Facebook leadgen event processing failed", err);
      }
    }
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
}
