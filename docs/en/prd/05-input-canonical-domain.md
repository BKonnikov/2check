# 5. Input and the Canonical Domain Object

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/05-input-canonical-domain.md)
<!-- nav:end -->

§5 defines input and preprocessing rules.

## 5.1. Accepted Input

The following inputs are accepted:

- a hostname;
- an HTTP URL;
- an HTTPS URL;
- URL-like input without a scheme.

The MVP rejects:

- an IP address;
- a wildcard hostname;
- an email address;
- a single-label hostname;
- record owner names such as `_dmarc.example.uz`;
- URL credentials;
- a custom port.

## 5.2. IDN Processing

The following sequence applies:

```text
trim
→ hostname extraction
→ lowercase where applicable
→ Unicode normalization
→ UTS #46 Nontransitional
→ IDNA validation
→ ASCII / punycode
```

Standard DNS label and hostname length limits apply.

## 5.3. The CanonicalDomain Object

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

`registryDomain` is deliberately **excluded** from `CanonicalDomain`.

## 5.4. Registration Boundary

`registrableDomain` is determined by preprocessing and PSL rules.

The PSL snapshot is a versioned configuration item per §20: changing it changes the computed `registrableDomain`.

`registryDomain` is determined by the specific `registryProvider` and returned by the registration module.

## 5.5. Typo Correction

The MVP does not provide automatic typo correction or replacement suggestions.

## 5.6. Acceptance Criteria

- **AC-5.1** All modules use one CanonicalDomain and do not normalize input independently.
- **AC-5.2** `registryDomain` is absent from CanonicalDomain.
- **AC-5.3** IP addresses, wildcard hostnames, email addresses, single-label hostnames, and custom ports are rejected.
- **AC-5.4** IDN processing uses UTS #46 Nontransitional and punycode.
- **AC-5.5** `publicSuffixType` distinguishes ICANN/PRIVATE/UNKNOWN.
- **AC-5.6** Typos are not corrected automatically.

---
