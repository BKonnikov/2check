import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { type Env, loadEnv } from "../src/config/env.js";

const env: Env = loadEnv({
  LOG_LEVEL: "silent",
  REDIS_URL: "redis://127.0.0.1:6379",
  DATABASE_URL: "postgres://twocheck:twocheck@127.0.0.1:5432/twocheck",
  APPLICATION_RELEASE_VERSION: "0.0.0-test",
});

const SCAN_ID = "11111111-2222-4333-8444-555555555555";

describe("AC-25.2 — a scanId alone does not unlock registrant data", () => {
  it("refuses the gated resource and returns no registrant data", async () => {
    const app = buildApp({ env });
    const response = await app.inject({
      method: "GET",
      url: `/api/web/v1/scans/${SCAN_ID}/registry/registrant`,
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().errorCode).toBe("gated_access_denied");
    expect(response.body).not.toMatch(/name|email|phone|address/i);
    await app.close();
  });
});

describe("AC-25.3 — there is no way to enumerate scans", () => {
  it.each(["/api/web/v1/scans", "/api/web/v1/scans?limit=10", "/api/web/v1/scans/search"])(
    "does not serve %s",
    async (url) => {
      const app = buildApp({ env });
      const response = await app.inject({ method: "GET", url });
      expect(response.statusCode).toBe(404);
      await app.close();
    },
  );
});

describe("AC-25.4 — scan identifiers and their exposure", () => {
  it("answers an unknown identifier with a plain 404", async () => {
    const app = buildApp({ env });
    const response = await app.inject({ method: "GET", url: `/api/web/v1/scans/${SCAN_ID}` });
    expect(response.statusCode).toBe(404);
    expect(response.json().errorCode).toBe("scan_not_found");
    await app.close();
  });

  it("sends no-referrer, so a scan URL cannot leak to another origin", async () => {
    const app = buildApp({ env });
    const response = await app.inject({ method: "GET", url: "/healthz" });
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["cache-control"]).toBe("no-store");
    await app.close();
  });

  it("issues opaque, non-sequential identifiers", async () => {
    const app = buildApp({
      env,
      dnsQuery: async () => [],
      registryLookup: async () => [],
    });
    const ids: string[] = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const created = await app.inject({
        method: "POST",
        url: "/api/web/v1/scans",
        payload: { input: "example.uz", mode: "PARTIAL", selectedCategories: ["dns"] },
      });
      ids.push(created.json().scanId);
    }
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
    // Consecutive identifiers share no ordering a guesser could walk.
    expect(ids[0]?.slice(0, 8)).not.toBe(ids[1]?.slice(0, 8));
    await app.close();
  });
});
