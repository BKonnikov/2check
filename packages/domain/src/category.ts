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
  if (category === "email") {
    /**
     * 1.1 §2.1 — the mail category has no single root: the sending policies are read from the
     * domain's own records and the receiving checks from the hosts its MX names, and neither
     * group waits on the other. So the deadline is reported once per independent group rather
     * than against one check that would stand for work the other group never started.
     */
    return [
      {
        ...shared,
        checkId: "email.spf.record",
        target: { kind: "EMAIL_POLICY", policy: "SPF", queriedName: options.hostname },
        message: { titleCode: "email.spf.record.unknown" },
      },
      {
        ...shared,
        checkId: "email.mx.records",
        target: { kind: "MAIL_HOST", hostname: options.hostname },
        message: { titleCode: "email.mx.records.unknown" },
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
