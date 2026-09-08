# 25. Privacy, Data Protection & Abuse Boundaries

§25 является normative owner scan access model/privacy/abuse boundaries.

## 25.1. MVP identity model

User account/login не required для ordinary Domain Health scan.

## 25.2. Scan access

Safe scan resource использует capability-style access по high-entropy opaque `scanId`.

В пределах retention знание valid `scanId` достаточно для:

- Public ScanResult;
- Safe Technical Details.

No session ownership required для этих safe projections.

## 25.3. Gated data

`scanId` alone **не** даёт доступ к actual Registry registrant PII.

Gated endpoint требует отдельный server-side authorization/gating condition.

При отсутствии reliable gate PII не возвращается browser.

## 25.4. ScanId security

- opaque;
- unpredictable;
- non-sequential;
- sufficient entropy против practical enumeration.

No scan listing/history/search API.

Unknown/expired scanId → generic 404 behavior.

## 25.5. Leakage prevention

Scan route treated as access-bearing URL.

Strict Referrer Policy, предпочтительно `no-referrer`, предотвращает cross-origin leakage full scan URL.

Actual scanId/domain/originalInput/PII не передаются third-party analytics.

## 25.6. Data minimization

After preprocessing execution uses CanonicalDomain.

Original URL path/query/fragment/credentials не provider data и не persistent product data.

Providers получают только protocol-required target information, без user/session/scanId metadata.

## 25.7. Public target scope

Proof of ownership domain не требуется для bounded public DNS/Registry/TLS:443 observations.

MVP не является arbitrary port scanner или HTTP content crawler.

## 25.8. Abuse

Controls покрывают:

- high-rate scans;
- FORCE_REFRESH abuse;
- repeated target scans;
- provider amplification;
- SSRF probing;
- oversized input;
- scanId enumeration;
- gated endpoint probing.

Exact thresholds operational config-owned.

## 25.9. Share privacy

Image-only Share не содержит access capability и не отслеживает recipient/destination.

## 25.10. Acceptance Criteria

- **AC-25.1** Safe result capability access по scanId без account/session ownership.
- **AC-25.2** scanId alone недостаточен для gated PII.
- **AC-25.3** No scan enumeration/history API.
- **AC-25.4** Cross-origin referrer leakage scanId предотвращается.
- **AC-25.5** Third-party analytics не получает scanId/domain/originalInput/PII.
- **AC-25.6** Providers не получают user/session identifiers.
- **AC-25.7** Proof of domain ownership не required для MVP public observations.
- **AC-25.8** Arbitrary ports/port scanning отсутствуют.
- **AC-25.9** Abuse controls не меняют Domain Health semantics.

---
