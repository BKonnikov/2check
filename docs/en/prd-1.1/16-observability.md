# 16. Observability and Analytics

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/16-observability.md)
<!-- nav:end -->

[§16](16-observability.md#16-observability-and-analytics) defines what the `email` category adds to logs, metrics and analytics. The responsible sections are [1.0 §21](../prd/21-observability-logging-operational-monitoring.md#21-observability-logging-and-monitoring) and [1.0 §28](../prd/28-product-analytics-success-metrics.md#28-product-analytics-and-usage-metrics); the boundaries of analytics are not widened here.

## 16.1. What Analytics Gains

The enumeration of tools gains one value:

```text
tool: home | dns | registry | tls | email
```

Domain policy, key availability, and encryption support are not sent to analytics. The analytics defined in [1.0 §28](../prd/28-product-analytics-success-metrics.md#28-product-analytics-and-usage-metrics) measures service use without collecting characteristics of the domains being checked.

## 16.2. What Is Additionally Forbidden

The list in [1.0 §28](../prd/28-product-analytics-success-metrics.md#28-product-analytics-and-usage-metrics) gains, as values that are not sent:

- the names and addresses of mail hosts;
- a selector entered by the user;
- the values of policy tags.

The entered selector belongs to the user's request. Excluding it avoids an additional link between an analytics event and the domain being checked.

## 16.3. Metrics

The metrics of [1.0 §21](../prd/21-observability-logging-operational-monitoring.md#21-observability-logging-and-monitoring) gain:

| Metric | What it counts |
|---|---|
| `email_smtp_probe_total` | encryption probes, by outcome |
| `email_smtp_probe_blocked_total` | probes rejected by the safety validation |
| `email_dkim_selector_unknown_total` | checks that finished without finding a key |

The unknown-selector metric counts DKIM searches that found no key. It is considered alongside the total check count when assessing selector-configuration coverage — [§5](05-dkim.md#5-dkim).

## 16.4. Logs

The rules of [1.0 §21](../prd/21-observability-logging-operational-monitoring.md#21-observability-logging-and-monitoring) apply unchanged. The names and addresses of mail hosts are permitted in logs: a log is an internal diagnostic instrument with restricted access, not analytics. A selector entered by the user is not written to logs.

## 16.5. Acceptance Criteria

- **AC-16.1** The enumeration of tools in analytics gains the value `email`.
- **AC-16.2** The results of the category's checks are not sent to analytics.
- **AC-16.3** The names and addresses of mail hosts and the values of policy tags are not sent to analytics.
- **AC-16.4** A selector entered by the user is neither sent to analytics nor written to logs.
- **AC-16.5** The metrics in [§16.3](16-observability.md#163-metrics) are defined and are incremented on the corresponding events.

---
