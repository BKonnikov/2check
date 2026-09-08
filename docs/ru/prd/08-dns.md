# 8. Проверка DNS

<!-- nav:start -->
[Концепция](../01-concept.md) · [Оглавление PRD](../02-prd.md) · [English](../../en/prd/08-dns.md)
<!-- nav:end -->

§8 определяет правила DNS-проверок.

## 8.1. Набор резолверов

Резолверы, заданные по умолчанию:

```text
Google       8.8.8.8
Cloudflare   1.1.1.1
Yandex Basic 77.88.8.8
Quad9        9.9.9.10
```

Варианты с защитной фильтрацией не используются как резолверы MVP по умолчанию.

## 8.2. Типы запросов

Для введённого имени хоста запрашиваются:

```text
A, AAAA, MX, TXT, NS, CNAME, SOA
```

## 8.3. Ответ провайдера

```text
DnsProviderResult {
  provider
  qname
  qtype
  transportStatus: SUCCESS | TIMEOUT | NETWORK_ERROR | PROTOCOL_ERROR
  rcode?: NOERROR | NXDOMAIN | SERVFAIL | REFUSED | FORMERR | NOTIMP | OTHER
  outcome?: ANSWER | NODATA | NXDOMAIN
  answers[]
  authority[]
  latencyMs?
  receivedAt
}
```

NXDOMAIN и NODATA различаются.

Для DNS-полей `CheckResult.target/source` используются следующие структуры модуля:

```text
DnsCheckTarget {
  kind: DNS_NAME
  qname
  qtype?: A | AAAA | MX | TXT | NS | CNAME | SOA
}

DnsCheckSource {
  kind: DNS_RESOLVER_SET
  resolverSetVersion
  providers[]
}
```

`qtype` отсутствует у проверок имени в целом, например `dns.name.existence`. Массив `providers[]` содержит устойчивые идентификаторы настроенных резолверов, наблюдения которых участвовали в результате проверки. Подробные ответы провайдеров остаются в технических данных DNS и результатах провайдеров.

TTL отображается отдельно для каждого провайдера и не участвует в сравнении RRset на равенство.

## 8.4. Состояние записи у провайдера

```text
PRESENT | ABSENT | NAME_NOT_FOUND | INDETERMINATE
```

Минимальный кворум по умолчанию равен 2.

Используется строгое большинство среди определённых состояний провайдеров. При равенстве голосов или недостатке определённых данных результат равен `INDETERMINATE`.

## 8.5. Проверки определения состояния записи

```text
dns.a.resolve
dns.aaaa.resolve
dns.mx.resolve
dns.txt.resolve
dns.ns.resolve
dns.cname.resolve
dns.soa.resolve
```

Эти проверки устанавливают, удалось ли определить состояние записи, а не обязана ли она существовать.

Определённое состояние `PRESENT/ABSENT/NAME_NOT_FOUND` даёт PASS для проверки разрешения записи.

`INDETERMINATE` даёт UNKNOWN.

## 8.6. Существование имени

Проверка `dns.name.existence`:

- EXISTS → PASS;
- большинство NXDOMAIN/NOT_EXISTS → FAIL;
- неопределённый результат → UNKNOWN.

NXDOMAIN не создаёт повторные FAIL за отсутствие каждого типа записи.

## 8.7. Согласованность резолверов

Расхождение PRESENT с ABSENT/NXDOMAIN создаёт FAIL с серьёзностью warning как проблему согласованности.

Для A/AAAA разные наборы IP-адресов при наличии записи дают информационную отметку `valueVariation=true`, а не FAIL.

Расхождение MX/TXT/NS/CNAME/SOA обрабатывается как warning согласно политике проверки.

## 8.8. Наличие адресов

Отсутствие AAAA нейтрально и само по себе не является FAIL.

Отсутствие A при наличии AAAA также не является FAIL только из-за отсутствия A.

Проверка TLS по IPv6 при отсутствии AAAA получает N/A.

## 8.9. Набор адресов для проверки безопасности

Набор кандидатов включает объединение всех наблюдаемых A/AAAA из ответов всех резолверов без повторов.

IP-адрес, наблюдаемый меньшинством резолверов, также проходит проверку безопасности.

Недостаточное согласие DNS-резолверов не разрешает TLS-соединение, даже если отдельные IP-адреса получены.

## 8.10. Критерии приёмки

- **AC-8.1** Набор резолверов по умолчанию содержит Google/Cloudflare/Yandex Basic/Quad9 Unfiltered.
- **AC-8.2** NXDOMAIN и NODATA различаются.
- **AC-8.3** Кворум по умолчанию равен 2.
- **AC-8.4** Равенство голосов или недостаток данных даёт INDETERMINATE.
- **AC-8.5** Отсутствие AAAA не является FAIL.
- **AC-8.6** Различие значений A/AAAA само по себе не является FAIL.
- **AC-8.7** Набор кандидатов для проверки безопасности включает все наблюдаемые A/AAAA.
- **AC-8.8** Недостаточное согласие резолверов не разрешает сетевое подключение TLS.
- **AC-8.9** Корневая проблема NXDOMAIN не учитывается повторно по типам записей.
- **AC-8.10** DNS CheckResult использует контракт `DnsCheckTarget`/`DnsCheckSource` из §8.3.

---
