import type { CheckResult, MailHostTarget, MessageDescriptor, Severity } from "@2check/contracts";
import { type RecognisedService, recogniseMailProvider } from "./services.js";

/**
 * 1.1 §6 — locating the server that receives mail for a domain.
 *
 * The order is RFC 5321's, restated in RFC 7505: the MX records, and failing those the domain's
 * own address records. That second step is why "no MX" is not "no mail server" — mail still
 * arrives, at whatever answers for the website — and it is the reason this module exists apart
 * from a simple record check.
 */

type MessageParams = NonNullable<MessageDescriptor["params"]>;

export type MailLookupOutcome = "ANSWER" | "EMPTY" | "NAME_NOT_FOUND" | "INDETERMINATE";

export interface MxRecord {
  readonly preference: number;
  readonly exchange: string;
}

export interface MxObservation {
  readonly outcome: MailLookupOutcome;
  readonly records?: readonly MxRecord[];
}

/** What was found at one host name: addresses, and whether the name is an alias. */
export interface HostObservation {
  readonly hostname: string;
  readonly outcome: MailLookupOutcome;
  readonly addresses?: readonly string[];
  /** RFC 2181 §10.3 — an MX target must not be an alias. */
  readonly alias?: boolean;
}

export type MailServerState =
  | "HOSTS"
  | "IMPLICIT"
  | "NULL_MX"
  | "MISSING"
  | "NO_USABLE_HOST"
  | "INDETERMINATE";

export interface MailHost {
  readonly hostname: string;
  readonly preference?: number;
  readonly implicit?: boolean;
  readonly addresses: readonly string[];
}

export interface MailServerAnalysis {
  readonly state: MailServerState;
  /** The hosts the dependent checks may use; empty whenever there is no subject. */
  readonly hosts: readonly MailHost[];
  readonly aliasHosts: readonly string[];
  readonly literalHosts: readonly string[];
  readonly unusableHosts: readonly string[];
  readonly indeterminateHosts: readonly string[];
  /** PRD 8.3 — the service the hosts point at, where the records name one. */
  readonly recognisedService?: RecognisedService;
}

/** RFC 7505 §3 — preference 0 and an empty host, and nothing else alongside it. */
export function isNullMx(records: readonly MxRecord[]): boolean {
  return records.length === 1 && records[0]?.preference === 0 && isRootLabel(records[0].exchange);
}

function isRootLabel(exchange: string): boolean {
  const trimmed = exchange.trim();
  return trimmed === "" || trimmed === ".";
}

/** An MX target must be a name. An address written in its place resolves for nobody. */
export function isAddressLiteral(exchange: string): boolean {
  const value = exchange.trim().replace(/\.$/, "");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    return value.split(".").every((part) => Number(part) <= 255);
  }
  return value.includes(":") && /^[0-9a-f:]+$/i.test(value);
}

function normalise(name: string): string {
  return name.trim().replace(/\.$/, "").toLowerCase();
}

export interface MailServerInput {
  readonly domain: string;
  readonly mx: MxObservation;
  /** The domain's own addresses, which RFC 5321 falls back to when there is no MX. */
  readonly domainAddresses: HostObservation;
  readonly hosts: readonly HostObservation[];
}

export function analyseMailServer(input: MailServerInput): MailServerAnalysis {
  const empty = {
    hosts: [],
    aliasHosts: [],
    literalHosts: [],
    unusableHosts: [],
    indeterminateHosts: [],
  } as const;

  if (input.mx.outcome === "INDETERMINATE") {
    return { state: "INDETERMINATE", ...empty };
  }

  const records = [...(input.mx.records ?? [])].sort((a, b) => a.preference - b.preference);
  if (records.length > 0 && isNullMx(records)) {
    return { state: "NULL_MX", ...empty };
  }

  if (records.length === 0) {
    // RFC 5321 §5 — with no MX the domain's own addresses receive mail, implicitly.
    if (input.domainAddresses.outcome === "INDETERMINATE") {
      return { state: "INDETERMINATE", ...empty };
    }
    const addresses = input.domainAddresses.addresses ?? [];
    if (addresses.length === 0) {
      return { state: "MISSING", ...empty };
    }
    return {
      state: "IMPLICIT",
      hosts: [{ hostname: normalise(input.domain), implicit: true, addresses }],
      aliasHosts: [],
      literalHosts: [],
      unusableHosts: [],
      indeterminateHosts: [],
    };
  }

  const byName = new Map(input.hosts.map((host) => [normalise(host.hostname), host]));
  const hosts: MailHost[] = [];
  const aliasHosts: string[] = [];
  const literalHosts: string[] = [];
  const unusableHosts: string[] = [];
  const indeterminateHosts: string[] = [];

  for (const record of records) {
    const name = normalise(record.exchange);
    if (isAddressLiteral(record.exchange)) {
      literalHosts.push(name);
      continue;
    }
    if (isRootLabel(record.exchange)) {
      // A root label alongside other records is not the null MX of RFC 7505; it points nowhere.
      unusableHosts.push(name);
      continue;
    }
    const observed = byName.get(name);
    if (observed === undefined || observed.outcome === "INDETERMINATE") {
      indeterminateHosts.push(name);
      continue;
    }
    if (observed.alias === true) {
      aliasHosts.push(name);
    }
    const addresses = observed.addresses ?? [];
    if (addresses.length === 0) {
      unusableHosts.push(name);
      continue;
    }
    hosts.push({ hostname: name, preference: record.preference, addresses });
  }

  if (hosts.length === 0) {
    // Nothing to deliver to. An unfinished lookup is not the same as a host that cannot take mail.
    return indeterminateHosts.length > 0
      ? { state: "INDETERMINATE", ...empty, indeterminateHosts }
      : { state: "NO_USABLE_HOST", ...empty, aliasHosts, literalHosts, unusableHosts };
  }

  const service = recogniseMailProvider(records.map((record) => record.exchange));
  return {
    state: "HOSTS",
    hosts,
    aliasHosts,
    literalHosts,
    unusableHosts,
    indeterminateHosts,
    ...(service === undefined ? {} : { recognisedService: service }),
  };
}

