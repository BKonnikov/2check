import type {
  CheckResult,
  DnsRecordSource,
  EmailPolicyTarget,
  MessageDescriptor,
  Severity,
} from "@2check/contracts";

type MessageParams = NonNullable<MessageDescriptor["params"]>;

/**
 * 1.1 §4 — the DMARC policy check.
 *
 * RFC 9989 replaced RFC 7489 in May 2026. Two of its changes shape this module: the policy that
 * applies to a name is found by walking the DNS tree rather than by consulting a public suffix
 * list, and the `pct` tag no longer exists. A record written for the old specification is read by
 * the new rules, because that is what a receiver following the new rules does with it.
 *
 * What is checked is the published policy, not the fate of any message: alignment is a property
 * of a message, and without a message there is nothing to align.
 */

/** RFC 9989 §4.10 — the walk makes at most eight queries, counting the domain's own. */
export const DMARC_QUERY_LIMIT = 8;

/** RFC 9989 §4.10 step 4 — a longer name is shortened to this many labels before walking up. */
export const DMARC_WALK_LABELS = 7;

const POLICY_LABEL = "_dmarc";
const VERSION_TAG = "v";
const VERSION_VALUE = "DMARC1";
const MENTIONS_DMARC = /dmarc/i;
const URI = /^[a-z][a-z0-9+.-]*:/i;

export type DmarcPolicy = "none" | "quarantine" | "reject";
const POLICIES = new Set<string>(["none", "quarantine", "reject"]);

/** RFC 9989 §4.10.1 — which tag supplies the policy depends on where the record was found. */
export type DmarcPolicyTag = "p" | "sp" | "np";

export interface DmarcRecord {
  readonly text: string;
  /** Tag names lowercased; where a name repeats, the first occurrence wins. */
  readonly tags: ReadonlyMap<string, string>;
}

/** The name a DMARC record is published at. */
export function dmarcPolicyName(domain: string): string {
  return `${POLICY_LABEL}.${domain}`;
}

/**
 * RFC 9989 §4.7 — a tag-value list in which `v` comes first and its value is case-sensitive, so a
 * record that merely mentions DMARC1 somewhere is not one. A later tag that cannot be read is
 * ignored, exactly as an unknown tag is; only the version decides whether the record counts.
 */
export function parseDmarcRecord(text: string): DmarcRecord | undefined {
  const parts = text
    .trim()
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part !== "");
  const head = parts[0];
  if (head === undefined) {
    return undefined;
  }
  const separator = head.indexOf("=");
  if (
    separator <= 0 ||
    head.slice(0, separator).trim().toLowerCase() !== VERSION_TAG ||
    head.slice(separator + 1).trim() !== VERSION_VALUE
  ) {
    return undefined;
  }
  const tags = new Map<string, string>([[VERSION_TAG, VERSION_VALUE]]);
  for (const part of parts.slice(1)) {
    const at = part.indexOf("=");
    if (at <= 0) {
      continue;
    }
    const name = part.slice(0, at).trim().toLowerCase();
    if (!tags.has(name)) {
      tags.set(name, part.slice(at + 1).trim());
    }
  }
  return { text: text.trim(), tags };
}

export function isDmarcRecord(value: string): boolean {
  return parseDmarcRecord(value) !== undefined;
}

export type DmarcLookupOutcome = "ANSWER" | "EMPTY" | "NAME_NOT_FOUND" | "INDETERMINATE";

export interface DmarcLookupAnswer {
  readonly outcome: DmarcLookupOutcome;
  readonly records?: readonly string[];
}

/** The port the walk reads through; the transport belongs to the API, not to this module. */
export type DmarcLookup = (policyName: string) => Promise<DmarcLookupAnswer>;

type NodeState = "VALID" | "ABSENT" | "MULTIPLE" | "UNRECOGNISED" | "INDETERMINATE";

interface Node {
  readonly name: string;
  readonly state: NodeState;
  readonly record?: DmarcRecord;
  readonly count: number;
}

/**
 * RFC 9989 §4.10 step 2 — records that are not DMARC records are discarded, and if more than one
 * remains for a name they are all discarded.
 *
 * A text that names DMARC but does not parse was meant to be a policy; anything else living at
 * this name is not a DMARC record at all, so the name counts as carrying none.
 */
