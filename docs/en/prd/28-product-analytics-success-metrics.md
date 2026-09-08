# 28. Product Analytics and Usage Metrics

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/28-product-analytics-success-metrics.md)
<!-- nav:end -->

§28 defines product usage analytics. Operational observability remains within §21.

## 28.1. Separation of Responsibilities

Product analytics describes how people use the product.

Observability describes how the platform operates technically.

The domain FAIL rate is not a platform quality KPI.

## 28.2. Core Events

```text
scan_form_viewed
scan_submitted
scan_accepted
scan_result_viewed
technical_details_opened
refresh_clicked
retry_clicked
share_clicked
locale_changed
```

Optional events:

```text
share_completed
share_image_saved
```

These are used when the browser API can determine the action's outcome reliably.

## 28.3. Allowed Dimensions

Bounded sets of values are used:

- locale: ru/uz/en;
- tool: home/dns/registry/tls;
- mode: FULL/PARTIAL;
- the selected category set as a bounded enumeration;
- executionOutcome: COMPLETED/FAILED;
- an optional aggregate verdictCode.

## 28.4. Data Excluded from Default Analytics

The following are not sent:

- domain;
- scanId;
- originalInput;
- registration PII;
- IP address;
- certificate fingerprint;
- DNS values.

A scan page is tracked as a route template rather than its actual scanId URL.

The analytics service is not a mandatory runtime dependency; its failure does not affect scans.

## 28.5. Usage Funnel

```text
scan_form_viewed
→ scan_submitted
→ scan_accepted
→ scan_result_viewed
```

Recommended primary metrics:

```text
completed_result_rate
FULL vs PARTIAL usage
technical_details_open_rate
share_action_rate
refresh_rate
returning_session_rate
```

Retry and refresh rates are interpreted alongside observability rather than as independent quality judgments.

## 28.6. Privacy

An anonymous session identifier is permitted for aggregate funnel and return analysis, but is not an account or a persistent cross-service identity.

A submitted domain is not used as a marketing or audience attribute by default.

Image sharing does not create a recipient or view analytics entity.

## 28.7. Acceptance Criteria

- **AC-28.1** Product analytics and observability are separate.
- **AC-28.2** The core scan funnel is measurable.
- **AC-28.3** Domain, scanId, originalInput, and personal data are absent from default analytics dimensions.
- **AC-28.4** The client does not infer a retry event from reasonCode.
- **AC-28.5** Sharing analytics does not track recipients or destinations.
- **AC-28.6** Analytics failure does not affect domain health execution.
- **AC-28.7** Return analysis does not require domain history.
- **AC-28.8** Client-side experiments do not alter score, severity, or verdict semantics.

---
