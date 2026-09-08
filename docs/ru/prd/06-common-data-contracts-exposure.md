# 6. Общие контракты данных и уровни доступа

<!-- nav:start -->
[Концепция](../01-concept.md) · [Оглавление PRD](../02-prd.md) · [English](../../en/prd/06-common-data-contracts-exposure.md)
<!-- nav:end -->

§6 определяет общую структуру DTO и уровни раскрытия данных через API. Поля отдельных модулей определяются в соответствующих разделах.

## 6.1. Сообщение — MessageDescriptor

Для сообщений используется единый DTO:

```text
MessageDescriptor {
  titleCode: string
  explanationCode?: string
  impactCode?: string
  recommendationCode?: string
  params?: object
}
```

## 6.2. Результат проверки — CheckResult

```text
CheckResult<TDetails> {
  checkId
  category: dns | registry | tls
  status
  severity
  target: ModuleCheckTarget
  reasonCode?
  dependsOn?
  dependencyMode?: ALL | ANY
  blockedBy?
  message: MessageDescriptor
  details?
  source?: ModuleCheckSource
  freshness
}
```

`target` обозначает объект проверки. `source` содержит машиночитаемые сведения о происхождении наблюдения или результата. Оба поля имеют структуру, определённую модулем, и не являются произвольным текстом.

```text
ModuleCheckTarget =
  DnsCheckTarget |
  RegistryCheckTarget |
  TlsCheckTarget

ModuleCheckSource =
  DnsCheckSource |
  RegistryCheckSource |
  TlsCheckSource
```

Точный вариант структуры определяется разделом модуля: DNS — §8, регистрация — §9, TLS — §10. Поле `category` различает варианты модулей. Поле `source` необязательно: его отсутствие само по себе не меняет статус или серьёзность результата и не означает технический сбой. Доступность `target`/`source` в браузере определяется списками разрешённых полей представлений Public/Technical, а не наличием этих полей во внутреннем `CheckResult`.

По умолчанию `dependencyMode = ALL`.

## 6.3. Актуальность результата — CheckFreshness

```text
CheckFreshness {
  checkedAt
  cached
  cacheAge
  sourceUpdatedAt?
}
```

`checkedAt` содержит время исходного наблюдения, а не обращения к кэшу.

## 6.4. Уровни раскрытия данных

```text
Public
Technical
Gated
```

- **Public** — безопасное обычное представление результата.
- **Technical** — безопасное представление технических данных через `/details`.
- **Gated** — отдельный ресурс с контролируемым доступом к чувствительным данным.

Внутренний DTO никогда не сериализуется напрямую.

## 6.5. Машинные значения

Не локализуются:

- IP-адреса;
- имена хостов;
- значения DNS-записей;
- числовые значения TTL;
- отпечатки сертификатов;
- исходные значения издателя сертификата;
- версии TLS;
- статусы;
- уровни серьёзности;
- `reasonCode`;
- `checkId`.

## 6.6. Критерии приёмки

- **AC-6.1** `MessageDescriptor` является единым DTO сообщений, передаваемых браузеру.
- **AC-6.2** Внутренний DTO не сериализуется напрямую в браузерный API.
- **AC-6.3** Public/Technical/Gated являются отдельными уровнями раскрытия данных.
- **AC-6.4** Машинные значения не меняются при переключении языка.
- **AC-6.5** `checkedAt` сохраняет время наблюдения, а не обращения к кэшу.
- **AC-6.6** `target` и `source` имеют определённую модулем структуру и не являются произвольными полями.
- **AC-6.7** Точные варианты target/source определяются разделами модулей §8/§9/§10.
- **AC-6.8** Необязательное поле `source` само по себе не влияет на оценку здоровья домена; его передача браузеру определяется списком разрешённых полей.

---
