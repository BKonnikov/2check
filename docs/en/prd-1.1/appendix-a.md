# Appendix A. Responsible Sections

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/appendix-a.md)
<!-- nav:end -->

Each requirement has one responsible section. Where sections conflict, the provision in the responsible one applies.

| Subject | Responsible section |
|---|---|
| Release boundary | [§1](01-scope-goals.md#1-scope-and-goals-of-mvp-11) |
| Check groups and the dependency on `MX` | [§2](02-check-groups-dependencies.md#2-check-groups-and-the-dependency-on-mx) |
| Parsing SPF and its limits | [§3](03-spf.md#3-spf) |
| The DMARC policy and the tree walk | [§4](04-dmarc.md#4-dmarc) |
| Finding a DKIM key and its selectors | [§5](05-dkim.md#5-dkim) |
| The receiving server | [§6](06-mx.md#6-mx) |
| The encryption probe | [§7](07-starttls.md#7-starttls) |
| Reverse names | [§8](08-ptr.md#8-ptr) |
| Data contracts and exposure levels | [§9](09-data-contracts.md#9-data-contracts-and-exposure-levels) |
| Merging issues and the effect on the score | [§10](10-summary-score.md#10-effect-on-the-summary-the-verdict-and-the-score) |
| Wording and the forbidden causal claims | [§11](11-messages.md#11-messages-and-localization) |
| Cache keys and lifetimes | [§12](12-cache.md#12-caching-and-data-freshness) |
| Rules for outbound connections | [§13](13-outbound-security.md#13-outbound-connection-safety) |
| The web API contract and the scope of a scan | [§14](14-web-api.md#14-the-web-api-and-scan-modes) |
| The interface and the tool page | [§15](15-interface.md#15-the-interface-and-the-tool-page) |
| Metrics and the boundaries of analytics | [§16](16-observability.md#16-observability-and-analytics) |
| Release conditions | [§17](17-testing-readiness.md#17-testing-and-release-readiness) |

Requirements whose responsible section is in MVP 1.0 are not overridden by this document.
