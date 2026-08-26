import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  INSTAGRAM_MESSAGING_FIELDS,
  resolveInstagramEnabled,
  subscribeInstagramAccountToMessaging,
} from "./instagram-graph.server";

const originalFetch = globalThis.fetch;

function mockFetch(response: unknown, ok = true, status = 200) {
  const fn = vi.fn(async () =>
    new Response(JSON.stringify(response), {
      status: ok ? status : status,
      headers: { "content-type": "application/json" },
    }),
  );
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
}

beforeEach(() => {
  process.env.FACEBOOK_APP_SECRET = "test-secret";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("subscribeInstagramAccountToMessaging", () => {
  it("posts to the Instagram professional account subscribed_apps edge", async () => {
    const fetchMock = mockFetch({ success: true });
    const ok = await subscribeInstagramAccountToMessaging("17841400000000000", "page-token");

    expect(ok).toBe(true);
    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const url = new URL(calledUrl);
    expect(init.method).toBe("POST");
    expect(url.origin).toBe("https://graph.instagram.com");
    expect(url.pathname.endsWith("/17841400000000000/subscribed_apps")).toBe(true);
    expect(url.searchParams.get("subscribed_fields")).toBe("messages,messaging_postbacks");
    expect(url.searchParams.get("appsecret_proof")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("does not use the Facebook Page edge (which requires pages_messaging)", async () => {
    const fetchMock = mockFetch({ success: true });
    await subscribeInstagramAccountToMessaging("17841400000000000", "page-token");
    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    expect(calledUrl).not.toContain("graph.facebook.com");
  });

  it("exposes the official Instagram messaging fields", () => {
    expect([...INSTAGRAM_MESSAGING_FIELDS]).toEqual(["messages", "messaging_postbacks"]);
  });

  it("throws the Meta error message when the subscription fails", async () => {
    mockFetch({ error: { message: "(#200) permission missing" } }, false, 403);
    await expect(
      subscribeInstagramAccountToMessaging("17841400000000000", "page-token"),
    ).rejects.toThrow("(#200) permission missing");
  });
});

describe("resolveInstagramEnabled", () => {
  it("is true only when an account exists and the subscription succeeded", () => {
    expect(resolveInstagramEnabled(true, true)).toBe(true);
  });
  it("stays false when the subscription fails", () => {
    expect(resolveInstagramEnabled(true, false)).toBe(false);
  });
  it("stays false when no Instagram account is linked", () => {
    expect(resolveInstagramEnabled(false, true)).toBe(false);
  });
});
