import { normalizeUzPhone } from "./phone";

const CLINIC_ID = "8aede394-9975-4551-a27e-ebc57adb409b";

// Lovable landing page yoki boshqa web forma orqali kelgan lidlarni
// CRM leads jadvaliga kiritadi. Telegram'ga parallel chaqiriladi.
export async function handleWebLeadWebhook(request: Request): Promise<Response> {
  // CORS — Lovable domenidan browser fetch uchun
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON parse xatosi" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fullName = (body.full_name || body.name || "").trim();
  const rawPhone = (body.phone || body.telefon || "").trim();
  const problemType = (body.problem_type || body.kasallik || "").trim() || null;
  const canVisit = (body.can_visit_clinic || body.keladi || "").trim() || null;
  const sourceDetail = (body.source_detail || "Landing Page").trim();

  if (!fullName || !rawPhone) {
    return new Response(JSON.stringify({ error: "full_name va phone majburiy" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const phone = normalizeUzPhone(rawPhone) ?? rawPhone;

  // can_visit_clinic enum: 'ha' | 'yoq' | 'bilmayman'
  let canVisitEnum: "ha" | "yoq" | "bilmayman" | null = null;
  if (canVisit) {
    const v = canVisit.toLowerCase();
    if (v === "ha" || v.includes("kela")) {
      canVisitEnum = "ha";
    } else if (v === "yoq" || v.includes("olmayman") || v.includes("bora")) {
      canVisitEnum = "yoq";
    } else {
      canVisitEnum = "bilmayman";
    }
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: lead, error } = await supabaseAdmin
    .from("leads")
    .insert({
      full_name: fullName,
      phone,
      problem_type: problemType,
      can_visit_clinic: canVisitEnum,
      source: "website",
      source_detail: sourceDetail,
      status: "yangi",
      clinic_id: CLINIC_ID,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("web-lead-ingest error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, id: lead?.id ?? null }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
