# 14. Caching and Data Freshness

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/14-cache-freshness.md)
<!-- nav:end -->

§14 defines the general internal cache mechanism and data freshness rules.

## 14.1. Cache Roles

The following roles are distinct:

1. the internal 2check cache for reusable results;
2. an external provider's cache;
3. a historical or previous ScanResult.

Redis is mandatory.

## 14.2. Cache Modes

```text
NORMAL
FORCE_REFRESH
```

NORMAL may use a compatible, fresh internal cache entry.

FORCE_REFRESH:

- bypasses the internal reusable cache for the selected scope;
- performs a new external or network operation;
- writes the new result to the cache;
- does not purge the cache automatically;
- does not force a recursive DNS resolver to ignore its own TTL.

## 14.3. Sequential and Concurrent Refreshes

Two sequential FORCE_REFRESH requests, each following completion of the previous one, create two new executions.

Concurrent FORCE_REFRESH requests may coalesce only into an already running fresh execution.

## 14.4. Stale Data

A stale successful result does not replace a failed current refresh.

The current result may be UNKNOWN; the previous or last-known result is displayed separately.

## 14.5. Cache Keys

Module keys include `cacheContractVersion` and the relevant technical configuration versions.

DNS:

```text
asciiHostname
resolverSetVersion
dnsModuleConfigVersion
cacheContractVersion
```

Domain registration:

```text
registryDomain
registryProvider
registryModuleConfigVersion
cacheContractVersion
```

Stable TLS key:

```text
asciiHostname
port
tlsModuleConfigVersion
trustStoreVersion
cacheContractVersion
```

The language is not part of a technical cache key.

## 14.6. TLS Dependency Compatibility

`dependencyFingerprint` is not part of the stable cache key.

```text
TlsCacheEntry {
  result
  dependencyFingerprint
  freshness
}
```

After a stable-key lookup, the current fingerprint is calculated from DNS prerequisites and security conditions. A match may permit reuse; a mismatch requires a fresh TLS probe.

## 14.7. Concurrent Request Coalescing — Single-flight

Concurrent identical NORMAL requests with cache misses may coalesce.

Single-flight does not merge `scanId` values.

## 14.8. Technical Failure Cache

A transient UNKNOWN may be cached briefly. FORCE_REFRESH bypasses this cache.

## 14.9. Acceptance Criteria

- **AC-14.1** Redis is mandatory.
- **AC-14.2** FORCE_REFRESH does not mean cache purging.
- **AC-14.3** Sequential FORCE_REFRESH requests create a new execution each time.
- **AC-14.4** A stale successful result does not conceal a current UNKNOWN.
- **AC-14.5** The language is not part of a technical key.
- **AC-14.6** The registration key uses the canonical `registryModuleConfigVersion`.
- **AC-14.7** The TLS dependency fingerprint is stored as compatibility metadata, not as a stable key.
- **AC-14.8** Single-flight does not merge scan identities.

---
