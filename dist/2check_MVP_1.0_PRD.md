# 2check.uz — MVP 1.0 Product Requirements Document

**Версия:** 1.0  
**Статус:** CONSOLIDATED / FINAL  
**Основа:** `2check_Product_Concept_v1.0 — FINAL / FROZEN`  

## Правило единого источника истины

Для каждого требования, DTO, enum, policy, version identifier и error semantics в документе назначается один нормативный владелец. Повторные упоминания в других разделах являются cross-reference и не создают второй контракт. При конфликте приоритет имеет нормативный владелец, указанный в соответствующем разделе.

---

# 1. Product Goal & Positioning

## 1.1. Позиционирование

**2check.uz — проверка технического здоровья домена простым языком.**

Продукт должен одновременно обслуживать две аудитории:

- **обычный пользователь / владелец бизнеса** — получает человеческий вердикт, понятное объяснение проблемы и короткую рекомендацию;
- **технический пользователь** — получает нормализованные технические данные и безопасные Technical Details.

Главный смысл результата — не число, а **Domain Health Verdict**. Score является вспомогательной количественной визуализацией.

## 1.2. Product principles

1. Backend является единственным источником истины для Health semantics.
2. Один корневой дефект не должен давать несколько независимых штрафов.
3. Technical uncertainty не должна превращаться в проблему домена.
4. Security fail-closed имеет приоритет над throughput и UX convenience.
5. MVP scope не расширяется скрыто через «простые» дополнительные checks.
6. RU / UZ / EN являются обязательными locales с MVP.

## 1.3. Acceptance Criteria

- **AC-1.1** Основной результат содержит человеческий verdict, а Score является secondary element.
- **AC-1.2** Frontend не рассчитывает Health semantics самостоятельно.
- **AC-1.3** Technical user получает Safe Technical Projection, а не internal DTO/raw dump.
- **AC-1.4** RU / UZ / EN поддерживаются с MVP.

---

# 2. MVP Scope & Roadmap

## 2.1. MVP 1.0

В MVP 1.0 входят:

- preprocessing / IDN pipeline;
- CanonicalDomain;
- DNS resolver comparison;
- Registry через `registryProvider`;
- SSL/TLS fixed checks;
- Domain Health Summary;
- status / severity / dependency model;
- Issue aggregation;
- Domain Health Score и Confidence;
- Redis cache;
- SSRF protection;
- Web UI и Internal Web API;
- RU / UZ / EN.

## 2.2. MVP 1.1

**Email Health**:

- SPF;
- DMARC;
- DKIM;
- MX;
- STARTTLS;
- PTR;
- blacklist проверки принимающего mail server.

Email Health не входит в MVP 1.0 даже частично.

## 2.3. Phase 2

- true geo-distributed DNS;
- Ping / Traceroute;
- HTTP headers / redirect chain;
- Domain reputation;
- Homograph / IDN spoof detector;
- deep SEO repair guides.

## 2.4. Phase 3

- Telegram bot;
- Public API;
- SSE-based complex scan;
- Port scanner;
- Uptime monitoring.

## 2.5. Acceptance Criteria

- **AC-2.1** Email Health отсутствует в MVP 1.0.
- **AC-2.2** HTTP checker, reputation, port scanner и uptime monitoring отсутствуют в MVP 1.0.
- **AC-2.3** True geo DNS не заявляется как возможность MVP resolver comparison.
- **AC-2.4** Новый check не включается в MVP без явного изменения scope.

---

# 3. User Scenarios & Scan Modes

## 3.1. Default flow

Primary action запускает:

```text
mode = FULL
cacheMode = NORMAL
```

FULL включает:

```text
DNS + Registry + TLS
```

## 3.2. PARTIAL

Technical user может выбрать непустое подмножество:

```text
dns | registry | tls
```

Если выбраны все три categories, используется `FULL`, а не `PARTIAL`.

## 3.3. Tool pages

```text
/dns-check → PARTIAL [dns]
/whois     → PARTIAL [registry]
/ssl-check → PARTIAL [tls]
```

Tool pages используют те же backend modules и semantics, что FULL scan.

## 3.4. Global Summary

Global Score и global verdict существуют только для `FULL + FINAL`.

PARTIAL показывает category results, но не global Domain Health Score.

## 3.5. Acceptance Criteria

- **AC-3.1** Default flow создаёт FULL NORMAL scan.
- **AC-3.2** PARTIAL допускает только непустое подмножество FULL categories.
- **AC-3.3** Выбор DNS+Registry+TLS создаёт FULL.
- **AC-3.4** Tool pages не имеют отдельной technical semantics.
- **AC-3.5** PARTIAL не получает global Score/verdict.

---

# 4. Technical Architecture & System Boundaries

## 4.1. MVP stack

- Frontend: Next.js.
- Backend: Node.js/Fastify **или** Python/FastAPI.
- Redis: mandatory.
- MVP hosting: один VPS.

Конкретный backend language/runtime выбирается Technical Architecture и не меняет Product Contract.

## 4.2. Runtime boundaries

Основные logical components:

```text
Web Frontend
Internal Web API
Scan Orchestrator
DNS Module
Registry Module
TLS Module
Security Validation
Redis Reusable Cache
Scan Store
Sensitive/Gated Store
Observability
```

## 4.3. Network boundary

User-controlled target не передаётся напрямую arbitrary network client. Network execution проходит CanonicalDomain → DNS prerequisites → Security Validation → pinned connection.

## 4.4. Public platform TLS

Frontend/API 2check работают через trusted HTTPS certificate. Собственный certificate lifecycle 2check является operational dependency.

## 4.5. Acceptance Criteria

- **AC-4.1** Redis является обязательным MVP component.
- **AC-4.2** MVP deployable на одном VPS.
- **AC-4.3** MVP correctness не зависит от Kubernetes/multi-region/distributed scheduler.
- **AC-4.4** Network modules не обходят Security Validation.
- **AC-4.5** 2check public frontend/API обслуживаются trusted HTTPS.

---

# 5. Input & CanonicalDomain

§5 является нормативным владельцем preprocessing/input semantics.

## 5.1. Accepted input

Принимаются:

- hostname;
- HTTP URL;
- HTTPS URL;
- URL-like input без scheme.

Отклоняются MVP:

- IP address;
- wildcard hostname;
- email;
- single-label hostname;
- owner names вроде `_dmarc.example.uz`;
- URL credentials;
- custom port.

## 5.2. IDN pipeline

Используется:

```text
trim
→ hostname extraction
→ lowercase where applicable
→ Unicode normalization
→ UTS #46 Nontransitional
→ IDNA validation
→ ASCII / punycode
```

Применяются стандартные DNS label/hostname length constraints.

## 5.3. CanonicalDomain

```text
CanonicalDomain {
  originalInput
  inputType: HOSTNAME | URL | URL_LIKE
  unicodeHostname
  asciiHostname
  publicSuffix: string | null
  publicSuffixType: ICANN | PRIVATE | UNKNOWN
  registrableDomain: string | null
  labels[]
  isIdn
  hadTrailingDot
}
```

`registryDomain` намеренно **не входит** в `CanonicalDomain`.

## 5.4. Registry domain boundary

`registrableDomain` определяется preprocessing/PSL semantics.

`registryDomain` определяется конкретным `registryProvider` и возвращается Registry module.

## 5.5. Typo correction

Automatic typo suggestion/correction отсутствует в MVP.

## 5.6. Acceptance Criteria

- **AC-5.1** Все modules используют один CanonicalDomain и не нормализуют input независимо.
- **AC-5.2** `registryDomain` отсутствует в CanonicalDomain.
- **AC-5.3** IP/wildcard/email/single-label/custom-port input отклоняются.
- **AC-5.4** IDN обрабатывается через UTS #46 Nontransitional и punycode.
- **AC-5.5** `publicSuffixType` различает ICANN/PRIVATE/UNKNOWN.
- **AC-5.6** Typo correction не выполняется автоматически.

---

# 6. Common Data Contracts & Exposure Model

§6 является владельцем common DTO shape и API exposure tiers; module-specific fields принадлежат module owners.

## 6.1. MessageDescriptor

Единственный message DTO:

```text
MessageDescriptor {
  titleCode: string
  explanationCode?: string
  impactCode?: string
  recommendationCode?: string
  params?: object
}
```

## 6.2. CheckResult

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

`target` идентифицирует объект, состояние которого оценивает check. `source` описывает machine-readable provenance observation/result. Оба поля являются structured module-specific contracts, а не free-form text.

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

