import type { TlsCertificate } from "@2check/contracts";
import { describe, expect, it } from "vitest";
import {
  analyseStarttls,
  evaluateStarttlsChecks,
  SMTP_PORT,
  STARTTLS_CHECK_IDS,
  STARTTLS_MAX_HOSTS,
  type StarttlsOutcome,
} from "../src/index.js";

const FRESHNESS = { checkedAt: "2026-10-06T12:00:00.000Z", cached: false, cacheAge: 0 } as const;
const NOW = new Date("2026-10-06T12:00:00.000Z");

function certificate(overrides: Partial<TlsCertificate> = {}): TlsCertificate {
  return {
    subject: "mail.example.uz",
    issuer: "R11 (Let's Encrypt)",
    validFrom: "2026-09-01T00:00:00.000Z",
    validTo: "2026-12-01T00:00:00.000Z",
    subjectAltNames: ["DNS:mail.example.uz"],
    fingerprint256: "ab:cd",
    selfSigned: false,
    chainVerification: "TRUSTED",
    ...overrides,
  };
}

function secured(
  hostname: string,
  at = "2026-10-06T11:59:00.000Z",
  cert = certificate(),
): StarttlsOutcome {
  return {
    kind: "SECURED",
    hostname,
    address: "203.0.113.1",
    protocol: "TLSv1.3",
    certificate: cert,
    observedAt: at,
  };
}

function plain(hostname: string, at = "2026-10-06T11:59:30.000Z"): StarttlsOutcome {
  return { kind: "NOT_OFFERED", hostname, address: "203.0.113.2", observedAt: at };
}

function run(probes: readonly StarttlsOutcome[], skipped: readonly string[] = []) {
  const analysis = analyseStarttls({ domain: "example.uz", probes, skipped });
  const results = evaluateStarttlsChecks(analysis, {
    domain: "example.uz",
    freshness: FRESHNESS,
    now: NOW,
  });
  return {
    analysis,
    results,
    encryption: results.find((result) => result.checkId === STARTTLS_CHECK_IDS.encryption),
    certificate: results.find((result) => result.checkId === STARTTLS_CHECK_IDS.certificate),
  };
}

describe("AC-7.1 — the probe is fixed to the mail port", () => {
  it("names port 25 and nothing else", () => {
    expect(SMTP_PORT).toBe(25);
  });

  it("caps one check at four hosts", () => {
    expect(STARTTLS_MAX_HOSTS).toBe(4);
  });
});

describe("AC-7.4 and AC-7.5 — what the probe found", () => {
  it("passes when every host probed encrypts", () => {
    const { encryption } = run([secured("a.example.uz"), secured("b.example.uz")]);
    expect(encryption?.status).toBe("PASS");
    expect(encryption?.message.titleCode).toBe("email.starttls.encryption.pass");
  });

  it("warns when some hosts encrypt and some do not", () => {
    const { encryption } = run([secured("a.example.uz"), plain("b.example.uz")]);
    expect(encryption?.status).toBe("FAIL");
    expect(encryption?.severity).toBe("warning");
    expect(encryption?.message.params?.hosts).toBe("b.example.uz");
  });

  it("fails critically when no host encrypts", () => {
    const { encryption } = run([plain("a.example.uz"), plain("b.example.uz")]);
    expect(encryption?.status).toBe("FAIL");
    expect(encryption?.severity).toBe("critical");
  });

  it("fails critically when encryption was offered and did not come up", () => {
    const { encryption } = run([
      {
        kind: "UPGRADE_FAILED",
        hostname: "a.example.uz",
        address: "203.0.113.1",
        failureCode: "handshake_failed",
        observedAt: "2026-10-06T11:58:00.000Z",
      },
      secured("b.example.uz"),
    ]);
    expect(encryption?.status).toBe("FAIL");
    expect(encryption?.severity).toBe("critical");
    expect(encryption?.message.titleCode).toBe("email.starttls.encryption.fail.upgrade");
  });

  it("does not count a host that never answered as a host without encryption", () => {
    const { analysis, encryption } = run([
      secured("a.example.uz"),
      { kind: "CONNECT_FAILED", hostname: "b.example.uz", address: "203.0.113.9" },
    ]);
    expect(analysis.plainHosts).toEqual([]);
    expect(encryption?.status).toBe("PASS");
  });
});

describe("AC-7.3 — the result says what it covers", () => {
  it("counts the hosts probed and the hosts left alone", () => {
    const { encryption, analysis } = run(
      [secured("a.example.uz")],
      ["e.example.uz", "f.example.uz"],
    );
    expect(analysis.hostsProbed).toBe(1);
    expect(analysis.hostsSkipped).toBe(2);
    expect(encryption?.source).toEqual({ kind: "SMTP_PROBE", hostsProbed: 1, hostsSkipped: 2 });
  });

  it("says in the message itself that some hosts were not probed", () => {
    const { encryption } = run([secured("a.example.uz")], ["e.example.uz"]);
    expect(encryption?.message.titleCode).toBe("email.starttls.encryption.pass.partial");
    expect(encryption?.message.params).toMatchObject({ probed: 1, skipped: 1 });
  });

  it("keeps the two counts apart rather than reporting their difference", () => {
    // 1.1 §9.3 — equal or unequal counts do not by themselves decide coverage.
    const { encryption } = run([secured("a.example.uz")], ["b.example.uz"]);
    const source = encryption?.source as { hostsProbed: number; hostsSkipped: number };
    expect(source.hostsProbed).toBe(1);
    expect(source.hostsSkipped).toBe(1);
  });
});

