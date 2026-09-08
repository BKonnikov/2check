# 6. Common Data Contracts and Exposure Levels

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/06-common-data-contracts-exposure.md)
<!-- nav:end -->

§6 defines common DTO structures and API exposure levels. Module-specific fields are defined in the corresponding module sections.

## 6.1. Message — MessageDescriptor

Messages use a single DTO:

```text
MessageDescriptor {
  titleCode: string
  explanationCode?: string
  impactCode?: string
  recommendationCode?: string
  params?: object
}
```

## 6.2. Check Result — CheckResult

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

`target` identifies the object being checked. `source` contains machine-readable provenance for an observation or result. Both fields use module-defined structures rather than free-form text.

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

The exact structure is defined by the module section: DNS — §8, registration — §9, TLS — §10. The `category` field discriminates between module variants. The `source` field is optional: its absence alone does not change status or severity and does not indicate a technical failure. Browser exposure of `target`/`source` is determined by Public/Technical projection allowlists, not by their presence in the internal `CheckResult`.

The default is `dependencyMode = ALL`.

## 6.3. Result Freshness — CheckFreshness

```text
CheckFreshness {
  checkedAt
  cached
  cacheAge
  sourceUpdatedAt?
}
```

`checkedAt` records the time of the original observation, not the cache lookup.

## 6.4. Data Exposure Levels

```text
Public
Technical
Gated
```

- **Public** — the safe, standard result projection.
- **Technical** — a safe technical data projection available through `/details`.
- **Gated** — a separate resource providing controlled access to sensitive data.

An internal DTO is never serialized directly.

## 6.5. Machine Values

The following values are not localized:

- IP addresses;
- hostnames;
- DNS record values;
- numerical TTL values;
- certificate fingerprints;
- raw certificate issuer values;
- TLS versions;
- statuses;
- severity levels;
- `reasonCode`;
- `checkId`.

## 6.6. Acceptance Criteria

- **AC-6.1** `MessageDescriptor` is the single DTO for browser-facing messages.
- **AC-6.2** An internal DTO is not serialized directly into the browser API.
- **AC-6.3** Public/Technical/Gated are distinct data exposure levels.
- **AC-6.4** Machine values do not change when the language is switched.
- **AC-6.5** `checkedAt` preserves the observation time rather than the cache lookup time.
- **AC-6.6** `target` and `source` use module-defined structures rather than free-form fields.
- **AC-6.7** Exact target/source variants are defined by module sections §8/§9/§10.
- **AC-6.8** The optional `source` field alone does not affect domain health semantics; its browser exposure is determined by a projection allowlist.

---
