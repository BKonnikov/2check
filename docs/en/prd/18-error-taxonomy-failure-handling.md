# 18. Error Classification and Failure Handling

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/18-error-taxonomy-failure-handling.md)
<!-- nav:end -->

§18 defines error layers, reasons, retryability, and failure normalization.

## 18.1. Error Layers

1. Input error — before a scan, without a scanId.
2. Web API error — at request level.
3. Technical check uncertainty — UNKNOWN with reasonCode/blockedBy.
4. Scan execution failure — FAILED when a trustworthy final result is impossible.

A target problem produces FAIL. Technical inability to check produces UNKNOWN.

## 18.2. The reasonCode Rule

`reasonCode` is allowed only on UNKNOWN with the check's own technical execution cause.

`reasonCode` is absent from PASS/FAIL/N/A.

A dependency-driven UNKNOWN uses only `blockedBy`.

## 18.3. Retryability

```text
RETRYABLE | CONDITIONAL | NOT_RETRYABLE
```

The mapping from a code to retryability is defined by the backend failure policy.

Examples:

- provider_unavailable → usually RETRYABLE;
- rate_limited → CONDITIONAL;
- provider_not_supported → NOT_RETRYABLE.

The client does not maintain a separate parallel mapping.

## 18.4. Timeout Semantics

A timeout does not always mean UNKNOWN.

- a DNS provider timeout may be absorbed by quorum aggregation;
- exhausted registration provider timeouts → UNKNOWN/timeout;
- a validated target TCP or handshake timeout → TLS connectivity FAIL;
- an internal scanner network failure after ALLOW → UNKNOWN/internal_network_error;
- incomplete security processing before a network attempt → UNKNOWN/security_validation_incomplete;
- the global scan deadline expires → UNKNOWN/scan_deadline_exceeded.

## 18.5. Provider or Source Technical Errors

`malformed_response`, `parse_error`, `encoding_error`, and `protocol_error` do not imply that the target is absent.

`module_execution_error` is a generic fallback used only when no more precise code applies.

Raw exception strings are not used as stable reasonCode values.

## 18.6. Scan Failure Catalog

The canonical catalog in §16 is used without additional duplicates.

## 18.7. Acceptance Criteria

- **AC-18.1** A target problem and technical inability to check are distinguished as FAIL and UNKNOWN.
- **AC-18.2** reasonCode is present only on UNKNOWN with the check's own cause.
- **AC-18.3** blockedBy and reasonCode are mutually exclusive.
- **AC-18.4** Retryability is determined by the backend and configuration.
- **AC-18.5** provider_not_supported has NOT_RETRYABLE retryability.
- **AC-18.6** Timeout classification depends on the execution stage.
- **AC-18.7** Raw exceptions are normalized into stable codes.
- **AC-18.8** A generic fallback is not used when a precise reason is available.

---
