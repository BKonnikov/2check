# 25. Privacy, Access, and Abuse Prevention

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/25-privacy-data-protection-abuse-boundaries.md)
<!-- nav:end -->

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
