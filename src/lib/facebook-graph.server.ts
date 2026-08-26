// Meta Graph API bilan ishlash uchun yupqa server-only klient.
// FACEBOOK_APP_SECRET kabi maxfiy qiymatlar shu yerdan tashqariga chiqmaydi.

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

// Facebook server-side API chaqiruvlari uchun appsecret_proof hisoblash.
// Cloudflare Workers Web Crypto API (SubtleCrypto) orqali HMAC-SHA256.
export async function computeAppSecretProof(appSecret: string, accessToken: string): Promise<string> {
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
    const appSecret =
      typeof process !== "undefined" && process.env?.FACEBOOK_APP_SECRET
        ? process.env.FACEBOOK_APP_SECRET
        : undefined;
    if (!appSecret) {
      throw new Error("FACEBOOK_APP_SECRET sozlanmagan — appsecret_proof yaratib bo'lmadi");
    }
    params = {
      ...params,
      appsecret_proof: await computeAppSecretProof(appSecret, params.access_token),
    };
  }

  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const res = await fetch(url.toString());
  const body = await res.json();
  if (!res.ok || body.error) {
    const fbMessage = body?.error?.message ?? `Facebook API xatosi (${res.status})`;
    throw new Error(fbMessage);
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
    // Meta's default response does not guarantee access_token. Without an
    // explicit field list, reconnecting can save an undefined/stale Page
    // token and the Instagram webhook call then fails with "Cannot parse
    // access token".
    fields: "id,name,access_token",
  });
  const pages = data.data ?? [];
  if (pages.some((page) => !page.id || !page.name || !page.access_token)) {
    throw new Error("Meta Page access tokenni qaytarmadi. Facebook ulanishini qayta tasdiqlang.");
  }
  return pages;
}

export type FacebookLeadForm = { id: string; name: string };

export async function listLeadFormsForPage(
  pageId: string,
  pageAccessToken: string,
): Promise<FacebookLeadForm[]> {
  const data = await graphFetch<{ data: FacebookLeadForm[] }>(`/${pageId}/leadgen_forms`, {
    access_token: pageAccessToken,
    limit: "100",
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

export type FacebookHistoricalLead = {
  id: string;
  field_data: { name: string; values: string[] }[];
};

// Formada avvaldan mavjud (webhook ulanishidan oldingi) lidlarni sahifalab
// o'qiydi — bir martalik "eski lidlarni import qilish" uchun.
export async function listLeadsForForm(
  formId: string,
  pageAccessToken: string,
): Promise<FacebookHistoricalLead[]> {
  const leads: FacebookHistoricalLead[] = [];

  let data = await graphFetch<{
    data: FacebookHistoricalLead[];
    paging?: { next?: string };
  }>(`/${formId}/leads`, { access_token: pageAccessToken, fields: "field_data", limit: "100" });
  leads.push(...data.data);

  // paging.next allaqachon to'liq URL (access_token va appsecret_proof bilan
  // qayta hisoblash shart emas — Meta o'zi keyingi sahifa uchun tayyor manzil
  // beradi), shuning uchun graphFetch emas, oddiy fetch bilan davom etamiz.
  let guard = 0;
  while (data.paging?.next && guard < 20) {
    const res = await fetch(data.paging.next);
    const body = await res.json();
    if (!res.ok || body.error) {
      throw new Error(body?.error?.message ?? `Facebook API xatosi (${res.status})`);
    }
    data = body;
    leads.push(...data.data);
    guard++;
  }

  return leads;
}

// Sahifani leadgen webhook voqealariga obuna qiladi.
// POST /{page_id}/subscribed_apps?subscribed_fields=leadgen
// Server-side chaqiruv — appsecret_proof shart.
export async function subscribePageToLeadgen(
  pageId: string,
  pageAccessToken: string,
  fields: string[] = ["leadgen"],
): Promise<boolean> {
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const url = new URL(`${GRAPH_API_BASE}/${pageId}/subscribed_apps`);
  url.searchParams.set("subscribed_fields", fields.join(","));
  url.searchParams.set("access_token", pageAccessToken);
  if (appSecret) {
    url.searchParams.set(
      "appsecret_proof",
      await computeAppSecretProof(appSecret, pageAccessToken),
    );
  }
  const res = await fetch(url.toString(), { method: "POST" });
  const body = await res.json();
  if (!res.ok || body.error) {
    throw new Error(body?.error?.message ?? `Facebook obuna xatosi (${res.status})`);
  }
  return body.success === true;
}

// Sahifaga ulangan Instagram Professional/Business akkaunt ma'lumotlari.
// Ulanmagan bo'lsa null qaytaradi (bu xatolik emas).
export type PageInstagramAccount = { id: string; username: string | null };

export async function getPageInstagramAccount(
  pageId: string,
  pageAccessToken: string,
): Promise<PageInstagramAccount | null> {
  try {
    const data = await graphFetch<{
      instagram_business_account?: { id: string; username?: string };
      connected_instagram_account?: { id: string; username?: string };
    }>(`/${pageId}`, {
      access_token: pageAccessToken,
      fields: "instagram_business_account{id,username},connected_instagram_account{id,username}",
    });
    const acc = data.instagram_business_account ?? data.connected_instagram_account;
    if (!acc?.id) return null;
    return { id: acc.id, username: acc.username ?? null };
  } catch {
    return null;
  }
}
