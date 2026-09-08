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
