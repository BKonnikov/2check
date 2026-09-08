# 16. Оркестрация и выполнение сканирования

<!-- nav:start -->
[Концепция](../01-concept.md) · [Оглавление PRD](../02-prd.md) · [English](../../en/prd/16-scan-orchestration-execution-model.md)
<!-- nav:end -->

§16 определяет жизненный цикл сканирования, ScanPlan, барьеры выполнения, общий срок завершения и формирование итогового результата.

## 16.1. Состояния выполнения

```text
PENDING | RUNNING | COMPLETED | FAILED
```

Публичное состояние CANCELLED в MVP отсутствует.

## 16.2. Запрос сканирования — ScanRequest

```text
ScanRequest {
  input
  mode: FULL | PARTIAL
  selectedCategories?
  cacheMode: NORMAL | FORCE_REFRESH
}
```

Предварительная обработка ввода выполняется до создания сканирования. Некорректный ввод не создаёт `scanId`.

## 16.3. План сканирования — ScanPlan

```text
ScanPlan {
  scanId
  mode
  visibleCategories[]
  scheduledChecks[]
  internalPrerequisites[]
  cacheMode
  executionContext
}
```

Внутренние предварительные проверки не расширяют видимый объём сканирования и не создают скрытых категорий, оценок или проблем.

## 16.4. Контекст выполнения — ExecutionContext

```text
ExecutionContext {
  healthPolicyVersion
  securityPolicyVersion
  orchestrationConfigVersion
  cacheContractVersion
  resolverSetVersion
  dnsModuleConfigVersion
  registryModuleConfigVersion
  tlsModuleConfigVersion
  trustStoreVersion
}
```

Контекст фиксируется на всё сканирование. Смешение разных конфигураций в одном сканировании запрещено.

## 16.5. Параллельность и зависимости

DNS и проверка регистрации могут выполняться параллельно.

TLS зависит от A/AAAA и проверки безопасности, но не ожидает MX/TXT/NS/CNAME/SOA.

## 16.6. Барьер разрешения адресов

Все запланированные запросы A/AAAA к резолверам достигают конечного транспортного или DNS-исхода.

После барьера формируется неизменяемый набор:

```text
sealedDnsAddressCandidates
```

ALLOW разрешён только после фиксации полного набора. Досрочный BLOCK допускается при обнаружении запрещённого кандидата.

## 16.7. Общий срок завершения

Незавершённая корневая проверка, прерванная по общему сроку:

```text
UNKNOWN / scan_deadline_exceeded
```

Зависимая проверка получает UNKNOWN с `blockedBy`.

Если сформированы достоверные конечные результаты, сканирование остаётся COMPLETED с `completionReason=DEADLINE_TERMINALIZED`.

## 16.8. Формирование итогового результата

Детерминированный порядок:

```text
CheckResult[]
→ CategoryResult[]
→ Issues
→ Confidence
→ Verdict
→ Score
```

Клиентская часть не формирует авторитетный итоговый результат.

## 16.9. Сбой сканирования

FAILED устанавливается только при невозможности сформировать достоверный конечный ScanResult.

```text
ScanExecutionFailure {
  failureCode:
    orchestration_error |
    execution_state_unrecoverable |
    result_integrity_error |
    configuration_incompatible |
    internal_platform_error
  occurredAt
}
```

`execution_state_unrecoverable` обозначает незавершённое сканирование, потерявшее выполнение, если безопасное детерминированное возобновление невозможно.

## 16.10. Критерии приёмки

- **AC-16.1** Некорректный ввод не создаёт scanId.
- **AC-16.2** ExecutionContext фиксируется на всё сканирование.
- **AC-16.3** PARTIAL только для TLS может выполнять скрытые DNS-проверки и проверку безопасности без видимой категории DNS.
- **AC-16.4** TLS не запускается только на основании раннего кворума до барьера разрешения адресов.
- **AC-16.5** ALLOW требует зафиксированного полного набора кандидатов.
- **AC-16.6** Общий срок может завершать корневые проверки как UNKNOWN без перевода сканирования в FAILED.
- **AC-16.7** Итоговый результат формируется детерминированно на сервере.
- **AC-16.8** FAILED устанавливается только при невозможности получить достоверный итоговый результат.
- **AC-16.9** Потерянное невосстановимое выполнение получает `execution_state_unrecoverable`.

---
