import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../app/api/web/[...path]/route";

/**
 * The proxy forwards the browser's calls to the internal API. It has one sharp edge: a status
 * that may not carry a body. Getting it wrong turned every analytics beacon into a 500 in
 * production, and nothing said so — a beacon has nobody to report an error to.
 */
function context(path: readonly string[]) {
  return { params: Promise.resolve({ path: [...path] }) };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the web API proxy", () => {
  it("passes a 204 through without inventing a body for it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 })),
    );
    const response = await POST(
      new Request("https://2check.uz/api/web/v1/events", {
        method: "POST",
        body: "[]",
        headers: { "content-type": "application/json" },
        // biome-ignore lint/suspicious/noExplicitAny: NextRequest is structurally a Request here.
      }) as any,
      context(["v1", "events"]),
    );
    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  it("still carries the body of an ordinary answer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ scanId: "abc" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    const response = await GET(
      // biome-ignore lint/suspicious/noExplicitAny: NextRequest is structurally a Request here.
      new Request("https://2check.uz/api/web/v1/scans/abc") as any,
      context(["v1", "scans", "abc"]),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ scanId: "abc" });
  });

  it("passes an error status through as the API sent it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { code: "stats_unavailable" } }), { status: 503 }),
      ),
    );
    const response = await GET(
      // biome-ignore lint/suspicious/noExplicitAny: NextRequest is structurally a Request here.
      new Request("https://2check.uz/api/web/v1/stats") as any,
      context(["v1", "stats"]),
    );
    expect(response.status).toBe(503);
  });
});
