import type {
  CheckResult,
  MailHostTarget,
  MessageDescriptor,
  Severity,
  SmtpProbeSource,
  TlsCertificate,
} from "@2check/contracts";
import { certificateCoversHostname } from "./tls.js";

type MessageParams = NonNullable<MessageDescriptor["params"]>;

/**
 * 1.1 §7 — the STARTTLS probe.
 *
 * This is the first check in the category that opens a connection instead of reading DNS, so the
 * narrow part is what the probe is allowed to do: port 25 only, hosts only from §6, and a session
 * of greeting, extensions, upgrade and quit. No sender, recipient or data command is ever issued,
 * which is what makes the probe unusable for sending mail or for testing whether an address
 * exists — §13.3. The rules live in the prober; this module reads what it came back with.
 *
 * What the check must not say is equally fixed: the probe stops short of handing over a message,
 * so it cannot know whether the server would accept one — §7.7.
 */

/** 1.1 §7.3 — each host is a separate connection and a separate handshake, under one budget. */
export const STARTTLS_MAX_HOSTS = 4;

/** 1.1 §7.2 and §13.3 — fixed, and not settable from input or from the domain's records. */
export const SMTP_PORT = 25;

export type StarttlsOutcome =
  /** The server offered STARTTLS and the upgrade succeeded. */
  | {
      readonly kind: "SECURED";
      readonly hostname: string;
      readonly address: string;
      readonly protocol: string;
      readonly certificate: TlsCertificate;
      readonly observedAt: string;
    }
  /** The session reached the extension list and STARTTLS was not in it. */
  | {
      readonly kind: "NOT_OFFERED";
      readonly hostname: string;
      readonly address: string;
      readonly observedAt: string;
    }
  /** STARTTLS was offered and the upgrade failed on the server's side — §7.4. */
  | {
      readonly kind: "UPGRADE_FAILED";
      readonly hostname: string;
      readonly address: string;
      readonly failureCode: string;
      readonly observedAt: string;
    }
  /** Nothing was observed about the server: the connection never came up — §7.6. */
  | { readonly kind: "CONNECT_FAILED"; readonly hostname: string; readonly address?: string }
  /** The session ended before it said anything about encryption — §7.6. */
  | { readonly kind: "SESSION_INCOMPLETE"; readonly hostname: string; readonly address?: string }
  /** 1.0 §15 refused the host, so it was never connected to — §13.2. */
  | { readonly kind: "BLOCKED"; readonly hostname: string; readonly reasonCode: string }
  /** This deployment cannot open outbound mail connections at all — §7.6. */
  | { readonly kind: "UNAVAILABLE"; readonly hostname: string };

export interface StarttlsInput {
  readonly domain: string;
  /** The outcomes, in the preference order the hosts came back from §6 in. */
  readonly probes: readonly StarttlsOutcome[];
  /** Hosts §6 named that were not probed, because §7.3 caps the probe at four. */
  readonly skipped: readonly string[];
}

export type StarttlsState =
  | "ALL_SECURED"
  | "SOME_PLAIN"
  | "NONE_SECURED"
  | "UPGRADE_FAILED"
  | "BLOCKED"
  | "UNAVAILABLE"
  | "NOT_OBSERVED"
  | "NO_HOSTS";

export interface StarttlsAnalysis {
  readonly state: StarttlsState;
  readonly hostsProbed: number;
  readonly hostsSkipped: number;
  /** The hosts that answered at all, which is what a message may name. */
  readonly observedHosts: readonly string[];
  /** The hosts that reached the extension list without offering encryption. */
  readonly plainHosts: readonly string[];
  readonly securedHosts: readonly string[];
  /** The certificate of the first host that got as far as a handshake. */
  readonly certificate?: TlsCertificate;
  readonly certificateHost?: string;
  readonly protocol?: string;
  /** 1.1 §7.6 — why nothing was observed, when nothing was. */
  readonly reasonCode?: string;
  /** 1.1 §12.4 — the earliest of the observation times that went into the result. */
  readonly observedAt?: string;
}

function earliest(times: readonly string[]): string | undefined {
  return [...times].sort()[0];
}

/**
 * 1.1 §7.4 — one verdict over several hosts. A domain that lists four exchangers and encrypts on
 * three of them is not in the same state as one that encrypts on none, so the two are separate
 * findings; and a host that never answered is neither, so it cannot be counted as plain.
 */
