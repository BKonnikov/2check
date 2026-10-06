import type {
  CheckResult,
  MailHostTarget,
  MessageDescriptor,
  Severity,
  TlsIpFamily,
} from "@2check/contracts";
import ipaddr from "ipaddr.js";
import type { MailServerState } from "./mail-host.js";
import { blockedReason } from "./starttls.js";

type MessageParams = NonNullable<MessageDescriptor["params"]>;

/**
 * 1.1 §8 — the reverse names of the receiving hosts.
 *
 * What is checked is narrow on purpose. A reverse name is confirmed when the name found at an
 * address resolves back to that same address — the forward-and-reverse agreement RFC 1912 asks
 * for — and nothing else about the name is judged. Its shape is not a finding: a name that
 * contains the address, or that looks generated, is how most hosting works and says nothing
 * about the server.
 *
 * It also says nothing about the domain's outgoing mail. These are the addresses mail arrives at,
 * and a receiving host's reverse name does not describe a sending one — §8.7.
 */

/**
 * The reverse lookups one scan may make, per address family.
 *
 * §8.3 wants both families looked at, so the bound is per family rather than shared: a domain
 * whose first hosts are all IPv4 would otherwise spend the whole allowance before reaching an
 * IPv6 address. Each address costs a reverse query and a forward one to confirm it.
 */
export const PTR_MAX_ADDRESSES_PER_FAMILY = 2;

export type PtrOutcome = "ANSWER" | "EMPTY" | "NAME_NOT_FOUND" | "INDETERMINATE";

/** What the reverse zone said about one address. */
export interface PtrObservation {
  readonly address: string;
  /** The mail host whose address this is, so a result can name it. */
  readonly hostname: string;
  readonly outcome: PtrOutcome;
  readonly names?: readonly string[];
}

/** What a reverse name resolves to, which is what confirms it or does not. */
export interface PtrForwardObservation {
  readonly name: string;
  readonly outcome: PtrOutcome;
  readonly addresses?: readonly string[];
  /** RFC 1912 §2.4 — a reverse name should not be an alias. */
  readonly alias?: boolean;
}

export function ipFamilyOf(address: string): TlsIpFamily {
  return address.includes(":") ? "IPV6" : "IPV4";
}

/** Two spellings of one address are one address; `2001:db8::1` and its long form agree. */
export function sameAddress(left: string, right: string): boolean {
  if (left === right) {
    return true;
  }
  try {
    const one = ipaddr.parse(left);
    const other = ipaddr.parse(right);
    return one.kind() === other.kind() && one.toNormalizedString() === other.toNormalizedString();
  } catch {
    return false;
  }
}

/**
 * The name a reverse query is asked at: RFC 1035 §3.5 for IPv4 and RFC 3596 §2.5 for IPv6, which
 * spells the address out one nibble at a time. Both are built from the parsed bytes rather than
 * from the text, so a shortened IPv6 address produces the same name as its long form.
 */
export function reverseName(address: string): string | undefined {
  let bytes: readonly number[];
  try {
    bytes = ipaddr.parse(address).toByteArray();
  } catch {
    return undefined;
  }
  if (bytes.length === 4) {
    return `${[...bytes].reverse().join(".")}.in-addr.arpa`;
  }
  if (bytes.length !== 16) {
    return undefined;
  }
  const nibbles = bytes.flatMap((byte) => [(byte >> 4) & 0xf, byte & 0xf]);
  return `${nibbles
    .reverse()
    .map((nibble) => nibble.toString(16))
    .join(".")}.ip6.arpa`;
}

export type PtrAddressState =
  | "CONFIRMED"
  | "ALIAS"
  | "UNCONFIRMED"
  | "ABSENT"
  | "LOOKUP_FAILED"
  | "CONFIRMATION_INCOMPLETE";

export interface PtrAddressAnalysis {
  readonly address: string;
  readonly hostname: string;
  readonly state: PtrAddressState;
  readonly names: readonly string[];
  /** The name that resolved back to the address, when one did. */
  readonly confirmedName?: string;
}

/**
 * Two ways a family can have nothing to report, and they do not read alike. A host that answers
 * on IPv4 and not on IPv6 simply has no IPv6 address, which nothing blocked; a domain with no
 * receiving host at all has no address because the MX check said so — §2.3.
 */
