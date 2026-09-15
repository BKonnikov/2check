import { Socket } from "node:net";
import type { CheckFreshness } from "@2check/contracts";
import { normalizeRdapDomain, parseWhoisRecord, type TransportAttempt } from "@2check/domain";

/** PRD 9.1 — the MVP provider. Its endpoints belong to versioned module configuration (PRD 20.3). */
export const REGISTRY_PROVIDER = "UzRegistryProvider";
export const SUPPORTED_SUFFIX = "uz";

export interface RegistryProviderConfig {
  readonly rdapBaseUrl: string;
  readonly whoisHost: string;
  readonly whoisPort: number;
  readonly timeoutMs: number;
}

export const DEFAULT_REGISTRY_CONFIG: RegistryProviderConfig = {
  // Taken from the IANA RDAP bootstrap entry for .uz; overridable because it is configuration.
  rdapBaseUrl: process.env.REGISTRY_RDAP_BASE ?? "https://rdap.cctld.uz",
  whoisHost: process.env.REGISTRY_WHOIS_HOST ?? "whois.cctld.uz",
  whoisPort: 43,
  timeoutMs: 6000,
};

export function isSupportedZone(registryDomain: string): boolean {
  return registryDomain.toLowerCase().endsWith(`.${SUPPORTED_SUFFIX}`);
}

function freshnessNow(): CheckFreshness {
  return { checkedAt: new Date().toISOString(), cached: false, cacheAge: 0 };
}

/**
 * PRD 9.2 — RDAP attempt.
 * 404 is an authoritative statement that the object does not exist (RFC 9082) and is the only
 * way this transport can confirm NOT_REGISTERED. Every other failure stays indeterminate.
 */
export async function lookupRdap(
  registryDomain: string,
  config: RegistryProviderConfig = DEFAULT_REGISTRY_CONFIG,
): Promise<TransportAttempt> {
  const attempt = (
    registration: TransportAttempt["registration"],
    confirmedNotRegistered: boolean,
  ): TransportAttempt => ({ transport: "RDAP", registration, confirmedNotRegistered });

  try {
    const response = await fetch(
      `${config.rdapBaseUrl.replace(/\/$/, "")}/domain/${encodeURIComponent(registryDomain)}`,
      {
        headers: { accept: "application/rdap+json" },
        signal: AbortSignal.timeout(config.timeoutMs),
      },
    );

    if (response.status === 404) {
      return attempt(null, true);
    }
    if (!response.ok) {
      return attempt(null, false);
    }
    return attempt(normalizeRdapDomain(await response.json(), freshnessNow()), false);
  } catch {
    // Timeout, network failure, or a body that is not JSON: indeterminate, never "free".
    return attempt(null, false);
  }
}

/** Reads a WHOIS response over TCP port 43. */
export function fetchWhois(
  registryDomain: string,
  config: RegistryProviderConfig = DEFAULT_REGISTRY_CONFIG,
): Promise<string | null> {
  return new Promise((resolve) => {
    const socket = new Socket();
    const chunks: Buffer[] = [];
    let settled = false;

    const finish = (value: string | null): void => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(value);
      }
    };

    socket.setTimeout(config.timeoutMs);
    socket.on("data", (chunk: Buffer) => chunks.push(chunk));
    socket.on("end", () => finish(Buffer.concat(chunks).toString("utf8")));
    socket.on("timeout", () => finish(null));
    socket.on("error", () => finish(null));
    socket.connect(config.whoisPort, config.whoisHost, () => {
      socket.write(`${registryDomain}\r\n`);
    });
  });
}

export async function lookupWhois(
  registryDomain: string,
  config: RegistryProviderConfig = DEFAULT_REGISTRY_CONFIG,
): Promise<TransportAttempt> {
  const text = await fetchWhois(registryDomain, config);
  if (text === null) {
    return { transport: "WHOIS", registration: null, confirmedNotRegistered: false };
  }
  const parsed = parseWhoisRecord(text, freshnessNow());
  return {
    transport: "WHOIS",
    registration: parsed.registration,
    confirmedNotRegistered: parsed.notFound,
  };
}

export type RegistryLookup = (registryDomain: string) => Promise<readonly TransportAttempt[]>;

/** PRD 9.1 — WHOIS is consulted only after RDAP failed to be determinate. */
export async function lookupRegistration(
  registryDomain: string,
  config: RegistryProviderConfig = DEFAULT_REGISTRY_CONFIG,
): Promise<readonly TransportAttempt[]> {
  const rdap = await lookupRdap(registryDomain, config);
  if (rdap.registration !== null || rdap.confirmedNotRegistered) {
    return [rdap];
  }
  return [rdap, await lookupWhois(registryDomain, config)];
}
