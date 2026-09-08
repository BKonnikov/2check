# 15. Security and SSRF Protection

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD Contents](../02-prd.md) · [Русский](../../ru/prd/15-security-ssrf.md)
<!-- nav:end -->

§15 defines IP classification, SSRF protection, target-wide validation, and security policy.

## 15.1. Validation Sequence

```text
CanonicalDomain
→ DNS A/AAAA
→ full candidate set
→ Security Validation
→ ALLOW | BLOCK | INDETERMINATE
→ selected validated endpoint
→ pinned connection
```

## 15.2. Security Validation Result — SecurityValidationResult

```text
SecurityValidationResult {
  decision: ALLOW | BLOCK | INDETERMINATE
  policyVersion
  checkedAddressCount
  blockedAddressCount
  reasonCode?
}
```

## 15.3. Target-wide Rule

If any candidate IP address is forbidden, the entire target receives BLOCK.

Filtering out forbidden addresses and continuing with allowed addresses is prohibited.

## 15.4. Address Classification

The minimum set of classes is:

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

For IPv4-mapped IPv6, the embedded IPv4 address is checked.

## 15.5. Special-purpose Ranges

IANA special-purpose ranges are denied by default unless an explicit allowlist is defined. The MVP allowlist is empty.

## 15.6. Indeterminate Security Result — INDETERMINATE

If the safety of the complete candidate set cannot be established, the connection is prohibited.

The visible network check receives UNKNOWN with `security_validation_incomplete`.

## 15.7. Blocking — BLOCK

BLOCK uses `ssrf_policy_block`; no network connection is made. The visible dependent TLS result receives UNKNOWN without an Issue or score penalty.

## 15.8. Technical Error Boundaries

`security_validation_incomplete` denotes a failure within security validation before a network attempt.

`internal_network_error` denotes a failure after ALLOW during scanner or network execution.

## 15.9. IP Address Pinning

After ALLOW, the connection goes directly to the validated IP address with the original hostname in SNI. The library must not implicitly resolve the hostname again.

## 15.10. Internal Infrastructure Denylist

Support for internalInfrastructureDenylist is mandatory. Its values are deployment-specific and belong to the technical architecture and security configuration. A change to the effective list affects `securityPolicyVersion`.

## 15.11. Acceptance Criteria

- **AC-15.1** Any forbidden candidate address blocks the entire target.
- **AC-15.2** Access is denied when safety cannot be established.
- **AC-15.3** The complete candidate set is validated without prior truncation.
- **AC-15.4** DNS rebinding is prevented by connecting to a pinned IP address.
- **AC-15.5** A security BLOCK does not create a domain Issue.
- **AC-15.6** `security_validation_incomplete` and `internal_network_error` are distinguished by execution stage.
- **AC-15.7** internalInfrastructureDenylist contributes to the effective security policy version.

---