export type PtrFamilyState = PtrAddressState | "NO_FAMILY_ADDRESS" | "NO_HOSTS";

export interface PtrFamilyAnalysis {
  readonly family: TlsIpFamily;
  readonly state: PtrFamilyState;
  readonly addresses: readonly PtrAddressAnalysis[];
  /** The hosts whose addresses produced the reported state. */
  readonly hosts: readonly string[];
  readonly names: readonly string[];
}

export interface PtrInput {
  readonly reverse: readonly PtrObservation[];
  /** Keyed by reverse name; a name queried once serves every address that named it. */
  readonly forward: readonly PtrForwardObservation[];
}

function assess(
  observation: PtrObservation,
  forward: readonly PtrForwardObservation[],
): PtrAddressAnalysis {
  const { address, hostname } = observation;
  if (observation.outcome === "INDETERMINATE") {
    return { address, hostname, state: "LOOKUP_FAILED", names: [] };
  }
  const names = (observation.names ?? []).filter((name) => name.trim() !== "");
  if (names.length === 0) {
    return { address, hostname, state: "ABSENT", names: [] };
  }

  const resolved = names.map((name) => ({
    name,
    forward: forward.find((entry) => entry.name === name),
  }));
  const confirmed = resolved.find(({ forward: answer }) =>
    (answer?.addresses ?? []).some((candidate) => sameAddress(candidate, address)),
  );
  // RFC 1912 §2.4 — an alias is a finding of its own, and it is one whether or not the name
  // happened to resolve back: following the alias is what made the confirmation possible.
  const alias = resolved.some(({ forward: answer }) => answer?.alias === true);
  if (alias) {
    return {
      address,
      hostname,
      state: "ALIAS",
      names,
      ...(confirmed === undefined ? {} : { confirmedName: confirmed.name }),
    };
  }
  if (confirmed !== undefined) {
    return { address, hostname, state: "CONFIRMED", names, confirmedName: confirmed.name };
  }
  /**
   * §8.6 — without a forward answer we do not know whether the name is confirmed, and we are not
   * entitled to call it unconfirmed. Only a name that answered and did not include the address
   * establishes that.
   */
  if (
    resolved.some(
      ({ forward: answer }) => answer === undefined || answer.outcome === "INDETERMINATE",
    )
  ) {
    return { address, hostname, state: "CONFIRMATION_INCOMPLETE", names };
  }
  return { address, hostname, state: "UNCONFIRMED", names };
}

/**
 * The family's state is the worst established among its addresses, and an established fact comes
 * before a missing observation: a name that answered and did not match is a finding whatever a
 * second address failed to tell us.
 */
const WORST_FIRST: readonly PtrAddressState[] = [
  "UNCONFIRMED",
  "ABSENT",
  "ALIAS",
  "CONFIRMATION_INCOMPLETE",
  "LOOKUP_FAILED",
  "CONFIRMED",
];

function fold(
  family: TlsIpFamily,
  addresses: readonly PtrAddressAnalysis[],
  anyAddresses: boolean,
): PtrFamilyAnalysis {
  if (addresses.length === 0) {
    return {
      family,
      state: anyAddresses ? "NO_FAMILY_ADDRESS" : "NO_HOSTS",
      addresses,
      hosts: [],
      names: [],
    };
  }
  const state = WORST_FIRST.find((candidate) =>
    addresses.some((entry) => entry.state === candidate),
  );
  const matching = addresses.filter((entry) => entry.state === state);
  return {
    family,
    state: state ?? "CONFIRMED",
    addresses,
    hosts: [...new Set(matching.map((entry) => entry.hostname))],
    names: [...new Set(matching.flatMap((entry) => entry.names))],
  };
}

export function analysePtr(input: PtrInput): Readonly<Record<TlsIpFamily, PtrFamilyAnalysis>> {
  const assessed = input.reverse.map((observation) => assess(observation, input.forward));
  const any = assessed.length > 0;
  return {
    IPV4: fold(
      "IPV4",
      assessed.filter((entry) => ipFamilyOf(entry.address) === "IPV4"),
      any,
    ),
    IPV6: fold(
      "IPV6",
      assessed.filter((entry) => ipFamilyOf(entry.address) === "IPV6"),
      any,
    ),
  };
}

