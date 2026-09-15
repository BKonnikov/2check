import type {
  CheckFreshness,
  CheckResult,
  DnsCheckSource,
  DnsCheckTarget,
  DnsProviderResult,
  DnsQType,
  DnsRecordState,
  Severity,
} from "@2check/contracts";

/** PRD 8.4 — the default minimum quorum. */
export const DEFAULT_MINIMUM_QUORUM = 2;

export interface DnsEvaluationOptions {
  readonly qname: string;
  readonly resolverSetVersion: string;
  readonly minimumQuorum?: number;
}

export interface ProviderRecordState {
  readonly provider: string;
  readonly state: DnsRecordState;
}

export interface QuorumOutcome {
  readonly state: DnsRecordState;
  readonly determinedCount: number;
  readonly winningCount: number;
}

export interface DnsResolveDetails {
  readonly state: DnsRecordState;
  readonly providerStates: readonly ProviderRecordState[];
  readonly answersByProvider: Readonly<Record<string, readonly string[]>>;
  readonly valueVariation?: boolean;
}

/**
 * PRD 8.3–8.4 — a provider's view of one record.
 * Anything that did not produce a usable answer is INDETERMINATE rather than an absence:
 * a transport failure is not evidence that a record does not exist.
 */
export function deriveRecordState(result: DnsProviderResult): DnsRecordState {
  if (result.transportStatus !== "SUCCESS") {
    return "INDETERMINATE";
  }
  if (result.rcode !== undefined && result.rcode !== "NOERROR" && result.rcode !== "NXDOMAIN") {
    return "INDETERMINATE";
  }
  switch (result.outcome) {
    case "ANSWER":
      return "PRESENT";
    case "NODATA":
      return "ABSENT";
    case "NXDOMAIN":
      return "NAME_NOT_FOUND";
    default:
      return "INDETERMINATE";
  }
}

/**
 * PRD 8.4 — a strict majority among the determined states, with a minimum quorum.
 * A tie, or too few determined states, is INDETERMINATE.
 */
export function aggregateRecordState(
  states: readonly DnsRecordState[],
  minimumQuorum: number = DEFAULT_MINIMUM_QUORUM,
): QuorumOutcome {
  const determined = states.filter((state) => state !== "INDETERMINATE");
  if (determined.length < minimumQuorum) {
    return { state: "INDETERMINATE", determinedCount: determined.length, winningCount: 0 };
  }

  const tally = new Map<DnsRecordState, number>();
  for (const state of determined) {
    tally.set(state, (tally.get(state) ?? 0) + 1);
  }

  let winner: DnsRecordState = "INDETERMINATE";
  let winningCount = 0;
  for (const [state, count] of tally) {
    if (count > winningCount) {
      winner = state;
      winningCount = count;
    }
  }

  if (winningCount * 2 <= determined.length) {
    return { state: "INDETERMINATE", determinedCount: determined.length, winningCount };
  }
  return { state: winner, determinedCount: determined.length, winningCount };
}

/**
 * PRD 8.9 and AC-8.8 — resolver agreement on the address records gates the TLS connection.
 *
 * "Insufficient agreement among DNS resolvers does not permit a TLS connection, even when
 * individual IP addresses were obtained." One resolver answering while three time out is not
 * evidence of where the domain lives, so a certificate fetched from that one answer would be a
 * statement about an address nobody else confirmed. A determined state — including a quorum
 * that agrees the records are absent — is enough; only an undecided one withholds the connection.
 */
export function addressEvidenceIsSufficient(
  results: readonly DnsProviderResult[],
  minimumQuorum: number = DEFAULT_MINIMUM_QUORUM,
): boolean {
  return (["A", "AAAA"] as const).some((qtype) => {
    const states = results
      .filter((result) => result.qtype === qtype)
      .map((result) => deriveRecordState(result));
    if (states.length === 0) {
      return false;
    }
    return aggregateRecordState(states, minimumQuorum).state !== "INDETERMINATE";
  });
}

/**
 * PRD 8.9 — every A/AAAA address any resolver reported, without repetition.
 * An address seen by a minority of resolvers is a candidate too: it still gets validated.
 */
export function collectAddressCandidates(results: readonly DnsProviderResult[]): string[] {
  const candidates: string[] = [];
  for (const result of results) {
    if (result.qtype !== "A" && result.qtype !== "AAAA") {
      continue;
    }
    for (const answer of result.answers) {
      if (!candidates.includes(answer.value)) {
        candidates.push(answer.value);
      }
    }
  }
  return candidates;
}

function providerStates(results: readonly DnsProviderResult[]): ProviderRecordState[] {
  return results.map((result) => ({ provider: result.provider, state: deriveRecordState(result) }));
}

function answersByProvider(
  results: readonly DnsProviderResult[],
): Record<string, readonly string[]> {
  const byProvider: Record<string, readonly string[]> = {};
  for (const result of results) {
    byProvider[result.provider] = result.answers.map((answer) => answer.value);
  }
  return byProvider;
}

/** PRD 6.3 — the observation time, taken as the moment the picture was complete. */
function freshnessOf(results: readonly DnsProviderResult[]): CheckFreshness {
  const timestamps = results.map((result) => result.receivedAt).sort();
  return {
    checkedAt: timestamps[timestamps.length - 1] ?? new Date(0).toISOString(),
    cached: false,
    cacheAge: 0,
  };
}

function sourceOf(
  results: readonly DnsProviderResult[],
  resolverSetVersion: string,
): DnsCheckSource {
  return {
    kind: "DNS_RESOLVER_SET",
    resolverSetVersion,
    providers: [...new Set(results.map((result) => result.provider))],
  };
}