function read(name: string, answer: DmarcLookupAnswer): Node {
  if (answer.outcome === "INDETERMINATE") {
    return { name, state: "INDETERMINATE", count: 0 };
  }
  const texts = answer.records ?? [];
  const parsed = texts
    .map((text) => parseDmarcRecord(text))
    .filter((record): record is DmarcRecord => record !== undefined);
  if (parsed.length > 1) {
    return { name, state: "MULTIPLE", count: parsed.length };
  }
  const single = parsed[0];
  if (single !== undefined) {
    return { name, state: "VALID", record: single, count: 1 };
  }
  const intended = texts.filter((text) => MENTIONS_DMARC.test(text));
  return intended.length > 0
    ? { name, state: "UNRECOGNISED", count: intended.length }
    : { name, state: "ABSENT", count: 0 };
}

function labelsOf(domain: string): readonly string[] {
  return domain.split(".").filter((label) => label !== "");
}

/**
 * RFC 9989 §4.10 steps 3, 4 and 7 — the names above the subject domain, in the order queried. A
 * name of more than seven labels is shortened first, which is what keeps the walk inside its
 * eight-query budget however deep the name is.
 */
export function dmarcWalkTargets(domain: string): readonly string[] {
  const parts = labelsOf(domain);
  let remaining =
    parts.length > DMARC_WALK_LABELS
      ? parts.slice(parts.length - DMARC_WALK_LABELS)
      : parts.slice(1);
  const targets: string[] = [];
  while (remaining.length > 0) {
    targets.push(remaining.join("."));
    remaining = remaining.slice(1);
  }
  return targets;
}

/** The name one label nearer the subject domain than `suffix`, which is a suffix of it. */
function labelBelow(domain: string, suffix: string): string {
  const parts = labelsOf(domain);
  const depth = labelsOf(suffix).length + 1;
  return depth > parts.length ? domain : parts.slice(parts.length - depth).join(".");
}

interface Walk {
  readonly nodes: readonly Node[];
  readonly psd?: { readonly name: string; readonly value: "y" | "n" };
  readonly incomplete: boolean;
  readonly queries: number;
}

async function walkUp(domain: string, lookup: DmarcLookup, queried: number): Promise<Walk> {
  const nodes: Node[] = [];
  let queries = queried;
  let incomplete = false;
  let psd: { name: string; value: "y" | "n" } | undefined;
  for (const target of dmarcWalkTargets(domain)) {
    if (queries >= DMARC_QUERY_LIMIT) {
      break;
    }
    queries += 1;
    const node = read(target, await lookup(dmarcPolicyName(target)));
    nodes.push(node);
    if (node.state === "INDETERMINATE") {
      incomplete = true;
      break;
    }
    const tag = node.record?.tags.get("psd")?.toLowerCase();
    if (node.state === "VALID" && (tag === "y" || tag === "n")) {
      psd = { name: target, value: tag };
      break;
    }
  }
  return { nodes, ...(psd === undefined ? {} : { psd }), incomplete, queries };
}

/**
 * RFC 9989 §4.10.2 — a `psd=n` record marks the organisational domain itself; a `psd=y` record
 * marks a public suffix, so the organisational domain is the name one label below it. With no psd
 * tag anywhere, the record highest up the tree marks the boundary, and with no record at all the
 * subject domain is its own organisational domain.
 */
function organisationalDomain(domain: string, walk: Walk): string {
  const { psd } = walk;
  if (psd?.value === "n") {
    return psd.name;
  }
  if (psd?.value === "y") {
    return labelBelow(domain, psd.name);
  }
  const valid = walk.nodes.filter((node) => node.state === "VALID");
  // The walk runs from the subject domain upwards, so the last record found is the highest one.
  return valid[valid.length - 1]?.name ?? domain;
}

function policyOf(record: DmarcRecord, tag: DmarcPolicyTag): DmarcPolicy | undefined {
  const raw = record.tags.get(tag)?.toLowerCase();
  return raw !== undefined && POLICIES.has(raw) ? (raw as DmarcPolicy) : undefined;
}

/**
 * RFC 9989 §4.10.1 — the domain's own record speaks through `p`. An inherited record speaks
 * through `sp` for a name that exists and `np` for one that does not, each falling back towards
 * `p`. Where existence was not established we do not reach for `np`, because it is the tag for a
 * name we know to be absent.
 */
