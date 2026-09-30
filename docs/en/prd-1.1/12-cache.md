# 12. Cache and Freshness

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/12-cache.md)
<!-- nav:end -->

§12 defines the cache keys of the `email` category, how long entries live, and what may not be cached. The responsible section is 1.0 §14; the cache modes, the coalescing of concurrent requests and the staleness rules are not changed here.

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

`selector` is part of the policy key and is required for DKIM. Without it an answer for one selector would be reused for another, and a reader would be handed somebody else's key as their own.

Language is not part of a key — 1.0 §14.

## 12.2. Lifetimes

| What is cached | Order of the lifetime |
|---|---|
| the SPF, DMARC and DKIM policies | hours |
| `MX` records and host addresses | hours |
| the result of the encryption probe | hours |

Exact values are set by versioned configuration under the rules of 1.0 §20.

The lifetime for the encryption probe sits at the top of that range: it is the only check in the category that needs a connection, and the encryption settings of a mail host rarely change.

The lifetime for the policies sits nearer the bottom. A policy is edited at exactly the moment somebody checks it, and a reader who has fixed a record and pressed "check again" should see the fix.

## 12.3. What May Not Be Cached

| What | Why |
|---|---|
| an incomplete DMARC tree walk | a result was not obtained; a negative result was not obtained either |
| an incomplete encryption probe | the same |
| a selector entered by the reader | it belongs to the request, not to the domain |

The last row matters: an entered selector does not make the result the domain's property. Another reader who names no selector must get `UNKNOWN`, not a ready answer found on somebody else's hint.

The rules for caching technical failures are otherwise those of 1.0 §14.

## 12.4. Freshness

`checkedAt` holds the time of the observation, not of the cache lookup — 1.0 §6.

For the check that queries several hosts — §7 — the time of observation is the earliest of the times that went into the result. A result is no fresher than its oldest part.

## 12.5. Acceptance Criteria

- **AC-12.1** A policy key includes the selector; for DKIM the selector is required.
- **AC-12.2** An incomplete walk and an incomplete probe are not written to the cache as results.
- **AC-12.3** A result found through a selector entered by the reader is not reused for a request that names no selector.
- **AC-12.4** The observation time of a composite result is the earliest of the times of its parts.

---
