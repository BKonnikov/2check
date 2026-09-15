import type {
  CheckFreshness,
  CheckResult,
  Severity,
  TlsCertificate,
  TlsCheckSource,
  TlsCheckTarget,
  TlsIpFamily,
} from "@2check/contracts";

/**
 * PRD 10.8–10.9 — what the network layer observed for one address family.
 * The distinction that matters: a failure of the target is a FAIL, while a failure of our own
 * scanner is an UNKNOWN, because it says nothing about the target.
 */
export type TlsProbeOutcome =
  | { readonly kind: "ABSENT" }
  | {
      readonly kind: "CONNECTED";
      readonly address: string;
      readonly protocol: string;
      readonly certificate: TlsCertificate;
    }
  | { readonly kind: "TARGET_FAILURE"; readonly address: string; readonly failureCode: string }
  | {
      readonly kind: "SCANNER_FAILURE";
      readonly address: string;
      readonly reasonCode: "internal_network_error" | "scanner_tls_error";
    };

export type TlsProbes = Readonly<Record<TlsIpFamily, TlsProbeOutcome>>;

export interface TlsEvaluationOptions {
  readonly hostname: string;
  readonly freshness: CheckFreshness;
  readonly now?: Date;
}

const SOURCE: TlsCheckSource = { kind: "DIRECT_TLS_PROBE", endpointCoverage: "REPRESENTATIVE" };

/** The machine value stays IPV4/IPV6 in target.ipFamily; message parameters read naturally. */
const FAMILY_LABEL: Readonly<Record<TlsIpFamily, string>> = { IPV4: "IPv4", IPV6: "IPv6" };

function target(hostname: string, ipFamily?: TlsIpFamily): TlsCheckTarget {
  return ipFamily === undefined
    ? { kind: "TLS_HOST", hostname, port: 443 }
    : { kind: "TLS_HOST", hostname, port: 443, ipFamily };
}

/**
 * PRD 10.2 — the representative endpoint is the address the most resolvers saw; ties are broken
 * by lexicographic order so the same candidate set always yields the same endpoint.
 */
export function selectRepresentativeAddress(
  addresses: readonly string[],
  observationCount: (address: string) => number,
): string | undefined {
  return [...addresses].sort((left, right) => {
    const difference = observationCount(right) - observationCount(left);
    return difference !== 0 ? difference : left.localeCompare(right);
  })[0];
}

/**
 * PRD 10.6 — hostname matching uses SAN only, with no CN fallback.
 * A wildcard covers exactly one full leftmost label: *.example.uz matches a.example.uz but
 * neither example.uz itself nor a.b.example.uz.
 */
export function matchesSubjectAltName(hostname: string, entry: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const san = entry.toLowerCase().replace(/^dns:/, "").trim().replace(/\.$/, "");
  if (san === "") {
    return false;
  }
  if (!san.startsWith("*.")) {
    return san === host;
  }

  const suffix = san.slice(2);
  if (suffix === "" || suffix.includes("*")) {
    return false;
  }
  if (!host.endsWith(`.${suffix}`)) {
    return false;
  }
  const label = host.slice(0, host.length - suffix.length - 1);
  return label !== "" && !label.includes(".");
}

export function certificateCoversHostname(hostname: string, certificate: TlsCertificate): boolean {
  return certificate.subjectAltNames.some((entry) => matchesSubjectAltName(hostname, entry));
}

export function daysUntil(validTo: string, now: Date): number {
  return Math.floor((new Date(validTo).getTime() - now.getTime()) / 86_400_000);
}

export interface TlsConnectionDetails {
  readonly address?: string;
  readonly protocol?: string;
  readonly failureCode?: string;
}

