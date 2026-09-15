import type { CategoryResult, CheckFreshness, CheckResult, ScanCategory } from "@2check/contracts";
import { aggregateCompleteness, aggregateSeverity, aggregateStatus } from "./aggregation.js";

/**
 * PRD 7.4 — assemble a category from its checks using the shared aggregation rules,
 * so status precedence, completeness and severity are decided in exactly one place.
 */
export function buildCategoryResult<TDetails>(
  category: ScanCategory,
  checks: readonly CheckResult<TDetails>[],
): CategoryResult<TDetails> {
  const statuses = checks.map((check) => check.status);
  return {
    category,
    status: aggregateStatus(statuses),
    severity: aggregateSeverity(checks),
    completeness: aggregateCompleteness(statuses),
    checks,
  };
}

/**
 * PRD 16.7 and AC-22.2 — what a category looks like when the overall scan deadline ran out
 * before it produced anything.
 *
 * The root check of the category is UNKNOWN with scan_deadline_exceeded: the product did not
 * finish looking, which is not the same as having looked and found a problem (AC-23.4). The TLS
 * category builds its own shape, because its certificate checks follow the connection checks by
 * dependency.
 */
export function buildDeadlineChecks(
  category: ScanCategory,
  options: { readonly hostname: string; readonly freshness: CheckFreshness },
): CheckResult[] {
  const shared = {
    category,
    status: "UNKNOWN" as const,
    severity: "none" as const,
    reasonCode: "scan_deadline_exceeded",
    freshness: options.freshness,
  };
  if (category === "dns") {
    return [
      {
        ...shared,
        checkId: "dns.name.existence",
        target: { kind: "DNS_NAME", qname: options.hostname },
        message: { titleCode: "dns.name.existence.unknown" },
      },
    ];
  }
  return [
    {
      ...shared,
      checkId: "registry.lookup",
      target: { kind: "REGISTRY_DOMAIN", registryDomain: options.hostname },
      message: { titleCode: "registry.lookup.indeterminate" },
    },
  ];
}
