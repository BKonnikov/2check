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
