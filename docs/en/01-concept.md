# 2check.uz — Product Concept for a Domain Checking Portal

[Русский](../ru/01-concept.md) · [Documentation](README.md) · [02. PRD](02-prd.md)

**2check_Product_Concept_v1.0 — FINAL / FROZEN**

English reading edition of the frozen concept. The wording has been edited; the product boundaries are preserved. The [original document](../concept.md) remains unchanged.

## 1. Positioning

**2check.uz explains a domain's technical health in plain language.**
DNS, registration, SSL, email, and security are presented in one place. Specialists receive source data; general users receive an explanation of the problem and how to address it.

**Two audiences:**

- Technical specialists: precise data, raw output, and export.
- Beginners and business owners: understandable verdicts in ordinary language.

**Main screen:**

```text
Check a domain
[ example.uz________________ ] [ Check ]
```

**The result is a Domain Health Summary.** Its primary element is a written verdict. The score is supporting context. The following example represents **MVP 1.0**; the email block is introduced with MVP 1.1:

```text
Problems found
1 critical issue • 1 recommendation

87/100

DNS          ✅
  A          ✅ found
  AAAA       ✅ found
Domain       ✅
SSL/TLS      ❌
  IPv4       ✅ TLS connection established
  IPv6       ⚠️ TLS connection could not be established
```

A score of 87/100 alone does not explain the difference from 86. The written verdict communicates the finding; the number provides context.

IPv4 and IPv6 results are distinguished without introducing a separate scope module. The DNS module compares resolver responses, including whether A/AAAA records were found. IPv4/IPv6 TLS connectivity belongs to the existing **SSL/TLS check**, not to a new general “website availability” check. A separate TCP or connectivity module is outside MVP 1.0. An AAAA record that resolves correctly but does not permit a TLS connection is an IPv6 TLS finding, not a DNS failure.

---

## 2. Status, Severity, and Domain Health Score

### 2.1. Separate Status and Severity

These are independent dimensions:

```text
status   = PASS | FAIL | UNKNOWN | NOT_APPLICABLE
severity = critical | warning | informational | none
```

`status` records whether the check condition was satisfied. `severity` represents the potential impact of a negative check result; its precise wording is refined in the PRD. `INFO`/`WARN` are not status values because severity already expresses this dimension. Duplicating severity in status would permit ambiguous combinations such as `status=WARN` with `severity=critical`.

Examples:

```text
DMARC absent → status = FAIL, severity = warning
AAAA absent  → status = FAIL, severity = informational
               (or status = PASS if an absent AAAA record is treated
               as an optional recommendation rather than a defect)
```

`UNKNOWN` and `NOT_APPLICABLE` are distinct:

- `UNKNOWN`: the check is technically applicable, but no result could be obtained, for example because of an RDAP timeout or an unavailable blacklist API.
- `NOT_APPLICABLE`: the object required by the check is absent. If an MX record is absent, there is no receiving server whose STARTTLS support can be checked.

Neither status incurs a score penalty (§2.3). Their presentation differs: `UNKNOWN` indicates incomplete checks; `NOT_APPLICABLE` is neutral and is not displayed as a problem.

**`blocked_by` and `reason_code` have different, non-interchangeable roles:**

- `blocked_by` is used **only** when a check is not performed because of another check's state:

  ```text
  SSL
  status = UNKNOWN
  blocked_by = dns_resolution
  ```

  ```text
  STARTTLS
  status = NOT_APPLICABLE
  blocked_by = mx_missing
  ```

- A check's own technical failure is recorded in `reason_code`, without implying a dependency on another check:

  ```text
  RDAP
  status = UNKNOWN
  reason_code = timeout
  ```

  ```text
  Blacklist
  status = UNKNOWN
  reason_code = provider_unavailable
  ```

This distinction prevents `blocked_by` from combining a dependency graph, an error code, and a written explanation in one field.

### 2.2. Check Dependencies

**A check that could not run because another check failed does not receive an independent penalty.**

```text
DNS A/AAAA → FAIL
    ↓ blocked_by: dns_resolution
SSL → UNKNOWN (the check applies but could not be performed)
```