Точная форма variant определяется владельцем соответствующего модуля: DNS — §8, Registry — §9, TLS — §10. `category` является discriminator между module variants. `source` optional: его отсутствие само по себе не меняет status/severity и не является technical failure. Browser visibility `target`/`source` определяется Public/Technical projection allowlists, а не фактом наличия поля во внутреннем `CheckResult`.

Default `dependencyMode = ALL`.

## 6.3. CheckFreshness

```text
CheckFreshness {
  checkedAt
  cached
  cacheAge
  sourceUpdatedAt?
}
```

`checkedAt` — время исходного observation, не cache-hit time.

## 6.4. Exposure tiers

```text
Public
Technical
Gated
```

- **Public** — safe normal result.
- **Technical** — Safe Technical Projection через `/details`.
- **Gated** — отдельный controlled resource для sensitive data.

Internal DTO никогда не сериализуется напрямую.

## 6.5. Machine values

Не локализуются:

- IP;
- hostname;
- DNS values;
- TTL numeric value;
- fingerprint;
- issuer raw value;
- TLS version;
- status;
- severity;
- `reasonCode`;
- `checkId`.

## 6.6. Acceptance Criteria

- **AC-6.1** `MessageDescriptor` является единым message DTO для browser-facing message contracts.
- **AC-6.2** Internal DTO не сериализуется browser API напрямую.
- **AC-6.3** Public/Technical/Gated являются отдельными exposure tiers.
- **AC-6.4** Machine values не меняются при locale switch.
- **AC-6.5** `checkedAt` сохраняет время observation, а не время cache lookup.
- **AC-6.6** `target` и `source` являются structured module-specific contracts, не free-form fields.
- **AC-6.7** Exact target/source variants определяются module owners §8/§9/§10.
- **AC-6.8** Optional `source` не влияет на Health semantics сам по себе, а его browser exposure определяется projection allowlist.

---

# 7. Shared Status, Dependency, Category & Scan Semantics

## 7.1. Status

```text
PASS | FAIL | UNKNOWN | NOT_APPLICABLE
```

- `PASS` — применимо, результат определён, условие выполнено.
- `FAIL` — применимо, результат определён, подтверждено отрицательное target condition.
- `UNKNOWN` — применимо, но technical result определить невозможно.
- `NOT_APPLICABLE` — отсутствует объект/контекст проверки.

## 7.2. Severity

```text
critical | warning | informational | none
```

`FAIL + severity=none` запрещён configuration validation.

## 7.3. reasonCode vs blockedBy

`reasonCode` разрешён только для `UNKNOWN`, вызванного собственной technical reason check.

Dependency-caused result использует `blockedBy` и не получает собственный `reasonCode`.

`reasonCode` и `blockedBy` mutually exclusive.


## 7.4. CategoryResult

```text
CategoryResult {
  category
  status
  severity
  completeness: COMPLETE | PARTIAL
  checks[]
}
```

Aggregation status priority:

```text
FAIL > UNKNOWN > PASS > NOT_APPLICABLE
```

`completeness = PARTIAL` iff хотя бы один child `UNKNOWN`.

N/A не снижает completeness.

Category severity = maximum severity среди FAIL children; если FAIL отсутствует — `none`.

## 7.5. ScanResult base

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

## 7.6. Acceptance Criteria

- **AC-7.1** Только FAIL создаёт confirmed target problem.
- **AC-7.2** UNKNOWN не получает Score penalty.
- **AC-7.3** N/A не уменьшает Confidence.
- **AC-7.4** `reasonCode` и `blockedBy` не присутствуют вместе.
- **AC-7.5** Category completeness PARTIAL iff child UNKNOWN существует.
- **AC-7.6** Category severity определяется только FAIL children.

---

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

# 9. Registry

§9 является нормативным владельцем Registry provider/result/lifecycle/cache-business semantics.

## 9.1. Provider

MVP provider:

```text
UzRegistryProvider
```

Primary transport/source: RDAP.  
Fallback после RDAP indeterminate: WHOIS.

## 9.2. Outcome

```text
REGISTERED | NOT_REGISTERED | INDETERMINATE
```

`NOT_REGISTERED` только при explicit authoritative proof.

Timeout, 429, 5xx, malformed response, parser/encoding failure → `INDETERMINATE`, если fallback не дал determinate result.

## 9.3. Normalized lifecycle

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

Raw provider status сохраняется как `rawStatus`.

## 9.4. NormalizedDomainRegistration

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

Actual value при `state=value` хранится/экспонируется отдельно согласно §19/§25.

Для Registry `CheckResult.target/source` используются:

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

`transportsUsed` отражает фактически использованную provider strategy для terminal result: например `[RDAP]` либо `[RDAP, WHOIS]`. Для `provider_not_supported` `source` может отсутствовать, поскольку external Registry provider execution не выполнялся.

## 9.5. registry.lookup

- REGISTERED → PASS;
- explicit NOT_REGISTERED → FAIL;
- INDETERMINATE → UNKNOWN + own technical `reasonCode`.

При root lookup UNKNOWN child registry checks → UNKNOWN `blockedBy`.

При definitive NOT_REGISTERED child checks, которым не существует объекта registration, → N/A `blockedBy`.

## 9.6. Non-.uz

Для unsupported TLD:

```text
UNKNOWN
reasonCode = provider_not_supported
retryability = NOT_RETRYABLE
```

Без Score penalty, с Reduced Confidence в FULL scan.

## 9.7. Adaptive cache TTL

Registry status-aware TTL принадлежит §9. Active domains используют hours-scale TTL; grace/redemption — minutes-scale TTL. Exact configured values versioned.

## 9.8. Acceptance Criteria

- **AC-9.1** RDAP primary, WHOIS fallback только после indeterminate RDAP.
- **AC-9.2** NOT_REGISTERED требует explicit proof.
- **AC-9.3** Malformed/encoding/parser uncertainty не интерпретируется как FREE.
- **AC-9.4** Lifecycle normalization использует canonical enum §9.3.
- **AC-9.5** Actual registrant PII отсутствует в Public ScanResult.
- **AC-9.6** Non-.uz provider limitation даёт UNKNOWN/provider_not_supported без Score penalty.
- **AC-9.7** Registry TTL policy status-aware и module-owned.
- **AC-9.8** Registry CheckResult использует `RegistryCheckTarget`/`RegistryCheckSource` contract §9.4.

---

# 10. SSL/TLS

§10 является нормативным владельцем TLS technical semantics.

## 10.1. Endpoint coverage

MVP проверяет максимум:

```text
1 representative IPv4
1 representative IPv6
```

`endpointCoverage = REPRESENTATIVE`.

Не выполняется exhaustive backend scan.

## 10.2. Representative selection

Только Security-validated candidates.

Порядок выбора:

1. highest resolver observation count;
2. deterministic stable tie-break.

## 10.3. Connection

- TCP connect напрямую к pinned selected IP;
- port 443/TCP;
- SNI = `asciiHostname`;
- no own implicit DNS resolution;
- HTTP request/content не выполняется.

Для TLS `CheckResult.target/source` используются:

```text
TlsCheckTarget {
  kind: TLS_HOST
  hostname
  port: 443
  ipFamily?: IPV4 | IPV6
}

TlsCheckSource {
  kind: DIRECT_TLS_PROBE
  endpointCoverage: REPRESENTATIVE
}
```

`ipFamily` используется для family-specific connectivity checks; для aggregate certificate checks поле может отсутствовать. Selected endpoint IPs и dependency fingerprint относятся к TLS execution metadata/details (§19), а не дублируются в `TlsCheckSource`.

## 10.4. Protocol support

MVP проверяет TLS 1.2 и TLS 1.3. Предпочтительно TLS 1.3, если поддерживается.

## 10.5. Certificate checks

- validity period;
- hostname match;
- issuer;
- SAN;
- validFrom / validTo;
- days remaining;
- chain validation;
- expired intermediate;
- self-signed leaf;
- untrusted chain.

Не входят: cipher grading, legacy attack suite, OCSP/CRL, HSTS, HTTP/2, QUIC, CT grading, TLS1.0/1.1 grading.

## 10.6. Hostname matching

SAN only. CN fallback отсутствует.

Wildcard покрывает только complete leftmost one label.

## 10.7. IPv4/IPv6

Families независимы после target-wide Security gate.

Missing family → N/A.

