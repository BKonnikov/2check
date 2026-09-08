# 15. Безопасность и защита от SSRF

<!-- nav:start -->
[Концепция](../01-concept.md) · [Оглавление PRD](../02-prd.md) · [English](../../en/prd/15-security-ssrf.md)
<!-- nav:end -->

§15 определяет классификацию IP-адресов, защиту от SSRF, проверку цели целиком и политику безопасности.

## 15.1. Последовательность проверки

```text
CanonicalDomain
→ DNS A/AAAA
→ full candidate set
→ Security Validation
→ ALLOW | BLOCK | INDETERMINATE
→ selected validated endpoint
→ pinned connection
```

## 15.2. Результат проверки безопасности — SecurityValidationResult

```text
SecurityValidationResult {
  decision: ALLOW | BLOCK | INDETERMINATE
  policyVersion
  checkedAddressCount
  blockedAddressCount
  reasonCode?
}
```

## 15.3. Правило для цели целиком

Если хотя бы один IP-адрес кандидата запрещён, вся цель получает BLOCK.

Запрещено исключать запрещённые адреса и продолжать соединение с разрешёнными.

## 15.4. Классификация адресов

Минимальный набор классов:

```text
PUBLIC_ALLOWED
FORBIDDEN_PRIVATE
FORBIDDEN_LOOPBACK
FORBIDDEN_LINK_LOCAL
FORBIDDEN_SHARED
FORBIDDEN_SPECIAL
FORBIDDEN_MULTICAST
FORBIDDEN_METADATA
FORBIDDEN_INTERNAL_INFRASTRUCTURE
```

Для IPv4-mapped IPv6 проверяется вложенный IPv4-адрес.

## 15.5. Диапазоны специального назначения

Диапазоны специального назначения IANA запрещены по умолчанию, если не задан явный список разрешений. В MVP этот список пуст.

## 15.6. Неопределённый результат безопасности — INDETERMINATE

Если безопасность полного набора кандидатов не доказана, соединение запрещается.

Видимая сетевая проверка получает UNKNOWN с `security_validation_incomplete`.

## 15.7. Блокировка — BLOCK

При BLOCK используется `ssrf_policy_block`; сетевое соединение не выполняется. Видимый зависимый результат TLS получает UNKNOWN без Issue и штрафа к оценке.

## 15.8. Границы технических ошибок

`security_validation_incomplete` означает сбой внутри проверки безопасности до сетевой попытки.

`internal_network_error` означает сбой после ALLOW во время работы сканера или сетевого выполнения.

## 15.9. Закрепление IP-адреса

После ALLOW соединение направляется непосредственно к проверенному IP-адресу с исходным именем хоста в SNI. Библиотека не должна повторно и неявно разрешать имя хоста.

## 15.10. Запрет доступа к внутренней инфраструктуре

Поддержка internalInfrastructureDenylist обязательна. Конкретные значения зависят от развёртывания и определяются технической архитектурой и конфигурацией безопасности. Изменение действующего списка влияет на `securityPolicyVersion`.

## 15.11. Критерии приёмки

- **AC-15.1** Любой запрещённый адрес кандидата блокирует всю цель.
- **AC-15.2** При невозможности подтвердить безопасность доступ блокируется.
- **AC-15.3** Полный набор кандидатов проверяется без предварительного усечения.
- **AC-15.4** DNS rebinding предотвращается соединением с закреплённым IP-адресом.
- **AC-15.5** BLOCK по безопасности не создаёт проблему домена Issue.
- **AC-15.6** `security_validation_incomplete` и `internal_network_error` различаются по этапу выполнения.
- **AC-15.7** internalInfrastructureDenylist участвует в версии действующей политики безопасности.

---
