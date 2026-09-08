# 12. Domain Health Score

§12 является нормативным владельцем numeric Score semantics.

## 12.1. Applicability

Score существует только для `FULL + FINAL`.

## 12.2. Formula

```text
score = max(0, 100 - sum(issuePenalty))
```

Score строится по deduplicated Issues, не по raw FAIL checks.

## 12.3. Default recommended penalties

```text
critical      -25
warning        -8
informational  -2
```

Значения configuration-owned.

## 12.4. No penalty states

PASS, UNKNOWN, NOT_APPLICABLE → 0 penalty.

Reduced Confidence не уменьшает numeric Score.

## 12.5. ScoreBreakdown

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

Historical ScanResult сохраняет исходный `healthPolicyVersion` и Score. Новая policy не пересчитывает старый scan.

## 12.7. Acceptance Criteria

- **AC-12.1** Только FULL FINAL имеет Score.
- **AC-12.2** Score считается по Issues.
- **AC-12.3** UNKNOWN/N/A не получают penalty.
- **AC-12.4** Score floor = 0.
- **AC-12.5** Reduced Confidence не меняет numeric Score.
- **AC-12.6** Historical Score immutable.

---
