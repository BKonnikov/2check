# 18. Error Taxonomy & Failure Handling

§18 является нормативным владельцем error layers, reason/retry semantics и failure normalization.

## 18.1. Error layers

1. Input Error — до scan, no scanId.
2. Web API Error — request-level.
3. Check Technical Uncertainty — UNKNOWN reasonCode/blockedBy.
4. Scan Execution Failure — FAILED if trustworthy final result impossible.

Target problem → FAIL. Technical inability → UNKNOWN.

## 18.2. reasonCode rule

`reasonCode` только на UNKNOWN с own technical execution cause.

Нет `reasonCode` на PASS/FAIL/N/A.

Dependency UNKNOWN использует только `blockedBy`.

## 18.3. Retryability

```text
RETRYABLE | CONDITIONAL | NOT_RETRYABLE
```

Backend Failure Policy является owner mapping code → retryability.

Examples:

- provider_unavailable → обычно RETRYABLE;
- rate_limited → CONDITIONAL;
- provider_not_supported → NOT_RETRYABLE.

Frontend не хранит parallel mapping.

## 18.4. Timeout semantics

Timeout не означает universal UNKNOWN.

- DNS provider timeout может быть absorbed quorum aggregation;
- Registry exhausted provider timeout → UNKNOWN/timeout;
- validated target TCP/handshake timeout → TLS connectivity FAIL;
- scanner internal network error after ALLOW → UNKNOWN/internal_network_error;
- Security processing incomplete before probe → UNKNOWN/security_validation_incomplete;
- global scan deadline → UNKNOWN/scan_deadline_exceeded.

## 18.5. Provider/source technical errors

`malformed_response`, `parse_error`, `encoding_error`, `protocol_error` не означают target absence.

`module_execution_error` — generic fallback только если более precise code отсутствует.

Raw exception strings не используются как stable reasonCode.

## 18.6. Scan failure catalog

Canonical §16 catalog используется без дополнительных дубликатов.

## 18.7. Acceptance Criteria

- **AC-18.1** Target problem и technical inability различаются FAIL vs UNKNOWN.
- **AC-18.2** reasonCode только на own UNKNOWN.
- **AC-18.3** blockedBy и reasonCode mutually exclusive.
- **AC-18.4** Retryability backend/config-owned.
- **AC-18.5** provider_not_supported NOT_RETRYABLE.
- **AC-18.6** Timeout classification stage-specific.
- **AC-18.7** Raw exceptions normalize to stable codes.
- **AC-18.8** Generic fallback не используется при наличии precise reason.

---