describe("AC-7.7 and §13.7 — a limit of the service is not a fault of the domain", () => {
  it("reports a deployment without outbound mail as UNKNOWN", () => {
    const { encryption } = run([
      { kind: "UNAVAILABLE", hostname: "a.example.uz" },
      { kind: "UNAVAILABLE", hostname: "b.example.uz" },
    ]);
    expect(encryption?.status).toBe("UNKNOWN");
    expect(encryption?.reasonCode).toBe("outbound_smtp_unavailable");
    expect(encryption?.severity).toBe("none");
  });

  it("counts a host it never connected to as not probed", () => {
    /**
     * 1.1 §9.3 — the counts answer "how much does this cover?", so a host the deployment could
     * not reach and a host the security check refused belong with the hosts beyond the cap. The
     * two counts then add up to the hosts §6 named, which is what makes them readable.
     */
    const unavailable = run(
      [
        { kind: "UNAVAILABLE", hostname: "a.example.uz" },
        { kind: "UNAVAILABLE", hostname: "b.example.uz" },
      ],
      ["c.example.uz"],
    );
    expect(unavailable.encryption?.source).toEqual({
      kind: "SMTP_PROBE",
      hostsProbed: 0,
      hostsSkipped: 3,
    });
    expect(unavailable.analysis.notProbed).toEqual([
      "a.example.uz",
      "b.example.uz",
      "c.example.uz",
    ]);

    const refused = run([
      secured("a.example.uz"),
      { kind: "BLOCKED", hostname: "b.example.uz", reasonCode: "ssrf_policy_block" },
    ]);
    expect(refused.encryption?.source).toEqual({
      kind: "SMTP_PROBE",
      hostsProbed: 1,
      hostsSkipped: 1,
    });
  });

  it("names 2check as the limit when the host is our own infrastructure", () => {
    const { encryption } = run([
      { kind: "BLOCKED", hostname: "a.example.uz", reasonCode: "own_infrastructure_not_observed" },
    ]);
    expect(encryption?.status).toBe("UNKNOWN");
    expect(encryption?.message.titleCode).toBe("email.starttls.encryption.unknown.own");
  });

  it("separates a security block from a connection that did not come up", () => {
    const blocked = run([
      { kind: "BLOCKED", hostname: "a.example.uz", reasonCode: "ssrf_policy_block" },
    ]);
    expect(blocked.encryption?.reasonCode).toBe("ssrf_policy_block");

    const failed = run([{ kind: "CONNECT_FAILED", hostname: "a.example.uz" }]);
    expect(failed.encryption?.reasonCode).toBe("starttls_connect_failed");

    const cut = run([{ kind: "SESSION_INCOMPLETE", hostname: "a.example.uz" }]);
    expect(cut.encryption?.reasonCode).toBe("starttls_session_incomplete");
  });

  it("carries no impact or recommendation on any of those, because nothing was confirmed", () => {
    for (const probe of [
      { kind: "UNAVAILABLE", hostname: "a.example.uz" },
      { kind: "BLOCKED", hostname: "a.example.uz", reasonCode: "ssrf_policy_block" },
      { kind: "CONNECT_FAILED", hostname: "a.example.uz" },
    ] satisfies StarttlsOutcome[]) {
      const { encryption } = run([probe]);
      expect(encryption?.status, probe.kind).toBe("UNKNOWN");
      expect(encryption?.severity, probe.kind).toBe("none");
    }
  });
});

describe("AC-15.7 — the reason for not applying stays readable", () => {
  function blocked(receivingServer: "NULL_MX" | "MISSING" | "INDETERMINATE" | undefined) {
    const analysis = analyseStarttls({ domain: "example.uz", probes: [], skipped: [] });
    return evaluateStarttlsChecks(analysis, {
      domain: "example.uz",
      freshness: FRESHNESS,
      ...(receivingServer === undefined ? {} : { receivingServer }),
    })[0];
  }

  it("tells a domain that refuses mail apart from one whose records name no server", () => {
    /**
     * 1.1 §15.5 — collapsed, the two look identical and mean entirely different things: one is
     * the owner's own declaration under RFC 7505, the other is an absence of records.
     */
    expect(blocked("NULL_MX")?.message.titleCode).toBe("email.starttls.encryption.blocked.refused");
    expect(blocked("MISSING")?.message.titleCode).toBe("email.starttls.encryption.blocked.missing");
  });

  it("does not present a lookup that failed as a server that is not there", () => {
    expect(blocked("INDETERMINATE")?.message.titleCode).toBe(
      "email.starttls.encryption.blocked.unknown",
    );
    expect(blocked(undefined)?.message.titleCode).toBe("email.starttls.encryption.blocked.unknown");
  });

  it("stays NOT_APPLICABLE whichever the reason, and still names the MX check", () => {
    for (const state of ["NULL_MX", "MISSING", "INDETERMINATE"] as const) {
      expect(blocked(state)?.status, state).toBe("NOT_APPLICABLE");
      expect(blocked(state)?.blockedBy, state).toBe("email.mx.records");
      expect(blocked(state)?.reasonCode, state).toBeUndefined();
    }
  });
});

