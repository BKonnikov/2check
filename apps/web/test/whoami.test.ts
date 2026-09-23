import { describe, expect, it } from "vitest";
import { GET } from "../app/api/whoami/route";

/**
 * PRD 28.4 — an IP address has no place in analytics, and this endpoint does not put it there.
 * It answers the caller with the caller's own address and keeps nothing. These tests police the
 * one thing that could go wrong quietly: answering with somebody else's address.
 */
function request(headers: Record<string, string>) {
  // biome-ignore lint/suspicious/noExplicitAny: NextRequest is structurally a Request here.
  return new Request("https://2check.uz/api/whoami", { headers }) as any;
}

describe("the visitor's own address", () => {
  it("answers with the single address our nginx forwards", async () => {
    // deploy/nginx.example.conf resolves the client with the real_ip module and passes that one
    // address on, so nothing a client invented reaches us in our own deployment.
    const response = await GET(request({ "x-forwarded-for": "195.158.3.254" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ address: "195.158.3.254" });
  });

  it("takes the client from the left of the chain when a proxy appends hops", async () => {
    // Behind a proxy that appends rather than replaces, the rightmost entries are its own
    // machines and the leftmost is the client as the first proxy saw it.
    const response = await GET(
      request({ "x-forwarded-for": "195.158.3.254, 10.222.71.4, 10.222.77.254" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ address: "195.158.3.254" });
  });

  it("falls back to X-Real-IP for a deployment that sets only that", async () => {
    const response = await GET(request({ "x-real-ip": "2a00:1450:4001:80f::200e" }));
    expect(await response.json()).toEqual({ address: "2a00:1450:4001:80f::200e" });
  });

  it("says nothing rather than guessing when no proxy declared the caller", async () => {
    const response = await GET(request({}));
    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  it("is never held by a shared cache", async () => {
    const response = await GET(request({ "x-forwarded-for": "195.158.3.254" }));
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("cache-control")).toContain("private");
  });
});
