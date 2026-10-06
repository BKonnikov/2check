import type { DnsProviderResult, DnsQueryableType } from "@2check/contracts";
import type {
  HostObservation,
  MailLookupOutcome,
  MxObservation,
  MxRecord,
  PtrOutcome,
} from "@2check/domain";
import { reverseName } from "@2check/domain";
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

export interface ReverseObservation {
  readonly outcome: PtrOutcome;
  readonly names?: readonly string[];
}

export interface MailHostPort {
  readonly provider: string;
  mx(domain: string): Promise<MxObservation>;
  addresses(name: string): Promise<HostObservation>;
  /** 1.1 §8.1 — the name an address answers with, asked in the reverse zone. */
  reverse(address: string): Promise<ReverseObservation>;
}

export function createMailHostLookup(): MailHostPort {
  const resolver = DEFAULT_RESOLVERS[0];
  const provider = resolver?.provider ?? "unknown";
  const ask = async (
    name: string,
    qtype: DnsQueryableType,
  ): Promise<DnsProviderResult | undefined> => {
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
    async reverse(address) {
      const name = reverseName(address);
      if (name === undefined) {
        // Not an address we can build a reverse name from, so there is nothing to ask.
        return { outcome: "INDETERMINATE" };
      }
      const result = await ask(name, "PTR");
      if (result === undefined) {
        return { outcome: "INDETERMINATE" };
      }
      const outcome = toOutcome(result);
      if (outcome !== "ANSWER") {
        return { outcome };
      }
      const names = result.answers
        .map((answer) => answer.value.trim().replace(/\.$/, ""))
        .filter((value) => value !== "");
      return names.length === 0 ? { outcome: "EMPTY" } : { outcome: "ANSWER", names };
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
