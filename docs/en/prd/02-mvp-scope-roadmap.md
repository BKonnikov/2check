# 2. MVP Scope and Roadmap

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/02-mvp-scope-roadmap.md)
<!-- nav:end -->

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
