# 12. Caching and Data Freshness

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/12-cache.md)
<!-- nav:end -->

[§12](12-cache.md#12-caching-and-data-freshness) defines the cache keys of the `email` category, how long entries live, and what may not be cached. The responsible section is [1.0 §14](../prd/14-cache-freshness.md#14-caching-and-data-freshness); the cache modes, the coalescing of concurrent requests and the staleness rules are not changed here.

## 12.1. Keys

A key is built separately for policies and for hosts.

```text
asciiHostname
policy
selector?
resolverSetVersion
emailModuleConfigVersion
cacheContractVersion
```

```text
mailHost
ipFamily?
emailModuleConfigVersion
cacheContractVersion
```

`selector` is part of the policy key and is required for DKIM. Without it an answer for one selector would be reused for another, and a user would be handed somebody else's key as their own.

Language is not part of a key — [1.0 §14](../prd/14-cache-freshness.md#14-caching-and-data-freshness).

## 12.2. Lifetimes

| Observations | Lifetime Scale |
|---|---|
| SPF, DMARC, and DKIM policies | hours |
| `MX` records and host addresses | hours |
| encryption-probe result | hours |

Exact values are set by versioned configuration under [1.0 §20](../prd/20-configuration-policy-management.md#20-configuration-and-policy-management). The encryption probe may use a longer lifetime than policies, accounting for the cost of a connection.

A repeat check after records change follows the cache modes in [1.0 §14](../prd/14-cache-freshness.md#14-caching-and-data-freshness). It must not present an earlier observation as a new one.

## 12.3. What May Not Be Cached

| What | Why |
|---|---|
| an incomplete DMARC tree walk | a result was not obtained; a negative result was not obtained either |
| an incomplete encryption probe | the same |
| a selector entered by the user | it belongs to the request, not to the domain |

An entered selector is not automatically added to the domain's selector candidates for other requests. A request without a selector performs its own search under [§5](05-dkim.md#5-dkim); a previous result must not replace its `UNKNOWN`.

The rules for caching technical failures are otherwise those of [1.0 §14](../prd/14-cache-freshness.md#14-caching-and-data-freshness).

## 12.4. Freshness

`checkedAt` holds the time of the observation, not of the cache lookup — [1.0 §6](../prd/06-common-data-contracts-exposure.md#6-common-data-contracts-and-exposure-levels).

For the check that queries several hosts — [§7](07-starttls.md#7-starttls) — the time of observation is the earliest of the times that went into the result. A result is no fresher than its oldest part.

## 12.5. Acceptance Criteria

- **AC-12.1** A policy key includes the selector; for DKIM the selector is required.
- **AC-12.2** An incomplete walk and an incomplete probe are not written to the cache as results.
- **AC-12.3** A result found through a selector entered by the user is not reused for a request that names no selector.
- **AC-12.4** The observation time of a composite result is the earliest of the times of its parts.

---
