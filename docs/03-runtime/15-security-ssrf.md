# 15. Security & SSRF

§15 является нормативным владельцем IP classification, SSRF, target-wide validation и security policy.

## 15.1. Pipeline

```text
CanonicalDomain
→ DNS A/AAAA
→ full candidate set
→ Security Validation
→ ALLOW | BLOCK | INDETERMINATE
→ selected validated endpoint
→ pinned connection
```

## 15.2. SecurityValidationResult

```text
SecurityValidationResult {
  decision: ALLOW | BLOCK | INDETERMINATE
  policyVersion
  checkedAddressCount
  blockedAddressCount
  reasonCode?
}
```

## 15.3. Target-wide rule

Если хотя бы один candidate IP запрещён → весь target BLOCK.

Запрещено фильтровать bad IP и продолжать по good IP.

## 15.4. Classification

Минимально:

```text
PUBLIC_ALLOWED
FORBIDDEN_PRIVATE
FORBIDDEN_LOOPBACK
FORBIDDEN_LINK_LOCAL
FORBIDDEN_SHARED
FORBIDDEN_SPECIAL
FORBIDDEN_MULTICAST
FORBIDDEN_METADATA
FORBIDDEN_INTERNAL_INFRASTRUCTURE
```

IPv4-mapped IPv6 проверяет embedded IPv4.

## 15.5. Special-purpose ranges

IANA special-purpose ranges default deny, если explicit allowlist не определён. MVP allowlist пуст.

## 15.6. Security INDETERMINATE

Если невозможно доказать безопасность полного candidate set, connection запрещается.

Visible network check получает UNKNOWN `security_validation_incomplete`.

## 15.7. Security BLOCK

BLOCK использует `ssrf_policy_block`; no network connection; visible dependent TLS result UNKNOWN, без Issue/Score penalty.

## 15.8. Error boundary

`security_validation_incomplete` — failure до network probe внутри Security Validation.

`internal_network_error` — после Security ALLOW во время scanner/network execution.

## 15.9. Pinning

После ALLOW connection идёт напрямую к validated IP с hostname в SNI. Library не должна implicit resolve hostname снова.

## 15.10. internalInfrastructureDenylist

Поддержка обязательна. Concrete values deployment-specific и принадлежат Technical Architecture/security configuration. Effective change влияет на `securityPolicyVersion`.

## 15.11. Acceptance Criteria

- **AC-15.1** ANY forbidden candidate blocks whole target.
- **AC-15.2** Security validation fail closed.
- **AC-15.3** Full candidate set проверяется без truncation-before-security.
- **AC-15.4** Rebinding предотвращается pinned connection.
- **AC-15.5** Security BLOCK не создаёт Domain Issue.
- **AC-15.6** `security_validation_incomplete` и `internal_network_error` различаются по pipeline stage.
- **AC-15.7** internalInfrastructureDenylist участвует в effective security policy version.

---
