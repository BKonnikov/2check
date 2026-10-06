import type {
  CheckResult,
  DnsRecordSource,
  EmailPolicyTarget,
  MessageDescriptor,
  Severity,
} from "@2check/contracts";

type MessageParams = NonNullable<MessageDescriptor["params"]>;

/**
 * 1.1 §3 — the SPF policy check.
 *
 * RFC 7208 defines check_host(), which takes the sending address as a required input and answers
 * whether that address may send for the domain. We are given a domain and no address, so this is
 * a static analysis of the published record. Everything here follows from that: we count what a
 * receiver would have to evaluate, and whatever depends on an address we do not have is reported
 * as not established rather than guessed.
 */

/** RFC 7208 §4.6.4 — the mechanisms and the modifier that cost a lookup. */
const LOOKUP_TERMS = new Set(["include", "a", "mx", "ptr", "exists", "redirect"]);

/** RFC 7208 §4.6.4 — at most ten of those terms in one evaluation. */
export const SPF_LOOKUP_LIMIT = 10;

/** RFC 7208 §4.6.4 — a recommendation rather than a requirement, hence its own severity. */
export const SPF_VOID_LOOKUP_LIMIT = 2;

const VERSION = /^v=spf1(\s|$)/i;

/** A macro whose expansion needs the sender, which a static analysis does not have. */
const SENDER_MACRO = /%\{[^}]*[slohicrtvSLOHICRTV][^}]*\}/;

export type SpfQualifier = "+" | "-" | "~" | "?";

export interface SpfMechanism {
  readonly kind: "mechanism";
  readonly name: string;
  readonly qualifier: SpfQualifier;
  readonly argument?: string;
}

export interface SpfModifier {
  readonly kind: "modifier";
  readonly name: string;
  readonly value: string;
}

export type SpfTerm = SpfMechanism | SpfModifier;

export interface SpfRecord {
  readonly text: string;
  readonly terms: readonly SpfTerm[];
}

const MECHANISMS = new Set(["all", "include", "a", "mx", "ptr", "ip4", "ip6", "exists"]);
const TERM = /^([+\-~?])?([A-Za-z][A-Za-z0-9_.-]*)([:/].*)?$/;
const MODIFIER = /^([A-Za-z][A-Za-z0-9_.-]*)=(.*)$/;

export function isSpfRecord(value: string): boolean {
  return VERSION.test(value.trim());
}

/**
 * Parses one record. A term the grammar does not admit makes the whole record unusable, which is
 * what a receiver does with it: RFC 7208 treats a syntax error as permerror for the record, not
 * as a term to skip.
 */
export function parseSpfRecord(text: string): SpfRecord | undefined {
  const trimmed = text.trim();
  if (!VERSION.test(trimmed)) {
    return undefined;
  }
  const terms: SpfTerm[] = [];
  for (const raw of trimmed.split(/\s+/).slice(1)) {
    if (raw === "") {
      continue;
    }
    const modifier = MODIFIER.exec(raw);
    if (modifier !== null) {
      terms.push({
        kind: "modifier",
        name: modifier[1]?.toLowerCase() ?? "",
        value: modifier[2] ?? "",
      });
      continue;
    }
    const match = TERM.exec(raw);
    const name = match?.[2]?.toLowerCase();
    if (match === null || name === undefined || !MECHANISMS.has(name)) {
      return undefined;
    }
    const argument = match[3]?.slice(1);
    terms.push({
      kind: "mechanism",
      name,
      qualifier: (match[1] as SpfQualifier | undefined) ?? "+",
      ...(argument === undefined || argument === "" ? {} : { argument }),
    });
  }
  return { text: trimmed, terms };
}

export type SpfLookupOutcome = "ANSWER" | "EMPTY" | "NAME_NOT_FOUND" | "INDETERMINATE";

export interface SpfLookupAnswer {
  readonly outcome: SpfLookupOutcome;
  readonly records?: readonly string[];
}

/** The port the traversal reads through; the transport belongs to the API, not to this module. */
export type SpfLookup = (name: string) => Promise<SpfLookupAnswer>;

export type SpfRecordState = "ABSENT" | "SINGLE" | "MULTIPLE" | "UNPARSEABLE" | "INDETERMINATE";

