import type { DnsProviderResult, DnsQType, WebScanResponse } from "@2check/contracts";
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { type Env, loadEnv } from "../src/config/env.js";

const env: Env = loadEnv({
  LOG_LEVEL: "silent",
  REDIS_URL: "redis://127.0.0.1:6379",
  DATABASE_URL: "postgres://twocheck:twocheck@127.0.0.1:5432/twocheck",
  APPLICATION_RELEASE_VERSION: "0.0.0-test",
});

/** Golden fixture: two resolvers agree the name exists with one address. */
async function fixtureQuery(qname: string): Promise<DnsProviderResult[]> {
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

function app() {
  return buildApp({ env, dnsQuery: fixtureQuery });
}

async function createScan(instance: ReturnType<typeof app>, payload: unknown) {
  return instance.inject({ method: "POST", url: "/api/web/v1/scans", payload });
}

describe("AC-17.1 and AC-17.3 — POST only acknowledges acceptance", () => {
  it("returns 202 with a non-terminal state", async () => {
    const instance = app();
    const response = await createScan(instance, {
      input: "example.uz",
      mode: "PARTIAL",
      selectedCategories: ["dns"],
    });
    expect(response.statusCode).toBe(202);
    const body = response.json();
    expect(["PENDING", "RUNNING"]).toContain(body.executionState);
    expect(body.scanId).toBeTypeOf("string");
    await instance.close();
  });
});

describe("AC-16.1 — invalid input creates no scanId", () => {
  it.each([
    ["192.168.1.1", "input_ip_address"],
    ["uz", "input_single_label"],
    ["user@example.uz", "input_email_address"],
  ])("rejects %s with 400 and no scanId", async (input, errorCode) => {
    const instance = app();
    const response = await createScan(instance, {
      input,
      mode: "PARTIAL",
      selectedCategories: ["dns"],
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().errorCode).toBe(errorCode);
    expect(response.json().scanId).toBeUndefined();
    await instance.close();
  });
});

describe("PRD 17.2 and 17.9 — request validation", () => {
  it("rejects an unknown top-level field", async () => {
    const instance = app();
    const response = await createScan(instance, {
      input: "example.uz",
      mode: "PARTIAL",
      selectedCategories: ["dns"],
      skipSSRF: true,
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().errorCode).toBe("request_invalid");
    await instance.close();
  });

  it("rejects an invalid enum value", async () => {
    const instance = app();
    const response = await createScan(instance, { input: "example.uz", mode: "EVERYTHING" });
    expect(response.statusCode).toBe(400);
    await instance.close();
  });

  it("rejects PARTIAL with all three categories as an invalid scope", async () => {
    const instance = app();
    const response = await createScan(instance, {
      input: "example.uz",
      mode: "PARTIAL",
      selectedCategories: ["dns", "registry", "tls"],
    });
    expect(response.statusCode).toBe(422);
    await instance.close();
  });

  it("rejects FULL that also carries selectedCategories", async () => {
    const instance = app();
    const response = await createScan(instance, {
      input: "example.uz",
      mode: "FULL",
      selectedCategories: ["dns"],
    });
    expect(response.statusCode).toBe(400);
    await instance.close();
  });

  it("refuses a scope this deployment cannot execute instead of narrowing it", async () => {
    const instance = app();
    const response = await createScan(instance, { input: "example.uz", mode: "FULL" });
    expect(response.statusCode).toBe(503);
    expect(response.json().errorCode).toBe("scan_scope_not_available");
    await instance.close();
  });
});

describe("AC-17.2 and AC-17.4 — the authoritative result is read through GET", () => {
  it("reaches COMPLETED and reports the DNS category", async () => {
    const instance = app();
    const created = await createScan(instance, {
      input: "example.uz",
      mode: "PARTIAL",
      selectedCategories: ["dns"],
    });
    const { scanId } = created.json();

    let body: WebScanResponse | undefined;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const response = await instance.inject({ method: "GET", url: `/api/web/v1/scans/${scanId}` });
      expect(response.statusCode).toBe(200);
      body = response.json();
      if (body?.executionState === "COMPLETED" || body?.executionState === "FAILED") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    expect(body?.executionState).toBe("COMPLETED");
    expect(body?.categories).toHaveLength(1);
    expect(body?.categories[0]?.category).toBe("dns");
    expect(body?.categories[0]?.status).toBe("PASS");
    await instance.close();
  });

  it("does not expose originalInput in the public canonical domain", async () => {
    const instance = app();
    const created = await createScan(instance, {
      input: "HTTPS://EXAMPLE.UZ/path",
      mode: "PARTIAL",
      selectedCategories: ["dns"],
    });
    const response = await instance.inject({
      method: "GET",
      url: `/api/web/v1/scans/${created.json().scanId}`,
    });
    expect(response.json().canonicalDomain.originalInput).toBeUndefined();
    expect(response.json().canonicalDomain.asciiHostname).toBe("example.uz");
    await instance.close();
  });

  it("returns 404 for an unknown scan", async () => {
    const instance = app();
    const response = await instance.inject({
      method: "GET",
      url: "/api/web/v1/scans/00000000-0000-0000-0000-000000000000",
    });
    expect(response.statusCode).toBe(404);
    await instance.close();
  });
});