Aggregate certificate checks используют `dependencyMode = ANY` между family-specific IPv4/IPv6 connectivity prerequisites. Для запуска certificate evaluation достаточно минимум одного successful family path, на котором удалось получить certificate. Missing/N/A или failed/UNKNOWN другая family не блокирует evaluation доступного successful path и сохраняет собственный connectivity result отдельно.

Если обе families успешно дают certificate, aggregate certificate health учитывает обе: invalid на любой checked family → FAIL соответствующего aggregate certificate check. Таким образом `ANY` определяет eligibility запуска aggregate certificate check, но не разрешает игнорировать второй certificate-bearing path, если он также успешно доступен.

Если ни одна family не дала successful certificate-bearing path, certificate check не выполняется как самостоятельная target failure и получает dependency-driven terminal semantics через `blockedBy` согласно §7/§18.

Разные fingerprints IPv4/IPv6 не являются FAIL сами по себе.

## 10.8. Connectivity taxonomy

После Security ALLOW:

- target TCP connect timeout/refused → connectivity FAIL;
- target handshake timeout/failure после actual target attempt → connectivity FAIL;
- scanner/network infrastructure inability без trustworthy target observation → UNKNOWN `internal_network_error`.

## 10.9. TLS-specific reason codes

Module-specific directly applicable:

```text
internal_network_error
scanner_tls_error
```

Security codes принадлежат §15; orchestration codes — §16; generic rules — §18.

## 10.10. Acceptance Criteria

- **AC-10.1** Максимум один representative endpoint на IP family.
- **AC-10.2** TLS client не резолвит hostname повторно.
- **AC-10.3** SNI использует asciiHostname.
- **AC-10.4** SAN-only hostname validation без CN fallback.
- **AC-10.5** Missing family даёт N/A.
- **AC-10.6** Different valid fingerprints между families не являются FAIL.
- **AC-10.7** Target connectivity timeout после ALLOW классифицируется FAIL, не UNKNOWN.
- **AC-10.8** Internal scanner network failure классифицируется UNKNOWN/internal_network_error.
- **AC-10.9** Cipher grading/HTTP/HSTS/OCSP не входят в MVP.
- **AC-10.10** TLS CheckResult использует `TlsCheckTarget`/`TlsCheckSource` contract §10.3.
- **AC-10.11** Aggregate certificate checks используют `dependencyMode=ANY` между IPv4/IPv6 connectivity prerequisites: один successful certificate-bearing path достаточен для eligibility, а все successful certificate-bearing paths участвуют в aggregate evaluation.

---

# 11. Domain Health Summary & Issues

§11 является нормативным владельцем Issue aggregation, Summary, Confidence и verdict semantics.

## 11.1. Issue

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

Issue создаётся только из FAIL checks.

## 11.2. Aggregation

Один root defect → один Issue и один Score penalty.

MVP aggregation только внутри одной category. Cross-category aggregation запрещена configuration validation.

Issue severity = maximum severity среди включённых FAIL checks.

## 11.3. Summary

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

## 11.4. Confidence

```text
confidence {
  level: HIGH | REDUCED
  unknownChecksCount
  affectedCategories[]
}
```

`affectedCategories` ровно categories с `completeness=PARTIAL`.

## 11.5. Verdicts

```text
HEALTHY
RECOMMENDATIONS
PROBLEMS
CRITICAL_PROBLEM
NO_CONFIRMED_ISSUES_INCOMPLETE
```

Rules:

- no Issues + HIGH → HEALTHY;
- informational only → RECOMMENDATIONS;
- warning exists, no critical → PROBLEMS;
- any critical → CRITICAL_PROBLEM;
- no Issues + REDUCED → NO_CONFIRMED_ISSUES_INCOMPLETE.

Confirmed Issues не скрываются Reduced Confidence.

## 11.6. Acceptance Criteria

- **AC-11.1** Issue создаётся только из FAIL.
- **AC-11.2** UNKNOWN/N/A не создают Issue.
- **AC-11.3** Cross-category Issue aggregation запрещена.
- **AC-11.4** One root defect даёт one Issue.
- **AC-11.5** HIGH iff visible UNKNOWN отсутствуют.
- **AC-11.6** No Issues + REDUCED не даёт HEALTHY.
- **AC-11.7** `score=100 + REDUCED` допустим и не означает HEALTHY автоматически.

---

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

# 13. Human-readable Messages & Localization

§13 является нормативным владельцем message semantics и localization.

## 13.1. Message model

Используется только `MessageDescriptor` §6.

Check message отвечает: **что показал конкретный check**.

Issue message отвечает: **какая подтверждённая проблема обнаружена, почему это важно и что делать**.

Issue message может отличаться от primary Check message.

## 13.2. Human explanation pattern

```text
Fact → Impact → Recommendation
```

Impact/recommendation добавляются только если их можно утверждать evidence-bound.

## 13.3. UNKNOWN wording

UNKNOWN формулируется как «не удалось проверить/получить данные» и не обвиняет target.

`provider_not_supported` явно объясняется как limitation 2check.

## 13.4. PASS wording

PASS не преобразуется автоматически в «всё настроено правильно».

Например AAAA resolve PASS + ABSENT → «AAAA не обнаружена».

## 13.5. Unsupported causality

Запрещены необоснованные утверждения вроде:

- resolver mismatch = DNS propagation;
- IPv6 connect failure = firewall;
- NXDOMAIN = домен свободен для покупки;
- Registry failure = домен не зарегистрирован;
- untrusted chain = сертификат отвергают все браузеры.

## 13.6. Localization

Mandatory locales:

```text
ru | uz | en
```

Missing mandatory translation — build/config error.

Runtime fallback: requested locale → EN → safe generic message.

Raw code может показываться только Technical context.

## 13.7. Acceptance Criteria

- **AC-13.1** MessageDescriptor единый для Check/Issue/WebApiError.
- **AC-13.2** UNKNOWN language не утверждает target defect.
- **AC-13.3** provider_not_supported объясняется как limitation продукта.
- **AC-13.4** PASS wording factual, не шаблонно-positive.
- **AC-13.5** Unsupported causality запрещена.
- **AC-13.6** RU/UZ/EN mandatory.
- **AC-13.7** Missing translation блокирует production configuration/build.
- **AC-13.8** Message params structured, escaped, без pre-rendered HTML.

---

# 14. Cache & Freshness

§14 является нормативным владельцем generic internal cache mechanism и freshness semantics.

## 14.1. Cache roles

Различаются:

1. internal 2check reusable cache;
2. external provider cache;
3. historical/previous ScanResult.

Redis mandatory.

## 14.2. Cache modes

```text
NORMAL
FORCE_REFRESH
```

NORMAL может использовать compatible fresh internal cache.

FORCE_REFRESH:

- bypass internal reusable cache для выбранного scope;
- выполняет новый external/network execution;
- записывает новый cache result;
- не purge cache автоматически;
- не заставляет recursive DNS resolver игнорировать его собственный TTL.

## 14.3. Sequential vs concurrent refresh

Два последовательных FORCE_REFRESH после completion → два новых executions.

Concurrent FORCE_REFRESH может coalesce только в currently-running fresh execution.

## 14.4. Stale

Stale old success не заменяет current failed refresh.

Current result может быть UNKNOWN, а previous/last-known показывается отдельно.

## 14.5. Cache keys

Conceptual module keys включают `cacheContractVersion` и relevant technical config versions.

DNS:

```text
asciiHostname
resolverSetVersion
dnsModuleConfigVersion
cacheContractVersion
```

Registry:

```text
registryDomain
registryProvider
registryModuleConfigVersion
cacheContractVersion
```

TLS stable key:

```text
asciiHostname
port
tlsModuleConfigVersion
trustStoreVersion
cacheContractVersion
```

Locale не входит в technical cache key.

## 14.6. TLS dependency compatibility

`dependencyFingerprint` не является stable cache-key dimension.

```text
TlsCacheEntry {
  result
  dependencyFingerprint
  freshness
}
```

После stable lookup вычисляется current fingerprint из current DNS/security prerequisites. Match → reuse может быть разрешён; mismatch → fresh TLS probe.

## 14.7. Single-flight

Concurrent identical NORMAL misses могут coalesce.

Single-flight не объединяет `scanId`.

## 14.8. Failure cache

Transient UNKNOWN может кратко кэшироваться. FORCE_REFRESH bypass failure cache.

## 14.9. Acceptance Criteria

