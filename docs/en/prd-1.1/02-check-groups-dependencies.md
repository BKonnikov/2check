# 2. Check Groups and the Dependency on MX

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/02-check-groups-dependencies.md)
<!-- nav:end -->

§2 defines how the `email` category is put together: which groups the checks fall into, which of them depend on `MX`, and what happens to each group when the domain has no mail server. The responsible section for status and dependency semantics is 1.0 §7; only their application to this category is defined here.

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
├─ PTR
└─ DNSBL
```

The groups are not categories of their own and carry no verdict: they are units of dependency inside one category.

## 2.2. Why the Groups Are Separate

`SPF`, `DMARC` and `DKIM` are policies of the sending domain, published as `TXT` records. They exist whether or not the domain receives mail: `v=spf1 -all` on a domain that neither sends nor receives is not a mistake but a correct declaration.

`STARTTLS`, `PTR` and `DNSBL` describe one specific server. That server comes from `MX`. With no `MX` record these checks have no subject — the answer is not unknown, there is nothing to ask about.

## 2.3. No MX Record

With no `MX`:

| Check | Status |
|---|---|
| `SPF` | runs as usual |
| `DMARC` | runs as usual |
| `DKIM` | runs as usual |
| `STARTTLS` | `NOT_APPLICABLE`, `blocked_by = mx_missing` |
| `PTR` | `NOT_APPLICABLE`, `blocked_by = mx_missing` |
| `DNSBL` | `NOT_APPLICABLE`, `blocked_by = mx_missing` |

`NOT_APPLICABLE` rather than `UNKNOWN`: `UNKNOWN` means the check applies but no result could be obtained, whereas here the subject of the check is absent.

A missing `MX` is scored once, by the `MX` check. The checks it blocks add no further penalty; otherwise one cause would penalise the domain four times over. How `NOT_APPLICABLE` affects confidence is defined in 1.0 §11 and is unchanged here.

## 2.4. The Receiving Server, Not Outbound Mail

`MX` names the server that **receives** mail for the domain. The server the domain **sends** from may be a different one, and it does not follow from the domain's public records.

The results of `PTR` and `DNSBL` are therefore stated as the condition of the receiving server. Claims such as "mail from this domain will land in spam" are not permitted on this evidence: they rest on a link the data does not contain. The general rule against unproven causal claims is 1.0 §13.

## 2.5. Acceptance Criteria

- **AC-2.1** The `SPF`, `DMARC` and `DKIM` checks run whether or not `MX` is present.
- **AC-2.2** With no `MX`, the `STARTTLS`, `PTR` and `DNSBL` checks return `NOT_APPLICABLE` with `blocked_by = mx_missing`.
- **AC-2.3** A missing `MX` gives no check in the category the status `UNKNOWN`.
- **AC-2.4** A missing `MX` reduces the numerical score once, through the result of the `MX` check.
- **AC-2.5** The messages of the `PTR` and `DNSBL` checks describe the receiving server and assert nothing about the domain's outbound mail.

---
