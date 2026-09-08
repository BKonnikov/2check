# 23. Frontend UX & Result Presentation

§23 является normative owner пользовательского flow/presentation и Share Result.

## 23.1. Main flow

```text
Input
→ FULL/PARTIAL
→ RUNNING progress
→ FINAL Summary
→ Issues
→ DNS / Домен / SSL/TLS
→ Recommendations
→ Technical Details
```

## 23.2. RUNNING

Показываются states visible categories. Hidden prerequisites не создают user-facing DNS category в TLS-only scan.

No fake exact percentage, если backend не даёт meaningful progress.

Provisional Issues могут показываться, но не как final total. Final Score во время RUNNING отсутствует.

## 23.3. FINAL FULL hierarchy

```text
Verdict
→ Score + Confidence
→ Issues
→ Category Cards
→ Technical Details
```

Verdict primary. Frontend не выводит verdict из Score.

`score=100 + REDUCED` не показывается как unconditional «всё отлично».

## 23.4. Category labels

Primary UI:

```text
DNS
Домен
SSL/TLS
```

Registry/RDAP/WHOIS — technical terminology.

## 23.5. UNKNOWN/N/A

UNKNOWN — «не удалось проверить», не confirmed domain problem.

N/A neutral и может быть hidden в summary; Technical Details может показать factual reason.

## 23.6. Technical Details

Получаются через `/details`; explicit allowlist; no admin/internal secrets.

## 23.7. Freshness

`completedAt` не заменяет `checkedAt`.

Cached age должен быть доступен; mixed freshness не схлопывается в false global timestamp.

## 23.8. Refresh/Retry

Refresh → new FORCE_REFRESH scan.

Retry CTA основывается только на backend `retryability`:

- RETRYABLE → immediate retry допустим;
- CONDITIONAL → conditional/delayed UX;
- NOT_RETRYABLE → retry не показывается как solution.

Frontend не map'ит reasonCode самостоятельно.

## 23.9. Share Result

Для COMPLETED scan action:

```text
Поделиться
```

MVP share model:

```text
existing ScanResult
→ on-demand Share Card image
→ native Share Sheet
```

Fallback — save image.

Нет:

- «Скопировать ссылку»;
- shareId/shareToken;
- dedicated share URL/page;
- QR code;
- server-side share history.

Share Card использует только Safe Public Projection, без Technical Details/PII/scanId/URL/originalInput.

FULL card может показывать verdict/Score/Confidence/categories/issues. PARTIAL card не показывает global Score/verdict.

## 23.10. Accessibility/responsive

Desktop/mobile supported. Keyboard/focus/semantic headings/non-color status signals mandatory. Technical tables могут иметь bounded horizontal scrolling внутри container.

## 23.11. Acceptance Criteria

- **AC-23.1** Backend authoritative для verdict/score/severity/confidence/retryability.
- **AC-23.2** Internal prerequisites hidden из main progress.
- **AC-23.3** PARTIAL не показывает global Score/verdict.
- **AC-23.4** UNKNOWN не отображается как confirmed problem.
- **AC-23.5** Cached/mixed freshness отображается честно.
- **AC-23.6** Retry CTA использует backend retryability.
- **AC-23.7** Share image-only, без share link entity.
- **AC-23.8** Share Card не содержит PII/scanId/URL/QR/internal data.
- **AC-23.9** Supported UX accessible keyboard/non-color semantics.

---
