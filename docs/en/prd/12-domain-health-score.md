# 12. Domain Health Score

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/12-domain-health-score.md)
<!-- nav:end -->

§12 defines the numerical scoring rules.

## 12.1. Applicability

A score exists only for `FULL + FINAL`.

## 12.2. Formula

```text
score = max(0, 100 - sum(issuePenalty))
```

The score is calculated from deduplicated Issues rather than raw FAIL checks.

## 12.3. Recommended Default Penalties

```text
critical      -25
warning        -8
informational  -2
```

The values are defined by configuration.

## 12.4. States Without a Penalty

PASS, UNKNOWN, NOT_APPLICABLE → a penalty of 0.

Reduced confidence does not lower the numerical score.

## 12.5. Score Details — ScoreBreakdown

```text
ScoreBreakdown {
  baseScore
  penalties[]
  totalPenalty
  finalScore
}

ScorePenalty {
  issueId
  severity
  points
}
```

## 12.6. Versioning

A historical ScanResult preserves its original `healthPolicyVersion` and score. A new policy does not recalculate an earlier scan.

## 12.7. Acceptance Criteria

- **AC-12.1** A score is available only for FULL FINAL.
- **AC-12.2** The score is calculated from Issues.
- **AC-12.3** UNKNOWN/N/A receive no penalty.
- **AC-12.4** The score floor is 0.
- **AC-12.5** Reduced confidence does not change the numerical score.
- **AC-12.6** Historical scores are immutable.

---
