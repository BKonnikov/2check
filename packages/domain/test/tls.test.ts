import type { CheckFreshness, TlsCertificate } from "@2check/contracts";
import { describe, expect, it } from "vitest";
import {
  certificateCoversHostname,
  daysUntil,
  evaluateCertificateChecks,
  evaluateConnectionCheck,
  evaluateTlsChecks,
  matchesSubjectAltName,
  selectRepresentativeAddress,
  type TlsProbes,
} from "../src/tls.js";

const FRESHNESS: CheckFreshness = {
  checkedAt: "2026-09-15T00:00:00.000Z",
  cached: false,
  cacheAge: 0,
};
const NOW = new Date("2026-09-15T00:00:00.000Z");
const OPTIONS = { hostname: "example.uz", freshness: FRESHNESS, now: NOW };

function certificate(overrides: Partial<TlsCertificate> = {}): TlsCertificate {
  return {
    subject: "CN=example.uz",
    issuer: "CN=Test CA",
    validFrom: "2026-01-01T00:00:00.000Z",
    validTo: "2027-01-01T00:00:00.000Z",
    subjectAltNames: ["DNS:example.uz", "DNS:www.example.uz"],
    fingerprint256: "AA:BB",
    selfSigned: false,
    chainVerification: "TRUSTED",
    ...overrides,
  };
}

describe("AC-10.4 and PRD 10.6 — hostname matching uses SAN only", () => {
  it.each([
    ["example.uz", "DNS:example.uz", true],
    ["example.uz", "DNS:other.uz", false],
    ["a.example.uz", "*.example.uz", true],
    ["example.uz", "*.example.uz", false],
    ["a.b.example.uz", "*.example.uz", false],
    ["a.example.uz", "*.EXAMPLE.UZ", true],
    ["a.example.uz", "*.*.uz", false],
    ["a.example.uz", "*.", false],
    ["example.uz.", "DNS:example.uz", true],
  ])("matches %j against %j as %s", (hostname, san, expected) => {
    expect(matchesSubjectAltName(hostname, san)).toBe(expected);
  });

  it("does not fall back to the subject common name", () => {
    const cert = certificate({ subject: "CN=other.uz", subjectAltNames: ["DNS:other.uz"] });
    expect(certificateCoversHostname("other.uz", cert)).toBe(true);
    expect(certificateCoversHostname("example.uz", cert)).toBe(false);
  });
});

describe("PRD 10.2 — representative endpoint selection", () => {
  const counts: Record<string, number> = { "1.1.1.1": 3, "2.2.2.2": 1, "3.3.3.3": 3 };

  it("prefers the address the most resolvers observed", () => {
    expect(selectRepresentativeAddress(["2.2.2.2", "1.1.1.1"], (a) => counts[a] ?? 0)).toBe(
      "1.1.1.1",
    );
  });

  it("breaks a tie deterministically regardless of input order", () => {
    const first = selectRepresentativeAddress(["3.3.3.3", "1.1.1.1"], (a) => counts[a] ?? 0);
    const second = selectRepresentativeAddress(["1.1.1.1", "3.3.3.3"], (a) => counts[a] ?? 0);
    expect(first).toBe(second);
    expect(first).toBe("1.1.1.1");
  });
});

describe("AC-10.5, AC-10.7 and AC-10.8 — connection classification", () => {
  it("gives N/A to an address family that is absent", () => {
    const check = evaluateConnectionCheck("IPV6", { kind: "ABSENT" }, OPTIONS);
    expect(check.status).toBe("NOT_APPLICABLE");
    expect(check.target.ipFamily).toBe("IPV6");
  });

  it("fails on a target timeout after the security decision allowed the connection", () => {
    const check = evaluateConnectionCheck(
      "IPV4",
      { kind: "TARGET_FAILURE", address: "1.2.3.4", failureCode: "connection_timeout" },
      OPTIONS,
    );
    expect(check.status).toBe("FAIL");
    expect(check.reasonCode).toBeUndefined();
  });

  it("is UNKNOWN when our own scanner failed rather than the target", () => {
    const check = evaluateConnectionCheck(
      "IPV4",
      { kind: "SCANNER_FAILURE", address: "1.2.3.4", reasonCode: "internal_network_error" },
      OPTIONS,
    );
    expect(check.status).toBe("UNKNOWN");
    expect(check.reasonCode).toBe("internal_network_error");
  });

  it("passes and records the negotiated protocol", () => {
    const check = evaluateConnectionCheck(
      "IPV4",
      { kind: "CONNECTED", address: "1.2.3.4", protocol: "TLSv1.3", certificate: certificate() },
      OPTIONS,
    );
    expect(check.status).toBe("PASS");
    expect(check.details?.protocol).toBe("TLSv1.3");
  });
});

