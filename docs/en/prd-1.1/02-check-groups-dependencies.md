# 2. Check Groups and the Dependency on MX

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/02-check-groups-dependencies.md)
<!-- nav:end -->

[§2](02-check-groups-dependencies.md#2-check-groups-and-the-dependency-on-mx) defines how the `email` category is put together: which groups the checks fall into, which of them depend on `MX`, and what happens to each group when the domain has no mail server. The responsible section for status and dependency semantics is [1.0 §7](../prd/07-shared-status-dependency-category-scan-semantics.md#7-statuses-dependencies-and-scan-results); only their application to this category is defined here.

## 2.1. Three Groups

```text
Email Authentication
├─ SPF
├─ DMARC
└─ DKIM

Inbound Mail
├─ MX
└─ STARTTLS

Mail Server
└─ PTR
```

The groups are not categories of their own and carry no verdict: they are units of dependency inside one category.

## 2.2. Why the Groups Are Separate

`SPF`, `DMARC`, and `DKIM` are sender-domain policies published in `TXT` records. Their checks do not depend on receiving mail. For example, `v=spf1 -all` can declare that a domain sends no mail.

`STARTTLS` and `PTR` examine the receiving server identified by the domain's records. If no such server exists, these checks are inapplicable.

## 2.3. What Counts as a Receiving Server

No `MX` does not mean mail has nowhere to go. RFC 7505 describes the order laid down by RFC 5321: finding no `MX`, a sender turns to the domain's own address records. Such a server is called implicit, and the checks of the receiving server do have a subject.

There is no subject in two cases:

| State of the domain | Value of `blockedBy` |
|---|---|
| neither `MX` nor address records | `mx_missing` |
| an `MX` published to say "I accept no mail" | `null_mx` |

The second is a deliberate declaration by the owner under RFC 7505, not an omission. Both are detailed in [§6](06-mx.md#6-mx).

## 2.4. When There Is No Subject

| Check | Status |
|---|---|
| `SPF` | runs as usual |
| `DMARC` | runs as usual |
| `DKIM` | runs as usual |
| `STARTTLS` | `NOT_APPLICABLE` with `blockedBy` |
| `PTR` | `NOT_APPLICABLE` with `blockedBy` |

`NOT_APPLICABLE` rather than `UNKNOWN`: `UNKNOWN` means the check applies but no result could be obtained, whereas here the subject of the check is absent.

The `MX` check assesses the absence of a receiving server. Blocked checks add no penalties. `NOT_APPLICABLE` does not reduce confidence; the completeness and confidence rules in [1.0 §7](../prd/07-shared-status-dependency-category-scan-semantics.md#7-statuses-dependencies-and-scan-results) and [1.0 §11](../prd/11-domain-health-summary-issues.md#11-domain-health-summary-and-identified-issues) remain unchanged.

## 2.5. The Receiving Server, Not Outbound Mail

`MX` names the server that **receives** mail for the domain. The server the domain **sends** from may be a different one, and it does not follow from the domain's public records.

The results of `PTR` are therefore stated as the condition of the receiving server. Claims such as "mail from this domain will land in spam" are not permitted on this evidence: they rest on a link the data does not contain. The general rule against unproven causal claims is [1.0 §13](../prd/13-human-readable-messages-localization.md#13-user-messages-and-localization).

## 2.6. Acceptance Criteria

- **AC-2.1** The `SPF`, `DMARC` and `DKIM` checks run whether or not `MX` is present.
- **AC-2.2** With no `MX` but with address records for the domain, the checks of the receiving server run against the implicit server.
- **AC-2.3** Where there is no subject, the `STARTTLS` and `PTR` checks return `NOT_APPLICABLE` with a `blockedBy` drawn from the values `mx_missing` and `null_mx`.
- **AC-2.4** An absent receiving server is not itself a reason for `UNKNOWN` in the category.
- **AC-2.5** The state of the receiving server reduces the numerical score once, through the result of the `MX` check.
- **AC-2.6** The messages of the `PTR` check describe the receiving server and assert nothing about the domain's outbound mail.

---
