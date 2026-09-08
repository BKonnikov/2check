# PRD navigation

This directory contains the **normative source of truth** for the 2check.uz MVP 1.0 PRD. The frozen product boundary remains in [`concept.md`](concept.md). The compiled document in `../dist/` is generated from the numbered PRD sections and must not be edited directly.

## Foundation & common contracts

- [1. Product Goal & Positioning](00-foundation/01-product-goal-positioning.md)
- [2. MVP Scope & Roadmap](00-foundation/02-mvp-scope-roadmap.md)
- [3. User Scenarios & Scan Modes](00-foundation/03-user-scenarios-scan-modes.md)
- [4. Technical Architecture & System Boundaries](00-foundation/04-technical-architecture-system-boundaries.md)
- [5. Input & CanonicalDomain](00-foundation/05-input-canonical-domain.md)
- [6. Common Data Contracts & Exposure Model](00-foundation/06-common-data-contracts-exposure.md)
- [7. Shared Status, Dependency, Category & Scan Semantics](00-foundation/07-shared-status-dependency-category-scan-semantics.md)

## Domain checks

- [8. DNS](01-domain-checks/08-dns.md)
- [9. Registry](01-domain-checks/09-registry.md)
- [10. SSL/TLS](01-domain-checks/10-ssl-tls.md)

## Health model

- [11. Domain Health Summary & Issues](02-health-model/11-domain-health-summary-issues.md)
- [12. Domain Health Score](02-health-model/12-domain-health-score.md)
- [13. Human-readable Messages & Localization](02-health-model/13-human-readable-messages-localization.md)

## Runtime & API

- [14. Cache & Freshness](03-runtime/14-cache-freshness.md)
- [15. Security & SSRF](03-runtime/15-security-ssrf.md)
- [16. Scan Orchestration & Execution Model](03-runtime/16-scan-orchestration-execution-model.md)
- [17. Internal Web API Contract](03-runtime/17-internal-web-api-contract.md)
- [18. Error Taxonomy & Failure Handling](03-runtime/18-error-taxonomy-failure-handling.md)

## Platform & NFR

- [19. Data Model & Persistence](04-platform/19-data-model-persistence.md)
- [20. Configuration & Policy Management](04-platform/20-configuration-policy-management.md)
- [21. Observability, Logging & Operational Monitoring](04-platform/21-observability-logging-operational-monitoring.md)
- [22. Performance, Resource Limits & NFR](04-platform/22-performance-resource-limits-nfr.md)

## Product experience

- [23. Frontend UX & Result Presentation](05-product-experience/23-frontend-ux-result-presentation.md)
- [24. SEO, Routing & Public Tool Pages](05-product-experience/24-seo-routing-public-tool-pages.md)
- [25. Privacy, Data Protection & Abuse Boundaries](05-product-experience/25-privacy-data-protection-abuse-boundaries.md)

## Quality & operations

- [26. Testing, Quality Gates & Acceptance Strategy](06-quality-operations/26-testing-quality-gates-acceptance-strategy.md)
- [27. Deployment, Environments & Release Management](06-quality-operations/27-deployment-environments-release-management.md)
- [28. Product Analytics & Success Metrics](06-quality-operations/28-product-analytics-success-metrics.md)

## Appendices

- [Appendix A. Normative Ownership Map](appendices/A-normative-ownership-map.md)
- [Appendix B. Consolidation Invariants](appendices/B-consolidation-invariants.md)
