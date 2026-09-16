import { describe, expect, it } from "vitest";
import { classifyClient } from "../src/analytics/client.js";
import { cachePublicStats } from "../src/analytics/public-stats.js";
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

/**
 * PRD 28 — the published counters. This is the only read side of analytics that faces the
 * public, so what it may and may not say is worth a test of its own.
 */
describe("PRD 28 — the statistics endpoint", () => {
  const stats = {
    generatedAt: "2026-09-16T00:00:00.000Z",
    scans: { total: 1200, completed: 1180, last30Days: 310, last24Hours: 12 },
    verdicts: { HEALTHY: 800, PROBLEMS: 120 },
    tools: { home: 900, dns: 140, registry: 90, tls: 70 },
    typicalSeconds: 4,
    audience: {
      sessions: 140,
      returningSessions: 22,
      views: 400,
      devices: [{ key: "desktop", sessions: 90 }],
      browsers: [{ key: "chrome", sessions: 80 }],
    },
  };

  it("serves the aggregate and lets it be cached", async () => {
    const instance = buildApp({ env, stats: { read: async () => stats } });
    const response = await instance.inject({ method: "GET", url: "/api/web/v1/stats" });
    expect(response.statusCode).toBe(200);
    expect(response.json().scans.total).toBe(1200);
    // PRD 25.4 forbids a shared cache for a scan; an aggregate that is identical for everyone
    // is exactly the case that exception exists for.
    expect(response.headers["cache-control"]).toContain("max-age");
    await instance.close();
  });

  it("carries no domain, no scanId and nothing per reader", async () => {
    const instance = buildApp({ env, stats: { read: async () => stats } });
    const response = await instance.inject({ method: "GET", url: "/api/web/v1/stats" });
    const body = response.payload;
    for (const forbidden of ["scanId", "domain", "originalInput", "sessionId", "ip"]) {
      expect(body).not.toContain(forbidden);
    }
    await instance.close();
  });

  it("answers 503 rather than an error page when the figures cannot be read", async () => {
    const instance = buildApp({
      env,
      stats: {
        read: async () => {
          throw new Error("no database");
        },
      },
    });
    const response = await instance.inject({ method: "GET", url: "/api/web/v1/stats" });
    expect(response.statusCode).toBe(503);
    await instance.close();
  });

  it("keeps a scan result uncacheable even so", async () => {
    const instance = buildApp({ env });
    const response = await instance.inject({ method: "GET", url: "/api/web/v1/scans/unknown" });
    expect(response.headers["cache-control"]).toBe("no-store");
    await instance.close();
  });
});

describe("the published counters are cached, not queried per visitor", () => {
  it("asks the source once inside the window and serves the last good answer after a failure", async () => {
    let reads = 0;
    let fail = false;
    const source = {
      read: async () => {
        reads += 1;
        if (fail) {
          throw new Error("database gone");
        }
        return {
          generatedAt: new Date().toISOString(),
          scans: { total: reads, completed: 0, last30Days: 0, last24Hours: 0 },
          verdicts: {},
          tools: {},
          typicalSeconds: null,
          audience: { sessions: 0, returningSessions: 0, views: 0, devices: [], browsers: [] },
        };
      },
    };
    const cached = cachePublicStats(source, 60_000);
    await Promise.all([cached.read(), cached.read(), cached.read()]);
    expect(reads).toBe(1);

    // A window that has expired and a source that is now down: the page keeps its numbers.
    const brief = cachePublicStats(source, 0);
    const first = await brief.read();
    fail = true;
    expect((await brief.read()).scans.total).toBe(first.scans.total);
  });
});

/**
 * PRD 28.3 and 28.6 — the client class is read from the User-Agent and the string itself is
 * thrown away. A raw User-Agent names a browser build and an OS patch level; a few of them are
 * unique to one person, and it would otherwise sit in the same row as the session id.
 */
describe("PRD 28.3 — the client is classified, never recorded", () => {
  it.each([
    [
      "iPhone Safari",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      "mobile",
      "safari",
    ],
    [
      "Android Chrome",
      "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      "mobile",
      "chrome",
    ],
    [
      "an Android tablet, which says Android without saying Mobile",
      "Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "tablet",
      "chrome",
    ],
    [
      "iPad",
      "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Safari/604.1",
      "tablet",
      "safari",
    ],
    [
      "desktop Firefox",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
      "desktop",
      "firefox",
    ],
    [
      "Edge, which also says Chrome and Safari",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
      "desktop",
      "edge",
    ],
    [
      "Yandex Browser, which also says Chrome",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 YaBrowser/24.4.0.0 Safari/537.36",
      "desktop",
      "yandex",
    ],
    [
      "Googlebot",
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "bot",
      "other",
    ],
  ])("classifies %s", (_name, agent, deviceKind, browser) => {
    expect(classifyClient(agent)).toEqual({ deviceKind, browser });
  });

  it("has an answer for a request with no User-Agent at all", () => {
    expect(classifyClient(undefined)).toEqual({ deviceKind: "unknown", browser: "other" });
    expect(classifyClient("   ")).toEqual({ deviceKind: "unknown", browser: "other" });
  });

  it("stores the class and never the string it came from", async () => {
    const store = createInMemoryAnalyticsStore();
    const instance = buildApp({ env, analytics: store });
    const agent =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.207 Safari/537.36";
    const response = await instance.inject({
      method: "POST",
      url: "/api/web/v1/events",
      headers: { "user-agent": agent },
      payload: [VALID],
    });
    expect(response.statusCode).toBe(204);
    // The in-memory store keeps the payload, which is the browser's half and has no room for it.
    expect(JSON.stringify(store.events)).not.toContain("537.36");
    expect(analyticsEventSchema.safeParse({ ...VALID, deviceKind: "mobile" }).success).toBe(false);
    await instance.close();
  });
});
