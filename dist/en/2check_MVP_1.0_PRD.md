# 2check.uz — Product Requirements (PRD), MVP 1.0

**Version:** 1.0

**Status:** consolidated final specification.

**Basis:** `2check_Product_Concept_v1.0 — FINAL / FROZEN`.

## Applying the Requirements

Each requirement, data contract, enumeration, rule, and version has one responsible section. References from other sections do not establish a second contract. In a conflict, the provision in the responsible section identified in Appendix A applies.

The Russian and English editions describe the same requirements. Identifiers, formulas, and acceptance criteria match; editorial changes are made in both editions together.

[01. Concept](../../docs/en/01-concept.md) · [PRD Sections](../../docs/en/02-prd.md) · [Русский](../ru/2check_MVP_1.0_PRD.md)

## Contents

- [1. Product Goal and Positioning](#section-01)
- [2. MVP Scope and Roadmap](#section-02)
- [3. User Scenarios and Scan Modes](#section-03)
- [4. Technical Architecture and System Boundaries](#section-04)
- [5. Input and the Canonical Domain Object](#section-05)
- [6. Common Data Contracts and Exposure Levels](#section-06)
- [7. Statuses, Dependencies, and Scan Results](#section-07)
- [8. DNS Checks](#section-08)
- [9. Domain Registration](#section-09)
- [10. SSL/TLS Checks](#section-10)
- [11. Domain Health Summary and Identified Issues](#section-11)
- [12. Domain Health Score](#section-12)
- [13. User Messages and Localization](#section-13)
- [14. Caching and Data Freshness](#section-14)
- [15. Security and SSRF Protection](#section-15)
- [16. Scan Orchestration and Execution](#section-16)
- [17. Internal Web API Contract](#section-17)
- [18. Error Classification and Failure Handling](#section-18)
- [19. Data Model and Persistence](#section-19)
- [20. Configuration and Policy Management](#section-20)
- [21. Observability, Logging, and Monitoring](#section-21)
- [22. Performance and Resource Limits](#section-22)
- [23. User Interface and Result Presentation](#section-23)
- [24. SEO, Routing, and Tool Pages](#section-24)
- [25. Privacy, Access, and Abuse Prevention](#section-25)
- [26. Testing and Release Criteria](#section-26)
- [27. Deployment, Environments, and Release Management](#section-27)
- [28. Product Analytics and Usage Metrics](#section-28)
- [Appendix A. Responsible Sections](#appendix-a)
- [Appendix B. Consistency Conditions](#appendix-b)

<a id="section-01"></a>

# 1. Product Goal and Positioning

## 1.1. Positioning

**2check.uz explains a domain's technical health in plain language.**

The product serves two audiences:

- **general users / business owners** receive a clear verdict, an explanation of the problem, and a concise recommendation;
- **technical users** receive normalized data and a safe representation of technical details.

The primary result is the **domain health verdict**. The numerical score provides additional context.

## 1.2. Product Principles

1. The backend is authoritative for domain health semantics.
2. A single root defect must not incur several independent penalties.
3. Technical uncertainty must not be interpreted as a domain problem.
4. Failing closed when safety cannot be established takes precedence over throughput and interface convenience.
5. Additional checks must not expand MVP scope implicitly, even when they appear simple to implement.
6. Russian, Uzbek, and English (RU / UZ / EN) are mandatory from the MVP release.

## 1.3. Acceptance Criteria

- **AC-1.1** The primary result contains a clear verdict; the numerical score remains secondary.
- **AC-1.2** The frontend does not calculate domain health semantics independently.
- **AC-1.3** Technical users receive a safe data projection rather than an internal DTO or raw dump.
- **AC-1.4** RU / UZ / EN are supported from the MVP release.

---

<a id="section-02"></a>

# 2. MVP Scope and Roadmap

## 2.1. MVP 1.0

MVP 1.0 includes:

- input preprocessing and the IDN pipeline;
- the CanonicalDomain object;
- DNS resolver comparison;
- registration checks through `registryProvider`;
- a fixed set of SSL/TLS checks;
- the domain health summary;
- the status, severity, and dependency model;
- issue aggregation;
- the domain health score and confidence indicator;
- Redis caching;
- SSRF protection;
- the web interface and internal web API;
- RU / UZ / EN.

## 2.2. MVP 1.1

**Email health checks**:

- SPF;
- DMARC;
- DKIM;
- MX;
- STARTTLS;
- PTR;
- blacklist checks for the receiving mail server.

Email health checks are excluded from MVP 1.0, including partial implementations.

## 2.3. Phase 2

- geographically distributed DNS checks;
- Ping / Traceroute;
- HTTP headers and redirect chains;
- domain reputation;
- homograph and IDN spoof detection;
- detailed repair guides with SEO considerations.

## 2.4. Phase 3

- a Telegram bot;
- a public API;
- complex scans using SSE;
- port scanning;
- uptime monitoring.

## 2.5. Acceptance Criteria

- **AC-2.1** Email health checks are absent from MVP 1.0.
- **AC-2.2** HTTP and reputation checks, port scanning, and uptime monitoring are absent from MVP 1.0.
- **AC-2.3** MVP resolver comparison is not presented as geographically distributed DNS checking.
- **AC-2.4** A new check is not included in the MVP without an explicit scope change.

---

<a id="section-03"></a>

# 3. User Scenarios and Scan Modes

## 3.1. Default Flow

The primary action starts a scan with the following parameters:

```text
mode = FULL
cacheMode = NORMAL
```

FULL includes:

```text
DNS + Registry + TLS
```

## 3.2. Partial Scans — PARTIAL

Technical users may select a non-empty subset of categories:

```text
dns | registry | tls
```

Selecting all three categories requires `FULL`, not `PARTIAL`.

## 3.3. Tool Pages

```text
/dns-check → PARTIAL [dns]
/whois     → PARTIAL [registry]
/ssl-check → PARTIAL [tls]
```

Tool pages use the same backend modules and processing semantics as a FULL scan.

## 3.4. Global Summary

The global numerical score and verdict are available only for `FULL + FINAL`.

PARTIAL shows the selected category results without a global domain health score.

## 3.5. Acceptance Criteria

- **AC-3.1** The default flow creates a FULL scan with NORMAL cache mode.
- **AC-3.2** PARTIAL permits only a non-empty subset of FULL categories.
- **AC-3.3** Selecting DNS, registration, and TLS creates a FULL scan.
- **AC-3.4** Tool pages do not introduce separate technical processing semantics.
- **AC-3.5** PARTIAL receives neither a global numerical score nor a global verdict.

---

<a id="section-04"></a>

# 4. Technical Architecture and System Boundaries

## 4.1. MVP Technology Stack

- Frontend: Next.js.
- Backend: Node.js/Fastify.
- Redis: mandatory.
- Scan store: PostgreSQL.
- MVP hosting: one VPS.

The concept allows two backend runtimes; the MVP fixes one — Node.js/Fastify. The choice keeps a single runtime shared with the frontend and one definition of the internal web API DTOs. The product contract does not depend on the backend language or runtime.

## 4.2. Runtime Components

The main logical components are:

```text
Web Frontend
Internal Web API
Scan Orchestrator
DNS Module
Registry Module
TLS Module
Security Validation
Redis Reusable Cache
Scan Store
Sensitive/Gated Store
Observability
```

## 4.3. Network Access Boundary

A user-controlled target is not passed directly to an arbitrary network client. Network execution follows CanonicalDomain → required DNS checks → security validation → a connection to a pinned IP address.

## 4.4. Platform HTTPS

The 2check web interface and API use a trusted HTTPS certificate. Managing the platform's own certificate is an operational dependency.

## 4.5. Acceptance Criteria

- **AC-4.1** Redis is a mandatory MVP component.
- **AC-4.2** The MVP can be deployed on one VPS.
- **AC-4.3** MVP correctness does not depend on Kubernetes, multiple regions, or a distributed scheduler.
- **AC-4.4** Network modules do not bypass security validation.
- **AC-4.5** The public 2check web interface and API are served over trusted HTTPS.
- **AC-4.6** The MVP backend is implemented on Node.js/Fastify.
- **AC-4.7** The authoritative MVP scan store is PostgreSQL; Redis remains a cache.

---

<a id="section-05"></a>

# 5. Input and the Canonical Domain Object

§5 defines input and preprocessing rules.

## 5.1. Accepted Input

The following inputs are accepted:

- a hostname;
- an HTTP URL;
- an HTTPS URL;
- URL-like input without a scheme.

The MVP rejects:

- an IP address;
- a wildcard hostname;
- an email address;
- a single-label hostname;
- record owner names such as `_dmarc.example.uz`;
- URL credentials;
- a custom port.

## 5.2. IDN Processing

The following sequence applies:

```text
trim
→ hostname extraction
→ lowercase where applicable
→ Unicode normalization
→ UTS #46 Nontransitional
→ IDNA validation
→ ASCII / punycode
```

Standard DNS label and hostname length limits apply.

## 5.3. The CanonicalDomain Object

```text
CanonicalDomain {
  originalInput
  inputType: HOSTNAME | URL | URL_LIKE
  unicodeHostname
  asciiHostname
  publicSuffix: string | null
  publicSuffixType: ICANN | PRIVATE | UNKNOWN
  registrableDomain: string | null
  labels[]
  isIdn
  hadTrailingDot
}
```

`registryDomain` is deliberately **excluded** from `CanonicalDomain`.

## 5.4. Registration Boundary

`registrableDomain` is determined by preprocessing and PSL rules.

`registryDomain` is determined by the specific `registryProvider` and returned by the registration module.

## 5.5. Typo Correction

The MVP does not provide automatic typo correction or replacement suggestions.

## 5.6. Acceptance Criteria

- **AC-5.1** All modules use one CanonicalDomain and do not normalize input independently.
- **AC-5.2** `registryDomain` is absent from CanonicalDomain.
- **AC-5.3** IP addresses, wildcard hostnames, email addresses, single-label hostnames, and custom ports are rejected.
- **AC-5.4** IDN processing uses UTS #46 Nontransitional and punycode.
- **AC-5.5** `publicSuffixType` distinguishes ICANN/PRIVATE/UNKNOWN.
- **AC-5.6** Typos are not corrected automatically.

---

<a id="section-06"></a>

# 6. Common Data Contracts and Exposure Levels

§6 defines common DTO structures and API exposure levels. Module-specific fields are defined in the corresponding module sections.

## 6.1. Message — MessageDescriptor

Messages use a single DTO:

```text
MessageDescriptor {
  titleCode: string
  explanationCode?: string
  impactCode?: string
  recommendationCode?: string
  params?: object
}
```

## 6.2. Check Result — CheckResult

```text
CheckResult<TDetails> {
  checkId
  category: dns | registry | tls
  status
  severity
  target: ModuleCheckTarget
  reasonCode?
  dependsOn?
  dependencyMode?: ALL | ANY
  blockedBy?
  message: MessageDescriptor
  details?
  source?: ModuleCheckSource
  freshness
}
```

`target` identifies the object being checked. `source` contains machine-readable provenance for an observation or result. Both fields use module-defined structures rather than free-form text.

```text
ModuleCheckTarget =
  DnsCheckTarget |
  RegistryCheckTarget |
  TlsCheckTarget

ModuleCheckSource =
  DnsCheckSource |
  RegistryCheckSource |
  TlsCheckSource
```

The exact structure is defined by the module section: DNS — §8, registration — §9, TLS — §10. The `category` field discriminates between module variants. The `source` field is optional: its absence alone does not change status or severity and does not indicate a technical failure. Browser exposure of `target`/`source` is determined by Public/Technical projection allowlists, not by their presence in the internal `CheckResult`.

The default is `dependencyMode = ALL`.

## 6.3. Result Freshness — CheckFreshness

```text
CheckFreshness {
  checkedAt
  cached
  cacheAge
  sourceUpdatedAt?
}
```

`checkedAt` records the time of the original observation, not the cache lookup.

## 6.4. Data Exposure Levels

```text
Public
Technical
Gated
```

- **Public** — the safe, standard result projection.
- **Technical** — a safe technical data projection available through `/details`.
- **Gated** — a separate resource providing controlled access to sensitive data.

An internal DTO is never serialized directly.

## 6.5. Machine Values

The following values are not localized:

- IP addresses;
- hostnames;
- DNS record values;
- numerical TTL values;
- certificate fingerprints;
- raw certificate issuer values;
- TLS versions;
- statuses;
- severity levels;
- `reasonCode`;
- `checkId`.

## 6.6. Acceptance Criteria

- **AC-6.1** `MessageDescriptor` is the single DTO for browser-facing messages.
- **AC-6.2** An internal DTO is not serialized directly into the browser API.
- **AC-6.3** Public/Technical/Gated are distinct data exposure levels.
- **AC-6.4** Machine values do not change when the language is switched.
- **AC-6.5** `checkedAt` preserves the observation time rather than the cache lookup time.
- **AC-6.6** `target` and `source` use module-defined structures rather than free-form fields.
- **AC-6.7** Exact target/source variants are defined by module sections §8/§9/§10.
- **AC-6.8** The optional `source` field alone does not affect domain health semantics; its browser exposure is determined by a projection allowlist.

---

<a id="section-07"></a>

# 7. Statuses, Dependencies, and Scan Results

## 7.1. Status

```text
PASS | FAIL | UNKNOWN | NOT_APPLICABLE
```

- `PASS` — the check is applicable, the result is determined, and the condition is satisfied.
- `FAIL` — the check is applicable, the result is determined, and an adverse target condition is confirmed.
- `UNKNOWN` — the check is applicable, but its technical result cannot be determined.
- `NOT_APPLICABLE` — the object or context required by the check is absent.

## 7.2. Severity

```text
critical | warning | informational | none
```

The combination `FAIL + severity=none` is rejected during configuration validation.

## 7.3. Failure Cause and Blocking Dependency

`reasonCode` is permitted only for `UNKNOWN` caused by the check's own technical failure.

A dependency-driven result uses `blockedBy` and does not receive its own `reasonCode`.

`reasonCode` and `blockedBy` are mutually exclusive.


## 7.4. Category Result — CategoryResult

```text
CategoryResult {
  category
  status
  severity
  completeness: COMPLETE | PARTIAL
  checks[]
}
```

Results are aggregated using the following status priority:

```text
FAIL > UNKNOWN > PASS > NOT_APPLICABLE
```

`completeness = PARTIAL` if and only if at least one child check has status `UNKNOWN`.

N/A does not reduce completeness.

Category severity is the maximum severity among FAIL children; when no FAIL is present, it is `none`.

## 7.5. Base Scan Result — ScanResult

```text
ScanResult {
  scanId
  executionState
  mode
  canonicalDomain
  selectedCategories[]
  categories[]
  summary?
  executionContext
  completionReason?
  failure?
  startedAt
  completedAt?
}
```

## 7.6. Acceptance Criteria

- **AC-7.1** Only FAIL denotes a confirmed target problem.
- **AC-7.2** UNKNOWN does not incur a score penalty.
- **AC-7.3** N/A does not reduce confidence.
- **AC-7.4** `reasonCode` and `blockedBy` are not present together.
- **AC-7.5** Category completeness is PARTIAL if and only if an UNKNOWN child check exists.
- **AC-7.6** Category severity is determined only by FAIL child checks.

---

<a id="section-08"></a>

# 8. DNS Checks

§8 defines DNS check semantics.

## 8.1. Resolver Set

The default configured resolvers are:

```text
Google       8.8.8.8
Cloudflare   1.1.1.1
Yandex Basic 77.88.8.8
Quad9        9.9.9.10
```

Security-filtering variants are not used as default MVP resolvers.

## 8.2. Query Types

The following records are requested for the entered hostname:

```text
A, AAAA, MX, TXT, NS, CNAME, SOA
```

## 8.3. Provider Response

```text
DnsProviderResult {
  provider
  qname
  qtype
  transportStatus: SUCCESS | TIMEOUT | NETWORK_ERROR | PROTOCOL_ERROR
  rcode?: NOERROR | NXDOMAIN | SERVFAIL | REFUSED | FORMERR | NOTIMP | OTHER
  outcome?: ANSWER | NODATA | NXDOMAIN
  answers[]
  authority[]
  latencyMs?
  receivedAt
}
```

NXDOMAIN and NODATA are distinct outcomes.

DNS fields in `CheckResult.target/source` use the following module structures:

```text
DnsCheckTarget {
  kind: DNS_NAME
  qname
  qtype?: A | AAAA | MX | TXT | NS | CNAME | SOA
}

DnsCheckSource {
  kind: DNS_RESOLVER_SET
  resolverSetVersion
  providers[]
}
```

`qtype` is absent for checks of the name as a whole, such as `dns.name.existence`. The `providers[]` array contains stable configured resolver identifiers whose observations contributed to the check result. Detailed provider responses remain in DNS technical details and provider results.

TTL is displayed separately for each provider and is excluded from RRset equality comparisons.

## 8.4. Provider Record State

```text
PRESENT | ABSENT | NAME_NOT_FOUND | INDETERMINATE
```

The default minimum quorum is 2.

A strict majority of determinate provider states is required. A tie or insufficient determinate evidence produces `INDETERMINATE`.

## 8.5. Record State Resolution Checks

```text
dns.a.resolve
dns.aaaa.resolve
dns.mx.resolve
dns.txt.resolve
dns.ns.resolve
dns.cname.resolve
dns.soa.resolve
```

These checks establish whether a record's state could be determined, not whether the record is required to exist.

A determinate `PRESENT/ABSENT/NAME_NOT_FOUND` state yields PASS for the resolution check.

`INDETERMINATE` yields UNKNOWN.

## 8.6. Name Existence

The `dns.name.existence` check uses:

- EXISTS → PASS;
- a majority of NXDOMAIN/NOT_EXISTS → FAIL;
- an indeterminate result → UNKNOWN.

NXDOMAIN does not create repeated FAIL results for the absence of each record type.

## 8.7. Resolver Consistency

PRESENT conflicting with ABSENT/NXDOMAIN produces a FAIL with warning severity for a consistency issue.

For A/AAAA, different IP sets with records present produce an informational `valueVariation=true` flag, not FAIL.

MX/TXT/NS/CNAME/SOA mismatches are treated as warnings according to check policy.

## 8.8. Address Presence

The absence of AAAA is neutral and does not constitute FAIL by itself.

The absence of A when AAAA is present likewise does not constitute FAIL solely because A is absent.

An IPv6 TLS check receives N/A when AAAA is absent.

## 8.9. Security Candidate Set

The candidate set is the deduplicated union of all observed A/AAAA records from all resolver responses.

An IP address observed by a minority of resolvers is also subject to security validation.

Insufficient DNS consensus does not permit a TLS connection, even when individual IP addresses have been obtained.

## 8.10. Acceptance Criteria

- **AC-8.1** The default resolver set includes Google/Cloudflare/Yandex Basic/Quad9 Unfiltered.
- **AC-8.2** NXDOMAIN and NODATA are distinguished.
- **AC-8.3** The default quorum is 2.
- **AC-8.4** A tie or insufficient evidence produces INDETERMINATE.
- **AC-8.5** The absence of AAAA is not FAIL.
- **AC-8.6** A/AAAA value variation alone is not FAIL.
- **AC-8.7** The security candidate set includes all observed A/AAAA records.
- **AC-8.8** Insufficient resolver consensus does not permit a TLS network connection.
- **AC-8.9** A root NXDOMAIN problem is not counted repeatedly by record type.
- **AC-8.10** DNS CheckResult uses the `DnsCheckTarget`/`DnsCheckSource` contract in §8.3.

---

<a id="section-09"></a>

# 9. Domain Registration

§9 defines registration provider behavior, query outcomes, domain lifecycle, and domain-specific caching rules.

## 9.1. Provider

The MVP provider is:

```text
UzRegistryProvider
```

RDAP is the primary protocol and data source.
WHOIS is used as a fallback when RDAP does not produce a determinate result.

## 9.2. Query Outcome

```text
REGISTERED | NOT_REGISTERED | INDETERMINATE
```

`NOT_REGISTERED` requires explicit confirmation from an authoritative source.

A timeout, 429, 5xx, malformed response, parsing error, or encoding error produces `INDETERMINATE` if the fallback also fails to provide a determinate result.

## 9.3. Normalized Lifecycle

```text
REGISTRATION_INITIATED
PENDING_ACTIVATION
ACTIVE
PENDING_RENEWAL
REDEMPTION_PERIOD
FREE
DEACTIVATED
CANCELLED
RESERVED
AUCTION
UNKNOWN
```

The provider's original status is preserved as `rawStatus`.

## 9.4. Registration Data — NormalizedDomainRegistration

```text
NormalizedDomainRegistration {
  registryDomain
  registrar
  createdAt
  expiresAt
  nameServers[]
  status
  rawStatus
  registrant: {
    name: RegistrantField
    email: RegistrantField
    phone: RegistrantField
    address: RegistrantField
  }
  raw: { rdap?, whois? }
  freshness
}
```

```text
RegistrantField {
  state: value | redacted | unavailable
}
```

The actual value for `state=value` is stored and exposed separately under §19/§25.

Registration fields in `CheckResult.target/source` use:

```text
RegistryCheckTarget {
  kind: REGISTRY_DOMAIN
  registryDomain
}

RegistryCheckSource {
  kind: REGISTRY_PROVIDER
  registryProvider
  transportsUsed: (RDAP | WHOIS)[]
}
```

`transportsUsed` records the strategy actually used to obtain the terminal result, for example `[RDAP]` or `[RDAP, WHOIS]`. For `provider_not_supported`, `source` may be absent because no external registration provider was called.

## 9.5. The registry.lookup Check

- REGISTERED → PASS;
- explicitly confirmed NOT_REGISTERED → FAIL;
- INDETERMINATE → UNKNOWN with the check's own technical `reasonCode`.

When the root registration lookup is UNKNOWN, child checks receive UNKNOWN with `blockedBy`.

For confirmed NOT_REGISTERED, child checks lacking a registration object receive N/A with `blockedBy`.

## 9.6. Domains Outside .uz

For an unsupported TLD:

```text
UNKNOWN
reasonCode = provider_not_supported
retryability = NOT_RETRYABLE
```

No score penalty applies; confidence in a FULL result is reduced.

## 9.7. Adaptive Cache Lifetime

§9 defines registration status-aware TTL. Active domains use an hours-scale TTL; grace and redemption periods use a minutes-scale TTL. Exact values belong to versioned configuration.

## 9.8. Acceptance Criteria

- **AC-9.1** RDAP is primary; WHOIS is used only after an indeterminate RDAP result.
- **AC-9.2** NOT_REGISTERED requires explicit confirmation.
- **AC-9.3** Response, encoding, or parsing uncertainty is not interpreted as FREE.
- **AC-9.4** Lifecycle normalization uses the canonical enumeration in §9.3.
- **AC-9.5** Actual registrant PII is absent from Public ScanResult.
- **AC-9.6** Provider limitations outside .uz produce UNKNOWN/provider_not_supported without a score penalty.
- **AC-9.7** TTL policy accounts for registration status and is owned by the registration module.
- **AC-9.8** Registry CheckResult uses the `RegistryCheckTarget`/`RegistryCheckSource` contract in §9.4.

---

<a id="section-10"></a>

# 10. SSL/TLS Checks

§10 defines the technical semantics of TLS checks.

## 10.1. Endpoint Coverage

The MVP checks at most:

```text
1 representative IPv4
1 representative IPv6
```

`endpointCoverage = REPRESENTATIVE`.

An exhaustive scan of all serving backends is not performed.

## 10.2. Representative Endpoint Selection

Only security-validated addresses may be selected.

Selection order:

1. the highest resolver observation count;
2. a stable, deterministic tie-break.

## 10.3. Connection

- a TCP connection directly to the selected pinned IP address;
- port 443/TCP;
- SNI = `asciiHostname`;
- no independent implicit DNS resolution;
- no HTTP requests or content retrieval.

TLS fields in `CheckResult.target/source` use:

```text
TlsCheckTarget {
  kind: TLS_HOST
  hostname
  port: 443
  ipFamily?: IPV4 | IPV6
}

TlsCheckSource {
  kind: DIRECT_TLS_PROBE
  endpointCoverage: REPRESENTATIVE
}
```

`ipFamily` is used for family-specific connectivity checks and may be absent from aggregate certificate checks. Selected IP addresses and the dependency fingerprint belong to TLS execution metadata (§19) and are not duplicated in `TlsCheckSource`.

## 10.4. Protocol Support

The MVP checks TLS 1.2 and TLS 1.3. TLS 1.3 is preferred when supported.

## 10.5. Certificate Checks

- validity period;
- hostname match;
- issuer;
- SAN;
- validFrom / validTo;
- days remaining;
- certificate chain validation;
- expired intermediate certificates;
- a self-signed leaf certificate;
- an untrusted chain.

The MVP excludes cipher grading, legacy attack checks, OCSP/CRL, HSTS, HTTP/2, QUIC, CT grading, and TLS1.0/1.1 grading.

## 10.6. Hostname Matching

Only SAN is used. CN fallback is not supported.

A wildcard covers only one complete leftmost label.

## 10.7. IPv4/IPv6

Address families are processed independently after target-wide security validation.

An absent family receives N/A.

Aggregate certificate checks use `dependencyMode = ANY` between IPv4/IPv6 connectivity prerequisites. One successful path that yields a certificate is sufficient for evaluation. An absent family, N/A, failure, or UNKNOWN in the other family does not block evaluation of the available successful path; the other family's connectivity result is preserved separately.

If both families yield certificates, the aggregate evaluation considers both: an invalid certificate on either checked family produces FAIL for the relevant aggregate check. The `ANY` mode determines eligibility to begin evaluation but does not permit ignoring a second available certificate-bearing path.

If neither family provides a successful certificate-bearing path, the certificate check does not create an independent target failure. It receives a dependency-driven terminal result through `blockedBy` under §7/§18.

Different IPv4/IPv6 certificate fingerprints alone do not constitute FAIL.

## 10.8. Connectivity Outcome Classification

After the security decision ALLOW:

- a target TCP connection timeout or refusal → connectivity FAIL;
- a handshake timeout or failure after an actual target attempt → connectivity FAIL;
- a scanner or network infrastructure failure without a trustworthy target observation → UNKNOWN `internal_network_error`.

## 10.9. TLS Technical Reason Codes

The codes directly applicable to this module are:

```text
internal_network_error
scanner_tls_error
```

Security codes are defined in §15, orchestration codes in §16, and general rules in §18.

## 10.10. Acceptance Criteria

- **AC-10.1** At most one representative endpoint is checked per IP family.
- **AC-10.2** The TLS client does not resolve the hostname again.
- **AC-10.3** SNI uses asciiHostname.
- **AC-10.4** Hostname validation uses SAN only, without CN fallback.
- **AC-10.5** An absent address family receives N/A.
- **AC-10.6** Different valid certificate fingerprints between families are not FAIL.
- **AC-10.7** A target connection timeout after ALLOW is classified as FAIL, not UNKNOWN.
- **AC-10.8** An internal scanner network failure is classified as UNKNOWN/internal_network_error.
- **AC-10.9** Cipher grading, HTTP, HSTS, and OCSP are excluded from the MVP.
- **AC-10.10** TLS CheckResult uses the `TlsCheckTarget`/`TlsCheckSource` contract in §10.3.
- **AC-10.11** Aggregate certificate checks use `dependencyMode=ANY` between IPv4/IPv6 connectivity prerequisites: one successful certificate-bearing path permits evaluation, and all successful certificate-bearing paths contribute to the aggregate result.

---

<a id="section-11"></a>

# 11. Domain Health Summary and Identified Issues

§11 defines issue aggregation, the overall summary, confidence, and verdict rules.

## 11.1. Issue

```text
Issue {
  issueId
  category: dns | registry | tls
  severity: critical | warning | informational
  primaryCheckId
  relatedCheckIds[]
  message: MessageDescriptor
}
```

An Issue is created only from checks with status FAIL.

## 11.2. Issue Aggregation

One root defect corresponds to one Issue and one score penalty.

In the MVP, aggregation is permitted only within one category. Cross-category aggregation is rejected during configuration validation.

Issue severity equals the maximum severity of the included FAIL checks.

## 11.3. Summary

```text
DomainHealthSummary {
  state: PROVISIONAL | FINAL
  verdictCode?
  score?
  confidence
  issueCounts
  issues[]
  categories[]
  generatedAt
}
```

## 11.4. Confidence

```text
confidence {
  level: HIGH | REDUCED
  unknownChecksCount
  affectedCategories[]
}
```

`affectedCategories` contains exactly the categories with `completeness=PARTIAL`.

## 11.5. Verdicts

```text
HEALTHY
RECOMMENDATIONS
PROBLEMS
CRITICAL_PROBLEM
NO_CONFIRMED_ISSUES_INCOMPLETE
```

The following rules apply:

- no issues and HIGH confidence → HEALTHY;
- informational issues only → RECOMMENDATIONS;
- warning present, no critical → PROBLEMS;
- at least one critical → CRITICAL_PROBLEM;
- no issues and REDUCED confidence → NO_CONFIRMED_ISSUES_INCOMPLETE.

Reduced confidence does not hide confirmed issues.

## 11.6. Acceptance Criteria

- **AC-11.1** An Issue is created only from FAIL.
- **AC-11.2** UNKNOWN/N/A do not create an Issue.
- **AC-11.3** Cross-category Issue aggregation is prohibited.
- **AC-11.4** One root defect creates one Issue.
- **AC-11.5** HIGH applies if and only if visible results contain no UNKNOWN.
- **AC-11.6** The absence of issues with REDUCED confidence does not produce HEALTHY.
- **AC-11.7** `score=100 + REDUCED` is valid and does not automatically imply HEALTHY.

---

<a id="section-12"></a>

# 12. Domain Health Score

§12 defines the numerical scoring rules.

## 12.1. Applicability

A score exists only for `FULL + FINAL`.

## 12.2. Formula

```text
score = max(0, 100 - sum(issuePenalty))
```

The score is calculated from deduplicated Issues rather than raw FAIL checks.

## 12.3. Recommended Default Penalties

```text
critical      -25
warning        -8
informational  -2
```

The values are defined by configuration.

## 12.4. States Without a Penalty

PASS, UNKNOWN, NOT_APPLICABLE → a penalty of 0.

Reduced confidence does not lower the numerical score.

## 12.5. Score Details — ScoreBreakdown

```text
ScoreBreakdown {
  baseScore
  penalties[]
  totalPenalty
  finalScore
}

ScorePenalty {
  issueId
  severity
  points
}
```

## 12.6. Versioning

A historical ScanResult preserves its original `healthPolicyVersion` and score. A new policy does not recalculate an earlier scan.

## 12.7. Acceptance Criteria

- **AC-12.1** A score is available only for FULL FINAL.
- **AC-12.2** The score is calculated from Issues.
- **AC-12.3** UNKNOWN/N/A receive no penalty.
- **AC-12.4** The score floor is 0.
- **AC-12.5** Reduced confidence does not change the numerical score.
- **AC-12.6** Historical scores are immutable.

---

<a id="section-13"></a>

# 13. User Messages and Localization

§13 defines message content and localization rules.

## 13.1. Message Model

Only `MessageDescriptor` from §6 is used.

A check message answers: **what the individual check established**.

An issue message answers: **which problem was confirmed, why it matters, and what action is appropriate**.

An Issue message may differ from the primary check's message.

## 13.2. Explanation Order

```text
Fact → Impact → Recommendation
```

Impact and recommendations are included only when supported by evidence.

## 13.3. Wording for UNKNOWN

UNKNOWN is described as an inability to check or obtain data, without claiming that the target is faulty.

`provider_not_supported` is explicitly described as a limitation of 2check.

## 13.4. Wording for PASS

PASS is not automatically converted into a statement that everything is configured correctly.

For example, an AAAA resolution result with status PASS and state ABSENT is described as “AAAA not found.”

## 13.5. Unsupported Causal Claims

Unsupported statements are prohibited, for example:

- resolver disagreement means DNS propagation;
- an IPv6 connection failure is caused by a firewall;
- NXDOMAIN means that the domain is available for purchase;
- a registration lookup failure means that the domain is unregistered;
- an untrusted chain means that every browser rejects the certificate.

## 13.6. Localization

Mandatory languages:

```text
ru | uz | en
```

A missing mandatory translation is a build or configuration error.

Runtime fallback order: requested language → EN → a safe generic message.

A raw message code may be displayed only in the technical projection.

## 13.7. Acceptance Criteria

- **AC-13.1** MessageDescriptor is shared by Check/Issue/WebApiError.
- **AC-13.2** UNKNOWN wording does not assert a target defect.
- **AC-13.3** provider_not_supported is explained as a product limitation.
- **AC-13.4** PASS wording states a fact rather than offering generic reassurance.
- **AC-13.5** Unsupported causal claims are prohibited.
- **AC-13.6** RU/UZ/EN are mandatory.
- **AC-13.7** A missing translation blocks production configuration or build.
- **AC-13.8** Message parameters are structured, escaped, and contain no pre-rendered HTML.

---

<a id="section-14"></a>

# 14. Caching and Data Freshness

§14 defines the general internal cache mechanism and data freshness rules.

## 14.1. Cache Roles

The following roles are distinct:

1. the internal 2check cache for reusable results;
2. an external provider's cache;
3. a historical or previous ScanResult.

Redis is mandatory.

## 14.2. Cache Modes

```text
NORMAL
FORCE_REFRESH
```

NORMAL may use a compatible, fresh internal cache entry.

FORCE_REFRESH:

- bypasses the internal reusable cache for the selected scope;
- performs a new external or network operation;
- writes the new result to the cache;
- does not purge the cache automatically;
- does not force a recursive DNS resolver to ignore its own TTL.

## 14.3. Sequential and Concurrent Refreshes

Two sequential FORCE_REFRESH requests, each following completion of the previous one, create two new executions.

Concurrent FORCE_REFRESH requests may coalesce only into an already running fresh execution.

## 14.4. Stale Data

A stale successful result does not replace a failed current refresh.

The current result may be UNKNOWN; the previous or last-known result is displayed separately.

## 14.5. Cache Keys

Module keys include `cacheContractVersion` and the relevant technical configuration versions.

DNS:

```text
asciiHostname
resolverSetVersion
dnsModuleConfigVersion
cacheContractVersion
```

Domain registration:

```text
registryDomain
registryProvider
registryModuleConfigVersion
cacheContractVersion
```

Stable TLS key:

```text
asciiHostname
port
tlsModuleConfigVersion
trustStoreVersion
cacheContractVersion
```

The language is not part of a technical cache key.

## 14.6. TLS Dependency Compatibility

`dependencyFingerprint` is not part of the stable cache key.

```text
TlsCacheEntry {
  result
  dependencyFingerprint
  freshness
}
```

After a stable-key lookup, the current fingerprint is calculated from DNS prerequisites and security conditions. A match may permit reuse; a mismatch requires a fresh TLS probe.

## 14.7. Concurrent Request Coalescing — Single-flight

Concurrent identical NORMAL requests with cache misses may coalesce.

Single-flight does not merge `scanId` values.

## 14.8. Technical Failure Cache

A transient UNKNOWN may be cached briefly. FORCE_REFRESH bypasses this cache.

## 14.9. Acceptance Criteria

- **AC-14.1** Redis is mandatory.
- **AC-14.2** FORCE_REFRESH does not mean cache purging.
- **AC-14.3** Sequential FORCE_REFRESH requests create a new execution each time.
- **AC-14.4** A stale successful result does not conceal a current UNKNOWN.
- **AC-14.5** The language is not part of a technical key.
- **AC-14.6** The registration key uses the canonical `registryModuleConfigVersion`.
- **AC-14.7** The TLS dependency fingerprint is stored as compatibility metadata, not as a stable key.
- **AC-14.8** Single-flight does not merge scan identities.

---

<a id="section-15"></a>

# 15. Security and SSRF Protection

§15 defines IP classification, SSRF protection, target-wide validation, and security policy.

## 15.1. Validation Sequence

```text
CanonicalDomain
→ DNS A/AAAA
→ full candidate set
→ Security Validation
→ ALLOW | BLOCK | INDETERMINATE
→ selected validated endpoint
→ pinned connection
```

## 15.2. Security Validation Result — SecurityValidationResult

```text
SecurityValidationResult {
  decision: ALLOW | BLOCK | INDETERMINATE
  policyVersion
  checkedAddressCount
  blockedAddressCount
  reasonCode?
}
```

## 15.3. Target-wide Rule

If any candidate IP address is forbidden, the entire target receives BLOCK.

Filtering out forbidden addresses and continuing with allowed addresses is prohibited.

## 15.4. Address Classification

The minimum set of classes is:

```text
PUBLIC_ALLOWED
FORBIDDEN_PRIVATE
FORBIDDEN_LOOPBACK
FORBIDDEN_LINK_LOCAL
FORBIDDEN_SHARED
FORBIDDEN_SPECIAL
FORBIDDEN_MULTICAST
FORBIDDEN_METADATA
FORBIDDEN_INTERNAL_INFRASTRUCTURE
```

For IPv4-mapped IPv6, the embedded IPv4 address is checked.

## 15.5. Special-purpose Ranges

IANA special-purpose ranges are denied by default unless an explicit allowlist is defined. The MVP allowlist is empty.

## 15.6. Indeterminate Security Result — INDETERMINATE

If the safety of the complete candidate set cannot be established, the connection is prohibited.

The visible network check receives UNKNOWN with `security_validation_incomplete`.

## 15.7. Blocking — BLOCK

BLOCK uses `ssrf_policy_block`; no network connection is made. The visible dependent TLS result receives UNKNOWN without an Issue or score penalty.

## 15.8. Technical Error Boundaries

`security_validation_incomplete` denotes a failure within security validation before a network attempt.

`internal_network_error` denotes a failure after ALLOW during scanner or network execution.

## 15.9. IP Address Pinning

After ALLOW, the connection goes directly to the validated IP address with the original hostname in SNI. The library must not implicitly resolve the hostname again.

## 15.10. Internal Infrastructure Denylist

Support for internalInfrastructureDenylist is mandatory. Its values are deployment-specific and belong to the technical architecture and security configuration. A change to the effective list affects `securityPolicyVersion`.

## 15.11. Acceptance Criteria

- **AC-15.1** Any forbidden candidate address blocks the entire target.
- **AC-15.2** Access is denied when safety cannot be established.
- **AC-15.3** The complete candidate set is validated without prior truncation.
- **AC-15.4** DNS rebinding is prevented by connecting to a pinned IP address.
- **AC-15.5** A security BLOCK does not create a domain Issue.
- **AC-15.6** `security_validation_incomplete` and `internal_network_error` are distinguished by execution stage.
- **AC-15.7** internalInfrastructureDenylist contributes to the effective security policy version.

---

<a id="section-16"></a>

# 16. Scan Orchestration and Execution

§16 defines the scan lifecycle, ScanPlan, execution barriers, global deadline, and finalization.

## 16.1. Execution States

```text
PENDING | RUNNING | COMPLETED | FAILED
```

The MVP has no public CANCELLED state.

## 16.2. Scan Request — ScanRequest

```text
ScanRequest {
  input
  mode: FULL | PARTIAL
  selectedCategories?
  cacheMode: NORMAL | FORCE_REFRESH
}
```

Input preprocessing occurs before scan creation. Invalid input does not create a `scanId`.

## 16.3. Scan Plan — ScanPlan

```text
ScanPlan {
  scanId
  mode
  visibleCategories[]
  scheduledChecks[]
  internalPrerequisites[]
  cacheMode
  executionContext
}
```

Internal prerequisites do not expand visible scan scope or create hidden categories, scores, or issues.

## 16.4. Execution Context — ExecutionContext

```text
ExecutionContext {
  healthPolicyVersion
  securityPolicyVersion
  orchestrationConfigVersion
  cacheContractVersion
  resolverSetVersion
  dnsModuleConfigVersion
  registryModuleConfigVersion
  tlsModuleConfigVersion
  trustStoreVersion
}
```

The context is fixed for the entire scan. Mixing configurations within one scan is prohibited.

## 16.5. Parallelism and Dependencies

DNS and registration checks may run in parallel.

TLS depends on A/AAAA and security validation but does not wait for MX/TXT/NS/CNAME/SOA.

## 16.6. Address Resolution Barrier

All scheduled A/AAAA resolver operations reach a terminal transport or DNS outcome.

After the barrier, the following immutable set is formed:

```text
sealedDnsAddressCandidates
```

ALLOW is permitted only after the complete set is sealed. An early BLOCK is permitted when a forbidden candidate is found.

## 16.7. Global Deadline

An unfinished root check interrupted by the global deadline receives:

```text
UNKNOWN / scan_deadline_exceeded
```

A dependent check receives UNKNOWN with `blockedBy`.

If trustworthy terminal results are formed, the scan remains COMPLETED with `completionReason=DEADLINE_TERMINALIZED`.

## 16.8. Finalization

Deterministic order:

```text
CheckResult[]
→ CategoryResult[]
→ Issues
→ Confidence
→ Verdict
→ Score
```

The frontend does not perform authoritative finalization.

## 16.9. Scan Failure

FAILED applies only when a trustworthy terminal ScanResult cannot be formed.

```text
ScanExecutionFailure {
  failureCode:
    orchestration_error |
    execution_state_unrecoverable |
    result_integrity_error |
    configuration_incompatible |
    internal_platform_error
  occurredAt
}
```

`execution_state_unrecoverable` denotes a non-terminal scan whose execution was lost and cannot be resumed safely and deterministically.

## 16.10. Acceptance Criteria

- **AC-16.1** Invalid input does not create a scanId.
- **AC-16.2** ExecutionContext is fixed for the entire scan.
- **AC-16.3** A TLS-only PARTIAL scan may perform hidden DNS and security prerequisites without a visible DNS category.
- **AC-16.4** TLS does not start solely on an early quorum before the address resolution barrier.
- **AC-16.5** ALLOW requires a sealed, complete candidate set.
- **AC-16.6** The deadline may terminalize root checks as UNKNOWN without setting the scan to FAILED.
- **AC-16.7** Finalization is deterministic and performed by the backend.
- **AC-16.8** FAILED applies only when a trustworthy final result is impossible.
- **AC-16.9** Lost, unrecoverable execution receives `execution_state_unrecoverable`.

---

<a id="section-17"></a>

# 17. Internal Web API Contract

§17 defines the API between the MVP browser frontend and backend. The Phase 3 public API is outside this contract.

## 17.1. Endpoints

```text
POST /api/web/v1/scans
GET  /api/web/v1/scans/{scanId}
GET  /api/web/v1/scans/{scanId}/details
GET  /api/web/v1/scans/{scanId}/registry/registrant
```

## 17.2. Scan Creation — CreateScanRequest

```text
CreateScanRequest {
  input
  mode: FULL | PARTIAL
  selectedCategories?: (dns | registry | tls)[]
  cacheMode?: NORMAL | FORCE_REFRESH
}
```

The default is `cacheMode=NORMAL`.

For FULL, `selectedCategories` is omitted. PARTIAL accepts a non-empty proper subset of `{dns, registry, tls}`. When all three categories are selected, the client must send `mode=FULL`. If the server receives `mode=PARTIAL` with all three categories, it rejects the invalid scope with HTTP `422`. Silent normalization to FULL is prohibited.

## 17.3. Acceptance Response — CreateScanResponse

```text
CreateScanResponse {
  scanId
  executionState: PENDING | RUNNING
  pollAfterMs?
}
```

`POST /scans` **acknowledges acceptance** and is not a terminal result endpoint.

Canonical client model:

```text
POST /scans
→ acceptance + scanId

GET /scans/{scanId}
→ authoritative current state
→ PENDING | RUNNING | COMPLETED | FAILED
```

Even a complete compatible cache hit does not return COMPLETED/FAILED in CreateScanResponse. A scan may finish between the POST response being formed and the first GET; this timing race is permitted.

## 17.4. Web API Error — WebApiError

```text
WebApiError {
  errorCode
  message: MessageDescriptor
  field?
  retryable: boolean
  retryAfterSeconds?
  requestId?
}
```

Web API errorCode and check `reasonCode` belong to separate namespaces.

## 17.5. Scan Response — WebScanResponse

```text
WebScanResponse {
  scanId
  executionState
  mode
  canonicalDomain
  selectedCategories[]
  progress?
  categories[]
  summary?
  startedAt
  completedAt?
  pollAfterMs?
  failure?
}
```

The public CanonicalDomain projection excludes `originalInput`.

`categories[]` always matches `ScanPlan.visibleCategories`.

## 17.6. Retryability in the CheckResult Projection

The browser projection supports:

```text
retryability?: RETRYABLE | CONDITIONAL | NOT_RETRYABLE
retryAfterSeconds?
```

The value is determined by the backend failure policy in §18. The client does not infer retryability from `reasonCode`.

A dependency-driven result with `blockedBy` is not assigned an artificial retryability value of its own.

## 17.7. HTTP Status Semantics

- 200 — reading an existing scan, regardless of its domain health verdict;
- 202 — scan accepted;
- 400 — malformed input or input validation error;
- 403 — gated access denied;
- 404 — scan unknown or retention expired;
- 413 — request payload too large;
- 415 — media type error;
- 422 — invalid scan scope;
- 429 — web API rate limit;
- 500 — request-level platform failure outside the normal scan lifecycle;
- 503 — a scan cannot be accepted safely.

A provider's 429 response within a scan produces an UNKNOWN check; the scan GET retains HTTP 200.

## 17.8. Refresh

A refresh creates a new `POST /scans` with FORCE_REFRESH. PATCH of an existing scan is not supported.

## 17.9. Security Restrictions

The client cannot submit arbitrary IP addresses, resolvers, providers, ports, skipSSRF, or network parameters.

Unknown top-level creation fields are rejected; enumeration values are validated strictly.

## 17.10. Acceptance Criteria

- **AC-17.1** POST returns only PENDING/RUNNING acceptance states.
- **AC-17.2** The authoritative terminal state and result are available only through GET.
- **AC-17.3** A cache hit does not change the POST→GET model.
- **AC-17.4** HTTP status does not encode domain health.
- **AC-17.5** Visible categories exclude internal prerequisites.
- **AC-17.6** Retryability is determined by the backend and supplied in the projection.
- **AC-17.7** Gated sensitive registration data has a separate endpoint.
- **AC-17.8** There is no raw RDAP/WHOIS endpoint.
- **AC-17.9** A refresh creates a new scanId.
- **AC-17.10** Users cannot override network or security policy.
- **AC-17.11** `PARTIAL` with `dns+registry+tls` is rejected with HTTP 422 and is not silently normalized to FULL.

---

<a id="section-18"></a>

# 18. Error Classification and Failure Handling

§18 defines error layers, reasons, retryability, and failure normalization.

## 18.1. Error Layers

1. Input error — before a scan, without a scanId.
2. Web API error — at request level.
3. Technical check uncertainty — UNKNOWN with reasonCode/blockedBy.
4. Scan execution failure — FAILED when a trustworthy final result is impossible.

A target problem produces FAIL. Technical inability to check produces UNKNOWN.

## 18.2. The reasonCode Rule

`reasonCode` is allowed only on UNKNOWN with the check's own technical execution cause.

`reasonCode` is absent from PASS/FAIL/N/A.

A dependency-driven UNKNOWN uses only `blockedBy`.

## 18.3. Retryability

```text
RETRYABLE | CONDITIONAL | NOT_RETRYABLE
```

The mapping from a code to retryability is defined by the backend failure policy.

Examples:

- provider_unavailable → usually RETRYABLE;
- rate_limited → CONDITIONAL;
- provider_not_supported → NOT_RETRYABLE.

The client does not maintain a separate parallel mapping.

## 18.4. Timeout Semantics

A timeout does not always mean UNKNOWN.

- a DNS provider timeout may be absorbed by quorum aggregation;
- exhausted registration provider timeouts → UNKNOWN/timeout;
- a validated target TCP or handshake timeout → TLS connectivity FAIL;
- an internal scanner network failure after ALLOW → UNKNOWN/internal_network_error;
- incomplete security processing before a network attempt → UNKNOWN/security_validation_incomplete;
- the global scan deadline expires → UNKNOWN/scan_deadline_exceeded.

## 18.5. Provider or Source Technical Errors

`malformed_response`, `parse_error`, `encoding_error`, and `protocol_error` do not imply that the target is absent.

`module_execution_error` is a generic fallback used only when no more precise code applies.

Raw exception strings are not used as stable reasonCode values.

## 18.6. Scan Failure Catalog

The canonical catalog in §16 is used without additional duplicates.

## 18.7. Acceptance Criteria

- **AC-18.1** A target problem and technical inability to check are distinguished as FAIL and UNKNOWN.
- **AC-18.2** reasonCode is present only on UNKNOWN with the check's own cause.
- **AC-18.3** blockedBy and reasonCode are mutually exclusive.
- **AC-18.4** Retryability is determined by the backend and configuration.
- **AC-18.5** provider_not_supported has NOT_RETRYABLE retryability.
- **AC-18.6** Timeout classification depends on the execution stage.
- **AC-18.7** Raw exceptions are normalized into stable codes.
- **AC-18.8** A generic fallback is not used when a precise reason is available.

---

<a id="section-19"></a>

# 19. Data Model and Persistence

§19 defines logical persistence, data classification, and retention relationships.

## 19.1. Logical Stores

```text
1. Scan Store
2. Reusable Cache
3. Sensitive / Gated Data Store
4. Operational Logs / Metrics
```

The PRD does not prescribe a physical storage technology.

## 19.2. Historical Scans

A PENDING/RUNNING execution record is mutable.

After COMPLETED/FAILED, the terminal snapshot is immutable.

A new refresh creates a new scanId and does not modify the historical snapshot.

## 19.3. Stored Data

A COMPLETED FULL snapshot retains sufficient normalized data for:

- CheckResults;
- CategoryResults;
- Issues;
- Summary;
- ScoreBreakdown;
- executionContext;
- the relevant technical audit metadata.

A historical result is not recalculated under the current policy.

## 19.4. TLS Execution Metadata

Canonical structure:

```text
TlsExecutionMetadata {
  selectedIPv4?
  selectedIPv6?
  dependencyFingerprint
  securityPolicyVersion
  tlsModuleConfigVersion
  trustStoreVersion
  resultSource: FRESH | CACHE
}
```

The minimum prerequisite audit data comprises selected endpoints, dependencyFingerprint, and securityPolicyVersion.

## 19.5. Persisting Freshness Information

The authoritative `checkedAt`/`sourceUpdatedAt?` values and the provenance flag `cached` are retained.

`cacheAge` may be calculated on read.

## 19.6. Original Input — originalInput

It is not stored in the scan store by default. URL paths, queries, fragments, and credentials are not persisted domain health data.

## 19.7. Data Classification

```text
PUBLIC_NORMALIZED
TECHNICAL_INTERNAL
GATED_SENSITIVE
OPERATIONAL_SECRET
```

Mapping to API projections:

- PUBLIC_NORMALIZED → Public;
- TECHNICAL_INTERNAL → an explicitly permitted safe technical projection;
- GATED_SENSITIVE → Gated;
- OPERATIONAL_SECRET → no web API projection.

`TECHNICAL_INTERNAL` does not automatically imply either browser visibility or exclusively backend use.

## 19.8. Registration Data

The public scan store contains normalized non-sensitive registration fields and only the states of registrant fields.

Actual registrant values and sensitive raw RDAP/WHOIS data are stored within a separate protected boundary when needed.

## 19.9. Retention

Separate lifecycles apply to:

- ScanResult;
- reusable result caches;
- gated personal data;
- raw provider diagnostics;
- logs and metrics.

Exact durations are defined by data retention and security policies and architectural decisions.

Persisting scan resources does not introduce a user-facing domain history feature.

The primary result retrieval identifier is `scanId`.

## 19.10. Integrity

COMPLETED is published only after an atomic, consistent terminal snapshot is stored.

ScorePenalty.issueId references an existing Issue. Issue references to checks must be valid within the same scan and category.

The storage representation is versioned through `storageSchemaVersion`.

## 19.11. Acceptance Criteria

- **AC-19.1** The roles of the scan store and reusable result cache are distinct.
- **AC-19.2** The terminal snapshot is immutable.
- **AC-19.3** Historical policy and score are not recalculated.
- **AC-19.4** `originalInput` is not persisted by default.
- **AC-19.5** Actual registration PII is stored separately with gated access.
- **AC-19.6** TECHNICAL_INTERNAL visibility is determined by a projection allowlist.
- **AC-19.7** OPERATIONAL_SECRET is never exposed to the browser.
- **AC-19.8** Persistence does not implicitly introduce user-facing domain history.
- **AC-19.9** Terminal result storage is atomic and consistent.
- **AC-19.10** Storage schema migration does not change historical domain health semantics.

---

<a id="section-20"></a>

# 20. Configuration and Policy Management

§20 defines configuration classes, versioning, and activation rules.

## 20.1. Configuration Classes

```text
Health Policy
Technical Module Configuration
Security Policy
Orchestration Configuration
Cache Contract
Presentation / Message Configuration
Operational Configuration
Secrets
```

## 20.2. Versions

```text
healthPolicyVersion
securityPolicyVersion
orchestrationConfigVersion
cacheContractVersion
resolverSetVersion
dnsModuleConfigVersion
registryModuleConfigVersion
tlsModuleConfigVersion
trustStoreVersion
```

Optional grouping uses `configReleaseId`.

`configReleaseId` does not replace component versions that identify semantic changes.

## 20.3. Version Impact

- severity, Issue grouping, or score penalties → healthPolicyVersion;
- the resolver set → resolverSetVersion;
- DNS evaluation rules → dnsModuleConfigVersion;
- registration adapter, parser, or provider behavior → registryModuleConfigVersion;
- TLS scanner semantics → tlsModuleConfigVersion;
- trust anchors → trustStoreVersion;
- SSRF or internal denylist semantics → securityPolicyVersion;
- the global deadline or orchestration behavior → orchestrationConfigVersion;
- general cache serialization or compatibility → cacheContractVersion.

## 20.4. Health Policy and Technical Observations

A change limited to health policy permits reuse of compatible technical observations.

Historical scans are not recalculated.

## 20.5. Configuration Immutability

One version identifier cannot represent different content.

A semantic content change requires a new version.

A deterministic content hash is recommended as an additional integrity mechanism.

## 20.6. Activation

A candidate configuration passes through the following stages:

```text
load
→ schema validation
→ cross-reference validation
→ semantic/security validation
→ atomic activation
```

A running scan continues with its fixed previous configuration.

Invalid mandatory startup configuration prevents readiness and requires fail-fast behavior; a hidden fallback configuration is prohibited.

## 20.7. Secrets

Secrets are excluded from ScanResult, ExecutionContext, and configuration content shown to the browser.

Secret rotation without a behavioral change does not require an artificial module version increase.

## 20.8. Acceptance Criteria

- **AC-20.1** Configuration is divided into semantic classes.
- **AC-20.2** A semantic change updates the corresponding version.
- **AC-20.3** Different content under one version is prohibited.
- **AC-20.4** A running scan uses a fixed configuration snapshot.
- **AC-20.5** Activation is atomic and preceded by validation.
- **AC-20.6** Unknown check references and cross-category Issue rules make a configuration invalid.
- **AC-20.7** The user API does not modify policy, quorum, trust anchors, or SSRF parameters.
- **AC-20.8** The canonical registration configuration identifier is `registryModuleConfigVersion`.

---

<a id="section-21"></a>

# 21. Observability, Logging, and Monitoring

§21 defines metric names and structures, logging, service readiness, and alerting rules.

## 21.1. Platform State and Domain Health

Observability describes whether 2check is operating; domain health describes the target's condition.

A domain FAIL does not automatically mean a platform ERROR.

## 21.2. Event Correlation

```text
requestId
→ scanId
→ moduleExecutionId?
→ operationId?
```

Shared single-flight work may have one moduleExecutionId for several scanId values.

## 21.3. Structured Logs

Event names are stable and drawn from a bounded set; users do not control event names.

Standard logs exclude:

- originalInput, URL paths, or query parameters;
- Authorization, Cookie, or session secrets;
- registrant PII;
- raw RDAP/WHOIS bodies;
- internal denylist values.

## 21.4. Metric Names

Names in earlier sections express signal requirements; exact names are defined in §21.

Canonical examples:

```text
cache_lookup_total{module,outcome}
cache_bypass_total{module}
cache_write_error_total{module}
singleflight_join_total{module}
force_refresh_total{module?}
security_validation_total{decision}
ssrf_policy_block_total
security_validation_error_total
scan_started_total
scan_completed_total
scan_failed_total
```

Counters use the `_total` suffix.

## 21.5. Label Cardinality

Labels with an unbounded set of values are prohibited:

- hostname;
- IP address;
- scanId;
- requestId;
- fingerprint;
- internal CIDR.

## 21.6. Service Readiness

The service is not ready when it cannot accept a scan safely, for example:

- security policy is missing or invalid;
- the mandatory trust store is missing or invalid;
- the mandatory scan store is unavailable or incompatible.

An external RDAP/WHOIS/DNS provider outage alone does not make the entire instance unready.

A Redis outage may result in DEGRADED operation if safe bypass preserves correctness.

## 21.7. Alerts

Candidates for configured alerts include:

- increased Web API 5xx/503 responses;
- increased FAILED scans;
- scan store failures;
- configuration or security policy activation and drift;
- internal security validation errors;
- spikes in provider failures or rate limits;
- abnormal latency or resource saturation.

The domain FAIL rate is not a default paging signal.

## 21.8. Acceptance Criteria

- **AC-21.1** Platform observability and domain health are separate.
- **AC-21.2** §21 defines canonical metric names.
- **AC-21.3** Logs are structured, with sensitive data excluded or redacted.
- **AC-21.4** High-cardinality target values are not used as metric labels.
- **AC-21.5** An external provider outage does not necessarily block readiness.
- **AC-21.6** Invalid security policy blocks readiness.
- **AC-21.7** A domain FAIL is not logged as ERROR solely because its status is FAIL.
- **AC-21.8** Historical diagnostics use the versions associated with the particular scan.

---

<a id="section-22"></a>

# 22. Performance and Resource Limits

§22 defines resource bounds and behavior under load. Exact values that affect results belong to the versioned configuration of the relevant modules.

## 22.1. Bounded Execution

All externally influenced operations have bounds on:

- concurrency;
- queues;
- timeouts;
- retries;
- response size;
- candidate count processing;
- memory;
- sockets;
- stored payload size.

## 22.2. Backpressure

At saturation, bounded queues, rate limits, and 429/503 responses are used instead of unlimited concurrency.

An accepted scan cannot remain RUNNING indefinitely; a global deadline is mandatory.

## 22.3. Provider and Network Operation Budgets

Each scan plan has a bounded **logical per-scan operation budget**.

After cache and single-flight reuse, actual calls count against the **physical shared-execution budget**.

Single-flight reduces physical calls but does not expand the logical plan or bypass admission, rate, or global limits.

## 22.4. Input and Parser Limits

DNS, registration, and TLS parser inputs are bounded.

Semantic data must not be silently truncated if this could change status, security, Issues, score, or fingerprints.

The security candidate set is not truncated: inability to validate it in full produces INDETERMINATE and denies access.

## 22.5. Controlled Degradation

An independent module or provider failure does not automatically block other modules.

Degraded operation must not substitute guesses for results or present stale data as fresh.

Security rules are not weakened under load.

## 22.6. Graceful Shutdown and Crashes

Controlled shutdown order:

1. mark the service not ready;
2. stop accepting new scans;
3. allow a bounded completion period;
4. safely finish execution or produce terminal results;
5. prevent snapshot corruption.

Unrecoverable lost execution after a crash receives FAILED `execution_state_unrecoverable`.

Distributed resumption with exactly-once execution is not required in the MVP.

## 22.7. One-VPS Constraint

The MVP must operate correctly on one VPS. Resource exhaustion leads to controlled backpressure rather than altered result semantics.

## 22.8. Acceptance Criteria

- **AC-22.1** Unlimited parallelism is absent.
- **AC-22.2** A global scan deadline is mandatory.
- **AC-22.3** Operation timeouts are bounded and owned by the relevant module.
- **AC-22.4** Logical and physical budgets are distinct.
- **AC-22.5** Single-flight does not bypass admission controls.
- **AC-22.6** The security candidate set is not silently truncated.
- **AC-22.7** High load does not implicitly reduce scan scope or weaken security.
- **AC-22.8** Graceful shutdown preserves terminal result integrity.
- **AC-22.9** The resource limit of one VPS is handled through backpressure.

---

<a id="section-23"></a>

# 23. User Interface and Result Presentation

§23 defines the user flow, result presentation, and result image sharing.

## 23.1. Main Flow

```text
Input
→ FULL/PARTIAL
→ RUNNING progress
→ FINAL Summary
→ Issues
→ DNS / Domain / SSL/TLS
→ Recommendations
→ Technical Details
```

## 23.2. Execution — RUNNING

States of visible categories are displayed. Hidden prerequisites do not create a user-facing DNS category in a TLS-only scan.

An exact completion percentage is not displayed unless the backend supplies a meaningful progress estimate.

Provisional Issues may be displayed, but not as a final issue count. The final numerical score is absent during RUNNING.

## 23.3. Final FULL Result Hierarchy

```text
Verdict
→ Score + Confidence
→ Issues
→ Category Cards
→ Technical Details
```

The verdict is the primary element. The client does not derive it from the numerical score.

`score=100 + REDUCED` is not presented as an unconditional assurance that everything is fine.

## 23.4. Category Labels

Primary interface labels:

```text
DNS
Domain
SSL/TLS
```

Registry/RDAP/WHOIS are used as technical terms.

## 23.5. Uncertainty and Non-applicability — UNKNOWN/N/A

UNKNOWN means that a check could not be completed, not that a domain problem is confirmed.

N/A is neutral and may be omitted from the summary; technical details may include the factual reason.

## 23.6. Technical Details

Details are obtained through `/details` using an explicit field allowlist, without administrative or internal secrets.

## 23.7. Data Freshness

`completedAt` does not replace `checkedAt`.

The age of cached data must be available. Results with different freshness are not collapsed into a misleading global timestamp.

## 23.8. Refresh and Retry

A refresh creates a new FORCE_REFRESH scan.

The retry action is based only on backend `retryability`:

- RETRYABLE → an immediate retry is permitted;
- CONDITIONAL → the interface accounts for the condition or delay;
- NOT_RETRYABLE → retry is not offered as a solution.

The client does not map reasonCode to behavior independently.

## 23.9. Result Image Sharing

A COMPLETED scan provides the action:

```text
Share
```

MVP sharing model:

```text
existing ScanResult
→ on-demand Share Card image
→ native Share Sheet
```

The fallback is saving the image.

The following are absent:

- a “Copy link” action;
- shareId/shareToken;
- a dedicated sharing URL or page;
- a QR code;
- server-side sharing history.

The result card uses only the safe public projection, without technical details, personal data, scanId, URL, or originalInput.

A FULL card may show the verdict, score, confidence, categories, and issues. A PARTIAL card shows neither a global score nor a global verdict.

## 23.10. Accessibility and Responsive Layout

Desktop and mobile devices are supported. Keyboard operation, visible focus, semantic headings, and non-color status indicators are mandatory. Technical tables may scroll horizontally within their container.

## 23.11. Acceptance Criteria

- **AC-23.1** The backend determines verdict, score, severity, confidence, and retryability.
- **AC-23.2** Internal prerequisites are hidden from the main progress view.
- **AC-23.3** PARTIAL shows neither a global score nor a global verdict.
- **AC-23.4** UNKNOWN is not displayed as a confirmed problem.
- **AC-23.5** Caching and differences in freshness are presented accurately.
- **AC-23.6** Retry uses backend-projected retryability.
- **AC-23.7** Sharing is image-only; no sharing-link entity exists.
- **AC-23.8** The card contains no personal data, scanId, URL, QR code, or internal data.
- **AC-23.9** Supported flows are keyboard accessible and use non-color indicators.

---

<a id="section-24"></a>

# 24. SEO, Routing, and Tool Pages

§24 defines public frontend routes and indexing rules.

## 24.1. Indexable Pages

Indexable product and tool pages:

```text
/{locale}/
/{locale}/dns-check
/{locale}/whois
/{locale}/ssl-check
```

Language prefixes:

```text
ru | uz | en
```

`/` may serve as a language-neutral entry point and x-default.

## 24.2. Scan Route

```text
/{locale}/scan/{scanId}
```

Individual scan pages always have `noindex`, regardless of verdict, score, or cache state.

The route is identified by scanId rather than by the domain.

The MVP has no permanent public history resource at `/domain/{domain}`.

## 24.3. Canonical URLs and hreflang

Indexable language pages are self-canonical and have reciprocal hreflang links.

Prefill and tracking query parameters do not create separate canonical variants.

Canonical does not replace a scan page's `noindex`.

## 24.4. Sitemap

Only pages intended for indexing are included. Scan, API, and gated routes are excluded.

robots.txt is not a security boundary and does not replace a page's `noindex`.

## 24.5. SEO Claims and Product Capabilities

- the DNS page does not claim geographically distributed checking;
- the WHOIS page does not promise support for every TLD;
- the SSL page does not claim cipher grading or HSTS/OCSP/HTTP checks.

Tool pages contain useful explanatory content; detailed repair guides belong to Phase 2.

## 24.6. Relationship to Result Sharing

Built-in result sharing creates no sharing URL, page, or indexable entity. The existing scan route remains a noindex read route.

## 24.7. Privacy

`originalInput` and personal data are excluded from SEO metadata. The health score is not marked up as a review or aggregate rating.

A crawler GET to a tool or scan page does not start an external scan or refresh.

## 24.8. Acceptance Criteria

- **AC-24.1** Product and tool pages are indexable; individual scans have noindex.
- **AC-24.2** The scan route uses an opaque scanId.
- **AC-24.3** Scan routes are absent from the sitemap and any history directory.
- **AC-24.4** SEO text does not promise out-of-scope capabilities.
- **AC-24.5** Built-in result sharing does not create a dedicated sharing URL.
- **AC-24.6** A crawler GET does not start a network scan.
- **AC-24.7** Personal data and originalInput are absent from SEO metadata.

---

<a id="section-25"></a>

# 25. Privacy, Access, and Abuse Prevention

§25 defines scan access, privacy, and abuse prevention boundaries.

## 25.1. MVP User Identity

An account and login are not required for an ordinary domain health scan.

## 25.2. Scan Access

A safe scan resource uses capability-style access through a high-entropy opaque `scanId`.

Within the retention period, possession of a valid `scanId` is sufficient to retrieve:

- Public ScanResult;
- safe technical details.

Session ownership is not required for these safe projections.

## 25.3. Gated Data

A `scanId` alone **does not** provide access to actual registrant PII.

The gated endpoint requires a separate server-side authorization or admission condition.

Without a reliable gate, personal data is not returned to the browser.

## 25.4. scanId Requirements

- opaque;
- unpredictable;
- non-sequential;
- sufficient entropy to resist practical enumeration.

There is no scan listing, history, or search API.

An unknown or expired scanId receives generic 404 behavior.

## 25.5. Leakage Prevention

A scan URL is treated as an access-bearing link.

A strict Referrer Policy, preferably `no-referrer`, prevents disclosure of the complete scan URL to another origin.

Actual scanId, domain, originalInput, and personal data are not sent to third-party analytics.

## 25.6. Data Minimization

After preprocessing, execution uses CanonicalDomain.

Original URL paths, queries, fragments, and credentials are neither provider data nor persisted product data.

Providers receive only protocol-required target information, without user, session, or scanId metadata.

## 25.7. Public Check Boundaries

Proof of domain ownership is not required for bounded public DNS, registration, and TLS:443 observations.

The MVP is neither an arbitrary port scanner nor an HTTP content crawler.

## 25.8. Abuse Prevention

Controls cover:

- high-rate scanning;
- FORCE_REFRESH abuse;
- repeated scans of one target;
- provider amplification;
- SSRF attempts;
- oversized input;
- scanId enumeration;
- gated endpoint probing.

Exact thresholds belong to operational configuration.

## 25.9. Sharing Privacy

Image-only sharing conveys no access capability and does not track the recipient or destination.

## 25.10. Acceptance Criteria

- **AC-25.1** Safe results are accessible by scanId without an account or session ownership.
- **AC-25.2** A scanId alone is insufficient for gated personal data.
- **AC-25.3** There is no scan enumeration or history API.
- **AC-25.4** Cross-origin scanId leakage through the referrer is prevented.
- **AC-25.5** Third-party analytics receives no scanId, domain, originalInput, or personal data.
- **AC-25.6** Providers do not receive user or session identifiers.
- **AC-25.7** Public MVP checks do not require proof of domain ownership.
- **AC-25.8** Arbitrary ports and port scanning are absent.
- **AC-25.9** Abuse prevention does not change domain health semantics.

---

<a id="section-26"></a>

# 26. Testing and Release Criteria

§26 defines release readiness verification.

## 26.1. Test Layers

```text
Unit
Fixture / Golden
Contract
Integration
E2E
Security
Browser Compatibility
Accessibility / Localization
Failure Injection
Performance / Capacity
Privacy Leakage
```

## 26.2. Required Deterministic Coverage

- input, IDN, and PSL;
- DNS: ANSWER/NODATA/NXDOMAIN, quorum, ties, and value variation;
- `.uz` RDAP/WHOIS fixtures: registered and free domains, malformed responses, rate limits, and encodings;
- TLS: valid and expired certificates, hostname mismatch, self-signed and untrusted chains, expired intermediates, IPv4/IPv6, protocols, and timeouts;
- dependency propagation, including `dependencyMode=ANY` for aggregate TLS certificate checks over one and two address families;
- reasonCode/blockedBy invariants;
- SSRF: forbidden ranges, rebinding, and IP pinning;
- Issue deduplication and rejection of cross-category aggregation;
- score, confidence, and verdict;
- NORMAL/FORCE_REFRESH, single-flight, and cache compatibility;
- policy and configuration validation;
- API projections and access boundaries;
- persistence and crash recovery.

## 26.3. Retryability Contract Tests

Backend contract tests cover RETRYABLE/CONDITIONAL/NOT_RETRYABLE.

A frontend test must establish that no client-side reasonCode mapping exists. Controlled fixtures may supply a known reasonCode with deliberately different retryability; the client must follow the supplied retryability.

NOT_RETRYABLE does not display an immediate retry action; CONDITIONAL does not become an unconditional immediate retry.

## 26.4. Technical Projection Tests

TECHNICAL_INTERNAL requires:

- a positive case: an allowlisted field is present in `/details`;
- a negative case: a non-allowlisted field of the same storage class is absent.

## 26.5. Browser Compatibility Matrix

Mandatory browsers:

1. Google Chrome Desktop;
2. Google Chrome Android;
3. Apple Safari macOS;
4. Apple Safari iOS/iPadOS;
5. Microsoft Edge Desktop;
6. Mozilla Firefox Desktop;
7. Mozilla Firefox Android;
8. Yandex Browser Desktop;
9. Yandex Browser Android;
10. Samsung Internet Android.

For evergreen browsers, the current and previous stable releases or release generations are tested where practically available.

Real Chromium, WebKit, and Gecko engines are required.

Yandex Browser is not considered automatically covered by Chrome tests.

Opera Desktop is an optional additional target.

## 26.6. Image Sharing Compatibility

When the native file-sharing API is available, the system share sheet is used. Otherwise, image saving must work. The absence of native sharing does not make a browser unsupported.

## 26.7. Failure Injection

The minimum scenarios are:

- a DNS timeout;
- registration timeouts, malformed responses, and encoding errors;
- Redis unavailability;
- scan store unavailability;
- a target TLS timeout;
- an internal network failure;
- a security validation error;
- the global deadline;
- a worker crash.

Lost RUNNING execution without safe resumption receives FAILED `execution_state_unrecoverable`.

## 26.8. Release Blockers

A release is blocked by:

- an SSRF bypass;
- personal data or secret leakage;
- incorrect PASS/FAIL/UNKNOWN semantics;
- a duplicate score penalty;
- a corrupt historical result;
- a broken FULL flow in a mandatory browser;
- a missing mandatory language without a safe fallback.

## 26.9. Acceptance Criteria

- **AC-26.1** Critical invariant checks are automated where feasible.
- **AC-26.2** Golden fixtures isolate correctness checks from public internet instability.
- **AC-26.3** Frontend retry behavior is tested against the backend projection, not a reasonCode table.
- **AC-26.4** The technical projection has positive and negative allowlist tests.
- **AC-26.5** The mandatory browser matrix is verified before production release.
- **AC-26.6** An SSRF or security regression blocks release.
- **AC-26.7** Result card tests prohibit personal data, scanId, URL, QR codes, and internal data.
- **AC-26.8** Load tests verify correctness under load, not only throughput.
- **AC-26.9** Dependency tests cover `dependencyMode=ANY`: one successful TLS family permits certificate evaluation, and both successful families contribute to the aggregate result.

---

<a id="section-27"></a>

# 27. Deployment, Environments, and Release Management

§27 defines environment, release, and deployment requirements.

## 27.1. Environments

Logical model:

```text
development
test
staging
production
```

Production and non-production secrets and data stores are isolated.

## 27.2. Release Identifier

```text
applicationReleaseVersion
```

An equivalent immutable build identifier is permitted.

The following is maintained separately:

```text
configReleaseId
```

The release manifest allows reconstruction of the deployed combination:

- application release;
- storageSchemaVersion;
- health, security, orchestration, cache, module, and trust versions.

The manifest contains no secrets.

## 27.3. Release Promotion

Preferred order:

```text
build
→ automated tests
→ test
→ staging
→ quality gates
→ production
```

Where practical, the same immutable artifact is promoted from staging to production; environment differences are defined through configuration and secrets.

## 27.4. Migrations

Storage schema changes are explicit, versioned, and tested.

A migration may change data representation but not historical domain health semantics.

Before production release, the migration is identified as reversible or forward-only. A destructive migration requires a backup or an equivalent recovery strategy.

## 27.5. Deployment and Readiness

Normal deployment uses graceful draining and shutdown.

Before receiving traffic, a new instance confirms:

- valid configuration;
- valid security policy;
- a loaded trust store;
- a compatible, available mandatory scan store;
- a compatible storage schema.

An external provider outage does not necessarily block readiness.

## 27.6. Caching During Releases

Versioned compatibility is used instead of unconditional Redis flushing.

A change limited to health policy does not require flushing the technical cache.

A trust store change invalidates the compatibility of affected TLS results.

A security policy change requires reclassification of cached DNS candidates under current rules.

## 27.7. Rollback

Application, configuration, or trust store rollback is explicit and auditable.

Historical scans remain unchanged.

Rollback does not make stale or expired cache entries fresh.

## 27.8. Backup and Restore

The reusable result cache is not an authoritative backup target.

Sensitive-data backups comply with retention and security policies.

Restoring a historical ScanResult does not turn it into a fresh module cache entry.

## 27.9. Acceptance Criteria

- **AC-27.1** Environments are logically separated.
- **AC-27.2** The release artifact has an immutable identifier.
- **AC-27.3** Application release and configRelease are separate.
- **AC-27.4** Promotion to production passes the checks in §26.
- **AC-27.5** A migration does not recalculate historical domain health.
- **AC-27.6** Controlled graceful deployment is mandatory.
- **AC-27.7** Invalid security policy, trust data, or scan storage blocks readiness.
- **AC-27.8** Cache flushing is not the default release strategy.
- **AC-27.9** Rollback does not change historical scans.
- **AC-27.10** Lost execution is classified under §16.

---

<a id="section-28"></a>

# 28. Product Analytics and Usage Metrics

§28 defines product usage analytics. Operational observability remains within §21.

## 28.1. Separation of Responsibilities

Product analytics describes how people use the product.

Observability describes how the platform operates technically.

The domain FAIL rate is not a platform quality KPI.

## 28.2. Core Events

```text
scan_form_viewed
scan_submitted
scan_accepted
scan_result_viewed
technical_details_opened
refresh_clicked
retry_clicked
share_clicked
locale_changed
```

Optional events:

```text
share_completed
share_image_saved
```

These are used when the browser API can determine the action's outcome reliably.

## 28.3. Allowed Dimensions

Bounded sets of values are used:

- locale: ru/uz/en;
- tool: home/dns/registry/tls;
- mode: FULL/PARTIAL;
- the selected category set as a bounded enumeration;
- executionOutcome: COMPLETED/FAILED;
- an optional aggregate verdictCode.

## 28.4. Data Excluded from Default Analytics

The following are not sent:

- domain;
- scanId;
- originalInput;
- registration PII;
- IP address;
- certificate fingerprint;
- DNS values.

A scan page is tracked as a route template rather than its actual scanId URL.

The analytics service is not a mandatory runtime dependency; its failure does not affect scans.

## 28.5. Usage Funnel

```text
scan_form_viewed
→ scan_submitted
→ scan_accepted
→ scan_result_viewed
```

Recommended primary metrics:

```text
completed_result_rate
FULL vs PARTIAL usage
technical_details_open_rate
share_action_rate
refresh_rate
returning_session_rate
```

Retry and refresh rates are interpreted alongside observability rather than as independent quality judgments.

## 28.6. Privacy

An anonymous session identifier is permitted for aggregate funnel and return analysis, but is not an account or a persistent cross-service identity.

A submitted domain is not used as a marketing or audience attribute by default.

Image sharing does not create a recipient or view analytics entity.

## 28.7. Acceptance Criteria

- **AC-28.1** Product analytics and observability are separate.
- **AC-28.2** The core scan funnel is measurable.
- **AC-28.3** Domain, scanId, originalInput, and personal data are absent from default analytics dimensions.
- **AC-28.4** The client does not infer a retry event from reasonCode.
- **AC-28.5** Sharing analytics does not track recipients or destinations.
- **AC-28.6** Analytics failure does not affect domain health execution.
- **AC-28.7** Return analysis does not require domain history.
- **AC-28.8** Client-side experiments do not alter score, severity, or verdict semantics.

---

<a id="appendix-a"></a>

# Appendix A. Responsible Sections

| Requirement Area | Section |
|---|---|
| Product Goal and Positioning | §1 |
| MVP Scope and Roadmap | §2 |
| User Scenarios and Scan Modes | §3 |
| Technical Architecture and System Boundaries | §4 |
| Input and the Canonical Domain Object | §5 |
| Common Data Contracts and Exposure Levels | §6 |
| Statuses, Dependencies, and Scan Results | §7 |
| DNS Checks | §8 |
| Domain Registration | §9 |
| SSL/TLS Checks | §10 |
| Domain Health Summary and Identified Issues | §11 |
| Domain Health Score | §12 |
| User Messages and Localization | §13 |
| Caching and Data Freshness | §14 |
| Security and SSRF Protection | §15 |
| Scan Orchestration and Execution | §16 |
| Internal Web API Contract | §17 |
| Error Classification and Failure Handling | §18 |
| Data Model and Persistence | §19 |
| Configuration and Policy Management | §20 |
| Observability, Logging, and Monitoring | §21 |
| Performance and Resource Limits | §22 |
| User Interface and Result Presentation | §23 |
| SEO, Routing, and Tool Pages | §24 |
| Privacy, Access, and Abuse Prevention | §25 |
| Testing and Release Criteria | §26 |
| Deployment, Environments, and Release Management | §27 |
| Product Analytics and Usage Metrics | §28 |

<a id="appendix-b"></a>

# Appendix B. Consistency Conditions

The specification is internally consistent when all of the following conditions hold:

- each semantic object has one DTO;
- each configuration dimension has one canonical version field name;
- obsolete reason codes are absent;
- metric naming contracts are not duplicated;
- the frontend does not infer backend health or retry semantics;
- Public/Technical projections contain no gated personal data or secrets;
- the `scanId` access model is explicit;
- FULL/PARTIAL semantics are explicit;
- acceptance through `POST /scans` is separate from the terminal result obtained through `GET`;
- numerical score and confidence remain independent dimensions;
- the reusable cache and historical ScanResult serve distinct roles;
- security validation failures and network execution failures can be distinguished;
- image sharing creates no sharing-link storage or entities;
- acceptance criteria are numbered sequentially within each section;
- temporary patch, continuation, and placeholder criterion markers are absent.