function effectivePolicy(
  record: DmarcRecord,
  inherited: boolean,
  domainExists: boolean | undefined,
): { readonly policy?: DmarcPolicy; readonly tag?: DmarcPolicyTag } {
  const order: readonly DmarcPolicyTag[] = inherited
    ? domainExists === false
      ? ["np", "sp", "p"]
      : ["sp", "p"]
    : ["p"];
  for (const tag of order) {
    const policy = policyOf(record, tag);
    if (policy !== undefined) {
      return { policy, tag };
    }
  }
  return {};
}

function reportUris(record: DmarcRecord): readonly string[] {
  return (record.tags.get("rua") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => URI.test(entry));
}

/**
 * 1.1 §9.4 — the domain a report goes to is public, the full address is not. The domain is what
 * tells a reader whether the reports leave for a third party; the local part adds nothing to that
 * and is already more of somebody's address than the question needs.
 *
 * RFC 9989 §4.7 allows a size limit after the URI, as in `mailto:d@example.uz!10m`.
 */
function reportDomains(uris: readonly string[]): readonly string[] {
  const domains = new Set<string>();
  for (const uri of uris) {
    const [address] = uri.split("!");
    const at = (address ?? "").lastIndexOf("@");
    if (!/^mailto:/i.test(uri) || at < 0) {
      continue;
    }
    const domain = (address ?? "").slice(at + 1).toLowerCase();
    if (domain !== "") {
      domains.add(domain);
    }
  }
  return [...domains];
}

export type DmarcRecordState =
  | "OWN"
  | "INHERITED"
  | "ABSENT"
  | "MULTIPLE"
  | "UNRECOGNISED"
  | "INDETERMINATE"
  | "WALK_INCOMPLETE";

export interface DmarcAnalysis {
  readonly recordState: DmarcRecordState;
  /** How many records were found at the domain's own name, which matters when there was more than one. */
  readonly recordCount: number;
  readonly record?: DmarcRecord;
  /** The name whose record applies, when one does. */
  readonly policyDomain?: string;
  readonly organisationalDomain: string;
  /** True when the applied record carried `psd=y`, so it belongs to a public suffix. */
  readonly fromPublicSuffix: boolean;
  readonly effectivePolicy?: DmarcPolicy;
  readonly policyTag?: DmarcPolicyTag;
  readonly requestsAggregateReports: boolean;
  /** 1.1 §9.4 — the domains the reports are addressed to, which the Public view may name. */
  readonly reportDomains: readonly string[];
  /** 1.1 §9.4 — the addresses themselves, which only the Technical view may name. */
  readonly reportAddresses: readonly string[];
  readonly usesDeprecatedPct: boolean;
  readonly queries: number;
  readonly visitedNames: readonly string[];
}

export interface DmarcAnalysisInput {
  readonly domain: string;
  /** The answer for the domain's own policy name, which the caller has already asked for. */
  readonly answer: DmarcLookupAnswer;
  readonly lookup: DmarcLookup;
  /** Whether the domain exists in DNS, which decides between `sp` and `np` — 1.1 §4.5. */
  readonly domainExists?: boolean;
}

export async function analyseDmarc(input: DmarcAnalysisInput): Promise<DmarcAnalysis> {
  const { domain, answer, lookup, domainExists } = input;
  const base = {
    recordCount: 0,
    organisationalDomain: domain,
    fromPublicSuffix: false,
    requestsAggregateReports: false,
    reportDomains: [],
    reportAddresses: [],
    usesDeprecatedPct: false,
    queries: 1,
    visitedNames: [domain],
  } as const;

  const own = read(domain, answer);
  if (own.state === "INDETERMINATE") {
    return { ...base, recordState: "INDETERMINATE" };
  }
  if (own.state === "MULTIPLE" || own.state === "UNRECOGNISED") {
    return { ...base, recordState: own.state, recordCount: own.count };
  }

  const found = (name: string, record: DmarcRecord, inherited: boolean, walk?: Walk) => {
    const { policy, tag } = effectivePolicy(record, inherited, domainExists);
    const uris = reportUris(record);
    return {
      recordState: inherited ? ("INHERITED" as const) : ("OWN" as const),
      recordCount: 1,
      record,
      policyDomain: name,
      organisationalDomain: walk === undefined ? name : organisationalDomain(domain, walk),
      fromPublicSuffix: walk?.psd?.value === "y" && walk.psd.name === name,
      ...(policy === undefined ? {} : { effectivePolicy: policy }),
      ...(tag === undefined ? {} : { policyTag: tag }),
      requestsAggregateReports: uris.length > 0,
      reportDomains: reportDomains(uris),
      reportAddresses: uris,
      usesDeprecatedPct: record.tags.has("pct"),
      queries: walk?.queries ?? 1,
      visitedNames: [domain, ...(walk?.nodes ?? []).map((node) => node.name)],
    };
  };

  if (own.state === "VALID" && own.record !== undefined) {
    return found(domain, own.record, false);
  }

  const walk = await walkUp(domain, lookup, 1);
  const visited = [domain, ...walk.nodes.map((node) => node.name)];
  if (walk.incomplete) {
    // 1.1 §4.8 — short of the end of the walk we do not know whether a policy sits higher up, so
    // nothing is concluded about the one that applies.
    return {
      ...base,
      recordState: "WALK_INCOMPLETE",
      queries: walk.queries,
      visitedNames: visited,
    };
  }

  const organisational = organisationalDomain(domain, walk);
  const at = (name: string) =>
    walk.nodes.find((node) => node.name === name && node.state === "VALID")?.record;
  // RFC 9989 §4.10.1 — the organisational domain's record applies, and failing that the public
  // suffix domain's, which the walk stopped at.
  const inherited = at(organisational) ?? (walk.psd?.value === "y" ? at(walk.psd.name) : undefined);
  const name =
    at(organisational) !== undefined ? organisational : (walk.psd?.name ?? organisational);
  if (inherited === undefined) {
    return {
      ...base,
      recordState: "ABSENT",
      organisationalDomain: organisational,
      queries: walk.queries,
      visitedNames: visited,
    };
  }
  return found(name, inherited, true, walk);
}

