# 21. Observability, Logging, and Monitoring

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/21-observability-logging-operational-monitoring.md)
<!-- nav:end -->

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
