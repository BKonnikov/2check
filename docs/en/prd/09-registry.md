# 9. Domain Registration

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/09-registry.md)
<!-- nav:end -->

§9 defines registration provider behavior, query outcomes, domain lifecycle, and domain-specific caching rules.

## 9.1. Provider

The MVP provider is:

```text
UzRegistryProvider
```

RDAP is the primary protocol and data source.
WHOIS is used as a fallback when RDAP does not produce a determinate result.

## 9.2. Query Outcome

```text
REGISTERED | NOT_REGISTERED | INDETERMINATE
```

`NOT_REGISTERED` requires explicit confirmation from an authoritative source.

A timeout, 429, 5xx, malformed response, parsing error, or encoding error produces `INDETERMINATE` if the fallback also fails to provide a determinate result.

## 9.3. Normalized Lifecycle

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

The provider's original status is preserved as `rawStatus`.

## 9.4. Registration Data — NormalizedDomainRegistration

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

The actual value for `state=value` is stored and exposed separately under §19/§25.

Registration fields in `CheckResult.target/source` use:

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

`transportsUsed` records the strategy actually used to obtain the terminal result, for example `[RDAP]` or `[RDAP, WHOIS]`. For `provider_not_supported`, `source` may be absent because no external registration provider was called.

## 9.5. The registry.lookup Check

- REGISTERED → PASS;
- explicitly confirmed NOT_REGISTERED → FAIL;
- INDETERMINATE → UNKNOWN with the check's own technical `reasonCode`.

When the root registration lookup is UNKNOWN, child checks receive UNKNOWN with `blockedBy`.

For confirmed NOT_REGISTERED, child checks lacking a registration object receive N/A with `blockedBy`.

## 9.6. Domains Outside .uz

For an unsupported TLD:

```text
UNKNOWN
reasonCode = provider_not_supported
retryability = NOT_RETRYABLE
```

No score penalty applies; confidence in a FULL result is reduced.

## 9.7. Adaptive Cache Lifetime

§9 defines registration status-aware TTL. Active domains use an hours-scale TTL; grace and redemption periods use a minutes-scale TTL. Exact values belong to versioned configuration.

## 9.8. Acceptance Criteria

- **AC-9.1** RDAP is primary; WHOIS is used only after an indeterminate RDAP result.
- **AC-9.2** NOT_REGISTERED requires explicit confirmation.
- **AC-9.3** Response, encoding, or parsing uncertainty is not interpreted as FREE.
- **AC-9.4** Lifecycle normalization uses the canonical enumeration in §9.3.
- **AC-9.5** Actual registrant PII is absent from Public ScanResult.
- **AC-9.6** Provider limitations outside .uz produce UNKNOWN/provider_not_supported without a score penalty.
- **AC-9.7** TTL policy accounts for registration status and is owned by the registration module.
- **AC-9.8** Registry CheckResult uses the `RegistryCheckTarget`/`RegistryCheckSource` contract in §9.4.

---
