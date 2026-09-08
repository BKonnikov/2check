# 2. MVP Scope & Roadmap

## 2.1. MVP 1.0

В MVP 1.0 входят:

- preprocessing / IDN pipeline;
- CanonicalDomain;
- DNS resolver comparison;
- Registry через `registryProvider`;
- SSL/TLS fixed checks;
- Domain Health Summary;
- status / severity / dependency model;
- Issue aggregation;
- Domain Health Score и Confidence;
- Redis cache;
- SSRF protection;
- Web UI и Internal Web API;
- RU / UZ / EN.

## 2.2. MVP 1.1

**Email Health**:

- SPF;
- DMARC;
- DKIM;
- MX;
- STARTTLS;
- PTR;
- blacklist проверки принимающего mail server.

Email Health не входит в MVP 1.0 даже частично.

## 2.3. Phase 2

- true geo-distributed DNS;
- Ping / Traceroute;
- HTTP headers / redirect chain;
- Domain reputation;
- Homograph / IDN spoof detector;
- deep SEO repair guides.

## 2.4. Phase 3

- Telegram bot;
- Public API;
- SSE-based complex scan;
- Port scanner;
- Uptime monitoring.

## 2.5. Acceptance Criteria

- **AC-2.1** Email Health отсутствует в MVP 1.0.
- **AC-2.2** HTTP checker, reputation, port scanner и uptime monitoring отсутствуют в MVP 1.0.
- **AC-2.3** True geo DNS не заявляется как возможность MVP resolver comparison.
- **AC-2.4** Новый check не включается в MVP без явного изменения scope.

---
