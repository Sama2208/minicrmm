import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CAPI_STATUSES: Record<string, string> = {
  konsultatsiyaga_yozildi: "Lead",
    konsultatsiyada_boldi: "Lead",
    yotishga_yozildi: "Purchase",
    qatnovchi: "Purchase"
};

async function sha256hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const triggerSecret = Deno.env.get("CAPI_TRIGGER_SECRET");
  if (triggerSecret && req.headers.get("x-trigger-secret") !== triggerSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { lead_id?: string; new_status?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { lead_id, new_status } = body;
  if (!lead_id || !new_status) {
    return new Response(
      JSON.stringify({ error: "lead_id va new_status majburiy" }),
      { status: 400 }
    );
  }

  if (!CAPI_STATUSES[new_status]) {
    return new Response(
      JSON.stringify({ skip: true, reason: "status CAPI trigger emas" }),
      { status: 200 }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: lead, error } = await supabase
    .from("leads")
    .select("id, phone, fbclid, fbc, fbp, meta_campaign_id, meta_adset_id, meta_ad_id")
    .eq("id", lead_id)
    .single();

  if (error || !lead) {
    return new Response(JSON.stringify({ error: "Lead topilmadi" }), { status: 404 });
  }

  const eventName = CAPI_STATUSES[new_status];
  const eventId = `${lead_id}_${new_status}_${Date.now()}`;
  const pixelId = Deno.env.get("META_PIXEL_ID");
  const accessToken = Deno.env.get("META_CAPI_ACCESS_TOKEN");

  if (!pixelId || !accessToken) {
    console.error("META_PIXEL_ID yoki META_CAPI_ACCESS_TOKEN sozlanmagan");
    return new Response(
      JSON.stringify({ error: "CAPI secrets sozlanmagan" }),
      { status: 500 }
    );
  }

  const userData: Record<string, string> = {};
  if (lead.phone) userData.ph = await sha256hex(lead.phone.replace(/\D/g, ""));
  if (lead.fbc) userData.fbc = lead.fbc;
  else if (lead.fbclid) userData.fbc = `fb.1.${Date.now()}.${lead.fbclid}`;
  if (lead.fbp) userData.fbp = lead.fbp;

  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: "website",
      user_data: userData,
      ...(lead.meta_campaign_id
        ? { custom_data: { campaign_id: lead.meta_campaign_id } }
        : {}),
    }],
  };

  const capiRes = await fetch(
    `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  const capiBody = await capiRes.json();

  await supabase.from("capi_events_log").insert({
    lead_id: lead.id,
    event_name: eventName,
    event_id: eventId,
    request_payload: payload,
    response_status: capiRes.status,
    response_body: capiBody,
  });

  console.log(`CAPI ${eventName} yuborildi: lead=${lead_id}, capiStatus=${capiRes.status}`);

  return new Response(
    JSON.stringify({ ok: true, event: eventName, capiStatus: capiRes.status }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