export function analyseStarttls(input: StarttlsInput): StarttlsAnalysis {
  const { probes, skipped } = input;
  const base = {
    hostsProbed: probes.length,
    hostsSkipped: skipped.length,
    observedHosts: [] as readonly string[],
    plainHosts: [] as readonly string[],
    securedHosts: [] as readonly string[],
  };
  if (probes.length === 0) {
    return { ...base, state: "NO_HOSTS" };
  }

  const secured = probes.filter((probe) => probe.kind === "SECURED");
  const plain = probes.filter((probe) => probe.kind === "NOT_OFFERED");
  const failedUpgrade = probes.filter((probe) => probe.kind === "UPGRADE_FAILED");
  const observed = [...secured, ...plain, ...failedUpgrade];
  const withCertificate = secured[0];

  const common = {
    ...base,
    observedHosts: observed.map((probe) => probe.hostname),
    plainHosts: plain.map((probe) => probe.hostname),
    securedHosts: secured.map((probe) => probe.hostname),
    ...(withCertificate === undefined
      ? {}
      : {
          certificate: withCertificate.certificate,
          certificateHost: withCertificate.hostname,
          protocol: withCertificate.protocol,
        }),
    ...(() => {
      const at = earliest(observed.map((probe) => probe.observedAt));
      return at === undefined ? {} : { observedAt: at };
    })(),
  };

  if (observed.length === 0) {
    /**
     * Nothing was observed anywhere, so the reason is a property of our side or of the policy,
     * never of the domain. The order is from the most specific cause to the least: a deployment
     * that cannot open the port at all explains every host at once, and a refused host explains
     * itself better than a connection that merely did not come up.
     */
    if (probes.some((probe) => probe.kind === "UNAVAILABLE")) {
      return { ...common, state: "UNAVAILABLE", reasonCode: "outbound_smtp_unavailable" };
    }
    const blocked = probes.find((probe) => probe.kind === "BLOCKED");
    if (blocked !== undefined) {
      return { ...common, state: "BLOCKED", reasonCode: blocked.reasonCode };
    }
    const incomplete = probes.some((probe) => probe.kind === "SESSION_INCOMPLETE");
    return {
      ...common,
      state: "NOT_OBSERVED",
      reasonCode: incomplete ? "starttls_session_incomplete" : "starttls_connect_failed",
    };
  }

  // An upgrade that was offered and then failed is the worst confirmed state, and it is confirmed
  // on the server's side: it answered, said it could encrypt, and then could not.
  if (failedUpgrade.length > 0) {
    return { ...common, state: "UPGRADE_FAILED" };
  }
  if (plain.length === 0) {
    return { ...common, state: "ALL_SECURED" };
  }
  return { ...common, state: secured.length > 0 ? "SOME_PLAIN" : "NONE_SECURED" };
}

/** 1.1 §7 — the encryption of the connection, and the certificate presented over it. */
export const STARTTLS_CHECK_IDS = {
  encryption: "email.starttls.encryption",
  certificate: "email.starttls.certificate",
} as const;

export interface StarttlsCheckOptions {
  readonly domain: string;
  readonly freshness: CheckResult["freshness"];
  readonly now?: Date;
}

function source(analysis: StarttlsAnalysis): SmtpProbeSource {
  return {
    kind: "SMTP_PROBE",
    hostsProbed: analysis.hostsProbed,
    hostsSkipped: analysis.hostsSkipped,
  };
}

function target(hostname: string): MailHostTarget {
  return { kind: "MAIL_HOST", hostname };
}

function check(
  checkId: string,
  status: CheckResult["status"],
  severity: Severity,
  titleCode: string,
  analysis: StarttlsAnalysis,
  options: StarttlsCheckOptions,
  extra: Partial<CheckResult> & { readonly params?: MessageParams } = {},
): CheckResult {
  const { params, ...rest } = extra;
  return {
    checkId,
    category: "email",
    status,
    severity,
    target: target(analysis.certificateHost ?? analysis.observedHosts[0] ?? options.domain),
    message: { titleCode, ...(params === undefined ? {} : { params }) },
    source: source(analysis),
    // 1.1 §12.4 — a result is no fresher than the oldest observation in it.
    freshness:
      analysis.observedAt === undefined
        ? options.freshness
        : { ...options.freshness, checkedAt: analysis.observedAt },
    ...rest,
  };
}

/** The hosts a message may name, which 1.1 §9.4 keeps in the Public view. */
function hostList(hosts: readonly string[]): string {
  return hosts.join(", ");
}

