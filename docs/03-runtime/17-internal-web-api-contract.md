# 17. Internal Web API Contract

§17 является нормативным владельцем browser frontend ↔ backend MVP API. Это не Phase-3 Public API.

## 17.1. Endpoints

```text
POST /api/web/v1/scans
GET  /api/web/v1/scans/{scanId}
GET  /api/web/v1/scans/{scanId}/details
GET  /api/web/v1/scans/{scanId}/registry/registrant
```

## 17.2. CreateScanRequest

```text
CreateScanRequest {
  input
  mode: FULL | PARTIAL
  selectedCategories?: (dns | registry | tls)[]
  cacheMode?: NORMAL | FORCE_REFRESH
}
```

Default `cacheMode=NORMAL`.

FULL → `selectedCategories` omitted. PARTIAL → strict non-empty proper subset of `{dns, registry, tls}`. Frontend при выборе всех трёх categories обязан отправлять `mode=FULL`. Если backend всё же получает `mode=PARTIAL` со всеми тремя categories, request отклоняется как invalid scope: HTTP `422`; silent normalization в FULL запрещена.

## 17.3. CreateScanResponse

```text
CreateScanResponse {
  scanId
  executionState: PENDING | RUNNING
  pollAfterMs?
}
```

`POST /scans` является **acceptance boundary**, а не terminal result endpoint.

Canonical client model:

```text
POST /scans
→ acceptance + scanId

GET /scans/{scanId}
→ authoritative current state
→ PENDING | RUNNING | COMPLETED | FAILED
```

Даже full compatible cache hit не возвращает COMPLETED/FAILED в CreateScanResponse. Scan может фактически завершиться между формированием POST response и первым GET; это допустимая race condition.

## 17.4. WebApiError

```text
WebApiError {
  errorCode
  message: MessageDescriptor
  field?
  retryable: boolean
  retryAfterSeconds?
  requestId?
}
```

Web API errorCode и Check `reasonCode` — разные namespaces.

## 17.5. WebScanResponse

```text
WebScanResponse {
  scanId
  executionState
  mode
  canonicalDomain
  selectedCategories[]
  progress?
  categories[]
  summary?
  startedAt
  completedAt?
  pollAfterMs?
  failure?
}
```

Public CanonicalDomain projection не включает `originalInput`.

`categories[]` всегда соответствует `ScanPlan.visibleCategories`.

## 17.6. CheckResult projection retryability

Browser projection поддерживает:

```text
retryability?: RETRYABLE | CONDITIONAL | NOT_RETRYABLE
retryAfterSeconds?
```

Value определяется backend Failure Policy §18. Frontend не выводит retryability из `reasonCode`.

Dependency-driven result с `blockedBy` не получает искусственную own retryability.

## 17.7. HTTP semantics

- 200 — existing scan read независимо от Health verdict;
- 202 — scan accepted;
- 400 — malformed/input validation;
- 403 — gated denied;
- 404 — scan unknown/expired;
- 413 — payload too large;
- 415 — media type;
- 422 — invalid scope;
- 429 — Web API rate limit;
- 500 — request-level platform failure outside normal scan lifecycle;
- 503 — cannot safely accept scan.

Provider 429 внутри scan → check UNKNOWN, GET scan остаётся HTTP 200.

## 17.8. Refresh

Refresh создаёт новый `POST /scans` с FORCE_REFRESH. PATCH existing scan отсутствует.

## 17.9. Security controls

Frontend не может передать arbitrary IP/resolver/provider/port/skipSSRF/network parameters.

Unknown top-level create fields rejected; enums strict.

## 17.10. Acceptance Criteria

- **AC-17.1** POST возвращает только PENDING/RUNNING acceptance state.
- **AC-17.2** Terminal state/result authoritative только через GET.
- **AC-17.3** Cache-hit не меняет POST→GET model.
- **AC-17.4** HTTP status не кодирует Domain Health.
- **AC-17.5** Visible categories не включают internal prerequisites.
- **AC-17.6** Retryability приходит backend-projected.
- **AC-17.7** Gated Registry data имеет отдельный endpoint.
- **AC-17.8** Raw RDAP/WHOIS endpoint отсутствует.
- **AC-17.9** Refresh создаёт новый scanId.
- **AC-17.10** User cannot override security/network policy.
- **AC-17.11** `PARTIAL` с `dns+registry+tls` отклоняется HTTP 422 и не normalizes silently в FULL.

---