export interface SpfAnalysis {
  readonly recordState: SpfRecordState;
  /** How many records claimed to be SPF, which only matters when there was more than one. */
  readonly recordCount: number;
  readonly record?: SpfRecord;
  /** The first reachable `all` on the record's own chain, following `redirect` but not `include`. */
  readonly allQualifier?: SpfQualifier;
  /** The name whose record carried that `all`, when it was not the domain's own. */
  readonly allFrom?: string;
  readonly hasRedirect: boolean;
  /** Terms costing a lookup along the worst reachable path, as far as it could be established. */
  readonly lookupCount: number;
  readonly voidLookups: number;
  /** True when a name could not be followed, so the count is a lower bound. */
  readonly traversalIncomplete: boolean;
  readonly loopDetected: boolean;
  /** The name the chain came back to, which is what a reader needs in order to break it. */
  readonly loopName?: string;
  readonly usesPtr: boolean;
  readonly traversedNames: readonly string[];
}

interface Walk {
  lookups: number;
  voids: number;
  incomplete: boolean;
  loop: boolean;
  loopName?: string;
  ptr: boolean;
  /** The `all` that decides the policy, which `redirect` carries onward and `include` does not. */
  effectiveAll?: SpfQualifier;
  effectiveFrom?: string;
  readonly visited: Set<string>;
  readonly order: string[];
}

/**
 * Terms are evaluated left to right and stop at the first `all`, so everything after it is
 * unreachable and costs nothing. RFC 7208 §6.1 also has `redirect` ignored whenever an `all` is
 * present, which is the one place where two paths really are exclusive — the rest of a record is
 * evaluated in sequence until something matches, so those costs do add up.
 */
function reachableTerms(record: SpfRecord): {
  readonly terms: readonly SpfTerm[];
  readonly all?: SpfQualifier;
  readonly redirect?: string;
} {
  const reachable: SpfTerm[] = [];
  let all: SpfQualifier | undefined;
  for (const term of record.terms) {
    if (term.kind === "mechanism" && term.name === "all") {
      all = term.qualifier;
      break;
    }
    reachable.push(term);
  }
  const redirect = record.terms.find(
    (term): term is SpfModifier => term.kind === "modifier" && term.name === "redirect",
  );
  return {
    terms: reachable,
    ...(all === undefined ? {} : { all }),
    ...(all !== undefined || redirect === undefined ? {} : { redirect: redirect.value }),
  };
}

async function walk(
  name: string,
  record: SpfRecord,
  lookup: SpfLookup,
  state: Walk,
  /**
   * True for the domain's own record and for anything a `redirect` leads to. An `all` inside an
   * `include` ends only that included evaluation, so it never decides the outer policy.
   */
  decidesPolicy: boolean,
): Promise<void> {
  if (state.visited.has(name)) {
    state.loop = true;
    state.loopName ??= name;
    return;
  }
  state.visited.add(name);
  state.order.push(name);

  const { terms, redirect, all } = reachableTerms(record);
  if (decidesPolicy && all !== undefined && state.effectiveAll === undefined) {
    state.effectiveAll = all;
    state.effectiveFrom = name;
  }
  for (const term of terms) {
    if (term.kind !== "mechanism" || !LOOKUP_TERMS.has(term.name)) {
      continue;
    }
    state.lookups += 1;
    if (term.name === "ptr") {
      state.ptr = true;
    }
    if (term.name !== "include") {
      // The cost of a, mx, ptr and exists is the one term; what they resolve to is not walked.
      if (term.argument !== undefined && SENDER_MACRO.test(term.argument)) {
        state.incomplete = true;
      }
      continue;
    }
    const target = term.argument;
    if (target === undefined || SENDER_MACRO.test(target)) {
      // Where the included name itself depends on the sender, the subtree cannot be costed.
      state.incomplete = true;
      continue;
    }
    await follow(target, lookup, state, false);
    if (state.loop) {
      return;
    }
  }

  if (redirect !== undefined) {
    state.lookups += 1;
    if (SENDER_MACRO.test(redirect)) {
      state.incomplete = true;
      return;
    }
    await follow(redirect, lookup, state, decidesPolicy);
  }
}

async function follow(
  name: string,
  lookup: SpfLookup,
  state: Walk,
  decidesPolicy: boolean,
): Promise<void> {
  const answer = await lookup(name);
  if (answer.outcome === "INDETERMINATE") {
    state.incomplete = true;
    return;
  }
  if (answer.outcome !== "ANSWER") {
    state.voids += 1;
    return;
  }
  const records = (answer.records ?? []).filter(isSpfRecord);
  if (records.length === 0) {
    state.voids += 1;
    return;
  }
  if (records.length > 1) {
    // More than one record is permerror for that name; its subtree cannot be costed further.
    state.incomplete = true;
    return;
  }
  const parsed = parseSpfRecord(records[0] ?? "");
  if (parsed === undefined) {
    state.incomplete = true;
    return;
  }
  await walk(name, parsed, lookup, state, decidesPolicy);
}