function encryptionCheck(analysis: StarttlsAnalysis, options: StarttlsCheckOptions): CheckResult {
  const counts: MessageParams = {
    probed: analysis.hostsProbed,
    skipped: analysis.hostsSkipped,
  };
  const partial = analysis.hostsSkipped > 0;
  switch (analysis.state) {
    case "ALL_SECURED":
      return check(
        STARTTLS_CHECK_IDS.encryption,
        "PASS",
        "none",
        partial ? "email.starttls.encryption.pass.partial" : "email.starttls.encryption.pass",
        analysis,
        options,
        { params: { ...counts, hosts: hostList(analysis.securedHosts) } },
      );
    case "SOME_PLAIN":
      return check(
        STARTTLS_CHECK_IDS.encryption,
        "FAIL",
        "warning",
        "email.starttls.encryption.fail.some",
        analysis,
        options,
        { params: { ...counts, hosts: hostList(analysis.plainHosts) } },
      );
    case "NONE_SECURED":
      return check(
        STARTTLS_CHECK_IDS.encryption,
        "FAIL",
        "critical",
        "email.starttls.encryption.fail.none",
        analysis,
        options,
        { params: { ...counts, hosts: hostList(analysis.plainHosts) } },
      );
    case "UPGRADE_FAILED":
      return check(
        STARTTLS_CHECK_IDS.encryption,
        "FAIL",
        "critical",
        "email.starttls.encryption.fail.upgrade",
        analysis,
        options,
        { params: { ...counts, hosts: hostList(analysis.observedHosts) } },
      );
    case "UNAVAILABLE":
      // 1.1 §7.6 — a limit of this deployment, told apart from a fault of the server.
      return check(
        STARTTLS_CHECK_IDS.encryption,
        "UNKNOWN",
        "none",
        "email.starttls.encryption.unknown.unavailable",
        analysis,
        options,
        { reasonCode: "outbound_smtp_unavailable" },
      );
    case "BLOCKED":
      return check(
        STARTTLS_CHECK_IDS.encryption,
        "UNKNOWN",
        "none",
        analysis.reasonCode === "own_infrastructure_not_observed"
          ? "email.starttls.encryption.unknown.own"
          : "email.starttls.encryption.unknown.blocked",
        analysis,
        options,
        { reasonCode: analysis.reasonCode ?? "security_validation_incomplete" },
      );
    case "NO_HOSTS":
      // §2.3 — the MX check is what established that there is no receiving server to probe.
      return check(
        STARTTLS_CHECK_IDS.encryption,
        "NOT_APPLICABLE",
        "none",
        "email.starttls.encryption.blocked",
        analysis,
        options,
        { dependsOn: ["email.mx.records"], blockedBy: "email.mx.records" },
      );
    default:
      return check(
        STARTTLS_CHECK_IDS.encryption,
        "UNKNOWN",
        "none",
        analysis.reasonCode === "starttls_session_incomplete"
          ? "email.starttls.encryption.unknown.incomplete"
          : "email.starttls.encryption.unknown.connect",
        analysis,
        options,
        { reasonCode: analysis.reasonCode ?? "starttls_connect_failed", params: counts },
      );
  }
}

/**
 * 1.1 §7.5 — the certificate, parsed by the rules of 1.0 §10 and judged at this category's own
 * severity. The order is the order verification itself stops in: an expired certificate or a name
 * that does not match halts the check before the chain is reached, so reporting the chain first
 * would report a verdict that was never formed.
 */
function certificateCheck(analysis: StarttlsAnalysis, options: StarttlsCheckOptions): CheckResult {
  const dependency = {
    dependsOn: [STARTTLS_CHECK_IDS.encryption],
    blockedBy: STARTTLS_CHECK_IDS.encryption,
  };
  const certificate = analysis.certificate;
  const hostname = analysis.certificateHost;
  if (certificate === undefined || hostname === undefined) {
    return check(
      STARTTLS_CHECK_IDS.certificate,
      "NOT_APPLICABLE",
      "none",
      "email.starttls.certificate.blocked",
      analysis,
      options,
      dependency,
    );
  }

  const now = options.now ?? new Date();
  const params: MessageParams = { host: hostname };
  const fail = (titleCode: string, extra: MessageParams = {}) =>
    check(STARTTLS_CHECK_IDS.certificate, "FAIL", "warning", titleCode, analysis, options, {
      params: { ...params, ...extra },
      dependsOn: [STARTTLS_CHECK_IDS.encryption],
    });

  if (new Date(certificate.validTo).getTime() <= now.getTime()) {
    return fail("email.starttls.certificate.fail.expired");
  }
  if (new Date(certificate.validFrom).getTime() > now.getTime()) {
    return fail("email.starttls.certificate.fail.early");
  }
  if (!certificateCoversHostname(hostname, certificate)) {
    return fail("email.starttls.certificate.fail.hostname");
  }
  if (certificate.chainVerification === "UNTRUSTED") {
    return fail("email.starttls.certificate.fail.untrusted");
  }
  if (certificate.chainVerification === "NOT_VERIFIED") {
    // 1.0 §10.5 — a chain verdict that was never formed is not a verdict of untrusted.
    return check(
      STARTTLS_CHECK_IDS.certificate,
      "UNKNOWN",
      "none",
      "email.starttls.certificate.unknown",
      analysis,
      options,
      {
        reasonCode: "starttls_session_incomplete",
        params,
        dependsOn: [STARTTLS_CHECK_IDS.encryption],
      },
    );
  }
  return check(
    STARTTLS_CHECK_IDS.certificate,
    "PASS",
    "none",
    "email.starttls.certificate.pass",
    analysis,
    options,
    {
      params: { ...params, issuer: certificate.issuer },
      dependsOn: [STARTTLS_CHECK_IDS.encryption],
    },
  );
}

export function evaluateStarttlsChecks(
  analysis: StarttlsAnalysis,
  options: StarttlsCheckOptions,
): readonly CheckResult[] {
  return [encryptionCheck(analysis, options), certificateCheck(analysis, options)];
}