/** PRD 10.8 and AC-10.5, AC-10.7, AC-10.8 — one connection check per address family. */
export function evaluateConnectionCheck(
  family: TlsIpFamily,
  outcome: TlsProbeOutcome,
  options: TlsEvaluationOptions,
): CheckResult<TlsConnectionDetails> {
  const checkId = `tls.connection.${family.toLowerCase()}`;
  const base = {
    checkId,
    category: "tls" as const,
    target: target(options.hostname, family),
    source: SOURCE,
    freshness: options.freshness,
  };

  switch (outcome.kind) {
    case "ABSENT":
      return {
        ...base,
        status: "NOT_APPLICABLE",
        severity: "none" as Severity,
        message: {
          titleCode: "tls.connection.not_applicable",
          params: { ipFamily: FAMILY_LABEL[family] },
        },
      };
    case "CONNECTED":
      return {
        ...base,
        status: "PASS",
        severity: "none" as Severity,
        message: {
          titleCode: "tls.connection.pass",
          params: { ipFamily: FAMILY_LABEL[family], protocol: outcome.protocol },
        },
        details: { address: outcome.address, protocol: outcome.protocol },
      };
    case "TARGET_FAILURE":
      // AC-10.7 — a timeout against the target after ALLOW is a property of the target.
      return {
        ...base,
        status: "FAIL",
        severity: "critical" as Severity,
        message: { titleCode: "tls.connection.fail", params: { ipFamily: FAMILY_LABEL[family] } },
        details: { address: outcome.address, failureCode: outcome.failureCode },
      };
    case "SCANNER_FAILURE":
      // AC-10.8 — our own failure observed nothing about the target.
      return {
        ...base,
        status: "UNKNOWN",
        severity: "none" as Severity,
        reasonCode: outcome.reasonCode,
        message: {
          titleCode: "tls.connection.unknown",
          params: { ipFamily: FAMILY_LABEL[family] },
        },
        details: { address: outcome.address },
      };
  }
}

export interface TlsCertificateDetails {
  readonly evaluatedFamilies: readonly TlsIpFamily[];
  readonly chainErrorCode?: string;
  readonly daysRemaining?: number;
  readonly validFrom?: string;
  readonly validTo?: string;
  readonly issuer?: string;
  readonly subjectAltNames?: readonly string[];
  readonly fingerprints?: Readonly<Record<string, string>>;
  readonly fingerprintVariation?: boolean;
}

interface CertificateAssessment {
  readonly family: TlsIpFamily;
  readonly certificate: TlsCertificate;
}

function collectCertificates(probes: TlsProbes): CertificateAssessment[] {
  const collected: CertificateAssessment[] = [];
  for (const family of ["IPV4", "IPV6"] as const) {
    const outcome = probes[family];
    if (outcome.kind === "CONNECTED") {
      collected.push({ family, certificate: outcome.certificate });
    }
  }
  return collected;
}

/**
 * PRD 10.7 and AC-10.11 — the aggregated certificate checks.
 *
 * dependencyMode ANY decides whether evaluation may start: one successful path carrying a
 * certificate is enough, and an absent, N/A, failed or unknown other family does not block it.
 * It does not licence ignoring a second available certificate — an invalid certificate on any
 * evaluated family fails the aggregated check. With no certificate at all the check is resolved
 * by dependency through blockedBy rather than inventing a failure of its own.
 */