export interface SpfAnalysisOptions {
  readonly domain: string;
  readonly answer: SpfLookupAnswer;
  readonly lookup: SpfLookup;
}

export async function analyseSpf(options: SpfAnalysisOptions): Promise<SpfAnalysis> {
  const { domain, answer, lookup } = options;
  const empty: SpfAnalysis = {
    recordState: "ABSENT",
    recordCount: 0,
    hasRedirect: false,
    lookupCount: 0,
    voidLookups: 0,
    traversalIncomplete: false,
    loopDetected: false,
    usesPtr: false,
    traversedNames: [],
  };

  if (answer.outcome === "INDETERMINATE") {
    return { ...empty, recordState: "INDETERMINATE" };
  }
  const records = (answer.records ?? []).filter(isSpfRecord);
  if (records.length === 0) {
    return empty;
  }
  if (records.length > 1) {
    return { ...empty, recordState: "MULTIPLE", recordCount: records.length };
  }
  const record = parseSpfRecord(records[0] ?? "");
  if (record === undefined) {
    return { ...empty, recordState: "UNPARSEABLE" };
  }

  const state: Walk = {
    lookups: 0,
    voids: 0,
    incomplete: false,
    loop: false,
    ptr: false,
    visited: new Set<string>(),
    order: [],
  };
  await walk(domain, record, lookup, state, true);

  const { redirect } = reachableTerms(record);
  return {
    recordState: "SINGLE",
    recordCount: 1,
    record,
    ...(state.effectiveAll === undefined ? {} : { allQualifier: state.effectiveAll }),
    ...(state.effectiveFrom === undefined || state.effectiveFrom === domain
      ? {}
      : { allFrom: state.effectiveFrom }),
    hasRedirect: redirect !== undefined,
    lookupCount: state.lookups,
    voidLookups: state.voids,
    traversalIncomplete: state.incomplete,
    loopDetected: state.loop,
    ...(state.loopName === undefined ? {} : { loopName: state.loopName }),
    usesPtr: state.ptr,
    traversedNames: state.order,
  };
}

/** 1.1 §3 — the four conditions the section states, one status each. */
export const SPF_CHECK_IDS = {
  record: "email.spf.record",
  limits: "email.spf.limits",
  policy: "email.spf.policy",
  deprecated: "email.spf.deprecated",
} as const;

interface SpfCheckOptions {
  readonly domain: string;
  readonly freshness: CheckResult["freshness"];
}

/**
 * 1.1 §9.3 — where the result came from: the names the walk read, and how many of them answered
 * with nothing. Both are what a reader needs in order to repeat the count themselves, and 1.1
 * §9.4 keeps them in the Technical view.
 */
function source(analysis: SpfAnalysis): DnsRecordSource {
  return {
    kind: "DNS_RECORD",
    ...(analysis.traversedNames.length === 0 ? {} : { traversedNames: analysis.traversedNames }),
    voidLookups: analysis.voidLookups,
  };
}

function target(domain: string): EmailPolicyTarget {
  return { kind: "EMAIL_POLICY", policy: "SPF", queriedName: domain };
}