describe("AC-10.11 — aggregated certificate checks use dependencyMode ANY", () => {
  const connected = (cert: TlsCertificate) =>
    ({ kind: "CONNECTED", address: "1.2.3.4", protocol: "TLSv1.3", certificate: cert }) as const;

  it("evaluates from one successful family while the other is absent", () => {
    const probes: TlsProbes = { IPV4: connected(certificate()), IPV6: { kind: "ABSENT" } };
    const checks = evaluateCertificateChecks(probes, OPTIONS);
    expect(checks.every((check) => check.status === "PASS")).toBe(true);
    expect(checks[0]?.dependencyMode).toBe("ANY");
    expect(checks[0]?.details?.evaluatedFamilies).toEqual(["IPV4"]);
  });

  it("is not blocked by the other family failing", () => {
    const probes: TlsProbes = {
      IPV4: connected(certificate()),
      IPV6: { kind: "TARGET_FAILURE", address: "::1", failureCode: "connection_timeout" },
    };
    expect(evaluateCertificateChecks(probes, OPTIONS)[0]?.status).toBe("PASS");
  });

  it("still fails when the second available certificate is invalid", () => {
    const probes: TlsProbes = {
      IPV4: connected(certificate()),
      IPV6: connected(
        certificate({ validTo: "2026-01-02T00:00:00.000Z", fingerprint256: "CC:DD" }),
      ),
    };
    const validity = evaluateCertificateChecks(probes, OPTIONS).find(
      (check) => check.checkId === "tls.certificate.validity",
    );
    expect(validity?.status).toBe("FAIL");
  });

  it("resolves by dependency when no family produced a certificate", () => {
    const probes: TlsProbes = {
      IPV4: { kind: "TARGET_FAILURE", address: "1.2.3.4", failureCode: "connection_refused" },
      IPV6: { kind: "ABSENT" },
    };
    for (const check of evaluateCertificateChecks(probes, OPTIONS)) {
      expect(check.status).toBe("UNKNOWN");
      expect(check.blockedBy).toBe("tls.connection.ipv4");
      expect(check.reasonCode).toBeUndefined();
    }
  });
});

describe("AC-10.6 — differing fingerprints are not a failure", () => {
  it("records the variation while both certificates stay valid", () => {
    const probes: TlsProbes = {
      IPV4: {
        kind: "CONNECTED",
        address: "1.2.3.4",
        protocol: "TLSv1.3",
        certificate: certificate(),
      },
      IPV6: {
        kind: "CONNECTED",
        address: "::1",
        protocol: "TLSv1.3",
        certificate: certificate({ fingerprint256: "EE:FF" }),
      },
    };
    const checks = evaluateCertificateChecks(probes, OPTIONS);
    expect(checks.every((check) => check.status === "PASS")).toBe(true);
    expect(checks[0]?.details?.fingerprintVariation).toBe(true);
  });
});