- **AC-14.1** Redis mandatory.
- **AC-14.2** FORCE_REFRESH не является cache purge.
- **AC-14.3** Sequential FORCE_REFRESH создаёт новый execution каждый раз.
- **AC-14.4** Stale success не маскирует current UNKNOWN.
- **AC-14.5** Locale не входит в technical key.
- **AC-14.6** Registry key использует canonical `registryModuleConfigVersion`.
- **AC-14.7** TLS fingerprint хранится как compatibility metadata, не stable key.
- **AC-14.8** Single-flight не объединяет scan identity.

---

# 15. Security & SSRF

§15 является нормативным владельцем IP classification, SSRF, target-wide validation и security policy.

## 15.1. Pipeline

```text
CanonicalDomain
→ DNS A/AAAA
→ full candidate set
→ Security Validation
→ ALLOW | BLOCK | INDETERMINATE
→ selected validated endpoint
→ pinned connection
```

## 15.2. SecurityValidationResult

```text
SecurityValidationResult {
  decision: ALLOW | BLOCK | INDETERMINATE
  policyVersion
  checkedAddressCount
  blockedAddressCount
  reasonCode?
}
```

## 15.3. Target-wide rule

Если хотя бы один candidate IP запрещён → весь target BLOCK.

Запрещено фильтровать bad IP и продолжать по good IP.

## 15.4. Classification

Минимально:

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

IPv4-mapped IPv6 проверяет embedded IPv4.

## 15.5. Special-purpose ranges

IANA special-purpose ranges default deny, если explicit allowlist не определён. MVP allowlist пуст.

## 15.6. Security INDETERMINATE

Если невозможно доказать безопасность полного candidate set, connection запрещается.

Visible network check получает UNKNOWN `security_validation_incomplete`.

## 15.7. Security BLOCK

BLOCK использует `ssrf_policy_block`; no network connection; visible dependent TLS result UNKNOWN, без Issue/Score penalty.

## 15.8. Error boundary

`security_validation_incomplete` — failure до network probe внутри Security Validation.

`internal_network_error` — после Security ALLOW во время scanner/network execution.

## 15.9. Pinning

После ALLOW connection идёт напрямую к validated IP с hostname в SNI. Library не должна implicit resolve hostname снова.

## 15.10. internalInfrastructureDenylist

Поддержка обязательна. Concrete values deployment-specific и принадлежат Technical Architecture/security configuration. Effective change влияет на `securityPolicyVersion`.

## 15.11. Acceptance Criteria

- **AC-15.1** ANY forbidden candidate blocks whole target.
- **AC-15.2** Security validation fail closed.
- **AC-15.3** Full candidate set проверяется без truncation-before-security.
- **AC-15.4** Rebinding предотвращается pinned connection.
- **AC-15.5** Security BLOCK не создаёт Domain Issue.
- **AC-15.6** `security_validation_incomplete` и `internal_network_error` различаются по pipeline stage.
- **AC-15.7** internalInfrastructureDenylist участвует в effective security policy version.

---

# 16. Scan Orchestration & Execution Model

§16 является нормативным владельцем scan lifecycle, ScanPlan, barriers, deadline и finalization.

## 16.1. Execution states

```text
PENDING | RUNNING | COMPLETED | FAILED
```

No public CANCELLED in MVP.

## 16.2. ScanRequest

```text
ScanRequest {
  input
  mode: FULL | PARTIAL
  selectedCategories?
  cacheMode: NORMAL | FORCE_REFRESH
}
```

Input preprocessing выполняется до scan creation. Invalid input → no `scanId`.

## 16.3. ScanPlan

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

Internal prerequisites не расширяют visible scope и не создают hidden category/score/issues.

## 16.4. ExecutionContext

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

Frozen на весь scan. Hybrid config scan запрещён.

## 16.5. Parallelism/dependencies

DNS и Registry могут выполняться параллельно.

TLS зависит от A/AAAA + Security, но не ждёт MX/TXT/NS/CNAME/SOA.

## 16.6. Address Resolution Barrier

Все scheduled A/AAAA resolver operations достигают terminal transport/DNS outcome.

После barrier формируется immutable:

```text
sealedDnsAddressCandidates
```

Security ALLOW только после sealed full set. Early BLOCK разрешён при обнаружении forbidden candidate.

## 16.7. Global deadline

Unfinished root check, прерванный global deadline:

```text
UNKNOWN / scan_deadline_exceeded
```

Dependent check → UNKNOWN `blockedBy`.

Если trustworthy terminal results сформированы, scan остаётся COMPLETED с `completionReason=DEADLINE_TERMINALIZED`.

## 16.8. Finalization

Deterministic order:

```text
CheckResult[]
→ CategoryResult[]
→ Issues
→ Confidence
→ Verdict
→ Score
```

Frontend не выполняет authoritative finalization.

## 16.9. Scan failure

FAILED только если невозможно сформировать trustworthy terminal ScanResult.

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

`execution_state_unrecoverable` — orphaned non-terminal scan после lost execution, когда safe deterministic resume невозможен.

## 16.10. Acceptance Criteria

- **AC-16.1** Invalid input не создаёт scanId.
- **AC-16.2** ExecutionContext frozen на scan.
- **AC-16.3** TLS-only PARTIAL может выполнять hidden DNS/security prerequisites без visible DNS category.
- **AC-16.4** TLS не стартует только по early quorum до address barrier.
- **AC-16.5** Security ALLOW требует sealed candidate set.
- **AC-16.6** Deadline может terminalize root checks в UNKNOWN без Scan FAILED.
- **AC-16.7** Finalization deterministic и backend-owned.
- **AC-16.8** FAILED только при невозможности trustworthy final result.
- **AC-16.9** Orphaned unrecoverable execution → `execution_state_unrecoverable`.

---

# 17. Internal Web API Contract

§17 является нормативным владельцем browser frontend ↔ backend MVP API. Это не Phase-3 Public API.

## 17.1. Endpoints

```text
POST /api/web/v1/scans
GET  /api/web/v1/scans/{scanId}
GET  /api/web/v1/scans/{scanId}/details
GET  /api/web/v1/scans/{scanId}/registry/registrant
```

## 17.2. CreateScanRequest

```text
CreateScanRequest {
  input
  mode: FULL | PARTIAL
  selectedCategories?: (dns | registry | tls)[]
  cacheMode?: NORMAL | FORCE_REFRESH
}
```

Default `cacheMode=NORMAL`.

FULL → `selectedCategories` omitted. PARTIAL → strict non-empty proper subset of `{dns, registry, tls}`. Frontend при выборе всех трёх categories обязан отправлять `mode=FULL`. Если backend всё же получает `mode=PARTIAL` со всеми тремя categories, request отклоняется как invalid scope: HTTP `422`; silent normalization в FULL запрещена.

## 17.3. CreateScanResponse

```text
CreateScanResponse {
  scanId
  executionState: PENDING | RUNNING
  pollAfterMs?
}
```

`POST /scans` является **acceptance boundary**, а не terminal result endpoint.

Canonical client model:

```text
POST /scans
→ acceptance + scanId

GET /scans/{scanId}
→ authoritative current state
→ PENDING | RUNNING | COMPLETED | FAILED
```

Даже full compatible cache hit не возвращает COMPLETED/FAILED в CreateScanResponse. Scan может фактически завершиться между формированием POST response и первым GET; это допустимая race condition.

## 17.4. WebApiError

```text
WebApiError {
  errorCode
  message: MessageDescriptor
  field?
  retryable: boolean
  retryAfterSeconds?
  requestId?
}
```

Web API errorCode и Check `reasonCode` — разные namespaces.

## 17.5. WebScanResponse

```text
WebScanResponse {
  scanId
  executionState
  mode
  canonicalDomain
  selectedCategories[]
  progress?
  categories[]
  summary?
  startedAt
  completedAt?
  pollAfterMs?
  failure?
}
```

Public CanonicalDomain projection не включает `originalInput`.

`categories[]` всегда соответствует `ScanPlan.visibleCategories`.

## 17.6. CheckResult projection retryability

Browser projection поддерживает:

```text
retryability?: RETRYABLE | CONDITIONAL | NOT_RETRYABLE
retryAfterSeconds?
```

Value определяется backend Failure Policy §18. Frontend не выводит retryability из `reasonCode`.

Dependency-driven result с `blockedBy` не получает искусственную own retryability.

## 17.7. HTTP semantics

