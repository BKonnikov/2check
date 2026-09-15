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

/** The four resolvers the default set queries (PRD 8.1). */
const RESOLVERS = ["google", "cloudflare", "yandex-basic", "quad9-unfiltered"] as const;

/** Golden fixture: RDAP answers determinately, so WHOIS is never consulted (AC-9.1). */
async function fixtureRegistry(registryDomain: string) {
  return [
    {
      transport: "RDAP" as const,
      registration: {
        registryDomain,
        registrar: "UZINFOCOM",
        createdAt: "2005-05-01T00:00:00Z",
        expiresAt: "2030-01-01T00:00:00Z",
        nameServers: ["ns.uz"],
        status: "ACTIVE" as const,
        rawStatus: ["active"],
        registrant: {
          name: { state: "value" as const },
          email: { state: "redacted" as const },
          phone: { state: "unavailable" as const },
          address: { state: "value" as const },
        },
        freshness: { checkedAt: "2026-09-15T00:00:00.000Z", cached: false, cacheAge: 0 },
      },
      confirmedNotRegistered: false,
    },
  ];
}

/** Golden fixture: one IPv4 endpoint answering with a valid certificate. */
async function fixtureTlsProbe(address: string) {
  return {
    kind: "CONNECTED" as const,
    address,
    protocol: "TLSv1.3",
    certificate: {
      subject: "example.uz",
      issuer: "Test CA",
      validFrom: "2026-01-01T00:00:00.000Z",
      validTo: "2027-01-01T00:00:00.000Z",
      subjectAltNames: ["DNS:example.uz"],
      fingerprint256: "AA:BB",
      selfSigned: false,
      chainVerification: "TRUSTED",
    },
  };
}

