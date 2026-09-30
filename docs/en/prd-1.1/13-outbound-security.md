# 13. Outbound Connection Safety

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/13-outbound-security.md)
<!-- nav:end -->

[§13](13-outbound-security.md#13-outbound-connection-safety) defines the rules under which a connection to a mail host is permitted. The responsible section for address validation is [1.0 §15](../prd/15-security-ssrf.md#15-security-and-ssrf-protection); its sequence, address classification and blocking rule are not changed here but extended to a new kind of connection.

## 13.1. Applying Existing Security Controls

MVP 1.0 already establishes a TLS connection to an address of the domain under test after security validation. Release 1.1 applies the same sequence to mail servers obtained under [§6](06-mx.md#6-mx).

Additional constraints define the SMTP port, permitted commands, and number of servers probed. The common address-validation and selected-IP pinning rules remain in effect.

## 13.2. The Sequence

The order in [1.0 §15](../prd/15-security-ssrf.md#15-security-and-ssrf-protection) applies without exception:

```text
MailHostTarget
→ DNS A/AAAA
→ full candidate set
→ Security Validation
→ ALLOW | BLOCK | INDETERMINATE
→ selected validated endpoint
→ pinned connection
```

The host's full set of addresses is validated without prior truncation. If even one address is forbidden the whole host is blocked; dropping the forbidden address and connecting to the rest is not permitted — [1.0 §15](../prd/15-security-ssrf.md#15-security-and-ssrf-protection).

The connection goes to the pinned address. The host name is not resolved again by the connection library.

## 13.3. What Is Held Fixed

| Constraint | Value |
|---|---|
| port | `25` only |
| source of host names | [§6](06-mx.md#6-mx) only |
| session commands | the greeting, the request for extensions, the move to encryption, the close |
| hosts per check | no more than four — [§7](07-starttls.md#7-starttls) |

The port is not accepted from user input or DNS records. The implementation provides no override.

The sender, recipient and data commands are never issued. The probe sends no mail and therefore cannot be used either to deliver messages or to test whether an address exists.

## 13.4. What This Rules Out

| Scenario | Limiting Control |
|---|---|
| making the service connect to an internal address | a host's address is validated under [1.0 §15](../prd/15-security-ssrf.md#15-security-and-ssrf-protection) like any other |
| swapping the address between validation and connection | the connection goes to the pinned address |
| using the service to scan ports | the port is fixed |
| creating excessive outbound load | the host count is bounded; request-rate and concurrency limits in [1.0 §22](../prd/22-performance-resource-limits-nfr.md#22-performance-and-resource-limits) and [1.0 §25](../prd/25-privacy-data-protection-abuse-boundaries.md#25-privacy-access-and-abuse-prevention) also apply |
| sending mail through somebody else's hands | the data commands are never issued |

## 13.5. Our Own Infrastructure

The ban on reaching our own infrastructure — [1.0 §15](../prd/15-security-ssrf.md#15-security-and-ssrf-protection) — extends to mail hosts unchanged.

Blocking for this reason gives `UNKNOWN`, explains the service limitation, and does not reduce the domain's score.

## 13.6. Time Budget

The probe is subject to the scan's shared budget in [1.0 §22](../prd/22-performance-resource-limits-nfr.md#22-performance-and-resource-limits). The category introduces no budget of its own.

The rule in [§7](07-starttls.md#7-starttls) follows from that: hosts beyond the limit are listed as not probed rather than waiting for time to free up. A result obtained in part is reported as partial.

## 13.7. Acceptance Criteria

- **AC-13.1** A mail host's addresses pass the safety validation of [1.0 §15](../prd/15-security-ssrf.md#15-security-and-ssrf-protection) as a full set, without truncation.
- **AC-13.2** A forbidden address blocks the whole host.
- **AC-13.3** The connection is made to the pinned address; re-resolving the name is not permitted.
- **AC-13.4** The connection port is `25` and cannot be set by input or by the domain's records.
- **AC-13.5** Host names come only from the result of [§6](06-mx.md#6-mx).
- **AC-13.6** The session issues no sender, recipient or data commands.
- **AC-13.7** Blocking under the ban on our own infrastructure gives `UNKNOWN` and does not reduce the domain's score.
- **AC-13.8** The category introduces no time budget of its own.

---
