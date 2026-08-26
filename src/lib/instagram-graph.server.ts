// Instagram Messaging (Graph API) bilan ishlash uchun server-only klient.
// Page access token va FACEBOOK_APP_SECRET hech qachon brauzerga chiqmaydi.

import { computeAppSecretProof } from "./facebook-graph.server";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

// Bu Facebook Login oqimi: Instagram professional akkauntiga Page access
// token bilan murojaat qilinadi, shuning uchun graph.facebook.com ishlatiladi.
// graph.instagram.com bu token turi bilan almashtirilmaydi.
const IG_API_BASE = GRAPH_API_BASE;

export const INSTAGRAM_MESSAGING_FIELDS = ["messages", "messaging_postbacks"] as const;

function requireAppSecret(): string {
  const appSecret =
    typeof process !== "undefined" && process.env?.FACEBOOK_APP_SECRET
      ? process.env.FACEBOOK_APP_SECRET
      : undefined;
  if (!appSecret) throw new Error("FACEBOOK_APP_SECRET sozlanmagan");
  return appSecret;
}

/**
 * Instagram professional akkauntni Instagram Webhooks (Direct xabarlari)
 * maydonlariga obuna qiladi.
 * POST https://graph.facebook.com/{version}/{ig_user_id}/subscribed_apps
 * Facebook Page `subscribed_apps` edge'idan farqli — pages_messaging talab qilmaydi.
 */
export async function subscribeInstagramAccountToMessaging(
  igUserId: string,
  pageAccessToken: string,
  fields: readonly string[] = INSTAGRAM_MESSAGING_FIELDS,
): Promise<boolean> {
  const url = new URL(`${IG_API_BASE}/${igUserId}/subscribed_apps`);
  url.searchParams.set("subscribed_fields", fields.join(","));
  url.searchParams.set("access_token", pageAccessToken);
  const appSecret =
    typeof process !== "undefined" && process.env?.FACEBOOK_APP_SECRET
      ? process.env.FACEBOOK_APP_SECRET
      : undefined;
  if (appSecret) {
    url.searchParams.set(
      "appsecret_proof",
      await computeAppSecretProof(appSecret, pageAccessToken),
    );
  }

  const res = await fetch(url.toString(), { method: "POST" });
  const body = await res.json();
  if (!res.ok || body?.error) {
    throw new Error(body?.error?.message ?? `Instagram obuna xatosi (${res.status})`);
  }
  return body?.success === true;
}

/**
 * instagram_enabled qiymati: faqat akkaunt topilgan VA obuna muvaffaqiyatli
 * bo'lganda true bo'ladi.
 */
export function resolveInstagramEnabled(
  hasAccount: boolean,
  subscribeSucceeded: boolean,
): boolean {
  return hasAccount && subscribeSucceeded;
}


async function igFetch<T>(
  path: string,
  pageAccessToken: string,
  init?: { method?: "GET" | "POST"; params?: Record<string, string>; body?: unknown },
): Promise<T> {
  const url = new URL(`${GRAPH_API_BASE}${path}`);
  for (const [k, v] of Object.entries(init?.params ?? {})) url.searchParams.set(k, v);
  url.searchParams.set("access_token", pageAccessToken);
  url.searchParams.set(
    "appsecret_proof",
    await computeAppSecretProof(requireAppSecret(), pageAccessToken),
  );

  const res = await fetch(url.toString(), {
    method: init?.method ?? "GET",
    ...(init?.body
      ? { headers: { "content-type": "application/json" }, body: JSON.stringify(init.body) }
      : {}),
  });
  const body = await res.json();
  if (!res.ok || body?.error) {
    throw new Error(body?.error?.message ?? `Instagram API xatosi (${res.status})`);
  }
  return body as T;
}

/** Direct yozgan foydalanuvchining profil ma'lumotlari (ruxsat bo'lmasa null). */
export async function getInstagramUserProfile(
  igUserId: string,
  pageAccessToken: string,
): Promise<{ username: string | null; name: string | null }> {
  try {
    const data = await igFetch<{ username?: string; name?: string }>(
      `/${igUserId}`,
      pageAccessToken,
      { params: { fields: "name,username" } },
    );
    return { username: data.username ?? null, name: data.name ?? null };
  } catch {
    return { username: null, name: null };
  }
}

/** Direct orqali matnli javob yuboradi. Yuborilgan xabar ID'sini qaytaradi. */
export async function sendInstagramMessage(params: {
  pageId: string;
  pageAccessToken: string;
  recipientId: string;
  text: string;
}): Promise<{ messageId: string | null }> {
  const data = await igFetch<{ message_id?: string; mid?: string }>(
    `/${params.pageId}/messages`,
    params.pageAccessToken,
    {
      method: "POST",
      body: {
        recipient: { id: params.recipientId },
        message: { text: params.text },
        messaging_type: "RESPONSE",
      },
    },
  );
  return { messageId: data.message_id ?? data.mid ?? null };
}
