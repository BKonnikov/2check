import type { WebScanResponse } from "@2check/contracts";
import type {
  DkimLookupAnswer,
  HostObservation,
  MxObservation,
  SpfLookupAnswer,
  StarttlsOutcome,
  TlsCertificate,
} from "@2check/domain";
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { type Env, loadEnv } from "../src/config/env.js";
import { createMetrics, type Metrics } from "../src/observability/metrics.js";

const env: Env = loadEnv({
  LOG_LEVEL: "silent",
  REDIS_URL: "redis://127.0.0.1:6379",
  DATABASE_URL: "postgres://twocheck:twocheck@127.0.0.1:5432/twocheck",
  APPLICATION_RELEASE_VERSION: "0.0.0-test",
});

/**
 * 1.1 §3 to §6 — the mail category end to end, over a zone recorded in advance. Each port is fed
 * from the same fixture, so one object describes everything a scan of this domain can see. SPF,
 * DMARC and DKIM read different names, so one TXT map serves all three of their walks.
 */
interface Fixture {
  readonly txt?: Readonly<Record<string, SpfLookupAnswer>>;
  readonly mx?: MxObservation;
  readonly addresses?: Readonly<Record<string, HostObservation>>;
  /** 1.1 §7 — what one SMTP session against each host came back with. */
  readonly smtp?: Readonly<Record<string, StarttlsOutcome>>;
  readonly smtpEnabled?: boolean;
  /** 1.1 §8 — the reverse zone, keyed by address. */
  readonly ptr?: Readonly<Record<string, readonly string[]>>;
}

function app(fixture: Fixture, metrics?: Metrics) {
  return buildApp({
    env,
    ...(metrics === undefined ? {} : { metrics }),
    spfLookup: () => ({
      provider: "fixture",
      lookup: async (name) => fixture.txt?.[name] ?? { outcome: "NAME_NOT_FOUND" },
    }),
    dmarcLookup: () => ({
      provider: "fixture",
      lookup: async (name) => fixture.txt?.[name] ?? { outcome: "NAME_NOT_FOUND" },
    }),
    dkimLookup: () => ({
      provider: "fixture",
      lookup: async (name): Promise<DkimLookupAnswer> =>
        fixture.txt?.[name] ?? { outcome: "NAME_NOT_FOUND" },
    }),
    smtpProbeEnabled: fixture.smtpEnabled ?? true,
    smtpProbe: async (_address, hostname) =>
      fixture.smtp?.[hostname] ?? { kind: "CONNECT_FAILED", hostname },
    mailHostLookup: () => ({
      provider: "fixture",
      mx: async () => fixture.mx ?? { outcome: "EMPTY" },
      addresses: async (name) =>
        fixture.addresses?.[name] ?? { hostname: name, outcome: "EMPTY", addresses: [] },
      reverse: async (address) => {
        const names = fixture.ptr?.[address];
        return names === undefined ? { outcome: "NAME_NOT_FOUND" } : { outcome: "ANSWER", names };
      },
    }),
  });
}

function answer(...records: string[]): SpfLookupAnswer {
  return { outcome: "ANSWER", records };
}

/** A real 2048-bit key, so the DER walk in the domain module is exercised through the stack. */
const RSA_2048 =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmG1javSGSFFzqR4KGGKsiNnMipYtbWR7RA7MDLeLbJeLYw4n1UhYqRPvoM3yMgHSRh01T5JSkzJVqyCPbxcKXfJcVppbmfzxPah7hBGUcF85j5A+kI4S2rruj1u3aFMd8iLgYA26qO2LlkXi3CpJ0MFXDU00LKJkpBjV5BL6a1pepgRa3LgJiu4vqqAQL3Hn37+safjVJhOvkKScDRPWf95X61mrkcAoxTdw7C2JCtFcXko0zEQAppaFv16bcL4pXoacOWCwBnS5lrWt/nPwxvf52DP3S346S9ZM4Ky3H2LeYV0hw+YHzGVctt4tCL/wyU4SBLBl62qPNKQI01TGywIDAQAB";

