import { afterEach, describe, expect, it, vi } from "vitest";
import { listPagesForUser } from "./facebook-graph.server";

const originalFetch = globalThis.fetch;
const originalAppSecret = process.env.FACEBOOK_APP_SECRET;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalAppSecret === undefined) delete process.env.FACEBOOK_APP_SECRET;
  else process.env.FACEBOOK_APP_SECRET = originalAppSecret;
  vi.restoreAllMocks();
});

describe("listPagesForUser", () => {
  it("requests a fresh Page access token explicitly", async () => {
    process.env.FACEBOOK_APP_SECRET = "test-secret";
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [{ id: "page-1", name: "Clinic", access_token: "fresh-page-token" }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(listPagesForUser("user-token")).resolves.toEqual([
      { id: "page-1", name: "Clinic", access_token: "fresh-page-token" },
    ]);

    const [calledUrl] = fetchMock.mock.calls[0] as unknown as [string];
    expect(new URL(calledUrl).searchParams.get("fields")).toBe("id,name,access_token");
  });

  it("fails clearly when Meta omits the Page access token", async () => {
    process.env.FACEBOOK_APP_SECRET = "test-secret";
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ id: "page-1", name: "Clinic" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    await expect(listPagesForUser("user-token")).rejects.toThrow(
      "Meta Page access tokenni qaytarmadi",
    );
  });
});