function check(
  checkId: string,
  status: CheckResult["status"],
  severity: Severity,
  titleCode: string,
  options: SpfCheckOptions,
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

function withSource(result: CheckResult, analysis: SpfAnalysis): CheckResult {
  return { ...result, source: source(analysis) };
}

function blocked(checkId: string, titleCode: string, options: SpfCheckOptions): CheckResult {
  // 1.0 §7 — a result caused by a dependency names the dependency and invents no reason of its own.
  return check(checkId, "NOT_APPLICABLE", "none", titleCode, options, {
    dependsOn: [SPF_CHECK_IDS.record],
    blockedBy: SPF_CHECK_IDS.record,
  });
}

function recordCheck(analysis: SpfAnalysis, options: SpfCheckOptions): CheckResult {
  switch (analysis.recordState) {
    case "SINGLE":
      return check(SPF_CHECK_IDS.record, "PASS", "none", "email.spf.record.present", options);
    case "ABSENT":
      // An absent record is a confirmed fact rather than an unknown one — 1.1 §3.3.
      return check(
        SPF_CHECK_IDS.record,
        "FAIL",
        "warning",
        "email.spf.record.fail.absent",
        options,
      );
    case "MULTIPLE":
      return check(
        SPF_CHECK_IDS.record,
        "FAIL",
        "critical",
        "email.spf.record.fail.multiple",
        options,
        { params: { count: analysis.recordCount } },
      );
    case "UNPARSEABLE":
      return check(
        SPF_CHECK_IDS.record,
        "FAIL",
        "critical",
        "email.spf.record.fail.unparseable",
        options,
      );
    default:
      return check(SPF_CHECK_IDS.record, "UNKNOWN", "none", "email.spf.record.unknown", options, {
        reasonCode: "spf_lookup_failed",
      });
  }
}

/**
 * 1.1 §3.4 — the count is of terms a receiver would evaluate, and it is only a finding when the
 * excess is established. A name we could not follow leaves the count a lower bound, so an excess
 * that has not already been reached cannot be claimed.
 */
function limitsCheck(analysis: SpfAnalysis, options: SpfCheckOptions): CheckResult {
  if (analysis.loopDetected) {
    return check(SPF_CHECK_IDS.limits, "FAIL", "critical", "email.spf.limits.fail.loop", options, {
      params: { name: analysis.loopName ?? options.domain },
    });
  }
  if (analysis.lookupCount > SPF_LOOKUP_LIMIT) {
    return check(
      SPF_CHECK_IDS.limits,
      "FAIL",
      "critical",
      "email.spf.limits.fail.lookups",
      options,
      { params: { count: analysis.lookupCount, limit: SPF_LOOKUP_LIMIT } },
    );
  }
  if (analysis.traversalIncomplete) {
    return check(SPF_CHECK_IDS.limits, "UNKNOWN", "none", "email.spf.limits.unknown", options, {
      reasonCode: "spf_traversal_incomplete",
      params: { count: analysis.lookupCount },
    });
  }
  if (analysis.voidLookups > SPF_VOID_LOOKUP_LIMIT) {
    return check(SPF_CHECK_IDS.limits, "FAIL", "warning", "email.spf.limits.fail.void", options, {
      params: { count: analysis.voidLookups, limit: SPF_VOID_LOOKUP_LIMIT },
    });
  }
  return check(SPF_CHECK_IDS.limits, "PASS", "none", "email.spf.limits.pass", options, {
    params: { count: analysis.lookupCount, limit: SPF_LOOKUP_LIMIT },
  });
}

/** 1.1 §3.5 — what the record says about senders it does not list. */
function policyCheck(analysis: SpfAnalysis, options: SpfCheckOptions): CheckResult {
  switch (analysis.allQualifier) {
    case "-":
      return check(SPF_CHECK_IDS.policy, "PASS", "none", "email.spf.policy.pass.reject", options);
    case "~":
      return check(SPF_CHECK_IDS.policy, "PASS", "none", "email.spf.policy.pass.mark", options);
    case "?":
      return check(
        SPF_CHECK_IDS.policy,
        "FAIL",
        "warning",
        "email.spf.policy.fail.neutral",
        options,
      );
    case "+":
      return check(SPF_CHECK_IDS.policy, "FAIL", "critical", "email.spf.policy.fail.open", options);
    default:
      break;
  }
  if (analysis.hasRedirect) {
    // The redirect was published but its target did not yield a reachable `all` we could read.
    return check(SPF_CHECK_IDS.policy, "UNKNOWN", "none", "email.spf.policy.unknown", options, {
      reasonCode: "spf_traversal_incomplete",
    });
  }
  return check(SPF_CHECK_IDS.policy, "FAIL", "warning", "email.spf.policy.fail.absent", options);
}

export function evaluateSpfChecks(
  analysis: SpfAnalysis,
  options: SpfCheckOptions,
): readonly CheckResult[] {
  // 1.1 §9.4 — the record as published, which is the one thing a reader cannot reconstruct from
  // the findings and the first thing they will want to compare them against.
  const text = analysis.record?.text;
  const record =
    text === undefined
      ? recordCheck(analysis, options)
      : { ...recordCheck(analysis, options), details: { recordText: text } };
  if (analysis.recordState !== "SINGLE") {
    return [
      record,
      blocked(SPF_CHECK_IDS.limits, "email.spf.limits.blocked", options),
      blocked(SPF_CHECK_IDS.policy, "email.spf.policy.blocked", options),
      blocked(SPF_CHECK_IDS.deprecated, "email.spf.deprecated.blocked", options),
    ].map((result) => withSource(result, analysis));
  }
  return [
    record,
    limitsCheck(analysis, options),
    policyCheck(analysis, options),
    analysis.usesPtr
      ? check(SPF_CHECK_IDS.deprecated, "FAIL", "warning", "email.spf.deprecated.fail.ptr", options)
      : check(SPF_CHECK_IDS.deprecated, "PASS", "none", "email.spf.deprecated.absent", options),
  ].map((result) => withSource(result, analysis));
}
