// Meta Graph API bilan ishlash uchun yupqa server-only klient.
// FACEBOOK_APP_SECRET kabi maxfiy qiymatlar shu yerdan tashqariga chiqmaydi.
const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

// Facebook server-side API chaqiruvlari uchun appsecret_proof hisoblash.
// Cloudflare Workers Web Crypto API (SubtleCrypto) orqali HMAC-SHA256.
async function computeAppSecretProof(appSecret: string, accessToken: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(accessToken));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function graphFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH_API_BASE}${path}`);

  // access_token mavjud bo'lsa va /oauth/ bo'lmasa — appsecret_proof avtomatik qo'shamiz.
  // /oauth/access_token chaqiruvlari client_secret orqali ishlaydi, proof shart emas.
  if (params.access_token && !path.startsWith("/oauth/")) {
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (appSecret) {
      params = {
        ...params,
        appsecret_proof: await computeAppSecretProof(appSecret, params.access_token),
      };
    }
  }

  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const res = await fetch(url.toString());
  const body = await res.json();
  if (!res.ok || body.error) {
    const message = body?.error?.message ?? `Facebook API xatosi (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

export type FacebookPage = { id: string; name: string; access_token: string };

export async function exchangeCodeForUserToken(code: string, redirectUri: string): Promise<string> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) throw new Error("FACEBOOK_APP_ID/FACEBOOK_APP_SECRET sozlanmagan");

  const data = await graphFetch<{ access_token: string }>("/oauth/access_token", {
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
  return data.access_token;
}

// Qisqa muddatli token'ni uzoq muddatlisiga almashtiradi (~60 kun).
export async function getLongLivedUserToken(shortLivedToken: string): Promise<string> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) throw new Error("FACEBOOK_APP_ID/FACEBOOK_APP_SECRET sozlanmagan");

  const data = await graphFetch<{ access_token: string }>("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });
  return data.access_token;
}

export async function listPagesForUser(userAccessToken: string): Promise<FacebookPage[]> {
  const data = await graphFetch<{ data: FacebookPage[] }>("/me/accounts", {
    access_token: userAccessToken,
  });
  return data.data;
}

export type FacebookLeadForm = { id: string; name: string };

export async function listLeadFormsForPage(
  pageId: string,
  pageAccessToken: string,
): Promise<FacebookLeadForm[]> {
  const data = await graphFetch<{ data: FacebookLeadForm[] }>(`/${pageId}/leadgen_forms`, {
    access_token: pageAccessToken,
  });
  return data.data;
}

export type FacebookLeadData = { field_data: { name: string; values: string[] }[] };

export async function getLeadData(
  leadgenId: string,
  pageAccessToken: string,
): Promise<FacebookLeadData> {
  return graphFetch<FacebookLeadData>(`/${leadgenId}`, { access_token: pageAccessToken });
}
