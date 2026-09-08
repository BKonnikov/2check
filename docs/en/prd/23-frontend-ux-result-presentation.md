# 23. User Interface and Result Presentation

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/23-frontend-ux-result-presentation.md)
<!-- nav:end -->

§23 defines the user flow, result presentation, and result image sharing.

## 23.1. Main Flow

```text
Input
→ FULL/PARTIAL
→ RUNNING progress
→ FINAL Summary
→ Issues
→ DNS / Domain / SSL/TLS
→ Recommendations
→ Technical Details
```

## 23.2. Execution — RUNNING

States of visible categories are displayed. Hidden prerequisites do not create a user-facing DNS category in a TLS-only scan.

An exact completion percentage is not displayed unless the backend supplies a meaningful progress estimate.

Provisional Issues may be displayed, but not as a final issue count. The final numerical score is absent during RUNNING.

## 23.3. Final FULL Result Hierarchy

```text
Verdict
→ Score + Confidence
→ Issues
→ Category Cards
→ Technical Details
```

The verdict is the primary element. The client does not derive it from the numerical score.

`score=100 + REDUCED` is not presented as an unconditional assurance that everything is fine.

## 23.4. Category Labels

Primary interface labels:

```text
DNS
Domain
SSL/TLS
```

Registry/RDAP/WHOIS are used as technical terms.

## 23.5. Uncertainty and Non-applicability — UNKNOWN/N/A

UNKNOWN means that a check could not be completed, not that a domain problem is confirmed.

N/A is neutral and may be omitted from the summary; technical details may include the factual reason.

## 23.6. Technical Details

Details are obtained through `/details` using an explicit field allowlist, without administrative or internal secrets.

## 23.7. Data Freshness

`completedAt` does not replace `checkedAt`.

The age of cached data must be available. Results with different freshness are not collapsed into a misleading global timestamp.

## 23.8. Refresh and Retry

A refresh creates a new FORCE_REFRESH scan.

The retry action is based only on backend `retryability`:

- RETRYABLE → an immediate retry is permitted;
- CONDITIONAL → the interface accounts for the condition or delay;
- NOT_RETRYABLE → retry is not offered as a solution.

The client does not map reasonCode to behavior independently.

## 23.9. Result Image Sharing

A COMPLETED scan provides the action:

```text
Share
```

MVP sharing model:

```text
existing ScanResult
→ on-demand Share Card image
→ native Share Sheet
```

The fallback is saving the image.

The following are absent:

- a “Copy link” action;
- shareId/shareToken;
- a dedicated sharing URL or page;
- a QR code;
- server-side sharing history.

The result card uses only the safe public projection, without technical details, personal data, scanId, URL, or originalInput.

A FULL card may show the verdict, score, confidence, categories, and issues. A PARTIAL card shows neither a global score nor a global verdict.

## 23.10. Accessibility and Responsive Layout

Desktop and mobile devices are supported. Keyboard operation, visible focus, semantic headings, and non-color status indicators are mandatory. Technical tables may scroll horizontally within their container.

## 23.11. Acceptance Criteria

- **AC-23.1** The backend determines verdict, score, severity, confidence, and retryability.
- **AC-23.2** Internal prerequisites are hidden from the main progress view.
- **AC-23.3** PARTIAL shows neither a global score nor a global verdict.
- **AC-23.4** UNKNOWN is not displayed as a confirmed problem.
- **AC-23.5** Caching and differences in freshness are presented accurately.
- **AC-23.6** Retry uses backend-projected retryability.
- **AC-23.7** Sharing is image-only; no sharing-link entity exists.
- **AC-23.8** The card contains no personal data, scanId, URL, QR code, or internal data.
- **AC-23.9** Supported flows are keyboard accessible and use non-color indicators.

---
