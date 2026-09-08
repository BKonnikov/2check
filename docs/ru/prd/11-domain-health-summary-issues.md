# 11. Сводка технического здоровья и выявленные проблемы

<!-- nav:start -->
[Концепция](../01-concept.md) · [Оглавление PRD](../02-prd.md) · [English](../../en/prd/11-domain-health-summary-issues.md)
<!-- nav:end -->

§11 определяет объединение проблем, общую сводку, уверенность в результате и правила формирования вердикта.

## 11.1. Проблема — Issue

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

Issue создаётся только из проверок со статусом FAIL.

## 11.2. Объединение проблем

Один корневой дефект соответствует одному Issue и одному штрафу к оценке.

В MVP объединение допускается только внутри одной категории. Объединение между категориями отклоняется при проверке конфигурации.

Серьёзность Issue равна максимальной серьёзности включённых проверок FAIL.

## 11.3. Сводка

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

## 11.4. Уверенность в результате

```text
confidence {
  level: HIGH | REDUCED
  unknownChecksCount
  affectedCategories[]
}
```

`affectedCategories` содержит в точности категории с `completeness=PARTIAL`.

## 11.5. Вердикты

```text
HEALTHY
RECOMMENDATIONS
PROBLEMS
CRITICAL_PROBLEM
NO_CONFIRMED_ISSUES_INCOMPLETE
```

Применяются следующие правила:

- нет проблем и уверенность HIGH → HEALTHY;
- присутствуют только informational → RECOMMENDATIONS;
- есть warning, нет critical → PROBLEMS;
- есть хотя бы один critical → CRITICAL_PROBLEM;
- нет проблем и уверенность REDUCED → NO_CONFIRMED_ISSUES_INCOMPLETE.

Сниженная уверенность не скрывает подтверждённые проблемы.

## 11.6. Критерии приёмки

- **AC-11.1** Issue создаётся только из FAIL.
- **AC-11.2** UNKNOWN/N/A не создают Issue.
- **AC-11.3** Объединение Issue между категориями запрещено.
- **AC-11.4** Один корневой дефект создаёт один Issue.
- **AC-11.5** HIGH устанавливается тогда и только тогда, когда среди видимых результатов нет UNKNOWN.
- **AC-11.6** Отсутствие проблем при REDUCED не даёт HEALTHY.
- **AC-11.7** `score=100 + REDUCED` допустим и не означает HEALTHY автоматически.

---