/** 1.1 §4 — the four conditions the section states, one status each. */
export const DMARC_CHECK_IDS = {
  record: "email.dmarc.record",
  policy: "email.dmarc.policy",
  reports: "email.dmarc.reports",
  deprecated: "email.dmarc.deprecated",
} as const;

interface DmarcCheckOptions {
  readonly domain: string;
  readonly freshness: CheckResult["freshness"];
}

function target(domain: string): EmailPolicyTarget {
  return { kind: "EMAIL_POLICY", policy: "DMARC", queriedName: dmarcPolicyName(domain) };
}

/**
 * 1.1 §9.3 — the names the walk read on its way up. For this check they are the substance of the
 * result: the policy that applies may have been found several labels above the domain, and the
 * path is how a reader confirms the source rather than taking our word for it.
 */
function source(analysis: DmarcAnalysis): DnsRecordSource {
  return {
    kind: "DNS_RECORD",
    ...(analysis.visitedNames.length === 0 ? {} : { traversedNames: analysis.visitedNames }),
  };
}

function check(
  checkId: string,
  status: CheckResult["status"],
  severity: Severity,
  titleCode: string,
  options: DmarcCheckOptions,
  extra: Partial<CheckResult> & { readonly params?: MessageParams } = {},
): CheckResult {
  const { params, ...rest } = extra;
  return {
    checkId,
    category: "email",
    status,
    severity,
    target: target(options.domain),
    message: { titleCode, ...(params === undefined ? {} : { params }) },
    freshness: options.freshness,
    ...rest,
  };
}

function blocked(checkId: string, titleCode: string, options: DmarcCheckOptions): CheckResult {
  // 1.0 §7 — a result caused by a dependency names the dependency and invents no reason of its own.
  return check(checkId, "NOT_APPLICABLE", "none", titleCode, options, {
    dependsOn: [DMARC_CHECK_IDS.record],
    blockedBy: DMARC_CHECK_IDS.record,
  });
}

/** 1.1 §4.3 and §4.4 — where the policy came from, and whether it can be read at all. */
function recordCheck(analysis: DmarcAnalysis, options: DmarcCheckOptions): CheckResult {
  switch (analysis.recordState) {
    case "OWN":
      return check(DMARC_CHECK_IDS.record, "PASS", "none", "email.dmarc.record.present", options);
    case "INHERITED":
      // An inherited policy is how the standard means subdomains to work, so it is not a finding.
      return check(
        DMARC_CHECK_IDS.record,
        "PASS",
        "none",
        analysis.fromPublicSuffix
          ? "email.dmarc.record.present.suffix"
          : "email.dmarc.record.present.inherited",
        options,
        { params: { source: analysis.policyDomain ?? analysis.organisationalDomain } },
      );
    case "ABSENT":
      return check(
        DMARC_CHECK_IDS.record,
        "FAIL",
        "warning",
        "email.dmarc.record.fail.absent",
        options,
      );
    case "MULTIPLE":
      return check(
        DMARC_CHECK_IDS.record,
        "FAIL",
        "critical",
        "email.dmarc.record.fail.multiple",
        options,
        { params: { count: analysis.recordCount } },
      );
    case "UNRECOGNISED":
      return check(
        DMARC_CHECK_IDS.record,
        "FAIL",
        "critical",
        "email.dmarc.record.fail.unrecognised",
        options,
      );
    case "WALK_INCOMPLETE":
      return check(
        DMARC_CHECK_IDS.record,
        "UNKNOWN",
        "none",
        "email.dmarc.record.unknown.walk",
        options,
        { reasonCode: "dmarc_tree_walk_incomplete", params: { count: analysis.queries } },
      );
    default:
      return check(
        DMARC_CHECK_IDS.record,
        "UNKNOWN",
        "none",
        "email.dmarc.record.unknown",
        options,
        {
          reasonCode: "dmarc_lookup_failed",
        },
      );
  }
}