export const MAIL_CHECK_IDS = { records: "email.mx.records" } as const;

interface MailCheckOptions {
  readonly domain: string;
  readonly freshness: CheckResult["freshness"];
}

function target(analysis: MailServerAnalysis, options: MailCheckOptions): MailHostTarget {
  const first = analysis.hosts[0];
  return {
    kind: "MAIL_HOST",
    hostname: first?.hostname ?? options.domain,
    ...(first?.preference === undefined ? {} : { preference: first.preference }),
    ...(first?.implicit === true ? { implicit: true } : {}),
  };
}

function check(
  status: CheckResult["status"],
  severity: Severity,
  titleCode: string,
  analysis: MailServerAnalysis,
  options: MailCheckOptions,
  extra: { readonly reasonCode?: string; readonly params?: MessageParams } = {},
): CheckResult {
  const { params, ...rest } = extra;
  return {
    checkId: MAIL_CHECK_IDS.records,
    category: "email",
    status,
    severity,
    target: target(analysis, options),
    message: { titleCode, ...(params === undefined ? {} : { params }) },
    freshness: options.freshness,
    ...rest,
  };
}

/**
 * 1.1 §6.3 — one status for the state of the receiving server, and the hosts it hands on.
 *
 * A declared refusal of mail is a PASS: a domain that takes no mail and says so is configured
 * correctly, and saying so is what RFC 7505 exists for. Delivery by address records is a warning
 * rather than a critical failure, because the mail does arrive — just at a host chosen by the
 * question "where is the site", which is not the question that was asked.
 */
export function evaluateMailServerCheck(
  analysis: MailServerAnalysis,
  options: MailCheckOptions,
): CheckResult {
  switch (analysis.state) {
    case "NULL_MX":
      return check("PASS", "none", "email.mx.records.null", analysis, options);
    case "IMPLICIT":
      return check("FAIL", "warning", "email.mx.records.fail.implicit", analysis, options);
    case "MISSING":
      return check("FAIL", "warning", "email.mx.records.fail.missing", analysis, options);
    case "NO_USABLE_HOST":
      return check("FAIL", "critical", "email.mx.records.fail.unusable", analysis, options, {
        params: { count: analysis.literalHosts.length + analysis.unusableHosts.length },
      });
    case "INDETERMINATE":
      return check("UNKNOWN", "none", "email.mx.records.unknown", analysis, options, {
        reasonCode:
          analysis.indeterminateHosts.length > 0 ? "mx_host_resolution_failed" : "mx_lookup_failed",
      });
    default:
      break;
  }

  if (analysis.literalHosts.length > 0) {
    return check("FAIL", "critical", "email.mx.records.fail.literal", analysis, options, {
      params: { hosts: analysis.literalHosts.join(", ") },
    });
  }
  if (analysis.aliasHosts.length > 0) {
    return check("FAIL", "warning", "email.mx.records.fail.alias", analysis, options, {
      params: { hosts: analysis.aliasHosts.join(", ") },
    });
  }
  if (analysis.unusableHosts.length > 0) {
    return check("FAIL", "warning", "email.mx.records.fail.partial", analysis, options, {
      params: { hosts: analysis.unusableHosts.join(", ") },
    });
  }
  const service = analysis.recognisedService;
  if (service?.delivery === "forwarding") {
    /**
     * The records look like any other provider's, and the arrangement behind them is a different
     * one: nothing is stored here, the message goes on to an address somewhere else. That is a
     * published property of the service — what happens to a particular message is not claimed.
     */
    return check("PASS", "none", "email.mx.records.present.forwarding", analysis, options, {
      params: { service: service.name, count: analysis.hosts.length },
    });
  }
  if (service !== undefined) {
    return check("PASS", "none", "email.mx.records.present.service", analysis, options, {
      params: { service: service.name, count: analysis.hosts.length },
    });
  }
  return check("PASS", "none", "email.mx.records.present", analysis, options, {
    params: { count: analysis.hosts.length },
  });
}

/**
 * 1.1 §2.3 — the two states that leave the checks of the receiving server without a subject.
 * The value names the check that blocked them, as 1.0 §7's contract does everywhere else; which
 * of the two states it was belongs in those checks' own wording.
 */
export function mailServerSubject(analysis: MailServerAnalysis): "PRESENT" | "NULL_MX" | "MISSING" {
  switch (analysis.state) {
    case "HOSTS":
    case "IMPLICIT":
      return "PRESENT";
    case "NULL_MX":
      return "NULL_MX";
    default:
      return "MISSING";
  }
}
