# 17. Internal Web API Contract

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/17-internal-web-api-contract.md)
<!-- nav:end -->

§17 defines the API between the MVP browser frontend and backend. The Phase 3 public API is outside this contract.

## 17.1. Endpoints

```text
POST /api/web/v1/scans
GET  /api/web/v1/scans/{scanId}
GET  /api/web/v1/scans/{scanId}/details
GET  /api/web/v1/scans/{scanId}/registry/registrant
```

## 17.2. Scan Creation — CreateScanRequest

```text
CreateScanRequest {
  input
  mode: FULL | PARTIAL
  selectedCategories?: (dns | registry | tls)[]
  cacheMode?: NORMAL | FORCE_REFRESH
}
```

The default is `cacheMode=NORMAL`.

For FULL, `selectedCategories` is omitted. PARTIAL accepts a non-empty proper subset of `{dns, registry, tls}`. When all three categories are selected, the client must send `mode=FULL`. If the server receives `mode=PARTIAL` with all three categories, it rejects the invalid scope with HTTP `422`. Silent normalization to FULL is prohibited.

## 17.3. Acceptance Response — CreateScanResponse

```text
CreateScanResponse {
  scanId
  executionState: PENDING | RUNNING
  pollAfterMs?
}
```

`POST /scans` **acknowledges acceptance** and is not a terminal result endpoint.

Canonical client model:

```text
POST /scans
→ acceptance + scanId

GET /scans/{scanId}
→ authoritative current state
→ PENDING | RUNNING | COMPLETED | FAILED
```

Even a complete compatible cache hit does not return COMPLETED/FAILED in CreateScanResponse. A scan may finish between the POST response being formed and the first GET; this timing race is permitted.

## 17.4. Web API Error — WebApiError

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

Web API errorCode and check `reasonCode` belong to separate namespaces.

## 17.5. Scan Response — WebScanResponse

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

The public CanonicalDomain projection excludes `originalInput`.

`categories[]` always matches `ScanPlan.visibleCategories`.

## 17.6. Retryability in the CheckResult Projection

The browser projection supports:

```text
retryability?: RETRYABLE | CONDITIONAL | NOT_RETRYABLE
retryAfterSeconds?
```

The value is determined by the backend failure policy in §18. The client does not infer retryability from `reasonCode`.

A dependency-driven result with `blockedBy` is not assigned an artificial retryability value of its own.

## 17.7. HTTP Status Semantics

- 200 — reading an existing scan, regardless of its domain health verdict;
- 202 — scan accepted;
- 400 — malformed input or input validation error;
- 403 — gated access denied;
- 404 — scan unknown or retention expired;
- 413 — request payload too large;
- 415 — media type error;
- 422 — invalid scan scope;
- 429 — web API rate limit;
- 500 — request-level platform failure outside the normal scan lifecycle;
- 503 — a scan cannot be accepted safely.

A provider's 429 response within a scan produces an UNKNOWN check; the scan GET retains HTTP 200.

## 17.8. Refresh

A refresh creates a new `POST /scans` with FORCE_REFRESH. PATCH of an existing scan is not supported.

## 17.9. Security Restrictions

The client cannot submit arbitrary IP addresses, resolvers, providers, ports, skipSSRF, or network parameters.

Unknown top-level creation fields are rejected; enumeration values are validated strictly.

## 17.10. Acceptance Criteria

- **AC-17.1** POST returns only PENDING/RUNNING acceptance states.
- **AC-17.2** The authoritative terminal state and result are available only through GET.
- **AC-17.3** A cache hit does not change the POST→GET model.
- **AC-17.4** HTTP status does not encode domain health.
- **AC-17.5** Visible categories exclude internal prerequisites.
- **AC-17.6** Retryability is determined by the backend and supplied in the projection.
- **AC-17.7** Gated sensitive registration data has a separate endpoint.
- **AC-17.8** There is no raw RDAP/WHOIS endpoint.
- **AC-17.9** A refresh creates a new scanId.
- **AC-17.10** Users cannot override network or security policy.
- **AC-17.11** `PARTIAL` with `dns+registry+tls` is rejected with HTTP 422 and is not silently normalized to FULL.

---
