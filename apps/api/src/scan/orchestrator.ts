import type { CheckResult, DnsProviderResult, ExecutionContext } from "@2check/contracts";
import {
  buildCategoryResult,
  collectAddressCandidates,
  type DnsResolveDetails,
  evaluateNameExistence,
  evaluateResolveCheck,
  evaluateResolverConsistency,
  validateTarget,
} from "@2check/domain";
import {
  DEFAULT_QTYPES,
  DEFAULT_RESOLVER_SET_VERSION,
  queryResolverSet,
} from "../dns/resolver-set.js";

/** Injectable so tests run against golden fixtures rather than the public internet (AC-26.2). */
export type DnsQuery = (qname: string) => Promise<readonly DnsProviderResult[]>;

import type { ScanRecord } from "./store.js";

/** PRD 16.4 — pinned for the whole scan. The slice carries placeholders for modules not yet built. */
export function buildExecutionContext(): ExecutionContext {
  return {
    healthPolicyVersion: "slice-1",
    securityPolicyVersion: "slice-1",
    orchestrationConfigVersion: "slice-1",
    cacheContractVersion: "slice-1",
    resolverSetVersion: DEFAULT_RESOLVER_SET_VERSION,
    dnsModuleConfigVersion: "slice-1",
    registryModuleConfigVersion: "not-implemented",
    tlsModuleConfigVersion: "not-implemented",
    trustStoreVersion: "not-implemented",
  };
}

/**
 * Runs the DNS category of PRD 8 and, as an internal prerequisite (PRD 16.3), the address barrier
 * of 16.6 followed by security validation. The prerequisite produces no visible category, no score
 * and no issue: it exists so TLS can consume a sealed, validated candidate set later.
 */
export async function runDnsScan(
  record: ScanRecord,
  query: DnsQuery = queryResolverSet,
): Promise<void> {
  record.executionState = "RUNNING";
  const qname = record.canonicalDomain.asciiHostname;
  const options = { qname, resolverSetVersion: record.executionContext.resolverSetVersion };

  try {
    const results = await query(qname);

    // PRD 16.6 — every planned A/AAAA query has reached a terminal outcome before the set is sealed.
    const sealed = collectAddressCandidates(results);
    record.sealedDnsAddressCandidates = sealed;
    record.securityValidation = validateTarget(sealed, {
      policyVersion: record.executionContext.securityPolicyVersion,
    });

    const checks: CheckResult<DnsResolveDetails>[] = [evaluateNameExistence(results, options)];
    for (const qtype of DEFAULT_QTYPES) {
      const forType = results.filter((entry) => entry.qtype === qtype);
      checks.push(evaluateResolveCheck(qtype, forType, options));
      checks.push(evaluateResolverConsistency(qtype, forType, options));
    }

    record.categories = [buildCategoryResult("dns", checks)];
    record.executionState = "COMPLETED";
    record.completedAt = new Date().toISOString();
  } catch {
    // PRD 16.9 — FAILED only when no trustworthy final result can be produced.
    record.executionState = "FAILED";
    record.completedAt = new Date().toISOString();
    record.failure = { failureCode: "orchestration_error", occurredAt: new Date().toISOString() };
  }
}