- 200 — existing scan read независимо от Health verdict;
- 202 — scan accepted;
- 400 — malformed/input validation;
- 403 — gated denied;
- 404 — scan unknown/expired;
- 413 — payload too large;
- 415 — media type;
- 422 — invalid scope;
- 429 — Web API rate limit;
- 500 — request-level platform failure outside normal scan lifecycle;
- 503 — cannot safely accept scan.

Provider 429 внутри scan → check UNKNOWN, GET scan остаётся HTTP 200.

## 17.8. Refresh

Refresh создаёт новый `POST /scans` с FORCE_REFRESH. PATCH existing scan отсутствует.

## 17.9. Security controls

Frontend не может передать arbitrary IP/resolver/provider/port/skipSSRF/network parameters.

Unknown top-level create fields rejected; enums strict.

## 17.10. Acceptance Criteria

- **AC-17.1** POST возвращает только PENDING/RUNNING acceptance state.
- **AC-17.2** Terminal state/result authoritative только через GET.
- **AC-17.3** Cache-hit не меняет POST→GET model.
- **AC-17.4** HTTP status не кодирует Domain Health.
- **AC-17.5** Visible categories не включают internal prerequisites.
- **AC-17.6** Retryability приходит backend-projected.
- **AC-17.7** Gated Registry data имеет отдельный endpoint.
- **AC-17.8** Raw RDAP/WHOIS endpoint отсутствует.
- **AC-17.9** Refresh создаёт новый scanId.
- **AC-17.10** User cannot override security/network policy.
- **AC-17.11** `PARTIAL` с `dns+registry+tls` отклоняется HTTP 422 и не normalizes silently в FULL.

---

# 18. Error Taxonomy & Failure Handling

§18 является нормативным владельцем error layers, reason/retry semantics и failure normalization.

## 18.1. Error layers

1. Input Error — до scan, no scanId.
2. Web API Error — request-level.
3. Check Technical Uncertainty — UNKNOWN reasonCode/blockedBy.
4. Scan Execution Failure — FAILED if trustworthy final result impossible.

Target problem → FAIL. Technical inability → UNKNOWN.

## 18.2. reasonCode rule

`reasonCode` только на UNKNOWN с own technical execution cause.

Нет `reasonCode` на PASS/FAIL/N/A.

Dependency UNKNOWN использует только `blockedBy`.

## 18.3. Retryability

```text
RETRYABLE | CONDITIONAL | NOT_RETRYABLE
```

Backend Failure Policy является owner mapping code → retryability.

Examples:

- provider_unavailable → обычно RETRYABLE;
- rate_limited → CONDITIONAL;
- provider_not_supported → NOT_RETRYABLE.

Frontend не хранит parallel mapping.

## 18.4. Timeout semantics

Timeout не означает universal UNKNOWN.

- DNS provider timeout может быть absorbed quorum aggregation;
- Registry exhausted provider timeout → UNKNOWN/timeout;
- validated target TCP/handshake timeout → TLS connectivity FAIL;
- scanner internal network error after ALLOW → UNKNOWN/internal_network_error;
- Security processing incomplete before probe → UNKNOWN/security_validation_incomplete;
- global scan deadline → UNKNOWN/scan_deadline_exceeded.

## 18.5. Provider/source technical errors

`malformed_response`, `parse_error`, `encoding_error`, `protocol_error` не означают target absence.

`module_execution_error` — generic fallback только если более precise code отсутствует.

Raw exception strings не используются как stable reasonCode.

## 18.6. Scan failure catalog

Canonical §16 catalog используется без дополнительных дубликатов.

## 18.7. Acceptance Criteria

- **AC-18.1** Target problem и technical inability различаются FAIL vs UNKNOWN.
- **AC-18.2** reasonCode только на own UNKNOWN.
- **AC-18.3** blockedBy и reasonCode mutually exclusive.
- **AC-18.4** Retryability backend/config-owned.
- **AC-18.5** provider_not_supported NOT_RETRYABLE.
- **AC-18.6** Timeout classification stage-specific.
- **AC-18.7** Raw exceptions normalize to stable codes.
- **AC-18.8** Generic fallback не используется при наличии precise reason.

---

# 19. Data Model & Persistence

§19 является нормативным владельцем logical persistence/data classification/retention relationships.

## 19.1. Logical stores

```text
1. Scan Store
2. Reusable Cache
3. Sensitive / Gated Data Store
4. Operational Logs / Metrics
```

Physical implementation technology не фиксируется PRD.

## 19.2. Historical Scan

PENDING/RUNNING execution record mutable.

После COMPLETED/FAILED terminal snapshot immutable.

Новый refresh создаёт новый scanId и не изменяет historical snapshot.

## 19.3. Stored data

COMPLETED FULL snapshot сохраняет достаточно normalized data для:

- CheckResults;
- CategoryResults;
- Issues;
- Summary;
- ScoreBreakdown;
- executionContext;
- relevant technical audit metadata.

Historical result не пересчитывается current policy.

## 19.4. TLS execution metadata

Canonical structure:

```text
TlsExecutionMetadata {
  selectedIPv4?
  selectedIPv6?
  dependencyFingerprint
  securityPolicyVersion
  tlsModuleConfigVersion
  trustStoreVersion
  resultSource: FRESH | CACHE
}
```

Минимальный prerequisite audit subset: selected endpoints + dependencyFingerprint + securityPolicyVersion.

## 19.5. Freshness persistence

Persist source-of-truth `checkedAt`/`sourceUpdatedAt?` и provenance `cached`.

`cacheAge` может вычисляться на read.

## 19.6. originalInput

Не сохраняется в Scan Store по умолчанию. URL path/query/fragment/credentials не являются persisted Domain Health data.

## 19.7. Data classification

```text
PUBLIC_NORMALIZED
TECHNICAL_INTERNAL
GATED_SENSITIVE
OPERATIONAL_SECRET
```

Mapping к API:

- PUBLIC_NORMALIZED → Public;
- TECHNICAL_INTERNAL → может быть explicit Safe Technical Projection;
- GATED_SENSITIVE → Gated;
- OPERATIONAL_SECRET → no Web API projection.

`TECHNICAL_INTERNAL` не означает автоматически browser-visible и не означает автоматически backend-only.

## 19.8. Registry data

Public Scan Store содержит normalized non-sensitive Registry fields и registrant state only.

Actual registrant values/raw sensitive RDAP/WHOIS — separate sensitive boundary при необходимости.

## 19.9. Retention

Разные lifecycle для:

- ScanResult;
- reusable cache;
- gated PII;
- raw provider diagnostics;
- logs/metrics.

Exact durations owned by Data Retention/Security/Architecture policy.

Persistence scan resources не создаёт Domain History product feature.

Primary retrieval identity = `scanId`.

## 19.10. Integrity

COMPLETED publish only after atomic consistent terminal snapshot.

ScorePenalty.issueId ссылается на существующий Issue; Issue check references должны быть valid within same scan/category.

Storage representation versioned через `storageSchemaVersion`.

## 19.11. Acceptance Criteria

- **AC-19.1** Scan Store и Reusable Cache semantic roles разделены.
- **AC-19.2** Terminal snapshot immutable.
- **AC-19.3** Historical policy/score не пересчитываются.
- **AC-19.4** `originalInput` не persisted по умолчанию.
- **AC-19.5** Actual Registry PII separate gated storage boundary.
- **AC-19.6** TECHNICAL_INTERNAL visibility определяется allowlist projection.
- **AC-19.7** OPERATIONAL_SECRET никогда browser-facing.
- **AC-19.8** Persistence не создаёт implicit Domain History.
- **AC-19.9** Terminal commit atomic/consistent.
- **AC-19.10** Storage schema migration не меняет historical Health semantics.

---

# 20. Configuration & Policy Management

§20 является нормативным владельцем configuration classes/versioning/activation rules.

## 20.1. Classes

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