function host(hostname: string, ...addresses: string[]): HostObservation {
  return { hostname, outcome: addresses.length > 0 ? "ANSWER" : "EMPTY", addresses };
}

function certificate(overrides: Partial<TlsCertificate> = {}): TlsCertificate {
  return {
    subject: "mail.example.uz",
    issuer: "R11 (Let's Encrypt)",
    validFrom: "2020-01-01T00:00:00.000Z",
    // Far enough out that the fixture does not expire while the product is still being built.
    validTo: "2099-01-01T00:00:00.000Z",
    subjectAltNames: ["DNS:mail.example.uz"],
    fingerprint256: "ab:cd",
    selfSigned: false,
    chainVerification: "TRUSTED",
    ...overrides,
  };
}

function encrypted(hostname: string, cert = certificate()): StarttlsOutcome {
  return {
    kind: "SECURED",
    hostname,
    address: "93.184.216.34",
    protocol: "TLSv1.3",
    certificate: cert,
    observedAt: "2026-10-06T11:00:00.000Z",
  };
}

/** A domain whose mail is in order, so a case can change one thing and keep the rest sound. */
const SOUND: Fixture = {
  txt: {
    "example.uz": answer("v=spf1 ip4:203.0.113.0/24 -all"),
    "_dmarc.example.uz": answer("v=DMARC1; p=reject; rua=mailto:dmarc@example.uz"),
    "mine._domainkey.example.uz": answer(`v=DKIM1; k=rsa; p=${RSA_2048}`),
  },
  mx: { outcome: "ANSWER", records: [{ preference: 10, exchange: "mail.example.uz" }] },
  addresses: {
    // A public address, because 1.0 §15 is applied to a mail host exactly as to any other and a
    // documentation range would be refused before the probe ran.
    "mail.example.uz": host("mail.example.uz", "93.184.216.34"),
    "example.uz": host("example.uz", "93.184.216.35"),
  },
  smtp: { "mail.example.uz": encrypted("mail.example.uz") },
  ptr: { "93.184.216.34": ["mail.example.uz"] },
};

