/**
 * Shared enumerations and constants of the internal web API.
 * Values are taken from the PRD and must not diverge from it.
 */

/** PRD 7.1 — check status. */
export const CHECK_STATUSES = ["PASS", "FAIL", "UNKNOWN", "NOT_APPLICABLE"] as const;
export type CheckStatus = (typeof CHECK_STATUSES)[number];

/** PRD 7.4 — status precedence when results are aggregated. */
export const CHECK_STATUS_PRECEDENCE = ["FAIL", "UNKNOWN", "PASS", "NOT_APPLICABLE"] as const;

/** PRD 7.2 — severity, ordered from strongest to weakest. */
export const SEVERITIES = ["critical", "warning", "informational", "none"] as const;
export type Severity = (typeof SEVERITIES)[number];

/** PRD 7.4 — category completeness. */
export const COMPLETENESS_VALUES = ["COMPLETE", "PARTIAL"] as const;
export type Completeness = (typeof COMPLETENESS_VALUES)[number];

/** PRD 16 — authoritative execution state, readable through GET. */
export const EXECUTION_STATES = ["PENDING", "RUNNING", "COMPLETED", "FAILED"] as const;
export type ExecutionState = (typeof EXECUTION_STATES)[number];

/** PRD 17.3 — POST /scans acknowledges acceptance only. */
export const ACCEPTANCE_STATES = ["PENDING", "RUNNING"] as const;
export type AcceptanceState = (typeof ACCEPTANCE_STATES)[number];

/** PRD 17.2 — scan mode. */
export const SCAN_MODES = ["FULL", "PARTIAL"] as const;
export type ScanMode = (typeof SCAN_MODES)[number];

/** PRD 17.2 — categories a PARTIAL scan may select. */
export const SCAN_CATEGORIES = ["dns", "registry", "tls"] as const;
export type ScanCategory = (typeof SCAN_CATEGORIES)[number];

/** PRD 17.2 — cache mode. */
export const CACHE_MODES = ["NORMAL", "FORCE_REFRESH"] as const;
export type CacheMode = (typeof CACHE_MODES)[number];

/** PRD 18 — retryability contract exposed by the server. */
export const RETRYABILITY_VALUES = ["RETRYABLE", "CONDITIONAL", "NOT_RETRYABLE"] as const;
export type Retryability = (typeof RETRYABILITY_VALUES)[number];

/** PRD 17.1 — base path of the internal web API. */
export const WEB_API_BASE_PATH = "/api/web/v1";