When MX is absent, checks of the receiving mail server — STARTTLS, PTR, and Blacklist — become `NOT_APPLICABLE` with `blocked_by: mx_missing`, rather than separate FAIL results. This is not UNKNOWN: the object is absent, rather than technically unobservable. SPF, DMARC, and DKIM are sender-domain DNS policies and are checked independently of MX. Separating these groups prevents both duplicate penalties and unjustified blocking of independent checks.

Each implemented check must explicitly declare its dependencies through `depends_on: [...]`.

### 2.3. Scoring Principles

The exact formula is a separate implementation task and is not finalized in this concept. Any formula must satisfy these constraints:

- **Only checks with `status = FAIL` affect the score. Severity determines the penalty. `PASS`, `UNKNOWN`, and `NOT_APPLICABLE` do not reduce the score.** For example, `PASS + severity: informational` incurs no penalty.

  ```text
  FAIL + critical       → penalty
  FAIL + warning        → penalty
  FAIL + informational  → small penalty

  PASS + any severity   → 0
  UNKNOWN               → 0, but reduces confidence
  NOT_APPLICABLE        → 0
  ```

  Whether a particular condition, such as missing AAAA, is PASS or FAIL with informational severity is determined by check configuration during implementation. The rule that only FAIL incurs a penalty remains unchanged.
- The score has a floor of 0.
- A root defect is not penalized twice. This follows from the dependency model in §2.2 rather than additional scoring logic.
- Severity weights (Critical / Warning / Info) and the checks assigned to each level are defined in configuration during MVP implementation rather than hard-coded incrementally.

---

## 3. Check Scope

### MVP 1.0 — Frozen Boundary

The scope comprises the IDN pipeline, DNS resolver comparison, registration through `registryProvider`, SSL, the health summary, and the SSRF security foundation. Email health, HTTP checking, and reputation are excluded, including partial implementations.

| Check | Output |
|---|---|
| **Preprocessing / IDN pipeline** | Mandatory preprocessing for every check, producing one canonical domain object (§4). |
| **DNS lookup** | A, AAAA, MX, TXT, NS, CNAME, and SOA through several independent public resolvers, including Cloudflare/Google DoH. The PRD and code call this **resolver comparison**. The interface must not describe it as a multi-region check or “DNS propagation worldwide.” |
| **WHOIS / RDAP** | A normalized result through `registryProvider` (§5). |
| **SSL/TLS check** | The fixed set in §6. |
| **Domain Health Summary** | Based on the status/severity model in §2. |
| **Localization** | RU / UZ / EN from the first release. |

### MVP 1.1 — Email Health

Email health is divided into three independent groups rather than one group sharing an MX dependency:

```text
Email Authentication — sender-domain DNS policies, independent of MX
├─ SPF   (multiple records, lookup count > 10)
├─ DMARC
└─ DKIM  (selector heuristics; a selector is required)

Inbound Mail
├─ MX
└─ STARTTLS   — depends_on: MX

Mail Server / IP
├─ PTR       (with a separate indication of absent IPv6 PTR)
└─ Blacklist of the mail server IP
```

SPF, DMARC, and DKIM are published as sender-domain DNS records independently of MX. RFC 7208 describes `v=spf1 -all` for domains that do not send email. Missing MX results in `NOT_APPLICABLE (blocked_by: mx_missing)` only for checks whose object is the receiving mail server: **STARTTLS, PTR, and Blacklist**. SPF, DMARC, and DKIM remain independent.

**PTR and Blacklist describe the MX server, not outbound email.** MX identifies the server receiving mail for a domain. Outbound mail may use a different relay or submission infrastructure. Findings about an MX-derived IP must therefore describe the receiving server. They must not claim that outgoing mail will be classified as spam. Outbound reputation requires the actual sending IP, which 2check does not know at this stage.

### Phase 2

- Geographically distributed DNS checks from multiple points of presence.
- Ping / Traceroute.
- HTTP header and redirect-chain checks with **SSRF validation on every redirect hop** (§7).
- Domain reputation.
- Homograph / IDN spoof detection.
- SEO guides linked to diagnostic findings.

### Phase 3

- Port scanning with strengthened SSRF protection.
- Uptime monitoring.
- A public API.
- A Telegram bot mirroring the service.

---

## 4. Preprocessing and the Canonical Domain Object

One input pipeline produces one object for all subsequent checks. Checks do not normalize input independently:

```text
input → trim → lowercase → Unicode normalization → IDNA validation → ASCII/punycode
```