describe("§2.3 — with no receiving server there is nothing to probe", () => {
  it("blocks the check on the MX check rather than inventing a reason", () => {
    const { encryption, certificate: cert } = run([]);
    expect(encryption?.status).toBe("NOT_APPLICABLE");
    expect(encryption?.blockedBy).toBe("email.mx.records");
    expect(encryption?.reasonCode).toBeUndefined();
    expect(cert?.status).toBe("NOT_APPLICABLE");
    expect(cert?.blockedBy).toBe(STARTTLS_CHECK_IDS.encryption);
  });
});

describe("AC-7.6 — the certificate of the host", () => {
  it("passes a certificate that is current, matching and trusted", () => {
    const { certificate: cert } = run([secured("mail.example.uz")]);
    expect(cert?.status).toBe("PASS");
    expect(cert?.message.params).toMatchObject({ host: "mail.example.uz" });
  });

  it.each([
    ["expired", { validTo: "2026-09-30T00:00:00.000Z" }, "email.starttls.certificate.fail.expired"],
    [
      "not yet valid",
      { validFrom: "2026-11-01T00:00:00.000Z" },
      "email.starttls.certificate.fail.early",
    ],
    [
      "for another name",
      { subjectAltNames: ["DNS:other.example.net"] },
      "email.starttls.certificate.fail.hostname",
    ],
    [
      "untrusted",
      { chainVerification: "UNTRUSTED" as const },
      "email.starttls.certificate.fail.untrusted",
    ],
  ])("reports a certificate %s as a warning", (_label, overrides, code) => {
    const { certificate: cert } = run([
      secured("mail.example.uz", "2026-10-06T11:59:00.000Z", certificate(overrides)),
    ]);
    expect(cert?.status).toBe("FAIL");
    expect(cert?.severity).toBe("warning");
    expect(cert?.message.titleCode).toBe(code);
  });

  it("reports an expired certificate before a chain that was never reached", () => {
    // 1.0 §10.5 — verification stops at the first fault, so the chain verdict was not formed.
    const { certificate: cert } = run([
      secured(
        "mail.example.uz",
        "2026-10-06T11:59:00.000Z",
        certificate({ validTo: "2026-09-30T00:00:00.000Z", chainVerification: "NOT_VERIFIED" }),
      ),
    ]);
    expect(cert?.message.titleCode).toBe("email.starttls.certificate.fail.expired");
  });

  it("does not call an unformed chain verdict an untrusted certificate", () => {
    const { certificate: cert } = run([
      secured(
        "mail.example.uz",
        "2026-10-06T11:59:00.000Z",
        certificate({ chainVerification: "NOT_VERIFIED" }),
      ),
    ]);
    expect(cert?.status).toBe("UNKNOWN");
    expect(cert?.message.titleCode).toBe("email.starttls.certificate.unknown");
  });

  it("has no certificate to judge when no host got as far as a handshake", () => {
    const { certificate: cert } = run([plain("a.example.uz")]);
    expect(cert?.status).toBe("NOT_APPLICABLE");
    expect(cert?.blockedBy).toBe(STARTTLS_CHECK_IDS.encryption);
  });

  it("accepts a wildcard certificate covering the host", () => {
    const { certificate: cert } = run([
      secured(
        "mail.example.uz",
        "2026-10-06T11:59:00.000Z",
        certificate({ subjectAltNames: ["DNS:*.example.uz"] }),
      ),
    ]);
    expect(cert?.status).toBe("PASS");
  });
});

describe("AC-12.4 — a result is no fresher than its oldest part", () => {
  it("takes the earliest observation time of the hosts that answered", () => {
    const { encryption, analysis } = run([
      secured("a.example.uz", "2026-10-06T11:59:50.000Z"),
      plain("b.example.uz", "2026-10-06T11:58:10.000Z"),
      secured("c.example.uz", "2026-10-06T11:59:59.000Z"),
    ]);
    expect(analysis.observedAt).toBe("2026-10-06T11:58:10.000Z");
    expect(encryption?.freshness.checkedAt).toBe("2026-10-06T11:58:10.000Z");
  });

  it("keeps the scan's own time when nothing was observed", () => {
    const { encryption } = run([{ kind: "CONNECT_FAILED", hostname: "a.example.uz" }]);
    expect(encryption?.freshness.checkedAt).toBe(FRESHNESS.checkedAt);
  });
});
