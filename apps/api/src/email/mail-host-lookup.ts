import type { DnsProviderResult, DnsQType } from "@2check/contracts";
import type { HostObservation, MailLookupOutcome, MxObservation, MxRecord } from "@2check/domain";
import { DEFAULT_RESOLVERS, queryProvider } from "../dns/resolver-set.js";

/**
 * 1.1 §6.2 — the records that say where mail for a domain is received.
 *
 * One resolver, for the reason the SPF port gives: the question here is what the zone publishes,
 * not whether resolvers agree about it, and the agreement question belongs to the DNS category.
 */
export const MAIL_LOOKUP_TIMEOUT_MS = 3000;

/** Each host costs two queries, so the number of hosts one scan will follow is bounded. */
export const MAX_MAIL_HOSTS = 6;

export function toOutcome(result: DnsProviderResult): MailLookupOutcome {
  if (result.transportStatus !== "SUCCESS") {
    return "INDETERMINATE";
  }
  if (result.rcode !== undefined && result.rcode !== "NOERROR" && result.rcode !== "NXDOMAIN") {
    return "INDETERMINATE";
  }
  switch (result.outcome) {
    case "ANSWER":
      return "ANSWER";
    case "NODATA":
      return "EMPTY";
    case "NXDOMAIN":
      return "NAME_NOT_FOUND";
    default:
      return "INDETERMINATE";
  }
}

/** The resolver renders an MX answer as "<preference> <exchange>"; this reads it back. */
export function parseMxValue(value: string): MxRecord | undefined {
  const match = /^(\d+)\s+(\S*)$/.exec(value.trim());
  const preference = Number(match?.[1]);
  if (match === null || Number.isNaN(preference)) {
    return undefined;
  }
  return { preference, exchange: match[2] ?? "" };
}

export interface MailHostPort {
  readonly provider: string;
  mx(domain: string): Promise<MxObservation>;
  addresses(name: string): Promise<HostObservation>;
}

export function createMailHostLookup(): MailHostPort {
  const resolver = DEFAULT_RESOLVERS[0];
  const provider = resolver?.provider ?? "unknown";
  const ask = async (name: string, qtype: DnsQType): Promise<DnsProviderResult | undefined> => {
    if (resolver === undefined) {
      return undefined;
    }
    return await queryProvider(provider, resolver.address, name, qtype, {
      timeoutMs: MAIL_LOOKUP_TIMEOUT_MS,
    });
  };

  return {
    provider,
    async mx(domain) {
      const result = await ask(domain, "MX");
      if (result === undefined) {
        return { outcome: "INDETERMINATE" };
      }
      const outcome = toOutcome(result);
      if (outcome !== "ANSWER") {
        return { outcome };
      }
      const records = result.answers
        .map((answer) => parseMxValue(answer.value))
        .filter((record): record is MxRecord => record !== undefined);
      // An answer we could not read is not an answer that said nothing.
      return records.length === 0 ? { outcome: "INDETERMINATE" } : { outcome: "ANSWER", records };
    },
    async addresses(name) {
      const [v4, v6, alias] = await Promise.all([
        ask(name, "A"),
        ask(name, "AAAA"),
        ask(name, "CNAME"),
      ]);
      if (v4 === undefined || v6 === undefined) {
        return { hostname: name, outcome: "INDETERMINATE" };
      }
      const outcomes = [toOutcome(v4), toOutcome(v6)];
      const found = [...v4.answers, ...v6.answers].map((answer) => answer.value);
      if (found.length === 0 && outcomes.every((outcome) => outcome === "INDETERMINATE")) {
        // Both families failed to answer: nothing was established about this host.
        return { hostname: name, outcome: "INDETERMINATE" };
      }
      const aliased = alias !== undefined && toOutcome(alias) === "ANSWER";
      return {
        hostname: name,
        outcome: found.length > 0 ? "ANSWER" : "EMPTY",
        addresses: found,
        ...(aliased ? { alias: true } : {}),
      };
    },
  };
}
