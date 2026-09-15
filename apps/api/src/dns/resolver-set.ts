import { Resolver } from "node:dns/promises";
import type {
  DnsAnswer,
  DnsProviderResult,
  DnsQType,
  DnsRcode,
  DnsTransportStatus,
} from "@2check/contracts";

/** PRD 8.1 — the default resolver set. Filtering variants are deliberately not used. */
export const DEFAULT_RESOLVERS = [
  { provider: "google", address: "8.8.8.8" },
  { provider: "cloudflare", address: "1.1.1.1" },
  { provider: "yandex-basic", address: "77.88.8.8" },
  { provider: "quad9-unfiltered", address: "9.9.9.10" },
] as const;

export const DEFAULT_RESOLVER_SET_VERSION = "default-1";

/** PRD 8.2 */
export const DEFAULT_QTYPES: readonly DnsQType[] = ["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA"];

interface NodeDnsError {
  readonly code?: string;
}

/**
 * node:dns reports the protocol outcome through error codes. A SERVFAIL or REFUSED is still a
 * response, so it keeps transportStatus SUCCESS and is separated from the record state by rcode.
 */
export function classifyError(error: unknown): {
  transportStatus: DnsTransportStatus;
  rcode?: DnsRcode;
  outcome?: DnsProviderResult["outcome"];
} {
  const code = (error as NodeDnsError).code ?? "";
  switch (code) {
    case "ENODATA":
      return { transportStatus: "SUCCESS", rcode: "NOERROR", outcome: "NODATA" };
    case "ENOTFOUND":
      return { transportStatus: "SUCCESS", rcode: "NXDOMAIN", outcome: "NXDOMAIN" };
    case "ESERVFAIL":
      return { transportStatus: "SUCCESS", rcode: "SERVFAIL" };
    case "EREFUSED":
      return { transportStatus: "SUCCESS", rcode: "REFUSED" };
    case "EFORMERR":
      return { transportStatus: "SUCCESS", rcode: "FORMERR" };
    case "ENOTIMP":
      return { transportStatus: "SUCCESS", rcode: "NOTIMP" };
    case "ETIMEOUT":
    case "ETIMEDOUT":
      return { transportStatus: "TIMEOUT" };
    case "EBADRESP":
    case "EBADQUERY":
    case "EBADNAME":
      return { transportStatus: "PROTOCOL_ERROR" };
    default:
      return { transportStatus: "NETWORK_ERROR" };
  }
}

async function queryAnswers(
  resolver: Resolver,
  qname: string,
  qtype: DnsQType,
): Promise<DnsAnswer[]> {
  switch (qtype) {
    case "A":
      return (await resolver.resolve4(qname, { ttl: true })).map((record) => ({
        type: qtype,
        value: record.address,
        ttl: record.ttl,
      }));
    case "AAAA":
      return (await resolver.resolve6(qname, { ttl: true })).map((record) => ({
        type: qtype,
        value: record.address,
        ttl: record.ttl,
      }));
    case "MX":
      return (await resolver.resolveMx(qname)).map((record) => ({
        type: qtype,
        value: `${record.priority} ${record.exchange}`,
      }));
    case "TXT":
      return (await resolver.resolveTxt(qname)).map((chunks) => ({
        type: qtype,
        value: chunks.join(""),
      }));
    case "NS":
      return (await resolver.resolveNs(qname)).map((value) => ({ type: qtype, value }));
    case "CNAME":
      return (await resolver.resolveCname(qname)).map((value) => ({ type: qtype, value }));
    case "SOA": {
      const soa = await resolver.resolveSoa(qname);
      return [
        {
          type: qtype,
          value: `${soa.nsname} ${soa.hostmaster} ${soa.serial} ${soa.refresh} ${soa.retry} ${soa.expire} ${soa.minttl}`,
        },
      ];
    }
  }
}

export interface QueryOptions {
  readonly timeoutMs?: number;
}

/** PRD 8.3 — one provider's answer for one query type. */
export async function queryProvider(
  provider: string,
  address: string,
  qname: string,
  qtype: DnsQType,
  options: QueryOptions = {},
): Promise<DnsProviderResult> {
  const resolver = new Resolver({ timeout: options.timeoutMs ?? 3000, tries: 1 });
  resolver.setServers([address]);

  const startedAt = Date.now();
  try {
    const answers = await queryAnswers(resolver, qname, qtype);
    return {
      provider,
      qname,
      qtype,
      transportStatus: "SUCCESS",
      rcode: "NOERROR",
      outcome: answers.length > 0 ? "ANSWER" : "NODATA",
      answers,
      authority: [],
      latencyMs: Date.now() - startedAt,
      receivedAt: new Date().toISOString(),
    };
  } catch (error) {
    const classified = classifyError(error);
    // exactOptionalPropertyTypes: an absent rcode or outcome is omitted, never set to undefined.
    return {
      provider,
      qname,
      qtype,
      transportStatus: classified.transportStatus,
      ...(classified.rcode === undefined ? {} : { rcode: classified.rcode }),
      ...(classified.outcome === undefined ? {} : { outcome: classified.outcome }),
      answers: [],
      authority: [],
      latencyMs: Date.now() - startedAt,
      receivedAt: new Date().toISOString(),
    };
  }
}

/** Queries every configured resolver for every query type, in parallel. */
export async function queryResolverSet(
  qname: string,
  qtypes: readonly DnsQType[] = DEFAULT_QTYPES,
  options: QueryOptions = {},
): Promise<DnsProviderResult[]> {
  const queries = DEFAULT_RESOLVERS.flatMap((resolver) =>
    qtypes.map((qtype) =>
      queryProvider(resolver.provider, resolver.address, qname, qtype, options),
    ),
  );
  return Promise.all(queries);
}