## 20.2. Versions

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
```

Optional grouping: `configReleaseId`.

`configReleaseId` не заменяет semantic component versions.

## 20.3. Version impact

- severity/Issue grouping/Score penalty → healthPolicyVersion;
- resolver set → resolverSetVersion;
- DNS evaluation semantics → dnsModuleConfigVersion;
- Registry adapter/parser/provider behavior → registryModuleConfigVersion;
- TLS scanner semantics → tlsModuleConfigVersion;
- trust anchors → trustStoreVersion;
- SSRF/internal denylist semantics → securityPolicyVersion;
- global deadline/orchestration behavior → orchestrationConfigVersion;
- generic cache serialization/compatibility → cacheContractVersion.

## 20.4. Health policy vs technical observations

Health-only policy change может reuse compatible technical observations.

Historical scans не пересчитываются.

## 20.5. Configuration immutability

Один version ID не обозначает разный content.

Semantic content change требует version change.

Optional deterministic content hash рекомендуется как integrity mechanism.

## 20.6. Activation

Candidate config:

```text
load
→ schema validation
→ cross-reference validation
→ semantic/security validation
→ atomic activation
```

Running scan продолжает frozen old configuration.

Invalid mandatory startup configuration → service not ready/fail-fast; hidden fallback запрещён.

## 20.7. Secrets

Secrets не входят в ScanResult/ExecutionContext/config content shown to browser.

Secret rotation без semantic behavior change не требует artificial module version bump.

## 20.8. Acceptance Criteria

- **AC-20.1** Configuration разделена по semantic classes.
- **AC-20.2** Semantic change меняет соответствующую version.
- **AC-20.3** Same version different content запрещён.
- **AC-20.4** Running scan использует frozen config snapshot.
- **AC-20.5** Activation atomic и предварительно validated.
- **AC-20.6** Unknown check references/cross-category Issue rules invalid config.
- **AC-20.7** User API не изменяет policy/quorum/trust/SSRF parameters.
- **AC-20.8** Canonical Registry technical configuration identifier = `registryModuleConfigVersion`.

---

# 21. Observability, Logging & Operational Monitoring

§21 является единственным normative owner metric naming/structure, logging, readiness and alerting semantics.

## 21.1. Platform vs Domain Health

Observability отвечает «работает ли 2check», Domain Health — «что с target».

Domain FAIL не является platform ERROR автоматически.

## 21.2. Correlation

```text
requestId
→ scanId
→ moduleExecutionId?
→ operationId?
```

Single-flight shared work может иметь один moduleExecutionId для нескольких scanId.

## 21.3. Structured logs

Stable bounded event names; no user-controlled event names.

Standard logs не содержат:

- originalInput/path/query;
- Authorization/Cookie/session secrets;
- registrant PII;
- raw RDAP/WHOIS body;
- internal denylist values.

## 21.4. Metrics naming ownership

Имена в ранних sections считаются signal requirements, а точный naming принадлежит §21.

Canonical examples:

```text
cache_lookup_total{module,outcome}
cache_bypass_total{module}
cache_write_error_total{module}
singleflight_join_total{module}
force_refresh_total{module?}
security_validation_total{decision}
ssrf_policy_block_total
security_validation_error_total
scan_started_total
scan_completed_total
scan_failed_total
```

Counters используют `_total` convention.

## 21.5. Cardinality

Запрещены unrestricted labels:

- hostname;
- IP;
- scanId;
- requestId;
- fingerprint;
- internal CIDR.

## 21.6. Readiness

Not ready при невозможности безопасно принять scan, например:

- invalid/missing Security Policy;
- invalid/missing mandatory trust store;
- mandatory Scan Store unavailable/incompatible.

External RDAP/WHOIS/DNS provider outage сам по себе не делает весь instance unready.

Redis outage может быть DEGRADED, если safe bypass сохраняет correctness.

## 21.7. Alerts

Alert candidates:

- Web API 5xx/503 growth;
- Scan FAILED growth;
- Scan Store failures;
- config/security activation/drift;
- internal security validation errors;
- provider/rate-limit spikes;
- abnormal latency/resource saturation.

Domain FAIL rate не является default pager signal.

## 21.8. Acceptance Criteria

- **AC-21.1** Observability и Domain Health разделены.
- **AC-21.2** §21 canonicalizes metric names.
- **AC-21.3** Logs structured и redacted.
- **AC-21.4** High-cardinality target values не metric labels.
- **AC-21.5** External provider outage не обязательно blocks readiness.
- **AC-21.6** Invalid Security Policy blocks readiness.
- **AC-21.7** Domain FAIL не логируется ERROR только из-за FAIL status.
- **AC-21.8** Historical diagnostics используют versions конкретного scan.

---

# 22. Performance, Resource Limits & NFR

§22 является normative owner bounded resource/performance behavior, но exact result-affecting values принадлежат versioned config/module owners.

## 22.1. Bounded execution

Все externally influenced operations bounded по:

- concurrency;
- queue;
- timeout;
- retries;
- response size;
- candidate count processing;
- memory;
- sockets;
- storage payload.

## 22.2. Backpressure

При saturation используются bounded queue/rate limiting/429/503, а не unlimited concurrency.

Accepted scan не остаётся RUNNING бесконечно; global deadline mandatory.

## 22.3. Provider/network budgets

Один Scan Plan имеет bounded **logical per-scan operation budget**.

После cache/single-flight реальные calls учитываются как **physical shared-execution budget**.

Single-flight уменьшает physical calls, но не расширяет logical Scan Plan и не обходит admission/rate/global limits.

## 22.4. Parser/input limits

DNS/Registry/TLS parser inputs bounded.

Нельзя silently truncate semantic data, если это может изменить status/Security/Issue/Score/fingerprint.

Security candidate set не truncates: невозможность проверить весь set → INDETERMINATE fail-closed.

## 22.5. Graceful degradation

Independent module/provider failure не блокирует остальные modules автоматически.

Degradation не означает guessing/stale-as-fresh.

Security semantics не ослабляются под load.

## 22.6. Graceful shutdown/crash

Controlled shutdown:

1. not-ready;
2. stop accepting new scans;
3. bounded grace period;
4. complete/terminalize safely;
5. no corrupt snapshot.

Unrecoverable orphan after crash → FAILED `execution_state_unrecoverable`.

Exactly-once distributed resume не требуется MVP.

## 22.7. One-VPS constraint

MVP correctness deployable на одном VPS. Capacity exhaustion приводит к controlled backpressure, не semantic downgrade.

## 22.8. Acceptance Criteria

- **AC-22.1** Unlimited parallelism отсутствует.
- **AC-22.2** Global scan deadline mandatory.
- **AC-22.3** Operation timeouts bounded и module-owned.
- **AC-22.4** Logical/physical budgets разделены.
- **AC-22.5** Single-flight не обходит admission controls.
- **AC-22.6** Security candidate set не silently truncates.
- **AC-22.7** High load не уменьшает scan scope/security semantics скрыто.
- **AC-22.8** Graceful shutdown сохраняет terminal integrity.
- **AC-22.9** One VPS capacity limit обрабатывается backpressure.

---

# 23. Frontend UX & Result Presentation

§23 является normative owner пользовательского flow/presentation и Share Result.

## 23.1. Main flow

```text
Input
→ FULL/PARTIAL
→ RUNNING progress
→ FINAL Summary
→ Issues
→ DNS / Домен / SSL/TLS
→ Recommendations
→ Technical Details
```

## 23.2. RUNNING

Показываются states visible categories. Hidden prerequisites не создают user-facing DNS category в TLS-only scan.

No fake exact percentage, если backend не даёт meaningful progress.

Provisional Issues могут показываться, но не как final total. Final Score во время RUNNING отсутствует.

## 23.3. FINAL FULL hierarchy

```text
Verdict
→ Score + Confidence
→ Issues
→ Category Cards
→ Technical Details
```

Verdict primary. Frontend не выводит verdict из Score.

`score=100 + REDUCED` не показывается как unconditional «всё отлично».

## 23.4. Category labels

Primary UI:

```text
DNS
Домен
SSL/TLS
```

Registry/RDAP/WHOIS — technical terminology.

## 23.5. UNKNOWN/N/A

UNKNOWN — «не удалось проверить», не confirmed domain problem.

N/A neutral и может быть hidden в summary; Technical Details может показать factual reason.

## 23.6. Technical Details

Получаются через `/details`; explicit allowlist; no admin/internal secrets.

## 23.7. Freshness

`completedAt` не заменяет `checkedAt`.

Cached age должен быть доступен; mixed freshness не схлопывается в false global timestamp.

## 23.8. Refresh/Retry

Refresh → new FORCE_REFRESH scan.

Retry CTA основывается только на backend `retryability`:

- RETRYABLE → immediate retry допустим;
- CONDITIONAL → conditional/delayed UX;
- NOT_RETRYABLE → retry не показывается как solution.

Frontend не map'ит reasonCode самостоятельно.

## 23.9. Share Result

Для COMPLETED scan action:

```text
Поделиться
```

MVP share model:

```text
existing ScanResult
→ on-demand Share Card image
→ native Share Sheet
```

Fallback — save image.

Нет:

- «Скопировать ссылку»;
- shareId/shareToken;
- dedicated share URL/page;
- QR code;
- server-side share history.

Share Card использует только Safe Public Projection, без Technical Details/PII/scanId/URL/originalInput.

FULL card может показывать verdict/Score/Confidence/categories/issues. PARTIAL card не показывает global Score/verdict.

## 23.10. Accessibility/responsive

Desktop/mobile supported. Keyboard/focus/semantic headings/non-color status signals mandatory. Technical tables могут иметь bounded horizontal scrolling внутри container.

## 23.11. Acceptance Criteria

- **AC-23.1** Backend authoritative для verdict/score/severity/confidence/retryability.
- **AC-23.2** Internal prerequisites hidden из main progress.
- **AC-23.3** PARTIAL не показывает global Score/verdict.
- **AC-23.4** UNKNOWN не отображается как confirmed problem.
- **AC-23.5** Cached/mixed freshness отображается честно.
- **AC-23.6** Retry CTA использует backend retryability.
- **AC-23.7** Share image-only, без share link entity.
- **AC-23.8** Share Card не содержит PII/scanId/URL/QR/internal data.
- **AC-23.9** Supported UX accessible keyboard/non-color semantics.

---

# 24. SEO, Routing & Public Tool Pages

§24 является normative owner public frontend routing/indexing SEO policy.

## 24.1. Indexable pages

Indexable product/tool pages:

```text
/{locale}/
/{locale}/dns-check
/{locale}/whois
/{locale}/ssl-check
```

Locale prefixes:

```text
ru | uz | en
```

`/` может быть locale-neutral entry/x-default.

## 24.2. Scan route

```text
/{locale}/scan/{scanId}
```

Individual scan pages всегда `noindex` независимо от verdict/score/cache.

scanId, не domain, является route identity.

No public `/domain/{domain}` permanent history resource MVP.

## 24.3. Canonical/hreflang

Localized indexable pages self-canonical и reciprocal hreflang.

Query prefill/tracking params не создают canonical variants.

Canonical не заменяет `noindex` scan page.

## 24.4. Sitemap

Только intended indexable pages. Scan/API/gated routes отсутствуют.

robots.txt не является security boundary и не заменяет page `noindex`.

## 24.5. Honest SEO scope

- DNS page не заявляет true geo DNS;
- WHOIS page не заявляет universal all-TLD support;
- SSL page не заявляет cipher grading/HSTS/OCSP/HTTP checks.

Tool pages содержат полезный explanatory content, но deep repair guides — Phase 2.

## 24.6. Share relation

Built-in Share Result не создаёт share URL/page/indexable entity. Existing scan route остаётся noindex read route.

## 24.7. Privacy

`originalInput`/PII не включаются в SEO metadata. Health Score не размечается как review/aggregate rating.

Crawler GET к tool/scan page не запускает external scan/refresh.

## 24.8. Acceptance Criteria

- **AC-24.1** Product/tool pages indexable, individual scans noindex.
- **AC-24.2** Scan route использует opaque scanId.
- **AC-24.3** Scan routes не sitemap/history directory.
- **AC-24.4** SEO copy не обещает out-of-scope features.
- **AC-24.5** Built-in Share не создаёт dedicated share URL.
- **AC-24.6** Crawler GET не запускает network scan.
- **AC-24.7** PII/originalInput не попадают в SEO metadata.

---

# 25. Privacy, Data Protection & Abuse Boundaries

§25 является normative owner scan access model/privacy/abuse boundaries.

## 25.1. MVP identity model

User account/login не required для ordinary Domain Health scan.

## 25.2. Scan access

Safe scan resource использует capability-style access по high-entropy opaque `scanId`.

В пределах retention знание valid `scanId` достаточно для:

- Public ScanResult;
- Safe Technical Details.

No session ownership required для этих safe projections.

## 25.3. Gated data

`scanId` alone **не** даёт доступ к actual Registry registrant PII.

Gated endpoint требует отдельный server-side authorization/gating condition.

При отсутствии reliable gate PII не возвращается browser.

## 25.4. ScanId security

- opaque;
- unpredictable;
- non-sequential;
- sufficient entropy против practical enumeration.

No scan listing/history/search API.

Unknown/expired scanId → generic 404 behavior.

## 25.5. Leakage prevention

Scan route treated as access-bearing URL.

Strict Referrer Policy, предпочтительно `no-referrer`, предотвращает cross-origin leakage full scan URL.

Actual scanId/domain/originalInput/PII не передаются third-party analytics.

## 25.6. Data minimization

After preprocessing execution uses CanonicalDomain.

Original URL path/query/fragment/credentials не provider data и не persistent product data.

Providers получают только protocol-required target information, без user/session/scanId metadata.

## 25.7. Public target scope

Proof of ownership domain не требуется для bounded public DNS/Registry/TLS:443 observations.

MVP не является arbitrary port scanner или HTTP content crawler.

## 25.8. Abuse

Controls покрывают:

- high-rate scans;
- FORCE_REFRESH abuse;
- repeated target scans;
- provider amplification;
- SSRF probing;
- oversized input;
- scanId enumeration;
- gated endpoint probing.

Exact thresholds operational config-owned.

## 25.9. Share privacy

Image-only Share не содержит access capability и не отслеживает recipient/destination.

## 25.10. Acceptance Criteria

- **AC-25.1** Safe result capability access по scanId без account/session ownership.
- **AC-25.2** scanId alone недостаточен для gated PII.
- **AC-25.3** No scan enumeration/history API.
- **AC-25.4** Cross-origin referrer leakage scanId предотвращается.
- **AC-25.5** Third-party analytics не получает scanId/domain/originalInput/PII.
- **AC-25.6** Providers не получают user/session identifiers.
- **AC-25.7** Proof of domain ownership не required для MVP public observations.
- **AC-25.8** Arbitrary ports/port scanning отсутствуют.
- **AC-25.9** Abuse controls не меняют Domain Health semantics.

---

# 26. Testing, Quality Gates & Acceptance Strategy

§26 является normative owner release verification strategy.

## 26.1. Test layers

```text
Unit
Fixture / Golden
Contract
Integration
E2E
Security
Browser Compatibility
Accessibility / Localization
Failure Injection
Performance / Capacity
Privacy Leakage
```

## 26.2. Required deterministic coverage

- input/IDN/PSL;
- DNS ANSWER/NODATA/NXDOMAIN/quorum/tie/value variation;
- `.uz` RDAP/WHOIS registered/free/malformed/rate-limit/encoding fixtures;
- TLS valid/expired/mismatch/self-signed/untrusted/expired intermediate/IPv4/IPv6/protocol/timeouts;
- dependency propagation, включая `dependencyMode=ANY` для TLS aggregate certificate checks при single-family и dual-family paths;
- reasonCode/blockedBy invariants;
- SSRF forbidden ranges/rebinding/pinning;
- Issue dedupe/cross-category rejection;
- Score/confidence/verdict;
- NORMAL/FORCE_REFRESH/single-flight/cache compatibility;
- policy/config validation;
- API projections/access boundaries;
- persistence/crash recovery.

## 26.3. Retryability contract tests

Backend contract tests покрывают RETRYABLE/CONDITIONAL/NOT_RETRYABLE.

Frontend test должен доказывать отсутствие client-side reasonCode mapping. Controlled fixture может передать известный reasonCode с intentionally different retryability; frontend обязан следовать projected retryability.

NOT_RETRYABLE не показывает immediate Retry CTA; CONDITIONAL не становится unconditional immediate retry.

## 26.4. Technical projection tests

Для TECHNICAL_INTERNAL обязательны:

- positive case: allowlisted field присутствует `/details`;
- negative case: non-allowlisted field того же storage class отсутствует.

## 26.5. Browser compatibility matrix

Mandatory targets:

1. Google Chrome Desktop;
2. Google Chrome Android;
3. Apple Safari macOS;
4. Apple Safari iOS/iPadOS;
5. Microsoft Edge Desktop;
6. Mozilla Firefox Desktop;
7. Mozilla Firefox Android;
8. Yandex Browser Desktop;
9. Yandex Browser Android;
10. Samsung Internet Android.

Evergreen support target: current stable + previous stable/release generation, practically available.

Required real engines: Chromium, WebKit, Gecko.

Yandex Browser не считается автоматически покрытым Chrome tests.

Opera Desktop — optional additional target.

## 26.6. Share compatibility

Если native file share API доступен → Share Sheet. Если нет → working image-save fallback. Absence native share не делает browser unsupported.

## 26.7. Failure injection

Минимально:

- DNS timeout;
- Registry timeout/malformed/encoding;
- Redis unavailable;
- Scan Store unavailable;
- target TLS timeout;
- internal network error;
- Security validation error;
- global deadline;
- worker crash.

Orphan RUNNING + no safe resume → FAILED `execution_state_unrecoverable`.

## 26.8. Release blockers

Release blocks при:

- SSRF bypass;
- PII/secret leakage;
- wrong PASS/FAIL/UNKNOWN semantics;
- duplicate Score penalty;
- corrupt historical result;
- broken FULL flow в mandatory browser;
- mandatory locale missing without safe fallback.

## 26.9. Acceptance Criteria

- **AC-26.1** Critical invariants automated where feasible.
- **AC-26.2** Golden fixtures isolate correctness от public Internet flakiness.
- **AC-26.3** Retryability frontend behavior проверяется backend projection, не reasonCode table.
- **AC-26.4** Technical projection имеет positive/negative allowlist tests.
- **AC-26.5** Mandatory browser matrix проходит before production.
- **AC-26.6** SSRF/security regression blocks release.
- **AC-26.7** Share Card tests запрещают PII/scanId/URL/QR/internal data.
- **AC-26.8** Capacity tests проверяют correctness под load, не только throughput.
- **AC-26.9** Dependency tests покрывают `dependencyMode=ANY`: одна successful TLS family разрешает certificate evaluation, обе successful families участвуют в aggregate result.

---

# 27. Deployment, Environments & Release Management

§27 является normative owner environment/release/deployment guarantees.

## 27.1. Environments

Logical model:

```text
development
test
staging
production
```

Production/non-production secrets/data stores isolated.

## 27.2. Release identity

```text
applicationReleaseVersion
```

или equivalent immutable build ID.

Separate:

```text
configReleaseId
```

Release manifest позволяет восстановить deployed combination:

- application release;
- storageSchemaVersion;
- health/security/orchestration/cache/module/trust versions.

No secrets in manifest.

## 27.3. Promotion

Preferred:

```text
build
→ automated tests
→ test
→ staging
→ quality gates
→ production
```

Same immutable artifact promoted staging→production where practical; environment differences via config/secrets.

## 27.4. Migrations

Storage schema changes explicit/versioned/tested.

Migration может менять representation, но не historical Health semantics.

До production известно, reversible migration или forward-only; destructive migration требует backup/equivalent restore strategy.

## 27.5. Deployment/readiness

Normal deployment uses graceful drain/shutdown.

До traffic новая instance подтверждает:

- valid config;
- valid Security Policy;
- loaded trust store;
- compatible/available mandatory Scan Store;
- compatible storage schema.

External provider outage не обязательно blocks readiness.

## 27.6. Cache during releases

Versioned compatibility используется вместо unconditional Redis flush.

Health-only policy change не требует technical cache flush.

Trust store change invalidates affected TLS compatibility.

Security policy change requires current reclassification cached DNS candidates.

## 27.7. Rollback

Rollback application/config/trust store explicit and auditable.

Historical scans unchanged.

Rollback не делает stale/expired cache fresh.

## 27.8. Backup/restore

Reusable cache не authoritative backup target.

Sensitive-data backups соблюдают retention/security policy.

Restore historical ScanResult не превращает его в fresh module cache.

## 27.9. Acceptance Criteria

- **AC-27.1** Environments logically separated.
- **AC-27.2** Release artifact immutable identity.
- **AC-27.3** Application release и configRelease separate.
- **AC-27.4** Production promotion проходит §26 gates.
- **AC-27.5** Migration не пересчитывает historical Health.
- **AC-27.6** Controlled graceful deployment mandatory.
- **AC-27.7** Invalid Security/trust/Scan Store blocks readiness.
- **AC-27.8** Cache flush не default release strategy.
- **AC-27.9** Rollback не меняет historical scans.
- **AC-27.10** Orphan lost execution классифицируется согласно §16.

---

# 28. Product Analytics & Success Metrics

§28 является normative owner product usage analytics. Operational observability остаётся §21.

## 28.1. Separation

Product Analytics отвечает «как пользователи используют продукт».

Observability отвечает «как технически работает платформа».

Domain FAIL rate не является platform-quality KPI.

## 28.2. Core events

```text
scan_form_viewed
scan_submitted
scan_accepted
scan_result_viewed
technical_details_opened
refresh_clicked
retry_clicked
share_clicked
locale_changed
```

Optional:

```text
share_completed
share_image_saved
```

если browser API позволяет достоверно определить outcome.

## 28.3. Allowed dimensions

Bounded:

- locale: ru/uz/en;
- tool: home/dns/registry/tls;
- mode: FULL/PARTIAL;
- selected category set как bounded enum;
- executionOutcome COMPLETED/FAILED;
- optional aggregate verdictCode.

## 28.4. Forbidden default analytics data

Не передаются:

- domain;
- scanId;
- originalInput;
- Registry PII;
- IP;
- certificate fingerprint;
- DNS values.

Scan page tracked как route template, не actual scanId URL.

Analytics backend не mandatory runtime dependency и его failure не влияет на scan.

## 28.5. Funnel

```text
scan_form_viewed
→ scan_submitted
→ scan_accepted
→ scan_result_viewed
```

Recommended primary metrics:

```text
completed_result_rate
FULL vs PARTIAL usage
technical_details_open_rate
share_action_rate
refresh_rate
returning_session_rate
```

Retry/Refresh rates интерпретируются совместно с Observability, а не как самостоятельный quality verdict.

## 28.6. Privacy

Anonymous session identity допустим для aggregate funnel/return analysis, но не является account/persistent cross-service identity.

User-entered domain не используется как marketing/audience attribute по умолчанию.

Image-only Share не создаёт recipient/view analytics entity.

## 28.7. Acceptance Criteria

- **AC-28.1** Product Analytics и Observability разделены.
- **AC-28.2** Core scan funnel измерим.
- **AC-28.3** domain/scanId/originalInput/PII отсутствуют в default analytics dimensions.
- **AC-28.4** Retry event не infer'ится frontend из reasonCode.
- **AC-28.5** Share analytics не отслеживает recipient/destination.
- **AC-28.6** Analytics failure не влияет на Domain Health execution.
- **AC-28.7** Return usage не требует domain history.
- **AC-28.8** Client-side experiments не изменяют Health Score/severity/verdict semantics.

---

# Appendix A. Normative Ownership Map

| Область | Normative owner |
|---|---|
| Product positioning | §1 |
| MVP scope / roadmap | §2 |
| User scan modes | §3 |
| Architecture boundaries | §4 |
| Input / CanonicalDomain | §5 |
| Common DTO / exposure | §6 |
| Shared status/dependency/category semantics | §7 |
| DNS | §8 |
| Registry | §9 |
| TLS | §10 |
| Issue / Summary / Confidence / Verdict | §11 |
| Score | §12 |
| Messages / Localization | §13 |
| Cache / Freshness | §14 |
| SSRF / Security | §15 |
| Scan lifecycle/orchestration | §16 |
| Browser Web API | §17 |
| Error taxonomy / retryability semantics | §18 |
| Persistence / data classes | §19 |
| Config/versioning | §20 |
| Metrics/logging/readiness | §21 |
| NFR/capacity | §22 |
| UX / Share | §23 |
| SEO/routes | §24 |
| Access/privacy/abuse | §25 |
| Tests/browser matrix | §26 |
| Deployment/releases | §27 |
| Product analytics | §28 |

# Appendix B. Consolidation Invariants

The PRD is considered internally consolidated only if all are true:

- one DTO per semantic concept;
- one canonical version field name per configuration dimension;
- no obsolete reason codes;
- no duplicate metric naming contracts;
- frontend does not infer backend Health/retry semantics;
- Public/Technical projections contain no gated PII/secrets;
- `scanId` access model is explicit;
- FULL/PARTIAL semantics are explicit;
- `POST /scans` acceptance-state vs terminal `GET` semantics are explicit;
- Score and Confidence remain separate dimensions;
- reusable cache and historical ScanResult are separate roles;
- Security-stage and network-stage failures are distinguishable;
- Share image does not create share-link storage/entities;
- all section Acceptance Criteria are sequential within their section;
- no temporary patch/footer/acceptance-placeholder markers remain.
