type FacebookSignedRequestPayload = {
  algorithm?: string;
  user_id?: string | number;
};

function base64UrlToBytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  try {
    return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function bytesToText(value: Uint8Array): string {
  return new TextDecoder().decode(value);
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function hmacSha256(secret: string, value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

export async function hashFacebookUserId(userId: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function parseFacebookDataDeletionSignedRequest(
  signedRequest: string,
  appSecret: string,
): Promise<{ userId: string } | null> {
  const [encodedSignature, encodedPayload, ...extra] = signedRequest.split(".");
  if (!encodedSignature || !encodedPayload || extra.length > 0) return null;

  const actualSignature = base64UrlToBytes(encodedSignature);
  if (!actualSignature) return null;

  const expectedSignature = await hmacSha256(appSecret, encodedPayload);
  if (!equalBytes(actualSignature, expectedSignature)) return null;

  const payloadBytes = base64UrlToBytes(encodedPayload);
  if (!payloadBytes) return null;

  try {
    const payload = JSON.parse(bytesToText(payloadBytes)) as FacebookSignedRequestPayload;
    if (payload.algorithm !== "HMAC-SHA256" || payload.user_id === undefined) return null;
    const userId = String(payload.user_id).trim();
    return userId ? { userId } : null;
  } catch {
    return null;
  }
}

function dataDeletionStatusHtml(message: string): Response {
  return new Response(
    `<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>Data deletion</title></head><body><h1>Ma'lumotlarni o‘chirish</h1><p>${message}</p></body></html>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export async function handleFacebookDataDeletionRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appSecret) return new Response("Service Unavailable", { status: 503 });

  let signedRequest: string | null = null;
  try {
    const formData = await request.formData();
    const value = formData.get("signed_request");
    signedRequest = typeof value === "string" ? value : null;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (!signedRequest) return new Response("Bad Request", { status: 400 });
  const parsed = await parseFacebookDataDeletionSignedRequest(signedRequest, appSecret);
  if (!parsed) return new Response("Invalid signature", { status: 401 });

  const userHash = await hashFacebookUserId(parsed.userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("facebook_data_deletion_requests")
    .select("confirmation_code")
    .eq("facebook_user_id_hash", userHash)
    .maybeSingle();
  if (existingError) {
    console.error("Facebook data deletion request lookup failed", existingError);
    return new Response("Service Unavailable", { status: 503 });
  }

  const origin = new URL(request.url).origin;
  const responseFor = (confirmationCode: string) =>
    Response.json({
      url: `${origin}/api/facebook/data-deletion-status?code=${encodeURIComponent(confirmationCode)}`,
      confirmation_code: confirmationCode,
    });
  if (existing) return responseFor(existing.confirmation_code);

  const confirmationCode = crypto.randomUUID();
  const { data: disabledConnections, error: disableError } = await supabaseAdmin
    .from("facebook_connections")
    .update({ is_active: false, page_access_token: "" })
    .eq("facebook_user_id_hash", userHash)
    .select("id");
  if (disableError) {
    console.error("Facebook data deletion connection cleanup failed", disableError);
    return new Response("Service Unavailable", { status: 503 });
  }

  const { error: sessionError } = await supabaseAdmin
    .from("facebook_oauth_sessions")
    .delete()
    .eq("facebook_user_id_hash", userHash);
  if (sessionError) {
    console.error("Facebook data deletion session cleanup failed", sessionError);
    return new Response("Service Unavailable", { status: 503 });
  }

  const { error: insertError } = await supabaseAdmin.from("facebook_data_deletion_requests").insert({
    facebook_user_id_hash: userHash,
    confirmation_code: confirmationCode,
    status: "completed",
    disabled_connection_count: disabledConnections?.length ?? 0,
    completed_at: new Date().toISOString(),
  });
  if (insertError) {
    console.error("Facebook data deletion request logging failed", insertError);
    return new Response("Service Unavailable", { status: 503 });
  }

  return responseFor(confirmationCode);
}

export async function handleFacebookDataDeletionStatus(request: Request): Promise<Response> {
  if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405 });

  const confirmationCode = new URL(request.url).searchParams.get("code");
  if (!confirmationCode) return dataDeletionStatusHtml("So‘rov kodi topilmadi.");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("facebook_data_deletion_requests")
    .select("status")
    .eq("confirmation_code", confirmationCode)
    .maybeSingle();

  if (data?.status === "completed") {
    return dataDeletionStatusHtml("So‘rov bajarildi. Facebook ulanishi o‘chirildi.");
  }
  return dataDeletionStatusHtml("So‘rov topilmadi yoki hali qayta ishlanmoqda.");
}
