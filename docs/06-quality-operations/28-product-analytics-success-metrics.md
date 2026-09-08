# 28. Product Analytics & Success Metrics

§28 является normative owner product usage analytics. Operational observability остаётся §21.

## 28.1. Separation

Product Analytics отвечает «как пользователи используют продукт».

Observability отвечает «как технически работает платформа».

Domain FAIL rate не является platform-quality KPI.

## 28.2. Core events

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

Optional:

```text
share_completed
share_image_saved
```

если browser API позволяет достоверно определить outcome.

## 28.3. Allowed dimensions

Bounded:

- locale: ru/uz/en;
- tool: home/dns/registry/tls;
- mode: FULL/PARTIAL;
- selected category set как bounded enum;
- executionOutcome COMPLETED/FAILED;
- optional aggregate verdictCode.

## 28.4. Forbidden default analytics data

Не передаются:

- domain;
- scanId;
- originalInput;
- Registry PII;
- IP;
- certificate fingerprint;
- DNS values.

Scan page tracked как route template, не actual scanId URL.

Analytics backend не mandatory runtime dependency и его failure не влияет на scan.

## 28.5. Funnel

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

Retry/Refresh rates интерпретируются совместно с Observability, а не как самостоятельный quality verdict.

## 28.6. Privacy

Anonymous session identity допустим для aggregate funnel/return analysis, но не является account/persistent cross-service identity.

User-entered domain не используется как marketing/audience attribute по умолчанию.

Image-only Share не создаёт recipient/view analytics entity.

## 28.7. Acceptance Criteria

- **AC-28.1** Product Analytics и Observability разделены.
- **AC-28.2** Core scan funnel измерим.
- **AC-28.3** domain/scanId/originalInput/PII отсутствуют в default analytics dimensions.
- **AC-28.4** Retry event не infer'ится frontend из reasonCode.
- **AC-28.5** Share analytics не отслеживает recipient/destination.
- **AC-28.6** Analytics failure не влияет на Domain Health execution.
- **AC-28.7** Return usage не требует domain history.
- **AC-28.8** Client-side experiments не изменяют Health Score/severity/verdict semantics.

---
