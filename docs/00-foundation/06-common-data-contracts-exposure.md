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
