import { describe, expect, it } from "vitest";
import { createInMemoryAnalyticsStore } from "../src/analytics/store.js";
import { buildApp } from "../src/app.js";
import { type Env, loadEnv } from "../src/config/env.js";
import { analyticsEventSchema } from "../src/routes/events.js";

const env: Env = loadEnv({
  LOG_LEVEL: "silent",
  REDIS_URL: "redis://127.0.0.1:6379",
  DATABASE_URL: "postgres://twocheck:twocheck@127.0.0.1:5432/twocheck",
  APPLICATION_RELEASE_VERSION: "0.0.0-test",
});

const VALID = { event: "scan_form_viewed", locale: "ru", tool: "home" } as const;

/**
 * PRD 28.4 and AC-28.3 — the schema is the boundary. Everything forbidden is forbidden because
 * there is nowhere to put it, and a payload that tries is rejected rather than trimmed.
 */
describe("AC-28.3 — analytics carries no target data", () => {
  it.each([
    ["domain", { domain: "example.uz" }],
    ["scanId", { scanId: "3f2a6d1e-0000-4000-8000-1234567890ab" }],
    ["originalInput", { originalInput: "https://example.uz/page" }],
    ["an IP address", { ip: "93.184.216.34" }],
    ["a certificate fingerprint", { fingerprint256: "AA:BB" }],
    ["a DNS value", { answers: ["93.184.216.34"] }],
    ["registrant data", { registrant: "Ivan Ivanov" }],
  ])("rejects a payload carrying %s", (_name, extra) => {
    expect(analyticsEventSchema.safeParse({ ...VALID, ...extra }).success).toBe(false);
  });

  it("accepts only the dimensions PRD 28.3 allows", () => {
    expect(
      analyticsEventSchema.safeParse({
        event: "scan_result_viewed",
        locale: "uz",
        tool: "tls",
        mode: "PARTIAL",
        scope: "tls",
        outcome: "COMPLETED",
        verdictCode: "HEALTHY",
        sessionId: "3f2a6d1e-0000-4000-8000-1234567890ab",
        returning: true,
      }).success,
    ).toBe(true);
  });

  it("refuses an event name or a dimension outside its enumeration", () => {
    expect(analyticsEventSchema.safeParse({ ...VALID, event: "anything" }).success).toBe(false);
    expect(analyticsEventSchema.safeParse({ ...VALID, locale: "de" }).success).toBe(false);
    expect(analyticsEventSchema.safeParse({ ...VALID, tool: "/ru/scan/abc" }).success).toBe(false);
    // PRD 28.6 — the session value is an opaque id, never something a caller can put meaning in.
    expect(analyticsEventSchema.safeParse({ ...VALID, sessionId: "user@example.uz" }).success).toBe(
      false,
    );
  });
});

describe("PRD 28 — the collection endpoint", () => {
  it("records a batch and answers 204", async () => {
    const analytics = createInMemoryAnalyticsStore();
    const app = buildApp({ env, analytics });
    const response = await app.inject({
      method: "POST",
      url: "/api/web/v1/events",
      payload: [VALID, { ...VALID, event: "scan_submitted" }],
    });
    expect(response.statusCode).toBe(204);
    expect(analytics.events.map((event) => event.event)).toEqual([
      "scan_form_viewed",
      "scan_submitted",
    ]);
    await app.close();
  });

  it("answers 204 for a malformed batch and stores nothing", async () => {
    const analytics = createInMemoryAnalyticsStore();
    const app = buildApp({ env, analytics });
    const response = await app.inject({
      method: "POST",
      url: "/api/web/v1/events",
      payload: [{ event: "scan_form_viewed", locale: "ru", tool: "home", domain: "example.uz" }],
    });
    expect(response.statusCode).toBe(204);
    expect(analytics.events).toHaveLength(0);
    await app.close();
  });

  it("caps how much one request may post", async () => {
    const analytics = createInMemoryAnalyticsStore();
    const app = buildApp({ env, analytics });
    const response = await app.inject({
      method: "POST",
      url: "/api/web/v1/events",
      payload: Array.from({ length: 50 }, () => VALID),
    });
    expect(response.statusCode).toBe(204);
    expect(analytics.events).toHaveLength(0);
    await app.close();
  });

  /** AC-28.6 — a domain check does not depend on analytics in any way. */
  it("completes a scan even when every analytics write fails", async () => {
    const failing = {
      record: async () => {
        throw new Error("analytics is down");
      },
      report: async () => {
        throw new Error("analytics is down");
      },
      prune: async () => 0,
    };
    const app = buildApp({ env, analytics: failing });
    const beacon = await app.inject({
      method: "POST",
      url: "/api/web/v1/events",
      payload: [VALID],
    });
    expect(beacon.statusCode).toBe(204);

    const created = await app.inject({
      method: "POST",
      url: "/api/web/v1/scans",
      payload: { input: "example.uz", mode: "FULL" },
    });
    expect(created.statusCode).toBe(202);
    await app.close();
  });
});
