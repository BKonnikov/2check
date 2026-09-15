import type { CategoryResult, CheckResult, ScanCategory } from "@2check/contracts";
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
