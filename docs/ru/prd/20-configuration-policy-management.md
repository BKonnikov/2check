# 20. Управление конфигурацией и политиками

<!-- nav:start -->
[Концепция](../01-concept.md) · [Оглавление PRD](../02-prd.md) · [English](../../en/prd/20-configuration-policy-management.md)
<!-- nav:end -->

§20 определяет классы конфигурации, версионирование и правила активации.

## 20.1. Классы конфигурации

```text
Health Policy
Technical Module Configuration
Security Policy
Orchestration Configuration
Cache Contract
Presentation / Message Configuration
Operational Configuration
Secrets
```

## 20.2. Версии

```text
healthPolicyVersion
securityPolicyVersion
orchestrationConfigVersion
cacheContractVersion
resolverSetVersion
dnsModuleConfigVersion
registryModuleConfigVersion
tlsModuleConfigVersion
trustStoreVersion
publicSuffixListVersion
```

Для необязательной группировки используется `configReleaseId`.

`configReleaseId` не заменяет версии отдельных компонентов, отражающие их смысловые изменения.

## 20.3. Влияние изменений на версии

- серьёзность, объединение Issue или штрафы оценки → healthPolicyVersion;
- набор резолверов → resolverSetVersion;
- правила оценки DNS → dnsModuleConfigVersion;
- поведение адаптера, парсера или провайдера регистрации → registryModuleConfigVersion;
- правила работы TLS-сканера → tlsModuleConfigVersion;
- доверенные корневые сертификаты → trustStoreVersion;
- правила SSRF или внутреннего списка запретов → securityPolicyVersion;
- общий срок или поведение оркестрации → orchestrationConfigVersion;
- общая сериализация или совместимость кэша → cacheContractVersion;
- снимок Public Suffix List → publicSuffixListVersion.

## 20.4. Политика оценки и технические наблюдения

Изменение только политики оценки допускает повторное использование совместимых технических наблюдений.

Исторические сканирования не пересчитываются.

## 20.5. Неизменяемость конфигурации

Один идентификатор версии не может обозначать разное содержимое.

Смысловое изменение содержимого требует новой версии.

Детерминированный хэш содержимого рекомендуется как дополнительный механизм контроля целостности.

## 20.6. Активация

Подготовленная конфигурация проходит следующие этапы:

```text
load
→ schema validation
→ cross-reference validation
→ semantic/security validation
→ atomic activation
```

Текущее сканирование продолжает работу с зафиксированной прежней конфигурацией.

Некорректная обязательная стартовая конфигурация не позволяет сервису стать готовым и требует раннего отказа; скрытая резервная конфигурация запрещена.

## 20.7. Секреты

Секреты не входят в ScanResult, ExecutionContext или содержимое конфигурации, показываемое браузеру.

Ротация секрета без изменения поведения не требует искусственного повышения версии модуля.

## 20.8. Критерии приёмки

- **AC-20.1** Конфигурация разделена на смысловые классы.
- **AC-20.2** Смысловое изменение обновляет соответствующую версию.
- **AC-20.3** Разное содержимое под одной версией запрещено.
- **AC-20.4** Текущее сканирование использует зафиксированный снимок конфигурации.
- **AC-20.5** Активация атомарна и предваряется проверкой.
- **AC-20.6** Неизвестные ссылки на проверки и межкатегорийные правила Issue делают конфигурацию недопустимой.
- **AC-20.7** Пользовательский API не изменяет политику, кворум, доверенные сертификаты или параметры SSRF.
- **AC-20.8** Канонический идентификатор технической конфигурации регистрации — `registryModuleConfigVersion`.
- **AC-20.9** Изменение снимка Public Suffix List обновляет `publicSuffixListVersion`.

---