```text
CanonicalDomain {
  originalInput: string
  unicodeHostname: string
  asciiHostname: string

  publicSuffix: string
  registrableDomain: string

  labels: string[]
  isIdn: boolean
}
```

The hostname and registrable domain must be separate. Inputs such as `mail.example.uz` and `status.shop.example.co.uk` require DNS and SSL checks of the entered hostname:

```text
input:              status.shop.example.co.uk
asciiHostname:       status.shop.example.co.uk
publicSuffix:        co.uk
registrableDomain:   example.co.uk

DNS  → canonicalDomain.asciiHostname
SSL  → canonicalDomain.asciiHostname
RDAP → registryProvider determines registryDomain (§5)
```

**`registrableDomain` in `CanonicalDomain` and the provider-determined `registryDomain` (§5) are not interchangeable.** The Public Suffix List has ICANN and PRIVATE sections with different application semantics. For a PRIVATE entry such as `foo.some-platform.example`, the PSL-derived registrable domain can correctly represent a web or cookie isolation boundary without being a separately registered domain in the TLD registry. The registered domain may belong to the platform rather than its tenant.

`registryDomain` is **deliberately excluded from `CanonicalDomain`** to avoid a circular dependency. Preprocessing cannot construct a value that requires registry-adapter rules when that adapter itself receives the completed `CanonicalDomain` through `registryProvider.lookup(canonicalDomain)`. Preprocessing supplies `registrableDomain` as the general PSL boundary; the `registryProvider` computes and returns `registryDomain` as its output.

This separation also supports providers beyond the initial `.uz` implementation (§5). The `tld` field is insufficient because the registration boundary does not always match the final domain label, as illustrated by `co.uk`.

Both original and ASCII forms are shown, for example `оптика.uz` → `xn--80aikucn.uz`.

---

## 5. Registration Provider and Normalized Result

The main contract returns normalized data rather than transport details:

```text
registryProvider.lookup(canonicalDomain)
    ↓ the provider determines registryDomain using registry-specific rules
NormalizedDomainRegistration {
  registryDomain
  registrar
  createdAt
  expiresAt
  nameServers[]
  status
  registrant: {
    name:    value | redacted | unavailable
    email:   value | redacted | unavailable
    phone:   value | redacted | unavailable
    address: value | redacted | unavailable
  }

  raw: { rdap?, whois? }        // technical mode only
  freshness: {
    checkedAt                 // required
    cached: boolean           // required
    cacheAge                  // required
    sourceUpdatedAt?          // nullable; not every source provides it
  }
}
```

`raw.rdap`/`raw.whois` support technical display and do not drive the registration module's primary logic. WHOIS and RDAP are retrieval mechanisms rather than mandatory transport-specific consumer contracts. Availability is represented separately for each `registrant.*` field: one source may disclose a name while redacting the email. An all-or-nothing registrant model cannot express this.

**Display restriction:** even when a `registrant.*` value is available rather than redacted or unavailable, it is **excluded from the public summary**. It may appear only in detailed or technical mode after an additional user action, such as a click or CAPTCHA. Raw RDAP/WHOIS containing personal data must never become publicly indexable. Storage, retention, and specific legal requirements belong to a separate security specification.

**Freshness** appears in details rather than on the main screen, for example “Checked now” or “Registry data obtained 48 minutes ago.” This distinguishes cached WHOIS/RDAP data from a new observation.

`.uz` is the first adapter, `UzRegistryProvider`, behind this interface:

- WHOIS server `whois.cctld.uz` and primary RDAP source `rdap.cctld.uz` (`application/rdap+json`).
- Registrant fields may be redacted or unavailable; UZINFOCOM describes differentiated RDAP data access.
- Caching is mandatory, with adaptive TTL: 1–3 hours for active domains and minutes for grace or redemption periods.
- Handling CP1251/UTF-8 legacy responses is a parser robustness requirement rather than a documented assertion about provider encoding.

---

## 6. Fixed MVP SSL/TLS Scope

The closed set excludes cipher grading, BEAST/POODLE, and extensive legacy checks:

- certificate validity and hostname match;
- issuer, SAN, valid-from/to dates, and days remaining;
- certificate chain and TLS 1.2/1.3 support;
- expired intermediates, self-signed certificates, and untrusted chains.

With `blocked_by: dns_resolution`, the status is UNKNOWN rather than FAIL (§2.2).

