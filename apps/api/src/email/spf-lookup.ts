import type { DnsProviderResult } from "@2check/contracts";
import type { SpfLookup, SpfLookupAnswer } from "@2check/domain";
import { DEFAULT_RESOLVERS, queryProvider } from "../dns/resolver-set.js";

/**
 * 1.1 §3.2 — reading the policy, and the names it leads to.
 *
 * One resolver, not the set. PRD 8.3 queries several because the DNS category's question is
 * whether resolvers agree; this module's question is what the published policy says, and asking
 * four resolvers for every nested include would multiply a bounded walk by four without
 * answering anything the DNS category does not already answer.
 */
export const SPF_LOOKUP_TIMEOUT_MS = 3000;

export function toSpfAnswer(result: DnsProviderResult): SpfLookupAnswer {
  if (result.transportStatus !== "SUCCESS") {
    return { outcome: "INDETERMINATE" };
  }
  if (result.rcode !== undefined && result.rcode !== "NOERROR" && result.rcode !== "NXDOMAIN") {
    return { outcome: "INDETERMINATE" };
  }
  switch (result.outcome) {
    case "ANSWER":
      return { outcome: "ANSWER", records: result.answers.map((entry) => entry.value) };
    case "NODATA":
      return { outcome: "EMPTY" };
    case "NXDOMAIN":
      return { outcome: "NAME_NOT_FOUND" };
    default:
      return { outcome: "INDETERMINATE" };
  }
}

export interface SpfLookupPort {
  readonly provider: string;
  readonly lookup: SpfLookup;
}

/**
 * The walk is bounded by the record, but a record is somebody else's to write, so the number of
 * names one scan may ask for is bounded here as well. Beyond the cap the answer is indeterminate,
 * which the analysis reads as a traversal it could not finish rather than as a finding.
 */
export const SPF_MAX_LOOKUPS_PER_SCAN = 24;

export function createSpfLookup(): SpfLookupPort {
  const resolver = DEFAULT_RESOLVERS[0];
  const provider = resolver?.provider ?? "unknown";
  let spent = 0;
  return {
    provider,
    lookup: async (name) => {
      if (resolver === undefined || spent >= SPF_MAX_LOOKUPS_PER_SCAN) {
        return { outcome: "INDETERMINATE" };
      }
      spent += 1;
      const result = await queryProvider(provider, resolver.address, name, "TXT", {
        timeoutMs: SPF_LOOKUP_TIMEOUT_MS,
      });
      return toSpfAnswer(result);
    },
  };
}