/** 1.1 §8.3 — one result per address family, because the two can differ. */
export const PTR_CHECK_IDS = {
  IPV4: "email.ptr.ipv4",
  IPV6: "email.ptr.ipv6",
} as const;

export interface PtrCheckOptions {
  readonly domain: string;
  readonly freshness: CheckResult["freshness"];
  /** 1.1 §2.3 and §15.5 — why there is no address to ask about, when there is none. */
  readonly receivingServer?: MailServerState;
}

const FAMILY_LABEL: Readonly<Record<TlsIpFamily, string>> = { IPV4: "IPv4", IPV6: "IPv6" };

function check(
  analysis: PtrFamilyAnalysis,
  status: CheckResult["status"],
  severity: Severity,
  titleCode: string,
  options: PtrCheckOptions,
  extra: Partial<CheckResult> & { readonly params?: MessageParams } = {},
): CheckResult {
  const { params, ...rest } = extra;
  const hostname = analysis.hosts[0] ?? analysis.addresses[0]?.hostname ?? options.domain;
  const target: MailHostTarget = {
    kind: "MAIL_HOST",
    hostname,
    ipFamily: analysis.family,
  };
  return {
    checkId: PTR_CHECK_IDS[analysis.family],
    category: "email",
    status,
    severity,
    target,
    message: {
      titleCode,
      params: { ipFamily: FAMILY_LABEL[analysis.family], ...params },
    },
    freshness: options.freshness,
    ...rest,
  };
}

export function evaluatePtrCheck(
  analysis: PtrFamilyAnalysis,
  options: PtrCheckOptions,
): CheckResult {
  const hosts = analysis.hosts.join(", ");
  const names = analysis.names.join(", ");
  switch (analysis.state) {
    case "CONFIRMED":
      return check(analysis, "PASS", "none", "email.ptr.present", options, { params: { names } });
    case "UNCONFIRMED":
      return check(analysis, "FAIL", "warning", "email.ptr.fail.unconfirmed", options, {
        params: { names, hosts },
      });
    case "ABSENT":
      /**
       * §8.4 — the levels differ by family, and the reason is what senders actually do: a
       * missing IPv4 reverse name is a long-standing expectation of receiving mail servers,
       * while on IPv6 it is far less consistently expected.
       */
      return check(
        analysis,
        "FAIL",
        analysis.family === "IPV4" ? "warning" : "informational",
        "email.ptr.fail.absent",
        options,
        { params: { hosts } },
      );
    case "ALIAS":
      return check(analysis, "FAIL", "informational", "email.ptr.fail.alias", options, {
        params: { names, hosts },
      });
    case "CONFIRMATION_INCOMPLETE":
      return check(analysis, "UNKNOWN", "none", "email.ptr.unknown.confirmation", options, {
        reasonCode: "ptr_confirmation_incomplete",
        params: { names },
      });
    case "LOOKUP_FAILED":
      return check(analysis, "UNKNOWN", "none", "email.ptr.unknown.lookup", options, {
        reasonCode: "ptr_lookup_failed",
      });
    case "NO_FAMILY_ADDRESS":
      // The hosts answered, just not on this family. Nothing blocked the check; there is simply
      // no address of this kind to ask a reverse question about.
      return check(analysis, "NOT_APPLICABLE", "none", "email.ptr.not_applicable", options);
    default:
      // §2.3 — with no receiving host there is no address to ask about.
      return check(
        analysis,
        "NOT_APPLICABLE",
        "none",
        `email.ptr.blocked.${blockedReason(options.receivingServer)}`,
        options,
        { dependsOn: ["email.mx.records"], blockedBy: "email.mx.records" },
      );
  }
}

export function evaluatePtrChecks(
  analyses: Readonly<Record<TlsIpFamily, PtrFamilyAnalysis>>,
  options: PtrCheckOptions,
): readonly CheckResult[] {
  return [evaluatePtrCheck(analyses.IPV4, options), evaluatePtrCheck(analyses.IPV6, options)];
}
