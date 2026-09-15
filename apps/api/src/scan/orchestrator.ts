import type { CategoryResult, DnsProviderResult, ExecutionContext } from "@2check/contracts";
import {
  buildCategoryResult,
  collectAddressCandidates,
  evaluateNameExistence,
  evaluateRegistryLookup,
  evaluateResolveCheck,
  evaluateResolverConsistency,
  resolveRegistryLookup,
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
import type { ScanRecord } from "./store.js";

/** Injectable so tests run against golden fixtures rather than the public internet (AC-26.2). */
export type DnsQuery = (qname: string) => Promise<readonly DnsProviderResult[]>;

export interface ScanDependencies {
  readonly dnsQuery?: DnsQuery;
  readonly registryLookup?: RegistryLookup;
}

/** PRD 16.4 — pinned for the whole scan. The slice carries placeholders for modules not yet built. */
export function buildExecutionContext(): ExecutionContext {
  return {
    healthPolicyVersion: "slice-1",
    securityPolicyVersion: "slice-1",
    orchestrationConfigVersion: "slice-1",
    cacheContractVersion: "slice-1",
    resolverSetVersion: DEFAULT_RESOLVER_SET_VERSION,
    dnsModuleConfigVersion: "slice-1",
    registryModuleConfigVersion: "slice-1",
    tlsModuleConfigVersion: "not-implemented",
    trustStoreVersion: "not-implemented",
  };
}

async function runDnsCategory(record: ScanRecord, query: DnsQuery): Promise<CategoryResult> {
  const qname = record.canonicalDomain.asciiHostname;
  const options = { qname, resolverSetVersion: record.executionContext.resolverSetVersion };
  const results = await query(qname);

  // PRD 16.6 — every planned A/AAAA query reached a terminal outcome before the set is sealed.
  const sealed = collectAddressCandidates(results);
  record.sealedDnsAddressCandidates = sealed;
  record.securityValidation = validateTarget(sealed, {
    policyVersion: record.executionContext.securityPolicyVersion,
  });

  const checks = [evaluateNameExistence(results, options)];
  for (const qtype of DEFAULT_QTYPES) {
    const forType = results.filter((entry) => entry.qtype === qtype);
    checks.push(evaluateResolveCheck(qtype, forType, options));
    checks.push(evaluateResolverConsistency(qtype, forType, options));
  }
  return buildCategoryResult("dns", checks);
}

async function runRegistryCategory(
  record: ScanRecord,
  lookup: RegistryLookup,
): Promise<CategoryResult> {
  // PRD 5.4 — registryDomain is the registry module's determination, not a CanonicalDomain input.
  const registryDomain =
    record.canonicalDomain.registrableDomain ?? record.canonicalDomain.asciiHostname;
  const freshness = { checkedAt: new Date().toISOString(), cached: false, cacheAge: 0 };
  const supported = isSupportedZone(registryDomain);

  const resolution = supported
    ? resolveRegistryLookup(await lookup(registryDomain))
    : { outcome: "INDETERMINATE" as const, registration: null, transportsUsed: [] };

  const check = evaluateRegistryLookup(resolution, {
    registryDomain,
    registryProvider: REGISTRY_PROVIDER,
    supported,
    freshness,
  });
  return buildCategoryResult("registry", [check]);
}

/**
 * Runs the visible categories of the scan. Security validation runs as an internal prerequisite
 * (PRD 16.3): it produces no visible category, no issue and no score.
 */
export async function runScan(record: ScanRecord, deps: ScanDependencies = {}): Promise<void> {
  record.executionState = "RUNNING";

  try {
    const categories: CategoryResult[] = [];
    for (const category of record.visibleCategories) {
      if (category === "dns") {
        categories.push(await runDnsCategory(record, deps.dnsQuery ?? queryResolverSet));
      }
      if (category === "registry") {
        categories.push(
          await runRegistryCategory(record, deps.registryLookup ?? lookupRegistration),
        );
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
}
