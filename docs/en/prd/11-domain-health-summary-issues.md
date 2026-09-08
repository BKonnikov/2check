# 11. Domain Health Summary and Identified Issues

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/11-domain-health-summary-issues.md)
<!-- nav:end -->

§11 defines issue aggregation, the overall summary, confidence, and verdict rules.

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

An Issue is created only from checks with status FAIL.

## 11.2. Issue Aggregation

One root defect corresponds to one Issue and one score penalty.

In the MVP, aggregation is permitted only within one category. Cross-category aggregation is rejected during configuration validation.

Issue severity equals the maximum severity of the included FAIL checks.

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

`affectedCategories` contains exactly the categories with `completeness=PARTIAL`.

## 11.5. Verdicts

```text
HEALTHY
RECOMMENDATIONS
PROBLEMS
CRITICAL_PROBLEM
NO_CONFIRMED_ISSUES_INCOMPLETE
```

The following rules apply:

- no issues and HIGH confidence → HEALTHY;
- informational issues only → RECOMMENDATIONS;
- warning present, no critical → PROBLEMS;
- at least one critical → CRITICAL_PROBLEM;
- no issues and REDUCED confidence → NO_CONFIRMED_ISSUES_INCOMPLETE.

Reduced confidence does not hide confirmed issues.

## 11.6. Acceptance Criteria

- **AC-11.1** An Issue is created only from FAIL.
- **AC-11.2** UNKNOWN/N/A do not create an Issue.
- **AC-11.3** Cross-category Issue aggregation is prohibited.
- **AC-11.4** One root defect creates one Issue.
- **AC-11.5** HIGH applies if and only if visible results contain no UNKNOWN.
- **AC-11.6** The absence of issues with REDUCED confidence does not produce HEALTHY.
- **AC-11.7** `score=100 + REDUCED` is valid and does not automatically imply HEALTHY.

---
