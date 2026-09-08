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
