import type { DnsProviderResult, DnsQType, WebScanResponse } from "@2check/contracts";
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { type Env, loadEnv } from "../src/config/env.js";
import { createAdmissionControl } from "../src/scan/admission.js";
import { createInMemoryScanStore } from "../src/scan/store.js";

const env: Env = loadEnv({
  LOG_LEVEL: "silent",
  REDIS_URL: "redis://127.0.0.1:6379",
  DATABASE_URL: "postgres://twocheck:twocheck@127.0.0.1:5432/twocheck",
  APPLICATION_RELEASE_VERSION: "0.0.0-test",
});

async function answering(qname: string): Promise<DnsProviderResult[]> {
  const qtypes: DnsQType[] = ["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA"];
  return qtypes.flatMap((qtype) =>
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
}

/**
 * PRD 22.2 and AC-25.8 — saturation is answered with 429 or 503 and a retry delay, never with
 * unbounded parallelism.
 */
describe("PRD 22.2 — admission control", () => {
  it("refuses a caller who is over their rate, and says when to come back", () => {
    let clock = 0;
    const admission = createAdmissionControl({
      maxConcurrent: 10,
      perMinute: 2,
      now: () => clock,
    });
    expect(admission.admit("1.2.3.4").ok).toBe(true);
    expect(admission.admit("1.2.3.4").ok).toBe(true);

    const refused = admission.admit("1.2.3.4");
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.reason).toBe("rate_limited");
      expect(refused.retryAfterSeconds).toBeGreaterThan(0);
    }

    // Another caller is unaffected: the limit is per client, not global.
    expect(admission.admit("5.6.7.8").ok).toBe(true);

    // And the window slides.
    clock += 60_001;
    expect(admission.admit("1.2.3.4").ok).toBe(true);
  });

  it("refuses everyone with 503 semantics while it is at capacity, and recovers on release", () => {
    const admission = createAdmissionControl({ maxConcurrent: 1, perMinute: 100 });
    const first = admission.admit("1.2.3.4");
    expect(first.ok).toBe(true);
    expect(admission.inFlight()).toBe(1);

    const refused = admission.admit("5.6.7.8");
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.reason).toBe("service_busy");
    }

    if (first.ok) {
      first.release();
      // Releasing twice must not drive the counter below zero.
      first.release();
    }
    expect(admission.inFlight()).toBe(0);
    expect(admission.admit("5.6.7.8").ok).toBe(true);
  });

  it("answers an over-rate POST with 429 and a retry delay", async () => {
    const app = buildApp({
      env,
      dnsQuery: answering,
      admission: createAdmissionControl({ maxConcurrent: 10, perMinute: 1 }),
    });
    const first = await app.inject({
      method: "POST",
      url: "/api/web/v1/scans",
      payload: { input: "example.uz", mode: "FULL" },
    });
    expect(first.statusCode).toBe(202);

    const second = await app.inject({
      method: "POST",
      url: "/api/web/v1/scans",
      payload: { input: "example.uz", mode: "FULL" },
    });
    expect(second.statusCode).toBe(429);
    expect(second.json().errorCode).toBe("rate_limited");
    expect(second.json().retryable).toBe(true);
    expect(second.json().retryAfterSeconds).toBeGreaterThan(0);
    await app.close();
  });

  it("does not spend the caller's allowance on a request it never accepted", async () => {
    const app = buildApp({
      env,
      dnsQuery: answering,
      admission: createAdmissionControl({ maxConcurrent: 10, perMinute: 1 }),
    });
    const rejected = await app.inject({
      method: "POST",
      url: "/api/web/v1/scans",
      payload: { input: "", mode: "FULL" },
    });
    expect(rejected.statusCode).toBe(400);

    const accepted = await app.inject({
      method: "POST",
      url: "/api/web/v1/scans",
      payload: { input: "example.uz", mode: "FULL" },
    });
    expect(accepted.statusCode).toBe(202);
    await app.close();
  });
});

/**
 * PRD 16.7 and AC-22.2 — an accepted scan may not stay RUNNING for ever. What finished is kept;
 * what did not is UNKNOWN with scan_deadline_exceeded, and the scan is COMPLETED with a reason.
 */
describe("PRD 16.7 — the overall scan deadline", () => {
  it("terminalises a scan whose work outlives its budget", async () => {
    const app = buildApp({
      env,
      scanDeadlineMs: 20,
      dnsQuery: async (qname: string) => {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return answering(qname);
      },
    });
    const created = await app.inject({
      method: "POST",
      url: "/api/web/v1/scans",
      payload: { input: "example.uz", mode: "FULL" },
    });
    const scanId = created.json().scanId as string;

    let body: WebScanResponse | undefined;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const response = await app.inject({ method: "GET", url: `/api/web/v1/scans/${scanId}` });
      body = response.json() as WebScanResponse;
      if (body.executionState === "COMPLETED" || body.executionState === "FAILED") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Not FAILED: the scan produced a trustworthy result for everything it managed to check.
    expect(body?.executionState).toBe("COMPLETED");
    expect(body?.completionReason).toBe("DEADLINE_TERMINALIZED");
    expect(body?.categories.length).toBe(3);
    const checks = body?.categories.flatMap((category) => category.checks) ?? [];
    expect(checks.some((check) => check.reasonCode === "scan_deadline_exceeded")).toBe(true);
    // AC-23.4 — nothing the deadline interrupted is reported as a confirmed problem.
    expect(checks.every((check) => check.status !== "FAIL")).toBe(true);
    await app.close();
  });
});

/** AC-16.9 — a scan the previous process left running is closed, not left to poll for ever. */
describe("AC-16.9 — recovery of interrupted executions", () => {
  it("closes what was left running and leaves terminal records alone", async () => {
    const store = createInMemoryScanStore();
    const base = {
      mode: "FULL" as const,
      cacheMode: "NORMAL" as const,
      visibleCategories: ["dns"] as const,
      canonicalDomain: {
        inputType: "HOSTNAME" as const,
        unicodeHostname: "example.uz",
        asciiHostname: "example.uz",
        publicSuffix: "uz",
        publicSuffixType: "ICANN" as const,
        registrableDomain: "example.uz",
        isIdn: false,
      },
      executionContext: {
        healthPolicyVersion: "t",
        securityPolicyVersion: "t",
        orchestrationConfigVersion: "t",
        cacheContractVersion: "t",
        resolverSetVersion: "t",
        dnsModuleConfigVersion: "t",
        registryModuleConfigVersion: "t",
        tlsModuleConfigVersion: "t",
        trustStoreVersion: "t",
      },
      startedAt: "2026-09-15T00:00:00.000Z",
      categories: [],
    };
    await store.create({ ...base, scanId: "running", executionState: "RUNNING" });
    await store.create({ ...base, scanId: "done", executionState: "RUNNING" });
    await store.save({ ...base, scanId: "done", executionState: "COMPLETED" });

    expect(await store.recoverInterrupted()).toBe(1);

    const recovered = await store.get("running");
    expect(recovered?.executionState).toBe("FAILED");
    expect(recovered?.failure?.failureCode).toBe("execution_state_unrecoverable");
    expect((await store.get("done"))?.executionState).toBe("COMPLETED");

    // Running it again finds nothing left to close.
    expect(await store.recoverInterrupted()).toBe(0);
  });
});
