# 21. Observability, Logging & Operational Monitoring

§21 является единственным normative owner metric naming/structure, logging, readiness and alerting semantics.

## 21.1. Platform vs Domain Health

Observability отвечает «работает ли 2check», Domain Health — «что с target».

Domain FAIL не является platform ERROR автоматически.

## 21.2. Correlation

```text
requestId
→ scanId
→ moduleExecutionId?
→ operationId?
```

Single-flight shared work может иметь один moduleExecutionId для нескольких scanId.

## 21.3. Structured logs

Stable bounded event names; no user-controlled event names.

Standard logs не содержат:

- originalInput/path/query;
- Authorization/Cookie/session secrets;
- registrant PII;
- raw RDAP/WHOIS body;
- internal denylist values.

## 21.4. Metrics naming ownership

Имена в ранних sections считаются signal requirements, а точный naming принадлежит §21.

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

Counters используют `_total` convention.

## 21.5. Cardinality

Запрещены unrestricted labels:

- hostname;
- IP;
- scanId;
- requestId;
- fingerprint;
- internal CIDR.

## 21.6. Readiness

Not ready при невозможности безопасно принять scan, например:

- invalid/missing Security Policy;
- invalid/missing mandatory trust store;
- mandatory Scan Store unavailable/incompatible.

External RDAP/WHOIS/DNS provider outage сам по себе не делает весь instance unready.

Redis outage может быть DEGRADED, если safe bypass сохраняет correctness.

## 21.7. Alerts

Alert candidates:

- Web API 5xx/503 growth;
- Scan FAILED growth;
- Scan Store failures;
- config/security activation/drift;
- internal security validation errors;
- provider/rate-limit spikes;
- abnormal latency/resource saturation.

Domain FAIL rate не является default pager signal.

## 21.8. Acceptance Criteria

- **AC-21.1** Observability и Domain Health разделены.
- **AC-21.2** §21 canonicalizes metric names.
- **AC-21.3** Logs structured и redacted.
- **AC-21.4** High-cardinality target values не metric labels.
- **AC-21.5** External provider outage не обязательно blocks readiness.
- **AC-21.6** Invalid Security Policy blocks readiness.
- **AC-21.7** Domain FAIL не логируется ERROR только из-за FAIL status.
- **AC-21.8** Historical diagnostics используют versions конкретного scan.

---
