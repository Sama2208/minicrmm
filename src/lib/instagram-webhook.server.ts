// Meta Instagram/Messenger webhook endpointi (/api/instagram/webhook).
// createServerFn emas — bu Meta chaqiradigan xom HTTP endpoint.

import { ingestInstagramMessage, type IncomingInstagramMessage } from "./instagram-ingest.server";

type MessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    is_deleted?: boolean;
    attachments?: { type?: string; payload?: { url?: string } }[];
  };
};

type InstagramWebhookPayload = {
  object?: string;
  entry?: { id?: string; time?: number; messaging?: MessagingEvent[] }[];
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
  const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expectedHex = Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expectedHex.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < expectedHex.length; i++) diff |= expectedHex.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}

function toIncoming(entryId: string, ev: MessagingEvent): IncomingInstagramMessage | null {
  const mid = ev.message?.mid;
  if (!mid || ev.message?.is_deleted) return null;
  const senderId = ev.sender?.id ?? "";
  const recipientId = ev.recipient?.id ?? "";
  if (!senderId || !recipientId) return null;

  const attachment = ev.message?.attachments?.[0];
  return {
    entryId,
    senderId,
    recipientId,
    messageId: mid,
    text: ev.message?.text ?? null,
    mediaType: attachment?.type ?? null,
    mediaUrl: attachment?.payload?.url ?? null,
    timestampMs: ev.timestamp ?? Date.now(),
    isEcho: ev.message?.is_echo === true,
    payload: ev,
  };
}

export async function handleInstagramWebhook(request: Request): Promise<Response> {
  if (request.method === "GET") {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expectedToken =
      process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ?? process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;
    if (mode === "subscribe" && challenge && expectedToken && token === expectedToken) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const rawBody = await request.text();
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const signature = request.headers.get("x-hub-signature-256");
  if (!appSecret || !(await verifySignature(rawBody, signature, appSecret))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: InstagramWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  for (const entry of payload.entry ?? []) {
    for (const ev of entry.messaging ?? []) {
      const incoming = toIncoming(entry.id ?? "", ev);
      if (!incoming) continue;
      try {
        await ingestInstagramMessage(incoming);
      } catch (err) {
        console.error("Instagram xabarini qayta ishlashda xato", err);
      }
    }
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
}
