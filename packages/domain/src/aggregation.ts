import {
  CHECK_STATUS_PRECEDENCE,
  type CheckStatus,
  type Completeness,
  SEVERITIES,
  type Severity,
} from "@2check/contracts";

/**
 * PRD 7.4 — aggregated status follows FAIL > UNKNOWN > PASS > NOT_APPLICABLE.
 * An empty set of child checks carries no applicable object.
 */
export function aggregateStatus(statuses: readonly CheckStatus[]): CheckStatus {
  for (const candidate of CHECK_STATUS_PRECEDENCE) {
    if (statuses.includes(candidate)) {
      return candidate;
    }
  }
  return "NOT_APPLICABLE";
}

/**
 * PRD 7.4 — completeness is PARTIAL if and only if at least one child check is UNKNOWN.
 * NOT_APPLICABLE does not reduce completeness.
 */
export function aggregateCompleteness(statuses: readonly CheckStatus[]): Completeness {
  return statuses.includes("UNKNOWN") ? "PARTIAL" : "COMPLETE";
}

/**
 * PRD 7.4 — category severity is the strongest severity among failing child checks;
 * without a failing child it is "none".
 */
export function aggregateSeverity(
  checks: readonly { readonly status: CheckStatus; readonly severity: Severity }[],
): Severity {
  const failing = checks.filter((check) => check.status === "FAIL");
  for (const candidate of SEVERITIES) {
    if (failing.some((check) => check.severity === candidate)) {
      return candidate;
    }
  }
  return "none";
}

/**
 * PRD 7.2 — the combination FAIL + severity "none" is rejected at configuration validation.
 */
export function isAllowedStatusSeverity(status: CheckStatus, severity: Severity): boolean {
  return !(status === "FAIL" && severity === "none");
}
