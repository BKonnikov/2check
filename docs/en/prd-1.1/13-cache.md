# 13. Cache and Freshness

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/13-cache.md)
<!-- nav:end -->

§13 defines the cache keys of the `email` category, how long entries live, and what may not be cached. The responsible section is 1.0 §14; the cache modes, the coalescing of concurrent requests and the staleness rules are not changed here.

## 13.1. Keys

A key is built separately for policies, for hosts and for blocklists.

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

```text
address
blocklistSetVersion
emailModuleConfigVersion
cacheContractVersion
```

`selector` is part of the policy key and is required for DKIM. Without it an answer for one selector would be reused for another, and a reader would be handed somebody else's key as their own.

`blocklistSetVersion` changes when the set of lists changes — §9. Changing the set devalues earlier answers: "not listed" refers to the lists that were asked, not to lists in general.

Language is not part of a key — 1.0 §14.

## 13.2. Lifetimes

| What is cached | Order of the lifetime |
|---|---|
| the SPF, DMARC and DKIM policies | hours |
| `MX` records and host addresses | hours |
| the result of the encryption probe | hours |
| a blocklist's answer | minutes |

Exact values are set by versioned configuration under the rules of 1.0 §20.

The lifetime for blocklists is short deliberately. A listing is a state an owner clears within minutes, and showing yesterday's listing as today's means accusing them of something they have already fixed.

The lifetime for the encryption probe is long for the opposite reason: it is the only check in the category that needs a connection, and the encryption settings of a mail host rarely change.

## 13.3. What May Not Be Cached

| What | Why |
|---|---|
| a list's refusal to serve a query | it is not an answer, and storing it as one turns it into a result — §9 |
| an incomplete DMARC tree walk | a result was not obtained; a negative result was not obtained either |
| an incomplete encryption probe | the same |
| a selector entered by the reader | it belongs to the request, not to the domain |

The last row matters: an entered selector does not make the result the domain's property. Another reader who names no selector must get `UNKNOWN`, not a ready answer found on somebody else's hint.

The rules for caching technical failures are otherwise those of 1.0 §14.

## 13.4. Freshness

`checkedAt` holds the time of the observation, not of the cache lookup — 1.0 §6.

For checks that query several sources — hosts in §7, lists in §9 — the time of observation is the earliest of the times that went into the result. A result is no fresher than its oldest part.

## 13.5. Acceptance Criteria

- **AC-13.1** A policy key includes the selector; for DKIM the selector is required.
- **AC-13.2** Changing the set of blocklists changes the key and devalues earlier answers.
- **AC-13.3** A list's refusal to serve a query is not written to the cache.
- **AC-13.4** An incomplete walk and an incomplete probe are not written to the cache as results.
- **AC-13.5** A result found through a selector entered by the reader is not reused for a request that names no selector.
- **AC-13.6** A blocklist answer's lifetime is shorter than that of the category's other entries.
- **AC-13.7** The observation time of a composite result is the earliest of the times of its parts.

---
