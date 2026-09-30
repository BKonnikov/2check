# 17. Observability and Analytics

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/17-observability.md)
<!-- nav:end -->

§17 defines what the `email` category adds to logs, metrics and analytics. The responsible sections are 1.0 §21 and 1.0 §28; the boundaries of analytics are not widened here.

## 17.1. What Analytics Gains

The enumeration of tools gains one value:

```text
tool: home | dns | registry | tls | email
```

Nothing else. None of the new quantities — a domain's policy, whether a key exists, a listing, support for encryption — is sent to analytics.

The reason is not caution but that those quantities belong to a particular domain. The analytics of 1.0 §28 answers how much the service is used, not what the checked domains hold, and the ban on domains in events would stop working if a sufficiently detailed portrait of the domain travelled alongside the event.

## 17.2. What Is Additionally Forbidden

The list in 1.0 §28 gains, as values that are not sent:

- the names and addresses of mail hosts;
- a selector entered by the reader;
- the names of lists holding an address;
- the values of policy tags.

The selector matters: it is typed by a reader, and together with the time of an event it would narrow the set of checked domains to a handful.

## 17.3. Metrics

The metrics of 1.0 §21 gain:

| Metric | What it counts |
|---|---|
| `email_smtp_probe_total` | encryption probes, by outcome |
| `email_smtp_probe_blocked_total` | probes rejected by the safety validation |
| `email_dnsbl_query_total` | queries to lists, by outcome |
| `email_dnsbl_refused_total` | refusals by lists to serve a query |
| `email_dkim_selector_unknown_total` | checks that finished without finding a key |

The last two are working instruments rather than decoration. Rising refusals mean we have left the bounds of permitted use and our answers are losing their meaning — §9. Rising unknown selectors show what share of readers the provider-to-selector mapping fails, which is when it is time to extend the configuration — §5.

## 17.4. Logs

The rules of 1.0 §21 apply unchanged. The names and addresses of mail hosts are permitted in logs: a log is an internal diagnostic instrument with restricted access, not analytics. A selector entered by the reader is not written to logs.

## 17.5. Acceptance Criteria

- **AC-17.1** The enumeration of tools in analytics gains the value `email`.
- **AC-17.2** The results of the category's checks are not sent to analytics.
- **AC-17.3** The names and addresses of mail hosts, the names of lists and the values of policy tags are not sent to analytics.
- **AC-17.4** A selector entered by the reader is neither sent to analytics nor written to logs.
- **AC-17.5** The metrics in §17.3 are defined and are incremented on the corresponding events.
- **AC-17.6** Refusals by lists to serve a query are counted by a metric of their own.

---