function app() {
  return buildApp({
    env,
    dnsQuery: fixtureQuery,
    registryLookup: fixtureRegistry,
    tlsProbe: fixtureTlsProbe,
  });
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

  it("accepts FULL now that every category is implemented", async () => {
    const instance = app();
    const response = await createScan(instance, { input: "example.uz", mode: "FULL" });
    expect(response.statusCode).toBe(202);
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

describe("PRD 9 — the registry category through the API", () => {
  it("reports registry alongside dns and keeps registrant values out of the response", async () => {
    const instance = app();
    const created = await createScan(instance, {
      input: "example.uz",
      mode: "PARTIAL",
      selectedCategories: ["dns", "registry"],
    });
    expect(created.statusCode).toBe(202);

    let body: WebScanResponse | undefined;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const response = await instance.inject({
        method: "GET",
        url: `/api/web/v1/scans/${created.json().scanId}`,
      });
      body = response.json();
      if (body?.executionState === "COMPLETED" || body?.executionState === "FAILED") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    expect(body?.executionState).toBe("COMPLETED");
    expect(body?.categories.map((category) => category.category)).toEqual(["dns", "registry"]);

    const registry = body?.categories.find((category) => category.category === "registry");
    expect(registry?.status).toBe("PASS");
    expect(registry?.checks[0]?.checkId).toBe("registry.lookup");
    expect(JSON.stringify(body)).not.toContain("@");
    await instance.close();
  });

  it("answers provider_not_supported for a zone outside .uz", async () => {
    const instance = app();
    const created = await createScan(instance, {
      input: "example.com",
      mode: "PARTIAL",
      selectedCategories: ["registry"],
    });

    let body: WebScanResponse | undefined;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const response = await instance.inject({
        method: "GET",
        url: `/api/web/v1/scans/${created.json().scanId}`,
      });
      body = response.json();
      if (body?.executionState === "COMPLETED" || body?.executionState === "FAILED") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    const check = body?.categories[0]?.checks[0];
    expect(check?.status).toBe("UNKNOWN");
    expect(check?.reasonCode).toBe("provider_not_supported");
    expect(check?.source).toBeUndefined();
    await instance.close();
  });
});

describe("PRD 10 and 16 — the TLS category through the API", () => {
  async function complete(instance: ReturnType<typeof app>, payload: unknown) {
    const created = await createScan(instance, payload);
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const response = await instance.inject({
        method: "GET",
        url: `/api/web/v1/scans/${created.json().scanId}`,
      });
      const body: WebScanResponse = response.json();
      if (body.executionState === "COMPLETED" || body.executionState === "FAILED") {
        return body;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error("scan did not terminate");
  }

  it("runs all three categories on a FULL scan", async () => {
    const instance = app();
    const body = await complete(instance, { input: "example.uz", mode: "FULL" });
    expect(body.executionState).toBe("COMPLETED");
    expect(body.categories.map((category) => category.category)).toEqual([
      "dns",
      "registry",
      "tls",
    ]);
    const tls = body.categories.find((category) => category.category === "tls");
    expect(tls?.status).toBe("PASS");
    expect(tls?.checks.map((check) => check.checkId)).toEqual([
      "tls.connection.ipv4",
      "tls.connection.ipv6",
      "tls.certificate.validity",
      "tls.certificate.hostname",
      "tls.certificate.chain",
    ]);
    await instance.close();
  });

  it("AC-16.3 — a TLS-only PARTIAL scan runs its DNS prerequisite without a visible DNS category", async () => {
    const instance = app();
    const body = await complete(instance, {
      input: "example.uz",
      mode: "PARTIAL",
      selectedCategories: ["tls"],
    });
    expect(body.categories.map((category) => category.category)).toEqual(["tls"]);
    expect(body.categories[0]?.status).toBe("PASS");
    await instance.close();
  });

  it("AC-10.5 — the absent IPv6 family is N/A rather than a failure", async () => {
    const instance = app();
    const body = await complete(instance, {
      input: "example.uz",
      mode: "PARTIAL",
      selectedCategories: ["tls"],
    });
    const ipv6 = body.categories[0]?.checks.find(
      (check) => check.checkId === "tls.connection.ipv6",
    );
    expect(ipv6?.status).toBe("NOT_APPLICABLE");
    await instance.close();
  });
});

describe("PRD 11 and 12 — the summary through the API", () => {
  async function complete(instance: ReturnType<typeof app>, payload: unknown) {
    const created = await createScan(instance, payload);
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const response = await instance.inject({
        method: "GET",
        url: `/api/web/v1/scans/${created.json().scanId}`,
      });
      const body: WebScanResponse = response.json();
      if (body.executionState === "COMPLETED" || body.executionState === "FAILED") {
        return body;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error("scan did not terminate");
  }

  it("carries a verdict, a confidence level and a score on a FULL scan", async () => {
    const instance = app();
    const body = await complete(instance, { input: "example.uz", mode: "FULL" });
    expect(body.summary?.state).toBe("FINAL");
    expect(body.summary?.verdictCode).toBeDefined();
    expect(body.summary?.confidence.level).toBeDefined();
    expect(typeof body.summary?.score).toBe("number");
    await instance.close();
  });

  it("AC-3.5 and AC-12.1 — a PARTIAL scan gets neither an overall verdict nor a score", async () => {
    const instance = app();
    const body = await complete(instance, {
      input: "example.uz",
      mode: "PARTIAL",
      selectedCategories: ["dns"],
    });
    // Both are statements about the whole domain, and a PARTIAL scan looked at one category.
    expect(body.summary?.verdictCode).toBeUndefined();
    expect(body.summary?.score).toBeUndefined();
    // The category it did run is still reported in full.
    expect(body.summary?.state).toBe("FINAL");
    expect(body.categories.map((category) => category.category)).toEqual(["dns"]);
    await instance.close();
  });

  it("AC-11.2 — checks that are UNKNOWN produce no issues", async () => {
    const instance = buildApp({
      env,
      dnsQuery: async (qname: string) =>
        (["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA"] as const).map((qtype) => ({
          provider: "google",
          qname,
          qtype,
          transportStatus: "NETWORK_ERROR" as const,
          answers: [],
          authority: [],
          receivedAt: "2026-09-15T00:00:00.000Z",
        })),
      registryLookup: fixtureRegistry,
      tlsProbe: fixtureTlsProbe,
    });
    // FULL, because AC-3.5 keeps the overall verdict out of a PARTIAL scan entirely.
    const body = await complete(instance, { input: "example.uz", mode: "FULL" });
    expect(body.summary?.issues).toEqual([]);
    expect(body.summary?.confidence.level).toBe("REDUCED");
    expect(body.summary?.verdictCode).toBe("NO_CONFIRMED_ISSUES_INCOMPLETE");
    await instance.close();
  });

  /**
   * AC-8.8 and PRD 8.9 — insufficient agreement among the resolvers does not permit a TLS
   * connection, even when one of them did return an address.
   */
  it("AC-8.8 — one resolver answering is not enough to open a TLS connection", async () => {
    let probed = 0;
    const instance = buildApp({
      env,
      dnsQuery: async (qname: string) =>
        RESOLVERS.map((provider, index) =>
          index === 0
            ? {
                provider,
                qname,
                qtype: "A" as const,
                transportStatus: "SUCCESS" as const,
                rcode: "NOERROR" as const,
                answers: [{ name: qname, type: "A" as const, value: "93.184.216.34", ttl: 300 }],
                authority: [],
                receivedAt: "2026-09-15T00:00:00.000Z",
              }
            : {
                provider,
                qname,
                qtype: "A" as const,
                transportStatus: "TIMEOUT" as const,
                answers: [],
                authority: [],
                receivedAt: "2026-09-15T00:00:00.000Z",
              },
        ),
      registryLookup: fixtureRegistry,
      tlsProbe: async (address: string) => {
        probed += 1;
        return fixtureTlsProbe(address);
      },
    });
    const body = await complete(instance, {
      input: "example.uz",
      mode: "PARTIAL",
      selectedCategories: ["tls"],
    });
    expect(probed).toBe(0);
    const tls = body.categories.find((category) => category.category === "tls");
    expect(tls?.status).toBe("UNKNOWN");
    expect(tls?.checks.every((check) => check.status !== "PASS" && check.status !== "FAIL")).toBe(
      true,
    );
    expect(tls?.checks.some((check) => check.reasonCode === "dns_quorum_not_reached")).toBe(true);
    await instance.close();
  });
});

/**
 * PRD 6.4 — the two exposure levels. The public result is the ordinary view; the measurements
 * behind it live at /details, behind an explicit list of permitted fields.
 */
describe("PRD 6.4 and 23.6 — Public and Technical exposure", () => {
  async function scan(instance: ReturnType<typeof app>) {
    const created = await createScan(instance, { input: "example.uz", mode: "FULL" });
    const scanId = created.json().scanId as string;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const response = await instance.inject({
        method: "GET",
        url: `/api/web/v1/scans/${scanId}`,
      });
      const body = response.json();
      if (body.executionState === "COMPLETED" || body.executionState === "FAILED") {
        return { scanId, body };
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("scan did not finish");
  }

  it("AC-6.4 — the public result serialises no internal DTO field", async () => {
    const instance = app();
    const { body } = await scan(instance);
    for (const category of body.categories) {
      for (const check of category.checks) {
        // target, source and details are the Technical level and must not travel here.
        expect(Object.keys(check).sort()).toEqual(
          expect.not.arrayContaining(["details", "source", "target"]),
        );
      }
    }
    // Nothing in the public payload carries an address the scan observed.
    expect(JSON.stringify(body)).not.toContain("93.184.216.34");
    await instance.close();
  });

  it("PRD 23.6 — /details serves the permitted measurements", async () => {
    const instance = app();
    const { scanId } = await scan(instance);
    const response = await instance.inject({
      method: "GET",
      url: `/api/web/v1/scans/${scanId}/details`,
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    const byId = new Map(body.checks.map((check: { checkId: string }) => [check.checkId, check]));

    const resolve = byId.get("dns.a.resolve") as { details?: Record<string, unknown> };
    expect(resolve?.details?.answersByProvider).toBeDefined();

    const registry = byId.get("registry.lookup") as { details?: Record<string, unknown> };
    expect(registry?.details?.registrar).toBe("UZINFOCOM");
    expect(registry?.details?.nameServers).toEqual(["ns.uz"]);

    const certificate = byId.get("tls.certificate.validity") as {
      details?: Record<string, unknown>;
    };
    expect(certificate?.details?.issuer).toBeDefined();
    expect(certificate?.details?.validTo).toBeDefined();
    await instance.close();
  });

  /**
   * AC-25.1 and PRD 9.4 — a registrant field travels as a state and never as a value, and the
   * projection rebuilds the subtree rather than copying it, so a value added upstream cannot
   * ride along.
   */
  it("AC-25.1 — /details carries registrant states, never registrant values", async () => {
    const instance = buildApp({
      env,
      dnsQuery: fixtureQuery,
      tlsProbe: fixtureTlsProbe,
      registryLookup: async (registryDomain: string) => {
        const [entry] = await fixtureRegistry(registryDomain);
        return [
          {
            ...entry,
            registration: {
              ...entry?.registration,
              registrant: {
                name: { state: "value" as const, value: "Ivan Ivanov" },
                email: { state: "value" as const, value: "ivan@example.uz" },
                phone: { state: "redacted" as const },
                address: { state: "unavailable" as const },
              },
            },
          },
        ] as Awaited<ReturnType<typeof fixtureRegistry>>;
      },
    });
    const { scanId } = await scan(instance);
    const response = await instance.inject({
      method: "GET",
      url: `/api/web/v1/scans/${scanId}/details`,
    });
    const serialised = JSON.stringify(response.json());
    expect(serialised).not.toContain("Ivan Ivanov");
    expect(serialised).not.toContain("ivan@example.uz");
    expect(serialised).toContain('"state":"redacted"');
    await instance.close();
  });

  it("returns 404 for a scan that does not exist", async () => {
    const instance = app();
    const response = await instance.inject({
      method: "GET",
      url: "/api/web/v1/scans/00000000-0000-4000-8000-000000000000/details",
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().errorCode).toBe("scan_not_found");
    await instance.close();
  });
});
