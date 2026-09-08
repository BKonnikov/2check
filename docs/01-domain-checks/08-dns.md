# 8. DNS

§8 является нормативным владельцем DNS semantics.

## 8.1. Resolver set

Default configured resolvers:

```text
Google       8.8.8.8
Cloudflare   1.1.1.1
Yandex Basic 77.88.8.8
Quad9        9.9.9.10
```

Security-filtering variants не используются как default MVP resolvers.

## 8.2. Query types

Для entered hostname:

```text
A, AAAA, MX, TXT, NS, CNAME, SOA
```

## 8.3. Provider result

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

Для DNS `CheckResult.target/source` используются следующие module-specific variants:

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

`qtype` отсутствует для qname-level checks, например `dns.name.existence`. `providers[]` содержит stable configured resolver identifiers, observations которых участвовали в формировании check; подробные provider responses остаются в DNS details/provider results.

TTL отображается/provider-specific и не участвует в equality RRset.

## 8.4. Provider record state

```text
PRESENT | ABSENT | NAME_NOT_FOUND | INDETERMINATE
```

Default minimum quorum = 2.

Используется strict majority среди determinate provider states. Tie/insufficient determinate evidence → `INDETERMINATE`.

## 8.5. Resolve checks

```text
dns.a.resolve
dns.aaaa.resolve
dns.mx.resolve
dns.txt.resolve
dns.ns.resolve
dns.cname.resolve
dns.soa.resolve
```

Они отвечают «удалось ли определить состояние записи», а не «обязана ли запись существовать».

Determinate `PRESENT/ABSENT/NAME_NOT_FOUND` → PASS resolve check.

`INDETERMINATE` → UNKNOWN.

## 8.6. Name existence

`dns.name.existence`:

- EXISTS → PASS;
- majority NXDOMAIN/NOT_EXISTS → FAIL;
- indeterminate → UNKNOWN.

NXDOMAIN не создаёт серию повторных FAIL для отсутствия каждого RR type.

## 8.7. Resolver consistency

PRESENT против ABSENT/NXDOMAIN → FAIL warning consistency issue.

Для A/AAAA разные IP sets при наличии записи → informational `valueVariation=true`, не FAIL.

MX/TXT/NS/CNAME/SOA mismatch → warning согласно check policy.

## 8.8. Address semantics

Отсутствие AAAA нейтрально и не является FAIL само по себе.

A absent + AAAA present также не является FAIL только по причине отсутствия A.

TLS IPv6 при отсутствии AAAA → N/A.

## 8.9. Candidate set

Security candidate set = union всех observed A/AAAA из всех resolver responses, с dedupe.

Observed minority IP также проверяется Security Layer.

Insufficient DNS consensus не разрешает TLS connection даже при наличии observed IP.

## 8.10. Acceptance Criteria

- **AC-8.1** Default resolver set содержит Google/Cloudflare/Yandex Basic/Quad9 Unfiltered.
- **AC-8.2** NXDOMAIN и NODATA различаются.
- **AC-8.3** Quorum по умолчанию равен 2.
- **AC-8.4** Tie/insufficient evidence даёт INDETERMINATE.
- **AC-8.5** AAAA absence не является FAIL.
- **AC-8.6** A/AAAA value variation не является FAIL сама по себе.
- **AC-8.7** Security candidate set включает все observed A/AAAA.
- **AC-8.8** Insufficient consensus не разрешает TLS network target.
- **AC-8.9** NXDOMAIN root failure не double-counted по RR types.
- **AC-8.10** DNS CheckResult использует `DnsCheckTarget`/`DnsCheckSource` contract §8.3.

---
