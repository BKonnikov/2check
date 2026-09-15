import type { DnsProviderResult, DnsQType, WebScanResponse } from "@2check/contracts";
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { createInMemoryCache, createSingleFlight } from "../src/cache/reusable-cache.js";
import { type Env, loadEnv } from "../src/config/env.js";

const env: Env = loadEnv({
  LOG_LEVEL: "silent",
  REDIS_URL: "redis://127.0.0.1:6379",
  DATABASE_URL: "postgres://twocheck:twocheck@127.0.0.1:5432/twocheck",
  APPLICATION_RELEASE_VERSION: "0.0.0-test",
});

const QTYPES: DnsQType[] = ["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA"];

function countingQuery() {
  let calls = 0;
  const query = async (qname: string): Promise<DnsProviderResult[]> => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return QTYPES.flatMap((qtype) =>
      ["google", "cloudflare"].map((provider) => ({
        provider,
        qname,
        qtype,
        transportStatus: "SUCCESS" as const,
        rcode: "NOERROR" as const,
        outcome: qtype === "A" ? ("ANSWER" as const) : ("NODATA" as const),
        answers: qtype === "A" ? [{ type: qtype, value: "93.184.216.34", ttl: 300 }] : [],
        authority: [],
        receivedAt: "2026-09-15T00:00:00.000Z",
      })),
    );
  };
  return { query, calls: () => calls };
}

function harness() {
  const counting = countingQuery();
  const app = buildApp({
    env,
    dnsQuery: counting.query,
    cache: createInMemoryCache(),
    singleFlight: createSingleFlight(),
  });
  return { app, calls: counting.calls };
}

async function scan(app: ReturnType<typeof buildApp>, cacheMode?: string) {
  const created = await app.inject({
    method: "POST",
    url: "/api/web/v1/scans",
    payload: {
      input: "example.uz",
      mode: "PARTIAL",
      selectedCategories: ["dns"],
      ...(cacheMode === undefined ? {} : { cacheMode }),
    },
  });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const response = await app.inject({
      method: "GET",
      url: `/api/web/v1/scans/${created.json().scanId}`,
    });
    const body: WebScanResponse = response.json();
    if (body.executionState === "COMPLETED" || body.executionState === "FAILED") {
      return body;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("scan did not terminate");
}

describe("PRD 14.2 — cache modes", () => {
  it("reuses a compatible entry on a NORMAL scan", async () => {
    const { app, calls } = harness();
    await scan(app);
    const second = await scan(app);
    expect(calls()).toBe(1);
    expect(second.categories[0]?.checks[0]?.freshness.cached).toBe(true);
    await app.close();
  });

  it("AC-6.5 — a cached result keeps its original observation time", async () => {
    const { app } = harness();
    await scan(app);
    const second = await scan(app);
    const freshness = second.categories[0]?.checks[0]?.freshness;
    expect(freshness?.checkedAt).toBe("2026-09-15T00:00:00.000Z");
    expect(freshness?.cached).toBe(true);
    await app.close();
  });

  it("AC-14.2 — FORCE_REFRESH retrieves again and writes, without clearing the cache", async () => {
    const { app, calls } = harness();
    await scan(app);
    const refreshed = await scan(app, "FORCE_REFRESH");
    expect(calls()).toBe(2);
    expect(refreshed.categories[0]?.checks[0]?.freshness.cached).toBe(false);

    // AC-14.3 — a later NORMAL scan reuses what the refresh stored, so nothing was flushed.
    const afterwards = await scan(app);
    expect(calls()).toBe(2);
    expect(afterwards.categories[0]?.checks[0]?.freshness.cached).toBe(true);
    await app.close();
  });

  it("AC-14.3 — sequential FORCE_REFRESH scans each execute again", async () => {
    const { app, calls } = harness();
    await scan(app, "FORCE_REFRESH");
    await scan(app, "FORCE_REFRESH");
    expect(calls()).toBe(2);
    await app.close();
  });
});

describe("PRD 14.7 and AC-14.8 — single-flight", () => {
  it("coalesces concurrent identical retrievals into one execution", async () => {
    const { app, calls } = harness();
    const [first, second] = await Promise.all([scan(app), scan(app)]);
    expect(calls()).toBe(1);
    // The scans stay separate identities even though they shared one retrieval.
    expect(first.scanId).not.toBe(second.scanId);
    await app.close();
  });
});