describe("PRD 10.5 — certificate facts", () => {
  it("reports days remaining from the certificate expiring first", () => {
    const probes: TlsProbes = {
      IPV4: {
        kind: "CONNECTED",
        address: "1.2.3.4",
        protocol: "TLSv1.3",
        certificate: certificate({ validTo: "2026-10-15T00:00:00.000Z" }),
      },
      IPV6: { kind: "ABSENT" },
    };
    expect(evaluateCertificateChecks(probes, OPTIONS)[0]?.details?.daysRemaining).toBe(30);
  });

  it("fails a certificate that is not yet valid", () => {
    const probes: TlsProbes = {
      IPV4: {
        kind: "CONNECTED",
        address: "1.2.3.4",
        protocol: "TLSv1.3",
        certificate: certificate({ validFrom: "2027-01-01T00:00:00.000Z" }),
      },
      IPV6: { kind: "ABSENT" },
    };
    expect(evaluateCertificateChecks(probes, OPTIONS)[0]?.status).toBe("FAIL");
  });

  /**
   * AC-11.4 — one root defect is one finding. TLS verification stops at the first fault, so a
   * certificate with the wrong name or the wrong dates never reaches chain verification. The
   * chain check must say so instead of reporting a second critical failure.
   */
  it.each([
    [
      "a name that does not match",
      { subjectAltNames: ["DNS:other.uz"], chainVerification: "NOT_VERIFIED" as const },
      "tls.certificate.hostname",
    ],
    [
      "an expired certificate",
      { validTo: "2026-01-02T00:00:00.000Z", chainVerification: "NOT_VERIFIED" as const },
      "tls.certificate.validity",
    ],
  ])("reports the chain as UNKNOWN for %s", (_name, overrides, failing) => {
    const probes: TlsProbes = {
      IPV4: {
        kind: "CONNECTED",
        address: "1.2.3.4",
        protocol: "TLSv1.3",
        certificate: certificate(overrides),
      },
      IPV6: { kind: "ABSENT" },
    };
    const checks = evaluateCertificateChecks(probes, OPTIONS);
    const chain = checks.find((check) => check.checkId === "tls.certificate.chain");
    expect(chain?.status).toBe("UNKNOWN");
    expect(chain?.reasonCode).toBe("chain_not_verified");
    expect(chain?.severity).toBe("none");
    // Exactly one check fails: the one that actually describes the defect.
    expect(checks.filter((check) => check.status === "FAIL").map((check) => check.checkId)).toEqual(
      [failing],
    );
  });

  it.each([
    [{ chainVerification: "UNTRUSTED" as const }, "untrusted chain"],
    [{ selfSigned: true }, "self-signed leaf"],
  ])("fails the chain check on %s", (overrides) => {
    const probes: TlsProbes = {
      IPV4: {
        kind: "CONNECTED",
        address: "1.2.3.4",
        protocol: "TLSv1.3",
        certificate: certificate(overrides),
      },
      IPV6: { kind: "ABSENT" },
    };
    const chain = evaluateCertificateChecks(probes, OPTIONS).find(
      (check) => check.checkId === "tls.certificate.chain",
    );
    expect(chain?.status).toBe("FAIL");
  });

  it("counts remaining days against the given moment", () => {
    expect(daysUntil("2026-09-25T00:00:00.000Z", NOW)).toBe(10);
    expect(daysUntil("2026-09-14T00:00:00.000Z", NOW)).toBe(-1);
  });
});

describe("AC-10.10 — the TLS target and source contract", () => {
  const checks = evaluateTlsChecks(
    {
      IPV4: {
        kind: "CONNECTED",
        address: "1.2.3.4",
        protocol: "TLSv1.3",
        certificate: certificate(),
      },
      IPV6: { kind: "ABSENT" },
    },
    OPTIONS,
  );

  it("names the host and port on every check", () => {
    for (const check of checks) {
      expect(check.target.kind).toBe("TLS_HOST");
      expect(check.target).toMatchObject({ hostname: "example.uz", port: 443 });
    }
  });

  it("omits ipFamily on the aggregated certificate checks", () => {
    const aggregated = checks.filter((check) => check.checkId.startsWith("tls.certificate."));
    expect(aggregated).toHaveLength(3);
    for (const check of aggregated) {
      expect(check.target.ipFamily).toBeUndefined();
    }
  });

  it("declares representative endpoint coverage", () => {
    expect(checks[0]?.source).toEqual({
      kind: "DIRECT_TLS_PROBE",
      endpointCoverage: "REPRESENTATIVE",
    });
  });
});

/**
 * PRD 13.1 — both are a FAIL of the connection, but "did not answer" and "refused" send whoever
 * comes to fix it to different places.
 */
describe("PRD 13.1 — a connection failure says which kind it was", () => {
  function connection(failureCode: string) {
    const probes: TlsProbes = {
      IPV4: { kind: "TARGET_FAILURE", address: "1.2.3.4", failureCode },
      IPV6: { kind: "ABSENT" },
    };
    return evaluateConnectionCheck("IPV4", probes.IPV4, OPTIONS);
  }

  it.each([
    ["connection_timeout", "tls.connection.fail.timeout"],
    ["ETIMEDOUT", "tls.connection.fail.timeout"],
    ["ECONNREFUSED", "tls.connection.fail.refused"],
    ["ECONNRESET", "tls.connection.fail"],
    ["handshake_failed", "tls.connection.fail"],
  ])("reports %s as %s", (failureCode, titleCode) => {
    const check = connection(failureCode);
    expect(check.status).toBe("FAIL");
    expect(check.message.titleCode).toBe(titleCode);
    // The machine-readable code is unchanged: only the wording is more precise.
    expect(check.details?.failureCode).toBe(failureCode);
  });
});
