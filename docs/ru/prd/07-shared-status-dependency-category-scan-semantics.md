# 7. Статусы, зависимости и результаты сканирования

<!-- nav:start -->
[Концепция](../01-concept.md) · [Оглавление PRD](../02-prd.md) · [English](../../en/prd/07-shared-status-dependency-category-scan-semantics.md)
<!-- nav:end -->

## 7.1. Статус

```text
PASS | FAIL | UNKNOWN | NOT_APPLICABLE
```

- `PASS` — проверка применима, результат определён, условие выполнено.
- `FAIL` — проверка применима, результат определён, подтверждено отрицательное состояние проверяемого объекта.
- `UNKNOWN` — проверка применима, но технический результат определить невозможно.
- `NOT_APPLICABLE` — отсутствует объект или контекст проверки.

## 7.2. Серьёзность

```text
critical | warning | informational | none
```

Сочетание `FAIL + severity=none` отклоняется при проверке конфигурации.

## 7.3. Причина сбоя и блокирующая зависимость

`reasonCode` разрешён только для `UNKNOWN`, вызванного собственной технической причиной проверки.

Результат, обусловленный зависимостью, использует `blockedBy` и не получает собственного `reasonCode`.

`reasonCode` и `blockedBy` взаимно исключают друг друга.


## 7.4. Результат категории — CategoryResult

```text
CategoryResult {
  category
  status
  severity
  completeness: COMPLETE | PARTIAL
  checks[]
}
```

При объединении результатов действует следующий приоритет статусов:

```text
FAIL > UNKNOWN > PASS > NOT_APPLICABLE
```

`completeness = PARTIAL` тогда и только тогда, когда хотя бы одна дочерняя проверка имеет статус `UNKNOWN`.

N/A не снижает полноту результата.

Серьёзность категории равна максимальной серьёзности дочерних проверок со статусом FAIL; при отсутствии FAIL используется `none`.

## 7.5. Базовый результат сканирования — ScanResult

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

## 7.6. Критерии приёмки

- **AC-7.1** Только FAIL обозначает подтверждённую проблему проверяемого объекта.
- **AC-7.2** UNKNOWN не приводит к штрафу в числовой оценке.
- **AC-7.3** N/A не уменьшает уверенность в результате.
- **AC-7.4** `reasonCode` и `blockedBy` не присутствуют одновременно.
- **AC-7.5** Полнота категории равна PARTIAL тогда и только тогда, когда существует дочерняя проверка UNKNOWN.
- **AC-7.6** Серьёзность категории определяется только дочерними проверками FAIL.

---
