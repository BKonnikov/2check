import type {
  CategoryResult,
  DnsProviderResult,
  ExecutionContext,
  TlsExecutionMetadata,
} from "@2check/contracts";
import {
  buildCategoryResult,
  collectAddressCandidates,
  evaluateNameExistence,
  evaluateRegistryLookup,
  evaluateResolveCheck,
  evaluateResolverConsistency,
  evaluateTlsBlockedChecks,
  evaluateTlsChecks,
  resolveRegistryLookup,
  selectRepresentativeAddress,
  type TlsProbeOutcome,
  type TlsProbes,
  validateTarget,
} from "@2check/domain";
import {
  DEFAULT_QTYPES,
  DEFAULT_RESOLVER_SET_VERSION,
  queryResolverSet,
} from "../dns/resolver-set.js";
import {
  isSupportedZone,
  lookupRegistration,
  REGISTRY_PROVIDER,
  type RegistryLookup,
} from "../registry/uz-provider.js";
import { probeEndpoint } from "../tls/prober.js";
import type { ScanRecord, ScanStore } from "./store.js";

/** Injectable so tests run against golden fixtures rather than the public internet (AC-26.2). */
export type DnsQuery = (qname: string) => Promise<readonly DnsProviderResult[]>;
export type TlsProbe = (
  address: string,
  hostname: string,
  family: "IPV4" | "IPV6",
) => Promise<TlsProbeOutcome>;

export interface ScanDependencies {
  readonly dnsQuery?: DnsQuery;
  readonly registryLookup?: RegistryLookup;
  readonly tlsProbe?: TlsProbe;
}

/** PRD 16.4 — pinned for the whole scan. */
export function buildExecutionContext(): ExecutionContext {
  return {
    healthPolicyVersion: "slice-1",
    securityPolicyVersion: "slice-1",
    orchestrationConfigVersion: "slice-1",
    cacheContractVersion: "slice-1",
    resolverSetVersion: DEFAULT_RESOLVER_SET_VERSION,
    dnsModuleConfigVersion: "slice-1",
    registryModuleConfigVersion: "slice-1",
    tlsModuleConfigVersion: "slice-1",
    trustStoreVersion: "system-1",
  };
}

function freshnessNow() {
  return { checkedAt: new Date().toISOString(), cached: false, cacheAge: 0 };
}

function isIpv6(address: string): boolean {
  return address.includes(":");
}

/**
 * PRD 16.6 — the address-resolution barrier.
 * Every planned A/AAAA query reaches a terminal outcome, the candidate set is sealed, and only
 * then may security validation produce ALLOW (AC-16.5). Running this without a visible DNS
 * category is what AC-16.3 permits for a TLS-only PARTIAL scan.
 */
async function sealAddressCandidates(
  record: ScanRecord,
  results: readonly DnsProviderResult[],
): Promise<readonly string[]> {
  const sealed = collectAddressCandidates(results);
  record.sealedDnsAddressCandidates = sealed;
  record.securityValidation = validateTarget(sealed, {
    policyVersion: record.executionContext.securityPolicyVersion,
  });
  return sealed;
}