---

## 7. Security and SSRF Protection

A domain can resolve to loopback (`127.0.0.1`), private ranges such as `10.0.0.0/8`, a cloud metadata endpoint (`169.254.169.254`), or private/link-local IPv6 ranges. Accepting domain names alone is not sufficient protection.

**Resolve, validate, then connect to a pinned IP address.** Resolving again immediately before the request still permits DNS rebinding if the application validates one address but the HTTP/TLS client resolves the hostname independently and receives another. The required sequence is:

1. Resolve the hostname and obtain all A/AAAA records.
2. Check **all** returned IP addresses against the SSRF policy, including private, loopback, link-local, and metadata ranges.
3. **If any address is forbidden, block the entire target and do not perform the network check.** A mixed response containing one public and one private address must not be handled by selecting only the public address.
4. If every address passes, select an allowed address and connect directly to it without resolving the hostname again.
5. Preserve the original hostname in TLS SNI and certificate validation. For HTTP, preserve the original `Host` header while the TCP connection uses the validated address.

**Redirects require independent validation at every hop.** Each next address goes through resolution, IP validation, and connection to a pinned address. A target may pass initial validation and then redirect to `169.254.169.254`; validating only the initial target does not prevent this bypass.

---

## 8. Domain Reputation and API Licensing

- **Google Web Risk API** is designated for any monetization of 2check.uz.
- **Google Safe Browsing API** is considered only while the service remains strictly non-commercial. The frozen concept flags uncertainty in the phrase “not for sale or revenue-generating purposes,” possible access withdrawal, and the absence of an SLA.
  - Access is encapsulated by `reputationProvider.check(domain)` so migration to Web Risk does not require rewriting the backend.
- **Yandex Safe Browsing API** offers Lookup, which sends the URL to Yandex without a response-time guarantee, or Update, using a local database for scale.
- VirusTotal is optional.

---

## 9. Architecture

- **DNS:** DoH providers and comparison across independent resolvers in the MVP; geographic distribution in Phase 2.
- **Registration:** `registryProvider` → `NormalizedDomainRegistration` (§5).
- **SSL:** server-side TLS handshakes with the SSRF guard (§7).
- **Reputation:** encapsulated by `reputationProvider` (§8).
- **MVP result loading:** no SSE/WebSocket; the frontend calls independent endpoints in parallel and updates cards through the status model. SSE is deferred to complex scans with 15–30 checks.

**Stack:**

- Frontend: Next.js, using SSR/ISR with minimal client JavaScript.
- Backend: Node.js/Fastify or Python/FastAPI.
- Cache: Redis with adaptive TTL.
- MVP hosting: one VPS.

---

## 10. Abuse Prevention

- Layered controls: a soft IP rate limit, fingerprinting, and Cloudflare Turnstile for suspicious activity.
- Mobile carrier CGNAT: combine IP information with a cookie or session token.
- Domain-only input and the mandatory SSRF guard (§7) are separate, complementary controls.
- Logging accounts for personal data law.

---

## 11. SEO Strategy

**Index:** tool landing pages such as `/dns-check`, `/ssl-check`, `/whois`, and `/punycode`, and substantive guides such as `/guides/dmarc-uz`.

**Guides are part of the product:** a health-summary finding, such as missing DMARC, provides a “How to fix” action linking to the relevant guide. Diagnostic findings and explanatory content are connected.

**Do not index by default:** automatically generated domain reports use `noindex` unless they contain unique content.

---

## 12. Localization

RU / UZ / EN are supported from the MVP release.

---

## 13. Priorities and Roadmap

**MVP 1.0, frozen scope:** the IDN pipeline and canonical domain object; DNS resolver comparison; registration through `registryProvider`; fixed-scope SSL checks; the domain health summary with status, severity, and dependencies; SSRF protection; and RU/UZ/EN.

**MVP 1.1:** email health. SPF/DMARC/DKIM are independent of MX; STARTTLS depends on MX; PTR/Blacklist describe the receiving MX server rather than outbound reputation.

**Phase 2:** geographically distributed DNS, Ping/Traceroute, HTTP checking with SSRF protection at every redirect, domain reputation, homograph detection, and diagnostic SEO guides.

**Phase 3:** a Telegram bot, public API, SSE-based complex scanning, port scanning, and uptime monitoring.
