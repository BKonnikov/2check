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

/** PRD 9.2 — the outcome of a registry lookup. */
export const REGISTRY_OUTCOMES = ["REGISTERED", "NOT_REGISTERED", "INDETERMINATE"] as const;
export type RegistryOutcome = (typeof REGISTRY_OUTCOMES)[number];

/** PRD 9.3 — the canonical lifecycle. The provider's own wording is kept in rawStatus. */
export const REGISTRATION_STATUSES = [
  "REGISTRATION_INITIATED",
  "PENDING_ACTIVATION",
  "ACTIVE",
  "PENDING_RENEWAL",
  "REDEMPTION_PERIOD",
  "FREE",
  "DEACTIVATED",
  "CANCELLED",
  "RESERVED",
  "AUCTION",
  "UNKNOWN",
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

/** PRD 9.4 — only the state travels in the public result; the value lives apart (PRD 19.8, 25). */
export const REGISTRANT_FIELD_STATES = ["value", "redacted", "unavailable"] as const;
export type RegistrantFieldState = (typeof REGISTRANT_FIELD_STATES)[number];

export interface RegistrantField {
  readonly state: RegistrantFieldState;
}

export const REGISTRY_TRANSPORTS = ["RDAP", "WHOIS"] as const;
export type RegistryTransport = (typeof REGISTRY_TRANSPORTS)[number];

/** PRD 9.4 */
export interface NormalizedDomainRegistration {
  readonly registryDomain: string;
  readonly registrar: string | null;
  readonly createdAt: string | null;
  readonly expiresAt: string | null;
  readonly nameServers: readonly string[];
  readonly status: RegistrationStatus;
  readonly rawStatus: readonly string[];
  readonly registrant: {
    readonly name: RegistrantField;
    readonly email: RegistrantField;
    readonly phone: RegistrantField;
    readonly address: RegistrantField;
  };
  readonly freshness: CheckFreshness;
}

/** PRD 9.4 */
export interface RegistryCheckTarget {
  readonly kind: "REGISTRY_DOMAIN";
  readonly registryDomain: string;
}

/** PRD 9.4 — transportsUsed records the strategy that actually produced the final result. */
export interface RegistryCheckSource {
  readonly kind: "REGISTRY_PROVIDER";
  readonly registryProvider: string;
  readonly transportsUsed: readonly RegistryTransport[];
}

/** PRD 10.7 — after the shared security decision the families are handled independently. */
export const TLS_IP_FAMILIES = ["IPV4", "IPV6"] as const;
export type TlsIpFamily = (typeof TLS_IP_FAMILIES)[number];

/** PRD 10.3 */
export interface TlsCheckTarget {
  readonly kind: "TLS_HOST";
  readonly hostname: string;
  readonly port: 443;
  readonly ipFamily?: TlsIpFamily;
}

/** PRD 10.1 and 10.3 — at most one representative endpoint per family. */
export interface TlsCheckSource {
  readonly kind: "DIRECT_TLS_PROBE";
  readonly endpointCoverage: "REPRESENTATIVE";
}

/**
 * PRD 10.5 — the outcome of chain verification.
 *
 * NOT_VERIFIED is a real third value, not a polite UNTRUSTED. TLS verification stops at the
 * first fault it finds, and a hostname mismatch or an expired certificate stops it before the
 * chain has been judged. Saying UNTRUSTED there would invent a second defect out of the first,
 * and saying TRUSTED would claim a verification that never happened.
 */
export const CHAIN_VERIFICATIONS = ["TRUSTED", "UNTRUSTED", "NOT_VERIFIED"] as const;
export type ChainVerification = (typeof CHAIN_VERIFICATIONS)[number];

/** PRD 10.5 — the certificate facts the MVP evaluates. */
export interface TlsCertificate {
  readonly subject: string;
  readonly issuer: string;
  readonly validFrom: string;
  readonly validTo: string;
  readonly subjectAltNames: readonly string[];
  readonly fingerprint256: string;
  readonly selfSigned: boolean;
  readonly chainVerification: ChainVerification;
  readonly chainErrorCode?: string;
}

/** PRD 19.4 — the canonical audit record of the TLS prerequisites. */
export interface TlsExecutionMetadata {
  readonly selectedIPv4?: string;
  readonly selectedIPv6?: string;
  readonly dependencyFingerprint: string;
  readonly securityPolicyVersion: string;
  readonly tlsModuleConfigVersion: string;
  readonly trustStoreVersion: string;
  readonly resultSource: "FRESH" | "CACHE";
}

/** PRD 6.2 */
export type ModuleCheckTarget = DnsCheckTarget | RegistryCheckTarget | TlsCheckTarget;
export type ModuleCheckSource = DnsCheckSource | RegistryCheckSource | TlsCheckSource;

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

/** PRD 7.4 — the aggregated result of one category. */
export interface CategoryResult<TDetails = unknown> {
  readonly category: ScanCategory;
  readonly status: CheckStatus;
  readonly severity: Severity;
  readonly completeness: Completeness;
  readonly checks: readonly CheckResult<TDetails>[];
}

/**
 * PRD 6.4 — the Public exposure level: the ordinary result view.
 *
 * It is a separate type from CheckResult on purpose. The internal DTO is never serialised
 * directly, so target, source and details — the Technical level — cannot reach a browser by
 * someone adding a field to CheckResult and forgetting that it is also the wire format.
 */
export interface PublicCheckResult {
  readonly checkId: string;
  readonly category: ScanCategory;
  readonly status: CheckStatus;
  readonly severity: Severity;
  readonly reasonCode?: string;
  readonly dependsOn?: readonly string[];
  readonly dependencyMode?: DependencyMode;
  readonly blockedBy?: string;
  readonly message: MessageDescriptor;
  readonly freshness: CheckFreshness;
}

/** PRD 7.4 and 6.4 — the public view of one category. */
export interface PublicCategoryResult {
  readonly category: ScanCategory;
  readonly status: CheckStatus;
  readonly severity: Severity;
  readonly completeness: Completeness;
  readonly checks: readonly PublicCheckResult[];
}

/**
 * PRD 6.4 and 23.6 — the Technical exposure level, served only by /details and only from an
 * explicit list of permitted fields. Nothing administrative or internal appears here, and the
 * registrant subtree carries field states, never field values (PRD 9.4, 25).
 */
export interface TechnicalCheckDetail {
  readonly checkId: string;
  readonly category: ScanCategory;
  readonly target: ModuleCheckTarget;
  readonly source?: ModuleCheckSource;
  readonly details?: Readonly<Record<string, unknown>>;
}

/** PRD 17.1 — the response of GET /scans/{scanId}/details. */
export interface ScanDetailsResponse {
  readonly scanId: string;
  readonly generatedAt: string;
  readonly checks: readonly TechnicalCheckDetail[];
}

/** PRD 17.5 — the public view of CanonicalDomain never includes originalInput. */
export interface PublicCanonicalDomain {
  readonly unicodeHostname: string;
  readonly asciiHostname: string;
  readonly publicSuffix: string | null;
  readonly publicSuffixType: PublicSuffixType;
  readonly registrableDomain: string | null;
  readonly isIdn: boolean;
}

/** PRD 17.2 */
export interface CreateScanRequest {
  readonly input: string;
  readonly mode: ScanMode;
  readonly selectedCategories?: readonly ScanCategory[];
  readonly cacheMode?: CacheMode;
}

/** PRD 17.3 — acceptance only; the authoritative terminal state is read through GET. */
export interface CreateScanResponse {
  readonly scanId: string;
  readonly executionState: AcceptanceState;
  readonly pollAfterMs?: number;
}

/**
 * PRD 16.7 — how a scan reached its terminal state.
 *
 * DEADLINE_TERMINALIZED is not a failure: trustworthy results were produced for the checks that
 * finished, and the ones that did not are UNKNOWN with scan_deadline_exceeded. The scan is
 * COMPLETED, and the reason says the rest was cut short rather than answered.
 */
export const COMPLETION_REASONS = ["NORMAL", "DEADLINE_TERMINALIZED"] as const;
export type CompletionReason = (typeof COMPLETION_REASONS)[number];

/** PRD 16.9 */
export const SCAN_FAILURE_CODES = [
  "orchestration_error",
  "execution_state_unrecoverable",
  "result_integrity_error",
  "configuration_incompatible",
  "internal_platform_error",
] as const;
export type ScanFailureCode = (typeof SCAN_FAILURE_CODES)[number];

export interface ScanExecutionFailure {
  readonly failureCode: ScanFailureCode;
  readonly occurredAt: string;
}

/** PRD 17.5 */
export interface WebScanResponse {
  readonly scanId: string;
  readonly executionState: ExecutionState;
  readonly mode: ScanMode;
  readonly canonicalDomain: PublicCanonicalDomain;
  readonly selectedCategories: readonly ScanCategory[];
  readonly progress?: number;
  readonly categories: readonly PublicCategoryResult[];
  readonly summary?: DomainHealthSummary;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly completionReason?: CompletionReason;
  readonly pollAfterMs?: number;
  readonly failure?: ScanExecutionFailure;
}

/** PRD 17.4 — errorCode lives in a different namespace from a check reasonCode. */
export interface WebApiError {
  readonly errorCode: string;
  readonly message: MessageDescriptor;
  readonly field?: string;
  readonly retryable: boolean;
  readonly retryAfterSeconds?: number;
  readonly requestId?: string;
}

/** PRD 16.4 — pinned for the whole scan; mixing configurations within one scan is prohibited. */
export interface ExecutionContext {
  readonly healthPolicyVersion: string;
  readonly securityPolicyVersion: string;
  readonly orchestrationConfigVersion: string;
  readonly cacheContractVersion: string;
  readonly resolverSetVersion: string;
  readonly dnsModuleConfigVersion: string;
  readonly registryModuleConfigVersion: string;
  readonly tlsModuleConfigVersion: string;
  readonly trustStoreVersion: string;
}

/** PRD 11.1 — an Issue is never "none": it exists only where a check confirmed a problem. */
export type IssueSeverity = Exclude<Severity, "none">;

export interface Issue {
  readonly issueId: string;
  readonly category: ScanCategory;
  readonly severity: IssueSeverity;
  readonly primaryCheckId: string;
  readonly relatedCheckIds: readonly string[];
  readonly message: MessageDescriptor;
}

/** PRD 11.4 */
export const CONFIDENCE_LEVELS = ["HIGH", "REDUCED"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export interface Confidence {
  readonly level: ConfidenceLevel;
  readonly unknownChecksCount: number;
  readonly affectedCategories: readonly ScanCategory[];
}

/** PRD 11.5 */
export const VERDICT_CODES = [
  "HEALTHY",
  "RECOMMENDATIONS",
  "PROBLEMS",
  "CRITICAL_PROBLEM",
  "NO_CONFIRMED_ISSUES_INCOMPLETE",
] as const;
export type VerdictCode = (typeof VERDICT_CODES)[number];

/** PRD 16 and 17 — a scan result is provisional until the scan terminalizes. */
export const SCAN_STATES = ["PROVISIONAL", "FINAL"] as const;
export type ScanState = (typeof SCAN_STATES)[number];

/** PRD 12.5 */
export interface ScorePenalty {
  readonly issueId: string;
  readonly severity: IssueSeverity;
  readonly points: number;
}

export interface ScoreBreakdown {
  readonly baseScore: number;
  readonly penalties: readonly ScorePenalty[];
  readonly totalPenalty: number;
  readonly finalScore: number;
}

/** PRD 11.3 */
export interface DomainHealthSummary {
  readonly state: ScanState;
  readonly verdictCode?: VerdictCode;
  readonly score?: number;
  readonly scoreBreakdown?: ScoreBreakdown;
  readonly confidence: Confidence;
  readonly issueCounts: Readonly<Record<IssueSeverity, number>>;
  readonly issues: readonly Issue[];
  readonly categories: readonly ScanCategory[];
  readonly generatedAt: string;
}

/**
 * PRD 28.2 — the product-analytics events.
 *
 * Product analytics answers how people use the product; how the platform behaves is §21 and lives
 * in metrics and logs. The two are kept apart deliberately (AC-28.1): the rate at which domains
 * come back FAIL is a fact about other people's domains, not a quality score for this service.
 */
export const ANALYTICS_EVENTS = [
  "scan_form_viewed",
  "scan_submitted",
  "scan_accepted",
  "scan_result_viewed",
  "technical_details_opened",
  "refresh_clicked",
  "retry_clicked",
  "share_clicked",
  "locale_changed",
  // PRD 28.2 — optional, recorded only where the browser reports the outcome truthfully.
  "share_completed",
  "share_image_saved",
] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

/** PRD 28.3 — the locales the product serves; the same three as the message catalogue. */
export const ANALYTICS_LOCALES = ["ru", "uz", "en"] as const;
export type AnalyticsLocale = (typeof ANALYTICS_LOCALES)[number];

/** PRD 28.3 — which page the event happened on. A bounded set, never a URL. */
export const ANALYTICS_TOOLS = ["home", "dns", "registry", "tls", "scan"] as const;
export type AnalyticsTool = (typeof ANALYTICS_TOOLS)[number];

/** PRD 28.3 — the selected scope, as a bounded enumeration rather than a free list. */
export const ANALYTICS_SCOPES = ["all", "dns", "registry", "tls"] as const;
export type AnalyticsScope = (typeof ANALYTICS_SCOPES)[number];

export const ANALYTICS_OUTCOMES = ["COMPLETED", "FAILED"] as const;
export type AnalyticsOutcome = (typeof ANALYTICS_OUTCOMES)[number];

/**
 * PRD 28.4 and AC-28.3 — the shape is the boundary.
 *
 * There is no field here for a domain, a scanId, the string the reader typed, registration data,
 * an IP address, a certificate fingerprint or a DNS value, so none of them can be sent by
 * accident: a payload carrying one is rejected rather than trimmed. The scan page is counted as
 * the route template `scan`, never as the URL that contains a scanId.
 */
export interface AnalyticsEventPayload {
  readonly event: AnalyticsEvent;
  readonly locale: AnalyticsLocale;
  readonly tool: AnalyticsTool;
  readonly mode?: ScanMode;
  readonly scope?: AnalyticsScope;
  readonly outcome?: AnalyticsOutcome;
  readonly verdictCode?: VerdictCode;
  /**
   * PRD 28.6 — an anonymous per-session value, for joining a funnel within one visit. It is not
   * an account, it does not persist past the session, and it is not shared with anything else.
   */
  readonly sessionId?: string;
  /** PRD 28.5 — whether this browser has been here before, without keeping an identifier for it. */
  readonly returning?: boolean;
}
