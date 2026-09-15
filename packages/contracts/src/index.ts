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

/** PRD 5.1 — how the user's input was shaped. */
export const INPUT_TYPES = ["HOSTNAME", "URL", "URL_LIKE"] as const;
export type InputType = (typeof INPUT_TYPES)[number];

/** PRD 5.3 — where the public suffix came from. */
export const PUBLIC_SUFFIX_TYPES = ["ICANN", "PRIVATE", "UNKNOWN"] as const;
export type PublicSuffixType = (typeof PUBLIC_SUFFIX_TYPES)[number];

/**
 * PRD 5.3 — the single preprocessing object every module consumes.
 * registryDomain is deliberately absent: it is an output of the registry module.
 */
export interface CanonicalDomain {
  readonly originalInput: string;
  readonly inputType: InputType;
  readonly unicodeHostname: string;
  readonly asciiHostname: string;
  readonly publicSuffix: string | null;
  readonly publicSuffixType: PublicSuffixType;
  readonly registrableDomain: string | null;
  readonly labels: readonly string[];
  readonly isIdn: boolean;
  readonly hadTrailingDot: boolean;
}

/**
 * Input-level rejections (PRD 18.1, level 1: before a scan exists, without a scanId).
 * These surface as WebApiError.errorCode with HTTP 422 (PRD 17.2), never as a reasonCode.
 */
export const INPUT_REJECTION_CODES = [
  "input_empty",
  "input_scheme_unsupported",
  "input_credentials_present",
  "input_port_not_allowed",
  "input_ip_address",
  "input_wildcard_hostname",
  "input_email_address",
  "input_single_label",
  "input_reserved_hostname",
  "input_hostname_invalid",
] as const;
export type InputRejectionCode = (typeof INPUT_REJECTION_CODES)[number];

/** PRD 15.2 — outcome of security validation for a whole target. */
export const SECURITY_DECISIONS = ["ALLOW", "BLOCK", "INDETERMINATE"] as const;
export type SecurityDecision = (typeof SECURITY_DECISIONS)[number];

/** PRD 15.4 — minimum address classification. Everything but PUBLIC_ALLOWED forbids the target. */
export const ADDRESS_CLASSES = [
  "PUBLIC_ALLOWED",
  "FORBIDDEN_PRIVATE",
  "FORBIDDEN_LOOPBACK",
  "FORBIDDEN_LINK_LOCAL",
  "FORBIDDEN_SHARED",
  "FORBIDDEN_SPECIAL",
  "FORBIDDEN_MULTICAST",
  "FORBIDDEN_METADATA",
  "FORBIDDEN_INTERNAL_INFRASTRUCTURE",
] as const;
export type AddressClass = (typeof ADDRESS_CLASSES)[number];

/** PRD 15.6–15.8 — the two security reason codes, separated by execution stage. */
export const SECURITY_REASON_CODES = [
  "ssrf_policy_block",
  "security_validation_incomplete",
] as const;
export type SecurityReasonCode = (typeof SECURITY_REASON_CODES)[number];

/** PRD 15.2 */
export interface SecurityValidationResult {
  readonly decision: SecurityDecision;
  readonly policyVersion: string;
  readonly checkedAddressCount: number;
  readonly blockedAddressCount: number;
  readonly reasonCode?: SecurityReasonCode;
}

/** PRD 6.1 — the single message DTO handed to the browser. */
export interface MessageDescriptor {
  readonly titleCode: string;
  readonly explanationCode?: string;
  readonly impactCode?: string;
  readonly recommendationCode?: string;
  readonly params?: Readonly<Record<string, string | number | boolean>>;
}

/** PRD 6.3 — checkedAt is the time of the original observation, never of the cache read. */
export interface CheckFreshness {
  readonly checkedAt: string;
  readonly cached: boolean;
  readonly cacheAge: number;
  readonly sourceUpdatedAt?: string;
}

/** PRD 7 and 6.2 — dependencyMode defaults to ALL. */
export const DEPENDENCY_MODES = ["ALL", "ANY"] as const;
export type DependencyMode = (typeof DEPENDENCY_MODES)[number];

/** PRD 8.2 — query types asked of every resolver. */
export const DNS_QTYPES = ["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA"] as const;
export type DnsQType = (typeof DNS_QTYPES)[number];

/** PRD 8.3 */
export const DNS_TRANSPORT_STATUSES = [
  "SUCCESS",
  "TIMEOUT",
  "NETWORK_ERROR",
  "PROTOCOL_ERROR",
] as const;
export type DnsTransportStatus = (typeof DNS_TRANSPORT_STATUSES)[number];

export const DNS_RCODES = [
  "NOERROR",
  "NXDOMAIN",
  "SERVFAIL",
  "REFUSED",
  "FORMERR",
  "NOTIMP",
  "OTHER",
] as const;
export type DnsRcode = (typeof DNS_RCODES)[number];

/** PRD 8.3 — NXDOMAIN and NODATA are distinct outcomes. */
export const DNS_OUTCOMES = ["ANSWER", "NODATA", "NXDOMAIN"] as const;
export type DnsOutcome = (typeof DNS_OUTCOMES)[number];

/** PRD 8.4 — per-provider record state. */
export const DNS_RECORD_STATES = ["PRESENT", "ABSENT", "NAME_NOT_FOUND", "INDETERMINATE"] as const;
export type DnsRecordState = (typeof DNS_RECORD_STATES)[number];

export interface DnsAnswer {
  readonly type: DnsQType;
  readonly value: string;
  /** PRD 8.3 — TTL is shown per provider and never participates in RRset equality. */
  readonly ttl?: number;
}

/** PRD 8.3 */
export interface DnsProviderResult {
  readonly provider: string;
  readonly qname: string;
  readonly qtype: DnsQType;
  readonly transportStatus: DnsTransportStatus;
  readonly rcode?: DnsRcode;
  readonly outcome?: DnsOutcome;
  readonly answers: readonly DnsAnswer[];
  readonly authority: readonly DnsAnswer[];
  readonly latencyMs?: number;
  readonly receivedAt: string;
}

/** PRD 8.3 — qtype is absent on whole-name checks such as dns.name.existence. */
export interface DnsCheckTarget {
  readonly kind: "DNS_NAME";
  readonly qname: string;
  readonly qtype?: DnsQType;
}

/** PRD 8.3 — stable identifiers of the resolvers whose observations produced the result. */
export interface DnsCheckSource {
  readonly kind: "DNS_RESOLVER_SET";
  readonly resolverSetVersion: string;
  readonly providers: readonly string[];
}

/** PRD 6.2 — registry and TLS variants join these once their modules exist. */
export type ModuleCheckTarget = DnsCheckTarget;
export type ModuleCheckSource = DnsCheckSource;

/** PRD 6.2 */
export interface CheckResult<TDetails = unknown> {
  readonly checkId: string;
  readonly category: ScanCategory;
  readonly status: CheckStatus;
  readonly severity: Severity;
  readonly target: ModuleCheckTarget;
  readonly reasonCode?: string;
  readonly dependsOn?: readonly string[];
  readonly dependencyMode?: DependencyMode;
  readonly blockedBy?: string;
  readonly message: MessageDescriptor;
  readonly details?: TDetails;
  readonly source?: ModuleCheckSource;
  readonly freshness: CheckFreshness;
}
