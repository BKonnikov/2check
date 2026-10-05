import type { DnsProviderResult } from "@2check/contracts";
import { DEFAULT_RESOLVERS, queryProvider } from "../dns/resolver-set.js";

/**
 * 1.1 §3.2 and §4.3 — reading a published policy out of TXT.
 *
 * One resolver, not the set. PRD 8.3 queries several because the DNS category's question is
 * whether resolvers agree; a policy walk's question is what the published record says, and asking
 * four resolvers for every nested name would multiply a bounded walk by four without answering
 * anything the DNS category does not already answer.
 */
export const TXT_LOOKUP_TIMEOUT_MS = 3000;

export type TxtOutcome = "ANSWER" | "EMPTY" | "NAME_NOT_FOUND" | "INDETERMINATE";

export interface TxtAnswer {
  readonly outcome: TxtOutcome;
  readonly records?: readonly string[];
}

export function toTxtAnswer(result: DnsProviderResult): TxtAnswer {
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

export interface TxtLookupPort {
  readonly provider: string;
  readonly lookup: (name: string) => Promise<TxtAnswer>;
}

/**
 * A walk is bounded by the record it reads, but a record is somebody else's to write, so the
 * number of names one scan may ask for is bounded here as well. Beyond the budget the answer is
 * indeterminate, which an analysis reads as a walk it could not finish rather than as a finding.
 */
export function createTxtLookup(budget: number): TxtLookupPort {
  const resolver = DEFAULT_RESOLVERS[0];
  const provider = resolver?.provider ?? "unknown";
  let spent = 0;
  return {
    provider,
    lookup: async (name) => {
      if (resolver === undefined || spent >= budget) {
        return { outcome: "INDETERMINATE" };
      }
      spent += 1;
      const result = await queryProvider(provider, resolver.address, name, "TXT", {
        timeoutMs: TXT_LOOKUP_TIMEOUT_MS,
      });
      return toTxtAnswer(result);
    },
  };
}
