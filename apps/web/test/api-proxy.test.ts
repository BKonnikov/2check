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

/**
 * PRD 22.2 — the API limits per caller, and the caller has to be identifiable. Every browser
 * request reaches it through this proxy, so if the proxy says nothing, every visitor is the
 * same caller and the limit protects nobody from anybody.
 */
describe("the proxy tells the API who is calling", () => {
  function captured() {
    const seen: { headers?: Headers } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        seen.headers = new Headers(init.headers);
        return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
      }),
    );
    return seen;
  }

  it("forwards the visitor's address, taken from the left of the chain", async () => {
    const seen = captured();
    await GET(
      new Request("https://2check.uz/api/web/v1/scans/abc", {
        headers: { "x-forwarded-for": "195.158.3.254, 10.222.71.4" },
        // biome-ignore lint/suspicious/noExplicitAny: NextRequest is structurally a Request here.
      }) as any,
      context(["v1", "scans", "abc"]),
    );
    expect(seen.headers?.get("x-forwarded-for")).toBe("195.158.3.254");
  });

  it("overwrites the chain rather than passing a client's own header through", async () => {
    const seen = captured();
    await GET(
      new Request("https://2check.uz/api/web/v1/scans/abc", {
        // A client that invents a chain still only gets its leftmost entry asserted once.
        headers: { "x-forwarded-for": "10.0.0.1, 203.0.113.9, 10.222.71.4" },
        // biome-ignore lint/suspicious/noExplicitAny: NextRequest is structurally a Request here.
      }) as any,
      context(["v1", "scans", "abc"]),
    );
    expect(seen.headers?.get("x-forwarded-for")).toBe("10.0.0.1");
  });

  it("says nothing when no proxy declared the caller", async () => {
    const seen = captured();
    await GET(
      // biome-ignore lint/suspicious/noExplicitAny: NextRequest is structurally a Request here.
      new Request("https://2check.uz/api/web/v1/scans/abc") as any,
      context(["v1", "scans", "abc"]),
    );
    expect(seen.headers?.get("x-forwarded-for")).toBeNull();
  });
});
