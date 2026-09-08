# 11. Domain Health Summary & Issues

§11 является нормативным владельцем Issue aggregation, Summary, Confidence и verdict semantics.

## 11.1. Issue

```text
Issue {
  issueId
  category: dns | registry | tls
  severity: critical | warning | informational
  primaryCheckId
  relatedCheckIds[]
  message: MessageDescriptor
}
```

Issue создаётся только из FAIL checks.

## 11.2. Aggregation

Один root defect → один Issue и один Score penalty.

MVP aggregation только внутри одной category. Cross-category aggregation запрещена configuration validation.

Issue severity = maximum severity среди включённых FAIL checks.

## 11.3. Summary

```text
DomainHealthSummary {
  state: PROVISIONAL | FINAL
  verdictCode?
  score?
  confidence
  issueCounts
  issues[]
  categories[]
  generatedAt
}
```

## 11.4. Confidence

```text
confidence {
  level: HIGH | REDUCED
  unknownChecksCount
  affectedCategories[]
}
```

`affectedCategories` ровно categories с `completeness=PARTIAL`.

## 11.5. Verdicts

```text
HEALTHY
RECOMMENDATIONS
PROBLEMS
CRITICAL_PROBLEM
NO_CONFIRMED_ISSUES_INCOMPLETE
```

Rules:

- no Issues + HIGH → HEALTHY;
- informational only → RECOMMENDATIONS;
- warning exists, no critical → PROBLEMS;
- any critical → CRITICAL_PROBLEM;
- no Issues + REDUCED → NO_CONFIRMED_ISSUES_INCOMPLETE.

Confirmed Issues не скрываются Reduced Confidence.

## 11.6. Acceptance Criteria

- **AC-11.1** Issue создаётся только из FAIL.
- **AC-11.2** UNKNOWN/N/A не создают Issue.
- **AC-11.3** Cross-category Issue aggregation запрещена.
- **AC-11.4** One root defect даёт one Issue.
- **AC-11.5** HIGH iff visible UNKNOWN отсутствуют.
- **AC-11.6** No Issues + REDUCED не даёт HEALTHY.
- **AC-11.7** `score=100 + REDUCED` допустим и не означает HEALTHY автоматически.

---
