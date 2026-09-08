# 9. Регистрация домена

<!-- nav:start -->
[Концепция](../01-concept.md) · [Оглавление PRD](../02-prd.md) · [English](../../en/prd/09-registry.md)
<!-- nav:end -->

§9 определяет работу провайдера регистрации, результаты запросов, жизненный цикл домена и предметные правила кэширования.

## 9.1. Провайдер

Провайдер MVP:

```text
UzRegistryProvider
```

Основной протокол и источник данных — RDAP.
Если RDAP не дал определённого результата, используется резервный запрос WHOIS.

## 9.2. Исход запроса

```text
REGISTERED | NOT_REGISTERED | INDETERMINATE
```

`NOT_REGISTERED` допустим только при явном подтверждении от авторитетного источника.

Тайм-аут, 429, 5xx, некорректный ответ, ошибка разбора или кодировки дают `INDETERMINATE`, если резервный запрос также не дал определённого результата.

## 9.3. Нормализованный жизненный цикл

```text
REGISTRATION_INITIATED
PENDING_ACTIVATION
ACTIVE
PENDING_RENEWAL
REDEMPTION_PERIOD
FREE
DEACTIVATED
CANCELLED
RESERVED
AUCTION
UNKNOWN
```

Исходный статус провайдера сохраняется в `rawStatus`.

## 9.4. Данные регистрации — NormalizedDomainRegistration

```text
NormalizedDomainRegistration {
  registryDomain
  registrar
  createdAt
  expiresAt
  nameServers[]
  status
  rawStatus
  registrant: {
    name: RegistrantField
    email: RegistrantField
    phone: RegistrantField
    address: RegistrantField
  }
  raw: { rdap?, whois? }
  freshness
}
```

```text
RegistrantField {
  state: value | redacted | unavailable
}
```

Фактическое значение при `state=value` хранится и раскрывается отдельно согласно §19/§25.

Для полей регистрации `CheckResult.target/source` используются:

```text
RegistryCheckTarget {
  kind: REGISTRY_DOMAIN
  registryDomain
}

RegistryCheckSource {
  kind: REGISTRY_PROVIDER
  registryProvider
  transportsUsed: (RDAP | WHOIS)[]
}
```

`transportsUsed` отражает фактически использованную стратегию получения конечного результата, например `[RDAP]` или `[RDAP, WHOIS]`. При `provider_not_supported` поле `source` может отсутствовать, поскольку обращение к внешнему провайдеру регистрации не выполнялось.

## 9.5. Проверка registry.lookup

- REGISTERED → PASS;
- явно подтверждённый NOT_REGISTERED → FAIL;
- INDETERMINATE → UNKNOWN с собственной технической причиной `reasonCode`.

Если корневая проверка регистрации получила UNKNOWN, дочерние проверки получают UNKNOWN с `blockedBy`.

При подтверждённом NOT_REGISTERED дочерние проверки, для которых отсутствует объект регистрации, получают N/A с `blockedBy`.

## 9.6. Домены вне зоны .uz

Для неподдерживаемого TLD:

```text
UNKNOWN
reasonCode = provider_not_supported
retryability = NOT_RETRYABLE
```

Штраф к числовой оценке не применяется; уверенность в результате FULL снижается.

## 9.7. Адаптивное время жизни кэша

§9 определяет TTL с учётом статуса регистрации. Для активных доменов TTL измеряется часами; для льготного периода и периода восстановления — минутами. Точные значения задаются версионируемой конфигурацией.

## 9.8. Критерии приёмки

- **AC-9.1** RDAP является основным источником; WHOIS используется как резервный только после неопределённого результата RDAP.
- **AC-9.2** NOT_REGISTERED требует явного подтверждения.
- **AC-9.3** Неопределённость из-за ответа, кодировки или разбора не интерпретируется как FREE.
- **AC-9.4** Нормализация жизненного цикла использует каноническое перечисление из §9.3.
- **AC-9.5** Фактические персональные данные регистранта отсутствуют в Public ScanResult.
- **AC-9.6** Ограничение провайдера для зон вне .uz даёт UNKNOWN/provider_not_supported без штрафа к оценке.
- **AC-9.7** Политика TTL учитывает статус регистрации и определяется модулем регистрации.
- **AC-9.8** Registry CheckResult использует контракт `RegistryCheckTarget`/`RegistryCheckSource` из §9.4.

---
