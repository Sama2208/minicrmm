import { describe, expect, it } from "vitest";
import { hashFacebookUserId, parseFacebookDataDeletionSignedRequest } from "./facebook-privacy.server";

function base64Url(value: Uint8Array | string): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function createSignedRequest(payload: Record<string, unknown>, secret: string): Promise<string> {
  const encodedPayload = base64Url(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload)),
  );
  return `${base64Url(signature)}.${encodedPayload}`;
}

describe("Facebook data deletion signed request", () => {
  it("accepts a correctly signed Meta data-deletion payload", async () => {
    const signedRequest = await createSignedRequest(
      { algorithm: "HMAC-SHA256", user_id: "facebook-user-123" },
      "test-secret",
    );

    await expect(parseFacebookDataDeletionSignedRequest(signedRequest, "test-secret")).resolves.toEqual({
      userId: "facebook-user-123",
    });
  });

  it("rejects a payload signed with another secret", async () => {
    const signedRequest = await createSignedRequest(
      { algorithm: "HMAC-SHA256", user_id: "facebook-user-123" },
      "test-secret",
    );

    await expect(parseFacebookDataDeletionSignedRequest(signedRequest, "wrong-secret")).resolves.toBeNull();
  });

  it("rejects a non-HMAC-SHA256 payload", async () => {
    const signedRequest = await createSignedRequest(
      { algorithm: "HMAC-SHA1", user_id: "facebook-user-123" },
      "test-secret",
    );

    await expect(parseFacebookDataDeletionSignedRequest(signedRequest, "test-secret")).resolves.toBeNull();
  });

  it("stores a deterministic non-raw identifier for Facebook users", async () => {
    const firstHash = await hashFacebookUserId("facebook-user-123");
    const secondHash = await hashFacebookUserId("facebook-user-123");
    expect(firstHash).toMatch(/^[0-9a-f]{64}$/);
    expect(firstHash).toEqual(secondHash);
  });
});