export function evaluateCertificateChecks(
  probes: TlsProbes,
  options: TlsEvaluationOptions,
): CheckResult<TlsCertificateDetails>[] {
  const now = options.now ?? new Date();
  const assessments = collectCertificates(probes);
  const dependsOn = ["tls.connection.ipv4", "tls.connection.ipv6"];

  const shared = {
    category: "tls" as const,
    target: target(options.hostname),
    dependsOn,
    dependencyMode: "ANY" as const,
    source: SOURCE,
    freshness: options.freshness,
  };

  const ids = ["tls.certificate.validity", "tls.certificate.hostname", "tls.certificate.chain"];

  if (assessments.length === 0) {
    // PRD 10.7 — no successful path with a certificate: resolved by dependency, not by a failure.
    return ids.map((checkId) => ({
      ...shared,
      checkId,
      status: "UNKNOWN" as const,
      severity: "none" as Severity,
      blockedBy: dependsOn[0] ?? "tls.connection.ipv4",
      message: { titleCode: `${checkId}.blocked` },
      details: { evaluatedFamilies: [] },
    }));
  }

  const families = assessments.map((entry) => entry.family);
  const fingerprints = Object.fromEntries(
    assessments.map((entry) => [entry.family, entry.certificate.fingerprint256]),
  );
  // AC-10.6 — differing fingerprints between families are recorded, never a failure by themselves.
  const fingerprintVariation = new Set(Object.values(fingerprints)).size > 1;

  const soonest = assessments.reduce((earliest, entry) =>
    new Date(entry.certificate.validTo) < new Date(earliest.certificate.validTo) ? entry : earliest,
  );
  const daysRemaining = daysUntil(soonest.certificate.validTo, now);

  const expired = assessments.some(
    (entry) =>
      new Date(entry.certificate.validTo).getTime() <= now.getTime() ||
      new Date(entry.certificate.validFrom).getTime() > now.getTime(),
  );
  const nameMismatch = assessments.some(
    (entry) => !certificateCoversHostname(options.hostname, entry.certificate),
  );
  /**
   * AC-11.4 — one root defect, one finding. A certificate that fails on its name or its dates
   * never got as far as chain verification, so the chain check reports UNKNOWN rather than
   * turning a single defect into two critical issues and two score penalties.
   */
  const chainBroken = assessments.some(
    (entry) => entry.certificate.chainVerification === "UNTRUSTED" || entry.certificate.selfSigned,
  );
  const chainUnverified =
    !chainBroken &&
    assessments.some((entry) => entry.certificate.chainVerification === "NOT_VERIFIED");
  const chainErrorCode = assessments.find((entry) => entry.certificate.chainErrorCode !== undefined)
    ?.certificate.chainErrorCode;

  const details: TlsCertificateDetails = {
    evaluatedFamilies: families,
    ...(chainErrorCode === undefined ? {} : { chainErrorCode }),
    daysRemaining,
    validFrom: soonest.certificate.validFrom,
    validTo: soonest.certificate.validTo,
    issuer: soonest.certificate.issuer,
    subjectAltNames: soonest.certificate.subjectAltNames,
    fingerprints,
    fingerprintVariation,
  };

  const verdicts: readonly (readonly [string, boolean, boolean])[] = [
    ["tls.certificate.validity", expired, false],
    ["tls.certificate.hostname", nameMismatch, false],
    ["tls.certificate.chain", chainBroken, chainUnverified],
  ];

  return verdicts.map(([checkId, failed, unverified]) => {
    if (unverified) {
      return {
        ...shared,
        checkId,
        status: "UNKNOWN" as const,
        severity: "none" as Severity,
        reasonCode: "chain_not_verified",
        message: { titleCode: `${checkId}.unknown` },
        details,
      };
    }
    return {
      ...shared,
      checkId,
      status: failed ? ("FAIL" as const) : ("PASS" as const),
      severity: (failed ? "critical" : "none") as Severity,
      message: { titleCode: `${checkId}.${failed ? "fail" : "pass"}` },
      details,
    };
  });
}

/** PRD 10.1 — the whole TLS category for one host. */
export function evaluateTlsChecks(
  probes: TlsProbes,
  options: TlsEvaluationOptions,
): CheckResult<TlsConnectionDetails | TlsCertificateDetails>[] {
  return [
    evaluateConnectionCheck("IPV4", probes.IPV4, options),
    evaluateConnectionCheck("IPV6", probes.IPV6, options),
    ...evaluateCertificateChecks(probes, options),
  ];
}

/**
 * PRD 15.6–15.7 — the visible TLS result when security validation did not allow the connection.
 * A BLOCK is not a problem of the domain: the connection checks are UNKNOWN with the security
 * reason code, the certificate checks follow by dependency, and no failure is invented.
 */
export function evaluateTlsBlockedChecks(
  reasonCode: "ssrf_policy_block" | "security_validation_incomplete" | "dns_quorum_not_reached",
  options: TlsEvaluationOptions,
): CheckResult<TlsConnectionDetails | TlsCertificateDetails>[] {
  const dependsOn = ["tls.connection.ipv4", "tls.connection.ipv6"];
  const connections = (["IPV4", "IPV6"] as const).map((family) => {
    const checkId = `tls.connection.${family.toLowerCase()}`;
    return {
      checkId,
      category: "tls" as const,
      status: "UNKNOWN" as const,
      severity: "none" as Severity,
      target: target(options.hostname, family),
      reasonCode,
      message: { titleCode: "tls.connection.unknown", params: { ipFamily: FAMILY_LABEL[family] } },
      source: SOURCE,
      freshness: options.freshness,
    };
  });

  const certificates = [
    "tls.certificate.validity",
    "tls.certificate.hostname",
    "tls.certificate.chain",
  ].map((checkId) => ({
    checkId,
    category: "tls" as const,
    status: "UNKNOWN" as const,
    severity: "none" as Severity,
    target: target(options.hostname),
    dependsOn,
    dependencyMode: "ANY" as const,
    blockedBy: dependsOn[0] ?? "tls.connection.ipv4",
    message: { titleCode: `${checkId}.blocked` },
    source: SOURCE,
    freshness: options.freshness,
    details: { evaluatedFamilies: [] as TlsIpFamily[] },
  }));

  return [...connections, ...certificates];
}