function target(qname: string, qtype?: DnsQType): DnsCheckTarget {
  return qtype === undefined ? { kind: "DNS_NAME", qname } : { kind: "DNS_NAME", qname, qtype };
}

/**
 * PRD 8.5 — the resolve checks establish whether a record's state could be determined,
 * not whether the record ought to exist. Any determined state passes.
 */
export function evaluateResolveCheck(
  qtype: DnsQType,
  results: readonly DnsProviderResult[],
  options: DnsEvaluationOptions,
): CheckResult<DnsResolveDetails> {
  const states = providerStates(results);
  const quorum = aggregateRecordState(
    states.map((entry) => entry.state),
    options.minimumQuorum ?? DEFAULT_MINIMUM_QUORUM,
  );
  const checkId = `dns.${qtype.toLowerCase()}.resolve`;
  const determined = quorum.state !== "INDETERMINATE";

  const details: DnsResolveDetails = {
    state: quorum.state,
    providerStates: states,
    answersByProvider: answersByProvider(results),
  };

  const base = {
    checkId,
    category: "dns",
    status: determined ? ("PASS" as const) : ("UNKNOWN" as const),
    severity: "none" as Severity,
    target: target(options.qname, qtype),
    message: {
      // PRD 13.4 — the wording states what was found, so the code carries the state itself.
      titleCode: `dns.record.resolve.${determined ? quorum.state.toLowerCase() : "unknown"}`,
      params: { recordType: qtype },
    },
    details,
    source: sourceOf(results, options.resolverSetVersion),
    freshness: freshnessOf(results),
  } satisfies Omit<CheckResult<DnsResolveDetails>, "reasonCode">;

  return determined ? base : { ...base, reasonCode: "dns_quorum_not_reached" };
}

/**
 * PRD 8.6 — name existence, judged once for the whole name.
 * NODATA proves the name exists, so a provider that answers NODATA for any type votes EXISTS,
 * and AC-8.9 is satisfied because a missing name is not re-counted per record type.
 */
export function evaluateNameExistence(
  results: readonly DnsProviderResult[],
  options: DnsEvaluationOptions,
): CheckResult<DnsResolveDetails> {
  const byProvider = new Map<string, DnsProviderResult[]>();
  for (const result of results) {
    const bucket = byProvider.get(result.provider) ?? [];
    bucket.push(result);
    byProvider.set(result.provider, bucket);
  }

  const states: ProviderRecordState[] = [...byProvider.entries()].map(([provider, bucket]) => {
    const observed = bucket.map(deriveRecordState);
    if (observed.includes("PRESENT") || observed.includes("ABSENT")) {
      return { provider, state: "PRESENT" };
    }
    if (observed.includes("NAME_NOT_FOUND")) {
      return { provider, state: "NAME_NOT_FOUND" };
    }
    return { provider, state: "INDETERMINATE" };
  });

  const quorum = aggregateRecordState(
    states.map((entry) => entry.state),
    options.minimumQuorum ?? DEFAULT_MINIMUM_QUORUM,
  );

  const checkId = "dns.name.existence";
  const exists = quorum.state === "PRESENT";
  const missing = quorum.state === "NAME_NOT_FOUND";
  const status = exists ? "PASS" : missing ? "FAIL" : "UNKNOWN";

  const details: DnsResolveDetails = {
    state: quorum.state,
    providerStates: states,
    answersByProvider: answersByProvider(results),
  };

  const base = {
    checkId,
    category: "dns",
    status,
    // A name that does not resolve at all is the strongest DNS finding there is.
    severity: (missing ? "critical" : "none") as Severity,
    target: target(options.qname),
    message: { titleCode: `dns.name.existence.${status.toLowerCase()}` },
    details,
    source: sourceOf(results, options.resolverSetVersion),
    freshness: freshnessOf(results),
  } satisfies Omit<CheckResult<DnsResolveDetails>, "reasonCode">;

  return status === "UNKNOWN" ? { ...base, reasonCode: "dns_quorum_not_reached" } : base;
}

/**
 * PRD 8.7 — resolver agreement.
 * PRESENT against ABSENT or NAME_NOT_FOUND is a consistency problem and fails with a warning.
 * For A/AAAA, differing address sets while the record exists are only an informational mark.
 */
export function evaluateResolverConsistency(
  qtype: DnsQType,
  results: readonly DnsProviderResult[],
  options: DnsEvaluationOptions,
): CheckResult<DnsResolveDetails> {
  const states = providerStates(results);
  const observed = new Set(states.map((entry) => entry.state));
  const disagrees =
    observed.has("PRESENT") && (observed.has("ABSENT") || observed.has("NAME_NOT_FOUND"));

  const answers = answersByProvider(results);
  const present = results.filter((result) => deriveRecordState(result) === "PRESENT");
  const signatures = new Set(
    present.map((result) => [...result.answers.map((answer) => answer.value)].sort().join(",")),
  );
  const valueVariation = signatures.size > 1;

  const checkId = `dns.${qtype.toLowerCase()}.consistency`;
  const status = disagrees ? "FAIL" : "PASS";

  const details: DnsResolveDetails = {
    state: aggregateRecordState(
      states.map((entry) => entry.state),
      options.minimumQuorum ?? DEFAULT_MINIMUM_QUORUM,
    ).state,
    providerStates: states,
    answersByProvider: answers,
    valueVariation,
  };

  return {
    checkId,
    category: "dns",
    status,
    severity: (disagrees ? "warning" : "none") as Severity,
    target: target(options.qname, qtype),
    message: {
      titleCode: `dns.record.consistency.${status.toLowerCase()}`,
      params: { recordType: qtype },
    },
    details,
    source: sourceOf(results, options.resolverSetVersion),
    freshness: freshnessOf(results),
  };
}
