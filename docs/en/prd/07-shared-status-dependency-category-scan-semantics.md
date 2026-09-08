# 7. Statuses, Dependencies, and Scan Results

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/07-shared-status-dependency-category-scan-semantics.md)
<!-- nav:end -->

## 7.1. Status

```text
PASS | FAIL | UNKNOWN | NOT_APPLICABLE
```

- `PASS` — the check is applicable, the result is determined, and the condition is satisfied.
- `FAIL` — the check is applicable, the result is determined, and an adverse target condition is confirmed.
- `UNKNOWN` — the check is applicable, but its technical result cannot be determined.
- `NOT_APPLICABLE` — the object or context required by the check is absent.

## 7.2. Severity

```text
critical | warning | informational | none
```

The combination `FAIL + severity=none` is rejected during configuration validation.

## 7.3. Failure Cause and Blocking Dependency

`reasonCode` is permitted only for `UNKNOWN` caused by the check's own technical failure.

A dependency-driven result uses `blockedBy` and does not receive its own `reasonCode`.

`reasonCode` and `blockedBy` are mutually exclusive.


## 7.4. Category Result — CategoryResult

```text
CategoryResult {
  category
  status
  severity
  completeness: COMPLETE | PARTIAL
  checks[]
}
```

Results are aggregated using the following status priority:

```text
FAIL > UNKNOWN > PASS > NOT_APPLICABLE
```

`completeness = PARTIAL` if and only if at least one child check has status `UNKNOWN`.

N/A does not reduce completeness.

Category severity is the maximum severity among FAIL children; when no FAIL is present, it is `none`.

## 7.5. Base Scan Result — ScanResult

```text
ScanResult {
  scanId
  executionState
  mode
  canonicalDomain
  selectedCategories[]
  categories[]
  summary?
  executionContext
  completionReason?
  failure?
  startedAt
  completedAt?
}
```

## 7.6. Acceptance Criteria

- **AC-7.1** Only FAIL denotes a confirmed target problem.
- **AC-7.2** UNKNOWN does not incur a score penalty.
- **AC-7.3** N/A does not reduce confidence.
- **AC-7.4** `reasonCode` and `blockedBy` are not present together.
- **AC-7.5** Category completeness is PARTIAL if and only if an UNKNOWN child check exists.
- **AC-7.6** Category severity is determined only by FAIL child checks.

---
