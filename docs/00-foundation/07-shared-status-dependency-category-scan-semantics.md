# 7. Shared Status, Dependency, Category & Scan Semantics

## 7.1. Status

```text
PASS | FAIL | UNKNOWN | NOT_APPLICABLE
```

- `PASS` — применимо, результат определён, условие выполнено.
- `FAIL` — применимо, результат определён, подтверждено отрицательное target condition.
- `UNKNOWN` — применимо, но technical result определить невозможно.
- `NOT_APPLICABLE` — отсутствует объект/контекст проверки.

## 7.2. Severity

```text
critical | warning | informational | none
```

`FAIL + severity=none` запрещён configuration validation.

## 7.3. reasonCode vs blockedBy

`reasonCode` разрешён только для `UNKNOWN`, вызванного собственной technical reason check.

Dependency-caused result использует `blockedBy` и не получает собственный `reasonCode`.

`reasonCode` и `blockedBy` mutually exclusive.


## 7.4. CategoryResult

```text
CategoryResult {
  category
  status
  severity
  completeness: COMPLETE | PARTIAL
  checks[]
}
```

Aggregation status priority:

```text
FAIL > UNKNOWN > PASS > NOT_APPLICABLE
```

`completeness = PARTIAL` iff хотя бы один child `UNKNOWN`.

N/A не снижает completeness.

Category severity = maximum severity среди FAIL children; если FAIL отсутствует — `none`.

## 7.5. ScanResult base

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

- **AC-7.1** Только FAIL создаёт confirmed target problem.
- **AC-7.2** UNKNOWN не получает Score penalty.
- **AC-7.3** N/A не уменьшает Confidence.
- **AC-7.4** `reasonCode` и `blockedBy` не присутствуют вместе.
- **AC-7.5** Category completeness PARTIAL iff child UNKNOWN существует.
- **AC-7.6** Category severity определяется только FAIL children.

---