/** 1.1 §4.5 — what the record asks a receiver to do, and which tag said so. */
function policyCheck(analysis: DmarcAnalysis, options: DmarcCheckOptions): CheckResult {
  const source = analysis.policyDomain ?? options.domain;
  const params: MessageParams = { source, tag: analysis.policyTag ?? "p" };
  switch (analysis.effectivePolicy) {
    case "reject":
      return check(
        DMARC_CHECK_IDS.policy,
        "PASS",
        "none",
        "email.dmarc.policy.pass.reject",
        options,
        { params },
      );
    case "quarantine":
      return check(
        DMARC_CHECK_IDS.policy,
        "PASS",
        "none",
        "email.dmarc.policy.pass.quarantine",
        options,
        { params },
      );
    case "none":
      // A monitoring policy is valid and deliberate; the severity reports its limit, not an error.
      return check(
        DMARC_CHECK_IDS.policy,
        "FAIL",
        "warning",
        "email.dmarc.policy.fail.none",
        options,
        {
          params,
        },
      );
    default:
      // 1.1 §4.5 — an absent tag is read as `none`, which is also what RFC 9989 §4.10.1 does.
      return check(
        DMARC_CHECK_IDS.policy,
        "FAIL",
        "warning",
        "email.dmarc.policy.fail.absent",
        options,
        { params: { source } },
      );
  }
}

export function evaluateDmarcChecks(
  analysis: DmarcAnalysis,
  options: DmarcCheckOptions,
): readonly CheckResult[] {
  // 1.1 §9.4 — the record as published, which a reader compares the findings against.
  const text = analysis.record?.text;
  const record =
    text === undefined
      ? recordCheck(analysis, options)
      : { ...recordCheck(analysis, options), details: { recordText: text } };
  if (analysis.recordState !== "OWN" && analysis.recordState !== "INHERITED") {
    return [
      record,
      blocked(DMARC_CHECK_IDS.policy, "email.dmarc.policy.blocked", options),
      blocked(DMARC_CHECK_IDS.reports, "email.dmarc.reports.blocked", options),
      blocked(DMARC_CHECK_IDS.deprecated, "email.dmarc.deprecated.blocked", options),
    ].map((result) => ({ ...result, source: source(analysis) }));
  }
  return [
    record,
    policyCheck(analysis, options),
    analysis.requestsAggregateReports
      ? check(
          DMARC_CHECK_IDS.reports,
          "PASS",
          "none",
          analysis.reportDomains.length > 0
            ? "email.dmarc.reports.present.at"
            : "email.dmarc.reports.present",
          options,
          {
            // 1.1 §9.4 — the full addresses, which the Public view withholds and this one shows
            // only on an explicit request for the technical view.
            details: { reportAddresses: analysis.reportAddresses },
            ...(analysis.reportDomains.length > 0
              ? { params: { domains: analysis.reportDomains.join(", ") } }
              : {}),
          },
        )
      : check(
          DMARC_CHECK_IDS.reports,
          "FAIL",
          "informational",
          "email.dmarc.reports.fail.absent",
          options,
        ),
    analysis.usesDeprecatedPct
      ? check(
          DMARC_CHECK_IDS.deprecated,
          "FAIL",
          "warning",
          "email.dmarc.deprecated.fail.pct",
          options,
        )
      : check(DMARC_CHECK_IDS.deprecated, "PASS", "none", "email.dmarc.deprecated.absent", options),
  ].map((result) => ({ ...result, source: source(analysis) }));
}