async function scan(fixture: Fixture, dkimSelector?: string) {
  const instance = app(fixture);
  const created = await instance.inject({
    method: "POST",
    url: "/api/web/v1/scans",
    payload: {
      input: "example.uz",
      mode: "PARTIAL",
      selectedCategories: ["email"],
      ...(dkimSelector === undefined ? {} : { dkimSelector }),
    },
  });
  expect(created.statusCode).toBe(202);
  const { scanId } = created.json<{ scanId: string }>();

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await instance.inject({ method: "GET", url: `/api/web/v1/scans/${scanId}` });
    const body = response.json<WebScanResponse>();
    if (body.executionState === "COMPLETED" || body.executionState === "FAILED") {
      await instance.close();
      return body;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  await instance.close();
  throw new Error("the scan did not finish");
}

function category(body: WebScanResponse) {
  return body.categories?.find((entry) => entry.category === "email");
}

function check(body: WebScanResponse, checkId: string) {
  return category(body)?.checks.find((entry) => entry.checkId === checkId);
}

/** PRD 6.4 and 1.1 §9.4 — the Technical view, as a reader gets it by asking for it. */
async function technical(fixture: Fixture, dkimSelector?: string) {
  const instance = app(fixture);
  const created = await instance.inject({
    method: "POST",
    url: "/api/web/v1/scans",
    payload: {
      input: "example.uz",
      mode: "PARTIAL",
      selectedCategories: ["email"],
      ...(dkimSelector === undefined ? {} : { dkimSelector }),
    },
  });
  const { scanId } = created.json<{ scanId: string }>();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await instance.inject({ method: "GET", url: `/api/web/v1/scans/${scanId}` });
    if (response.json<WebScanResponse>().executionState !== "RUNNING") {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  const response = await instance.inject({
    method: "GET",
    url: `/api/web/v1/scans/${scanId}/details`,
  });
  await instance.close();
  const body = response.json<{
    checks?: readonly {
      checkId: string;
      source?: Record<string, unknown>;
      details?: Record<string, unknown>;
    }[];
  }>();
  return {
    body,
    of: (checkId: string) => body.checks?.find((entry) => entry.checkId === checkId),
  };
}

describe("1.1 §14 — a PARTIAL scan of the mail category", () => {
  it("is accepted and produces every check in the category", async () => {
    const body = await scan(SOUND, "mine");
    expect(body.executionState).toBe("COMPLETED");
    // 1.1 §2.1 — the groups, in the order that section lists them.
    expect(category(body)?.checks.map((entry) => entry.checkId)).toEqual([
      "email.spf.record",
      "email.spf.limits",
      "email.spf.policy",
      "email.spf.deprecated",
      "email.dmarc.record",
      "email.dmarc.policy",
      "email.dmarc.reports",
      "email.dmarc.deprecated",
      "email.dkim.key",
      "email.mx.records",
      "email.starttls.encryption",
      "email.starttls.certificate",
      "email.ptr.ipv4",
      "email.ptr.ipv6",
    ]);
    expect(category(body)?.status).toBe("PASS");
  });

  it("carries no overall score or verdict, as a PARTIAL scan does not", async () => {
    const body = await scan(SOUND);
    expect(body.summary?.score).toBeUndefined();
    expect(body.summary?.verdictCode).toBeUndefined();
  });

  it("publishes no detail fields in the public view", async () => {
    // PRD 6.4 — details are the Technical level and never ride along with the public result.
    const body = await scan(SOUND, "mine");
    for (const entry of category(body)?.checks ?? []) {
      expect(entry.details, entry.checkId).toBeUndefined();
    }
  });
});

describe("AC-16.5 — the category's metrics are counted", () => {
  async function counted(fixture: Fixture, selector?: string) {
    const metrics = createMetrics();
    const instance = app(fixture, metrics);
    const created = await instance.inject({
      method: "POST",
      url: "/api/web/v1/scans",
      payload: {
        input: "example.uz",
        mode: "PARTIAL",
        selectedCategories: ["email"],
        ...(selector === undefined ? {} : { dkimSelector: selector }),
      },
    });
    const { scanId } = created.json<{ scanId: string }>();
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const response = await instance.inject({ method: "GET", url: `/api/web/v1/scans/${scanId}` });
      if (response.json<WebScanResponse>().executionState !== "RUNNING") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    await instance.close();
    return metrics.snapshot();
  }

  it("counts a probe by its outcome, and never by its host", async () => {
    const snapshot = await counted(SOUND, "mine");
    const probes = Object.keys(snapshot).filter((key) => key.startsWith("email_smtp_probe_total"));
    expect(probes).toHaveLength(1);
    expect(probes[0]).toContain("SECURED");
    // AC-21.4 — a host name is unbounded, so it can never be a label.
    expect(probes[0]).not.toContain("mail.example.uz");
  });

  it("counts a host the security check refused apart from one it probed", async () => {
    const snapshot = await counted({
      ...SOUND,
      addresses: {
        ...SOUND.addresses,
        "mail.example.uz": host("mail.example.uz", "93.184.216.34", "127.0.0.1"),
      },
    });
    expect(
      Object.keys(snapshot).some((key) => key.startsWith("email_smtp_probe_blocked_total")),
    ).toBe(true);
    expect(Object.keys(snapshot).some((key) => key.startsWith("email_smtp_probe_total"))).toBe(
      false,
    );
  });

  it("counts a check that ended without a key, and not one that found one", async () => {
    const withoutSelector = await counted(SOUND);
    expect(withoutSelector.email_dkim_selector_unknown_total).toBe(1);

    const withSelector = await counted(SOUND, "mine");
    expect(withSelector.email_dkim_selector_unknown_total).toBeUndefined();
  });
});

describe("1.1 §9.4 — what the technical view adds, and what it keeps out of the public one", () => {
  it("shows each record as published, and the names each walk read", async () => {
    const { of } = await technical(SOUND, "mine");
    expect(of("email.spf.record")?.details?.recordText).toBe("v=spf1 ip4:203.0.113.0/24 -all");
    expect(of("email.dmarc.record")?.details?.recordText).toContain("v=DMARC1");
    expect(of("email.spf.record")?.source).toMatchObject({ kind: "DNS_RECORD" });
  });

  it("names the DMARC report addresses here and only the domains in the public result", async () => {
    const { of } = await technical(SOUND, "mine");
    expect(of("email.dmarc.reports")?.details?.reportAddresses).toEqual([
      "mailto:dmarc@example.uz",
    ]);

    const body = await scan(SOUND, "mine");
    expect(check(body, "email.dmarc.reports")?.message.params?.domains).toBe("example.uz");
    expect(JSON.stringify(body)).not.toContain("dmarc@example.uz");
  });

  it("names the selectors it queried, and the key's length rather than the key", async () => {
    const { of } = await technical(SOUND, "mine");
    const dkim = of("email.dkim.key");
    expect(dkim?.details?.triedNames).toEqual(["mine._domainkey.example.uz"]);
    expect(dkim?.details?.keyBits).toBe(2048);
    expect(JSON.stringify(dkim)).not.toContain(RSA_2048.slice(0, 40));
  });

  it("shows the addresses the hosts resolved to, which the public result does not", async () => {
    const { of } = await technical(SOUND, "mine");
    expect(of("email.mx.records")?.details?.hosts).toEqual([
      { hostname: "mail.example.uz", preference: 10, addresses: ["93.184.216.34"] },
    ]);

    const body = await scan(SOUND, "mine");
    expect(JSON.stringify(body)).not.toContain("93.184.216.34");
  });

  it("shows the certificate of the mail host under the names the TLS category uses", async () => {
    const { of } = await technical(SOUND, "mine");
    expect(of("email.starttls.certificate")?.details).toMatchObject({
      address: "93.184.216.34",
      issuer: "R11 (Let's Encrypt)",
      subjectAltNames: ["DNS:mail.example.uz"],
    });
  });

  it("shows each address and the reverse names it answered with", async () => {
    const { of } = await technical(SOUND, "mine");
    expect(of("email.ptr.ipv4")?.details?.addresses).toEqual([
      { address: "93.184.216.34", names: ["mail.example.uz"] },
    ]);
    expect(of("email.ptr.ipv4")?.source).toMatchObject({
      kind: "DNS_RECORD",
      traversedNames: ["34.216.184.93.in-addr.arpa"],
    });
  });

  it("publishes nothing the permitted list does not name", async () => {
    /**
     * PRD 23.6 — the list is the boundary, so this is the assertion that matters: a field a
     * module starts producing does not reach a reader until somebody adds it deliberately.
     */
    const permitted = new Set([
      "recordText",
      "triedNames",
      "keyBits",
      "reportAddresses",
      "hosts",
      "addresses",
      "address",
      "protocol",
      "hostsNotProbed",
      "validFrom",
      "validTo",
      "issuer",
      "subjectAltNames",
      "chainErrorCode",
    ]);
    const { body } = await technical(SOUND, "mine");
    for (const entry of body.checks ?? []) {
      for (const field of Object.keys(entry.details ?? {})) {
        expect(permitted.has(field), `${entry.checkId} publishes ${field}`).toBe(true);
      }
    }
  });
});

describe("1.1 §3 — SPF through the whole stack", () => {
  it("reports a domain with no policy as a confirmed finding", async () => {
    const body = await scan({
      ...SOUND,
      txt: { ...SOUND.txt, "example.uz": { outcome: "EMPTY" } },
    });
    expect(check(body, "email.spf.record")?.status).toBe("FAIL");
    expect(category(body)?.severity).toBe("warning");
  });

  it("walks the names a record leads to and reports what it spent", async () => {
    const body = await scan({
      ...SOUND,
      txt: {
        "example.uz": answer("v=spf1 include:mail.uz -all"),
        "mail.uz": answer("v=spf1 a mx -all"),
      },
    });
    const limits = check(body, "email.spf.limits");
    expect(limits?.status).toBe("PASS");
    expect(limits?.message.params).toEqual({ count: 3, limit: 10 });
  });

  it("reports a walk it could not finish as incomplete rather than as a failure", async () => {
    const body = await scan({
      ...SOUND,
      txt: {
        "example.uz": answer("v=spf1 include:unreachable.uz -all"),
        "unreachable.uz": { outcome: "INDETERMINATE" },
      },
    });
    expect(check(body, "email.spf.limits")?.status).toBe("UNKNOWN");
    expect(category(body)?.completeness).toBe("PARTIAL");
  });
});

describe("1.1 §4 — DMARC through the whole stack", () => {
  it("reports a domain with no policy anywhere as a confirmed finding", async () => {
    const body = await scan({
      ...SOUND,
      txt: { ...SOUND.txt, "_dmarc.example.uz": { outcome: "EMPTY" } },
    });
    const record = check(body, "email.dmarc.record");
    expect(record?.status).toBe("FAIL");
    expect(record?.severity).toBe("warning");
    for (const checkId of ["email.dmarc.policy", "email.dmarc.reports", "email.dmarc.deprecated"]) {
      expect(check(body, checkId)?.status, checkId).toBe("NOT_APPLICABLE");
      expect(check(body, checkId)?.blockedBy, checkId).toBe("email.dmarc.record");
    }
  });

  it("names the higher domain a policy was inherited from", async () => {
    const body = await scan({
      ...SOUND,
      txt: {
        ...SOUND.txt,
        "_dmarc.example.uz": { outcome: "EMPTY" },
        "_dmarc.uz": answer("v=DMARC1; p=reject; sp=quarantine; psd=y"),
      },
    });
    const record = check(body, "email.dmarc.record");
    expect(record?.status).toBe("PASS");
    expect(record?.message.params?.source).toBe("uz");
    // The name exists — the MX query said so — so the subdomain policy is the one that applies.
    expect(check(body, "email.dmarc.policy")?.message.params).toMatchObject({ tag: "sp" });
  });

  it("does not turn an unfinished walk into a domain without a policy", async () => {
    const body = await scan({
      ...SOUND,
      txt: {
        ...SOUND.txt,
        "_dmarc.example.uz": { outcome: "EMPTY" },
        "_dmarc.uz": { outcome: "INDETERMINATE" },
      },
    });
    const record = check(body, "email.dmarc.record");
    expect(record?.status).toBe("UNKNOWN");
    expect(record?.reasonCode).toBe("dmarc_tree_walk_incomplete");
  });

  it("keeps the report addresses out of the answer, because they belong to the owner", async () => {
    const body = await scan(SOUND);
    expect(check(body, "email.dmarc.reports")?.status).toBe("PASS");
    expect(JSON.stringify(body)).not.toContain("dmarc@example.uz");
  });
});

describe("1.1 §5 and §14.2 — DKIM through the whole stack", () => {
  it("tries the selector the request gave and reports the key it finds", async () => {
    const body = await scan(SOUND, "mine");
    const key = check(body, "email.dkim.key");
    expect(key?.status).toBe("PASS");
    expect(key?.message.params?.selector).toBe("mine");
  });

  it("keeps the key material out of the answer", async () => {
    const body = await scan(SOUND, "mine");
    expect(JSON.stringify(body)).not.toContain(RSA_2048.slice(0, 40));
  });

  it("calls a missing key under the caller's own selector a confirmed absence", async () => {
    const body = await scan(SOUND, "other");
    const key = check(body, "email.dkim.key");
    expect(key?.status).toBe("FAIL");
    expect(key?.severity).toBe("warning");
  });

  it("has nothing to ask when the MX names no service it knows and no selector was given", async () => {
    const body = await scan(SOUND);
    const key = check(body, "email.dkim.key");
    expect(key?.status).toBe("UNKNOWN");
    expect(key?.reasonCode).toBe("dkim_selector_unknown");
  });

  it("tries the selectors of the service the MX records name", async () => {
    const body = await scan({
      ...SOUND,
      mx: { outcome: "ANSWER", records: [{ preference: 10, exchange: "aspmx.l.google.com" }] },
      addresses: { "aspmx.l.google.com": host("aspmx.l.google.com", "203.0.113.1") },
      txt: { ...SOUND.txt, "google._domainkey.example.uz": answer(`v=DKIM1; p=${RSA_2048}`) },
    });
    const key = check(body, "email.dkim.key");
    expect(key?.status).toBe("PASS");
    expect(key?.message.params?.selector).toBe("google");
  });

  it("refuses a selector sent without the mail category, and runs nothing", async () => {
    const instance = app(SOUND);
    const response = await instance.inject({
      method: "POST",
      url: "/api/web/v1/scans",
      payload: {
        input: "example.uz",
        mode: "PARTIAL",
        selectedCategories: ["dns"],
        dkimSelector: "mine",
      },
    });
    await instance.close();
    expect(response.statusCode).toBe(422);
    expect(response.json<{ field?: string }>().field).toBe("dkimSelector");
  });

  it.each(["not a label", "-leading", "trailing-", "a".repeat(64), ""])(
    "refuses %s as a selector before any query runs",
    async (selector) => {
      const instance = app(SOUND);
      const response = await instance.inject({
        method: "POST",
        url: "/api/web/v1/scans",
        payload: {
          input: "example.uz",
          mode: "PARTIAL",
          selectedCategories: ["email"],
          dkimSelector: selector,
        },
      });
      await instance.close();
      expect(response.statusCode).toBe(422);
      expect(response.json<{ field?: string }>().field).toBe("dkimSelector");
    },
  );
});

describe("1.1 §7 and §13 — STARTTLS through the whole stack", () => {
  it("reports encryption and the certificate presented over it", async () => {
    const body = await scan(SOUND, "mine");
    expect(check(body, "email.starttls.encryption")?.status).toBe("PASS");
    expect(check(body, "email.starttls.certificate")?.status).toBe("PASS");
  });

  it("counts the hosts it probed and the hosts it left alone", async () => {
    const hosts = ["m1", "m2", "m3", "m4", "m5", "m6"].map((name) => `${name}.example.uz`);
    const body = await scan({
      ...SOUND,
      mx: {
        outcome: "ANSWER",
        records: hosts.map((exchange, index) => ({ preference: (index + 1) * 10, exchange })),
      },
      addresses: Object.fromEntries(
        hosts.map((name, index) => [name, host(name, `93.184.216.${index + 1}`)]),
      ),
      smtp: Object.fromEntries(hosts.map((name) => [name, encrypted(name)])),
    });
    /**
     * 1.1 §7.3 — four of the six are probed, and the message says so rather than implying more.
     * The counts also travel as SmtpProbeSource, which 6.4 keeps in the Technical view; here the
     * assertion is on what the reader of the public result is actually told.
     */
    const encryption = check(body, "email.starttls.encryption");
    expect(encryption?.message.titleCode).toBe("email.starttls.encryption.pass.partial");
    expect(encryption?.message.params).toMatchObject({ probed: 4, skipped: 2 });
  });

  it("blocks a host whose address the security check refuses, and says it is our limit", async () => {
    // AC-13.1 and AC-13.2 — a forbidden address blocks the host; it is not dropped so the rest
    // of the set can be used.
    const body = await scan({
      ...SOUND,
      addresses: {
        ...SOUND.addresses,
        "mail.example.uz": host("mail.example.uz", "93.184.216.34", "127.0.0.1"),
      },
    });
    const encryption = check(body, "email.starttls.encryption");
    expect(encryption?.status).toBe("UNKNOWN");
    expect(encryption?.reasonCode).toBe("ssrf_policy_block");
  });

  it("reports a deployment that cannot open outbound mail as a limit of the service", async () => {
    const body = await scan({ ...SOUND, smtpEnabled: false });
    const encryption = check(body, "email.starttls.encryption");
    expect(encryption?.status).toBe("UNKNOWN");
    expect(encryption?.reasonCode).toBe("outbound_smtp_unavailable");
    expect(encryption?.severity).toBe("none");
  });

  it("warns about a certificate that does not match the host", async () => {
    const body = await scan({
      ...SOUND,
      smtp: {
        "mail.example.uz": encrypted(
          "mail.example.uz",
          certificate({ subjectAltNames: ["DNS:other.example.net"] }),
        ),
      },
    });
    const cert = check(body, "email.starttls.certificate");
    expect(cert?.status).toBe("FAIL");
    expect(cert?.severity).toBe("warning");
  });

  it("has nothing to probe when the domain accepts no mail", async () => {
    const body = await scan({
      ...SOUND,
      mx: { outcome: "ANSWER", records: [{ preference: 0, exchange: "." }] },
      addresses: {},
    });
    const encryption = check(body, "email.starttls.encryption");
    expect(encryption?.status).toBe("NOT_APPLICABLE");
    expect(encryption?.blockedBy).toBe("email.mx.records");
  });
});

describe("1.1 §8 — the reverse names through the whole stack", () => {
  it("confirms a reverse name by resolving it back to the same address", async () => {
    const body = await scan(SOUND, "mine");
    const v4 = check(body, "email.ptr.ipv4");
    expect(v4?.status).toBe("PASS");
    expect(v4?.message.params?.names).toBe("mail.example.uz");
  });

  it("reports a reverse name that resolves somewhere else as unconfirmed", async () => {
    const body = await scan({
      ...SOUND,
      ptr: { "93.184.216.34": ["elsewhere.example.net"] },
      addresses: {
        ...SOUND.addresses,
        "elsewhere.example.net": host("elsewhere.example.net", "198.51.100.9"),
      },
    });
    const v4 = check(body, "email.ptr.ipv4");
    expect(v4?.status).toBe("FAIL");
    expect(v4?.severity).toBe("warning");
  });

  it("weighs a missing name by family", async () => {
    const body = await scan({
      ...SOUND,
      ptr: {},
      addresses: {
        ...SOUND.addresses,
        "mail.example.uz": host("mail.example.uz", "93.184.216.34", "2606:2800:220:1::1"),
      },
    });
    expect(check(body, "email.ptr.ipv4")?.severity).toBe("warning");
    expect(check(body, "email.ptr.ipv6")?.severity).toBe("informational");
  });

  it("asks only about the addresses of the hosts the MX records name", async () => {
    // AC-8.1 — the domain's own address is not a receiving host here, so it is not asked about.
    const asked: string[] = [];
    const instance = buildApp({
      env,
      spfLookup: () => ({ provider: "fixture", lookup: async () => ({ outcome: "EMPTY" }) }),
      dmarcLookup: () => ({ provider: "fixture", lookup: async () => ({ outcome: "EMPTY" }) }),
      dkimLookup: () => ({ provider: "fixture", lookup: async () => ({ outcome: "EMPTY" }) }),
      smtpProbeEnabled: false,
      mailHostLookup: () => ({
        provider: "fixture",
        mx: async () => SOUND.mx ?? { outcome: "EMPTY" },
        addresses: async (name) =>
          SOUND.addresses?.[name] ?? { hostname: name, outcome: "EMPTY", addresses: [] },
        reverse: async (address) => {
          asked.push(address);
          return { outcome: "NAME_NOT_FOUND" };
        },
      }),
    });
    const created = await instance.inject({
      method: "POST",
      url: "/api/web/v1/scans",
      payload: { input: "example.uz", mode: "PARTIAL", selectedCategories: ["email"] },
    });
    const { scanId } = created.json<{ scanId: string }>();
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const response = await instance.inject({ method: "GET", url: `/api/web/v1/scans/${scanId}` });
      if (response.json<WebScanResponse>().executionState !== "RUNNING") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    await instance.close();
    expect(asked).toEqual(["93.184.216.34"]);
  });

  it("has no reverse name to check when the domain accepts no mail", async () => {
    const body = await scan({
      ...SOUND,
      mx: { outcome: "ANSWER", records: [{ preference: 0, exchange: "." }] },
      addresses: {},
    });
    for (const checkId of ["email.ptr.ipv4", "email.ptr.ipv6"]) {
      expect(check(body, checkId)?.status, checkId).toBe("NOT_APPLICABLE");
      expect(check(body, checkId)?.blockedBy, checkId).toBe("email.mx.records");
    }
  });
});

describe("1.1 §6 — the receiving server through the whole stack", () => {
  it("names the hosts the MX records point at", async () => {
    const body = await scan(SOUND);
    // PRD 6.4 — target stays inside the service; what a reader is told travels in the message.
    const mx = check(body, "email.mx.records");
    expect(mx?.status).toBe("PASS");
    expect(mx?.message.params).toMatchObject({ host: "mail.example.uz", count: 1 });
  });

  it("falls back to the domain's own addresses, and says the mail will follow them", async () => {
    const body = await scan({ ...SOUND, mx: { outcome: "EMPTY" } });
    const mx = check(body, "email.mx.records");
    expect(mx?.status).toBe("FAIL");
    expect(mx?.severity).toBe("warning");
    expect(mx?.message.titleCode).toBe("email.mx.records.fail.implicit");
    expect(mx?.message.params).toMatchObject({ host: "example.uz" });
  });

  it("passes a domain that declares it accepts no mail", async () => {
    const body = await scan({
      ...SOUND,
      mx: { outcome: "ANSWER", records: [{ preference: 0, exchange: "." }] },
    });
    expect(check(body, "email.mx.records")?.status).toBe("PASS");
  });

  it("marks a forwarding service apart from a mailbox provider", async () => {
    const body = await scan({
      ...SOUND,
      mx: {
        outcome: "ANSWER",
        records: [
          { preference: 10, exchange: "route1.mx.cloudflare.net" },
          { preference: 20, exchange: "route2.mx.cloudflare.net" },
        ],
      },
      addresses: {
        "route1.mx.cloudflare.net": host("route1.mx.cloudflare.net", "203.0.113.1"),
        "route2.mx.cloudflare.net": host("route2.mx.cloudflare.net", "203.0.113.2"),
      },
    });
    const mx = check(body, "email.mx.records");
    expect(mx?.message.titleCode).toBe("email.mx.records.present.forwarding");
    expect(mx?.message.params).toMatchObject({ service: "Cloudflare Email Routing" });
  });

  it("does not turn a failed MX lookup into a domain with no records", async () => {
    const body = await scan({ ...SOUND, mx: { outcome: "INDETERMINATE" } });
    const mx = check(body, "email.mx.records");
    expect(mx?.status).toBe("UNKNOWN");
    expect(mx?.reasonCode).toBe("mx_lookup_failed");
  });
});