export async function runScan(
  record: ScanRecord,
  store: ScanStore,
  deps: ScanDependencies = {},
): Promise<void> {
  record.executionState = "RUNNING";
  await store.save(record);

  const qname = record.canonicalDomain.asciiHostname;
  const dnsOptions = { qname, resolverSetVersion: record.executionContext.resolverSetVersion };
  let dnsResults: readonly DnsProviderResult[] | undefined;

  const dnsOnce = async (): Promise<readonly DnsProviderResult[]> => {
    dnsResults ??= await (deps.dnsQuery ?? queryResolverSet)(qname);
    return dnsResults;
  };

  try {
    const categories: CategoryResult[] = [];

    for (const category of record.visibleCategories) {
      if (category === "dns") {
        const results = await dnsOnce();
        await sealAddressCandidates(record, results);

        const checks = [evaluateNameExistence(results, dnsOptions)];
        for (const qtype of DEFAULT_QTYPES) {
          const forType = results.filter((entry) => entry.qtype === qtype);
          checks.push(evaluateResolveCheck(qtype, forType, dnsOptions));
          checks.push(evaluateResolverConsistency(qtype, forType, dnsOptions));
        }
        categories.push(buildCategoryResult("dns", checks));
      }

      if (category === "registry") {
        // PRD 5.4 — registryDomain is the registry module's determination.
        const registryDomain =
          record.canonicalDomain.registrableDomain ?? record.canonicalDomain.asciiHostname;
        const supported = isSupportedZone(registryDomain);
        const resolution = supported
          ? resolveRegistryLookup(await (deps.registryLookup ?? lookupRegistration)(registryDomain))
          : { outcome: "INDETERMINATE" as const, registration: null, transportsUsed: [] };

        categories.push(
          buildCategoryResult("registry", [
            evaluateRegistryLookup(resolution, {
              registryDomain,
              registryProvider: REGISTRY_PROVIDER,
              supported,
              freshness: freshnessNow(),
            }),
          ]),
        );
      }

      if (category === "tls") {
        const results = await dnsOnce();
        const sealed = await sealAddressCandidates(record, results);
        const tlsOptions = { hostname: qname, freshness: freshnessNow() };
        const decision = record.securityValidation?.decision ?? "INDETERMINATE";

        if (decision !== "ALLOW") {
          // PRD 15.7 — a security BLOCK is not a problem of the domain.
          categories.push(
            buildCategoryResult(
              "tls",
              evaluateTlsBlockedChecks(
                decision === "BLOCK" ? "ssrf_policy_block" : "security_validation_incomplete",
                tlsOptions,
              ),
            ),
          );
          continue;
        }

        // PRD 10.2 — the representative endpoint per family, chosen by how many resolvers saw it.
        const observations = (address: string): number =>
          results.filter((entry) => entry.answers.some((answer) => answer.value === address))
            .length;
        const selectedIPv4 = selectRepresentativeAddress(
          sealed.filter((address) => !isIpv6(address)),
          observations,
        );
        const selectedIPv6 = selectRepresentativeAddress(sealed.filter(isIpv6), observations);

        const probe = deps.tlsProbe ?? probeEndpoint;
        const probes: TlsProbes = {
          IPV4:
            selectedIPv4 === undefined
              ? { kind: "ABSENT" }
              : await probe(selectedIPv4, qname, "IPV4"),
          IPV6:
            selectedIPv6 === undefined
              ? { kind: "ABSENT" }
              : await probe(selectedIPv6, qname, "IPV6"),
        };

        // PRD 19.4 — the minimal audit record of the TLS prerequisites.
        const metadata: TlsExecutionMetadata = {
          ...(selectedIPv4 === undefined ? {} : { selectedIPv4 }),
          ...(selectedIPv6 === undefined ? {} : { selectedIPv6 }),
          dependencyFingerprint: [...sealed].sort().join("|"),
          securityPolicyVersion: record.executionContext.securityPolicyVersion,
          tlsModuleConfigVersion: record.executionContext.tlsModuleConfigVersion,
          trustStoreVersion: record.executionContext.trustStoreVersion,
          resultSource: "FRESH",
        };
        record.tlsExecutionMetadata = metadata;

        categories.push(buildCategoryResult("tls", evaluateTlsChecks(probes, tlsOptions)));
      }
    }

    record.categories = categories;
    record.executionState = "COMPLETED";
    record.completedAt = new Date().toISOString();
  } catch {
    // PRD 16.9 — FAILED only when no trustworthy final result can be produced.
    record.executionState = "FAILED";
    record.completedAt = new Date().toISOString();
    record.failure = { failureCode: "orchestration_error", occurredAt: new Date().toISOString() };
  }

  // AC-19.9 — the terminal snapshot is published in one write, after which it is immutable.
  await store.save(record);
}
