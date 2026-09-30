# 1. Scope and Goals of MVP 1.1

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/01-scope-goals.md)
<!-- nav:end -->

[§1](01-scope-goals.md#1-scope-and-goals-of-mvp-11) defines what release 1.1 adds, what stays outside it, and how it relates to the frozen MVP 1.0 specification.

## 1.1. What the Release Adds

One category of checks:

```text
email
```

Its contents:

```text
SPF
DMARC
DKIM
MX
STARTTLS
PTR
```

The category takes part in a full scan alongside `dns`, `registry` and `tls`, and is available as a separate tool.

## 1.2. What the Release Does Not Do

The release excludes:

- assessment of the domain's outbound mail reputation;
- receiving, parsing, and delivering messages;
- verification of an individual message's signature;
- provider-specific configuration advice unsupported by published records;
- checking receiving-server addresses against blocklists.

The project has not selected a blocklist source with confirmed permission for use by a public service. This feature is therefore excluded from the release.

Outbound mail reputation depends on the actual sending address. Receiving-server records do not establish that address — [§2](02-check-groups-dependencies.md#2-check-groups-and-the-dependency-on-mx).

## 1.3. Relation to MVP 1.0

The `dns`, `registry`, and `tls` checks retain their MVP 1.0 behavior. Additions for the `email` category are assigned to the following sections:

| MVP 1.0 Sections | Addition | MVP 1.1 Sections |
|---|---|---|
| [1.0 §3](../prd/03-user-scenarios-scan-modes.md#3-user-scenarios-and-scan-modes), [1.0 §17](../prd/17-internal-web-api-contract.md#17-internal-web-api-contract) | scan modes and web API | [§14](14-web-api.md#14-the-web-api-and-scan-modes) |
| [1.0 §6](../prd/06-common-data-contracts-exposure.md#6-common-data-contracts-and-exposure-levels) | data contracts and representations | [§9](09-data-contracts.md#9-data-contracts-and-exposure-levels) |
| [1.0 §7](../prd/07-shared-status-dependency-category-scan-semantics.md#7-statuses-dependencies-and-scan-results) | statuses and dependencies | [§2](02-check-groups-dependencies.md#2-check-groups-and-the-dependency-on-mx) |
| [1.0 §11](../prd/11-domain-health-summary-issues.md#11-domain-health-summary-and-identified-issues), [1.0 §12](../prd/12-domain-health-score.md#12-domain-health-score) | summary, verdict, and score | [§10](10-summary-score.md#10-effect-on-the-summary-the-verdict-and-the-score) |
| [1.0 §13](../prd/13-human-readable-messages-localization.md#13-user-messages-and-localization) | messages and localization | [§11](11-messages.md#11-messages-and-localization) |
| [1.0 §14](../prd/14-cache-freshness.md#14-caching-and-data-freshness) | caching | [§12](12-cache.md#12-caching-and-data-freshness) |
| [1.0 §15](../prd/15-security-ssrf.md#15-security-and-ssrf-protection), [1.0 §22](../prd/22-performance-resource-limits-nfr.md#22-performance-and-resource-limits) | security and resource limits | [§13](13-outbound-security.md#13-outbound-connection-safety) |
| [1.0 §23](../prd/23-frontend-ux-result-presentation.md#23-user-interface-and-result-presentation), [1.0 §24](../prd/24-seo-routing-public-tool-pages.md#24-seo-routing-and-tool-pages) | interface and routing | [§15](15-interface.md#15-the-interface-and-the-tool-page) |
| [1.0 §21](../prd/21-observability-logging-operational-monitoring.md#21-observability-logging-and-monitoring), [1.0 §28](../prd/28-product-analytics-success-metrics.md#28-product-analytics-and-usage-metrics) | observability and analytics | [§16](16-observability.md#16-observability-and-analytics) |
| [1.0 §26](../prd/26-testing-quality-gates-acceptance-strategy.md#26-testing-and-release-criteria) | testing and release conditions | [§17](17-testing-readiness.md#17-testing-and-release-readiness) |

The MVP 1.0 text remains unchanged. Appendix A lists the responsible sections of this addition.

## 1.4. Acceptance Criteria

- **AC-1.1** The release adds exactly one category, `email`; the checks in the `dns`, `registry` and `tls` categories are unchanged.
- **AC-1.2** This document does not amend the text of MVP 1.0; in a conflict, the provision in the responsible section identified in Appendix A applies.
- **AC-1.3** Outbound mail reputation is outside the release boundary and is not inferred from the results of the `email` category.
- **AC-1.4** Receiving, parsing and delivering messages are outside the release boundary.
- **AC-1.5** The `email` category is available both in a full scan and as a separate tool.

---
