# 2check.uz — Product Requirements (PRD), MVP 1.1

**Version:** 1.1

**Status:** in development.

**Basis:** `2check_Product_Concept_v1.0 — FINAL / FROZEN` and `2check_MVP_1.0_PRD`.

## Applying the Requirements

This document covers mail health only. The MVP 1.0 specification is frozen and is not amended here: where a 1.1 requirement touches behaviour that is already defined, it is stated as an addition to it and names the responsible 1.0 section.

A reference written `§7` points to a section of this document. A reference to the frozen specification is written `1.0 §7`.

The Russian and English editions describe the same requirements. Identifiers, formulas, and acceptance criteria match; editorial changes are made in both editions together.

[01. Concept](../../docs/en/01-concept.md) · [PRD Sections](../../docs/en/03-prd-1.1.md) · [Русский](../ru/2check_MVP_1.1_PRD.md)

## Contents

- [1. Scope and Goals of MVP 1.1](#section-01)
- [2. Check Groups and the Dependency on MX](#section-02)
- [3. SPF](#section-03)
- [Appendix A. Responsible Sections](#appendix-a)

<a id="section-01"></a>

# 1. Scope and Goals of MVP 1.1

§1 defines what release 1.1 adds, what stays outside it, and how it relates to the frozen MVP 1.0 specification.

## 1.1. What the Release Adds

One category of checks:

```text
email
```

Its contents:

```text
SPF
DMARC
DKIM
MX
STARTTLS
PTR
DNSBL
```

The category takes part in a full scan alongside `dns`, `registry` and `tls`, and is available as a separate tool.

## 1.2. What the Release Does Not Do

Outside the boundary:

- assessing the reputation of the mail a domain sends;
- receiving, parsing and delivering messages;
- verifying the signature on an individual message;
- advice on configuring a particular mail provider beyond what the published records state.

The reason for the first item is substantive rather than organisational: outbound reputation belongs to the address a domain sends from, and that address does not follow from the domain's public records — see §2.

## 1.3. Relation to MVP 1.0

This document does not change the checks in the `dns`, `registry` and `tls` categories. Behaviour defined in 1.0 is extended in four places:

| Responsible 1.0 section | What is extended | Where |
|---|---|---|
| 1.0 §7 | category semantics | §2 |
| 1.0 §11 | summary and verdict | §11 |
| 1.0 §12 | numerical score | §11 |
| 1.0 §15 | outbound connection safety | §14 |

Each extension names the responsible 1.0 section and does not rewrite it.

## 1.4. Acceptance Criteria

- **AC-1.1** The release adds exactly one category, `email`; the checks in the `dns`, `registry` and `tls` categories are unchanged.
- **AC-1.2** This document does not amend the text of MVP 1.0; in a conflict, the provision in the responsible section identified in Appendix A applies.
- **AC-1.3** Outbound mail reputation is outside the release boundary and is not inferred from the results of the `email` category.
- **AC-1.4** Receiving, parsing and delivering messages are outside the release boundary.
- **AC-1.5** The `email` category is available both in a full scan and as a separate tool.

---

<a id="section-02"></a>

# 2. Check Groups and the Dependency on MX

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
| `STARTTLS` | `NOT_APPLICABLE`, `blockedBy = mx_missing` |
| `PTR` | `NOT_APPLICABLE`, `blockedBy = mx_missing` |
| `DNSBL` | `NOT_APPLICABLE`, `blockedBy = mx_missing` |

`NOT_APPLICABLE` rather than `UNKNOWN`: `UNKNOWN` means the check applies but no result could be obtained, whereas here the subject of the check is absent.

A missing `MX` is scored once, by the `MX` check. The checks it blocks add no further penalty; otherwise one cause would penalise the domain four times over. How `NOT_APPLICABLE` affects confidence is defined in 1.0 §11 and is unchanged here.

## 2.4. The Receiving Server, Not Outbound Mail

`MX` names the server that **receives** mail for the domain. The server the domain **sends** from may be a different one, and it does not follow from the domain's public records.

The results of `PTR` and `DNSBL` are therefore stated as the condition of the receiving server. Claims such as "mail from this domain will land in spam" are not permitted on this evidence: they rest on a link the data does not contain. The general rule against unproven causal claims is 1.0 §13.

## 2.5. Acceptance Criteria

- **AC-2.1** The `SPF`, `DMARC` and `DKIM` checks run whether or not `MX` is present.
- **AC-2.2** With no `MX`, the `STARTTLS`, `PTR` and `DNSBL` checks return `NOT_APPLICABLE` with `blockedBy = mx_missing`.
- **AC-2.3** A missing `MX` gives no check in the category the status `UNKNOWN`.
- **AC-2.4** A missing `MX` reduces the numerical score once, through the result of the `MX` check.
- **AC-2.5** The messages of the `PTR` and `DNSBL` checks describe the receiving server and assert nothing about the domain's outbound mail.

---

<a id="section-03"></a>

# 3. SPF

§3 defines the SPF policy check: what is read, how the RFC 7208 limits are counted, and which conclusions may be drawn from a record without a sending address.

## 3.1. What Is Being Checked

RFC 7208 defines `check_host()`, which answers "may this address send mail on behalf of this domain" and takes the sender's address as a required input.

2check has no such address: the reader is asking about their own domain, not about a particular message. The SPF check is therefore an analysis of the published record, not an evaluation of `check_host()`. Anything that cannot be determined without a sending address is not asserted.

The analysis answers four questions:

- whether a record is published, and whether there is only one;
- whether it parses against the RFC 7208 grammar;
- whether it stays inside the limits on the number of DNS queries;
- what the record says about senders it does not list.

## 3.2. Retrieving the Record

The record is read from the domain's `TXT`. The responsible section for the DNS queries themselves is 1.0 §8.

An SPF record is a `TXT` value beginning with `v=spf1` followed by a space or the end of the value. Case is not significant. Several strings of one `TXT` value are joined with no separator.

The `SPF` DNS type is not queried: RFC 7208 requires the policy to be published in `TXT` only.

## 3.3. Number of Records

| Found | Status | Severity |
|---|---|---|
| none | `FAIL` | `warning` |
| one | analysed further | — |
| more than one | `FAIL` | `critical` |

More than one record is a `permerror` under RFC 7208: a receiver does not choose between them, it rejects the policy outright. A domain with two SPF records is worse protected than a domain with none, because its owner believes protection is in place.

An absent record is a confirmed fact rather than an unknown one, hence `FAIL` and not `UNKNOWN`.

## 3.4. The Limit on DNS Queries

RFC 7208 requires that one evaluation of a policy perform no more than ten queries caused by the terms `include`, `a`, `mx`, `ptr`, `exists` and `redirect`. The terms `all`, `ip4` and `ip6` do not count towards it. Exceeding the limit gives `permerror`.

2check walks the whole record, including nested `include` and `redirect`, and counts the **worst case** — the number of terms reached by a receiver that has to walk the record to the end. A real evaluation may stop earlier, at the first mechanism that matches, so the worst case is an upper bound, and it is the bound that decides whether the policy breaks for some senders.

| Query-causing terms | Status | Severity |
|---|---|---|
| ten or fewer | condition met | — |
| more than ten | `FAIL` | `critical` |

Void queries are counted separately — answers holding no records, and "name does not exist" answers. RFC 7208 recommends limiting them to two. The recommendation is not a requirement and receivers honour it unevenly, so exceeding it gives `warning` rather than `critical`.

The walk stops when a loop of `include` or `redirect` is found; a loop is a `permerror`.

## 3.5. What the Record Says About Unlisted Senders

The final `all` mechanism decides the fate of everyone that matched no earlier mechanism.

| Record | Meaning | Status | Severity |
|---|---|---|---|
| `-all` | reject | `PASS` | — |
| `~all` | accept but mark | `PASS` | — |
| `?all` | state nothing | `FAIL` | `warning` |
| `+all` | allow everyone | `FAIL` | `critical` |
| neither `all` nor `redirect` | state nothing | `FAIL` | `warning` |

`+all` lets anyone at all send in the domain's name. That is not a strict policy and not a lenient one: it is the absence of a policy, written so that it looks like the presence of one.

`~all` is not treated as a defect: it is the working setting for a domain that is not yet sure its list of senders is complete.

## 3.6. A Deprecated Mechanism

The `ptr` mechanism present in a record gives `warning`. RFC 7208 states plainly that it should not be published: it is slow, unreliable and puts load on other people's servers. It does not affect the status of the remaining conditions.

## 3.7. Technical Failure

If the `TXT` query gave no definite result, the check returns `UNKNOWN` with its own `reasonCode`. The rules for `reasonCode` and `blockedBy` are 1.0 §7.

| Cause | `reasonCode` |
|---|---|
| the query did not complete | `spf_lookup_failed` |
| the walk did not complete because a nested query failed | `spf_traversal_incomplete` |

An incomplete walk does not give `FAIL` on the number of terms: having failed to finish counting, we do not know whether the limit was exceeded.

## 3.8. What the Check Does Not Assert

- That the domain's mail will or will not be delivered: delivery depends on the receiver, not on the policy alone.
- That the listed addresses really belong to the domain's senders: the record states the owner's intent, and public data cannot confirm it.
- That the policy applies to a particular message: without a sending address that conclusion is undefined.

The general rule against unproven causal claims is 1.0 §13.

## 3.9. Acceptance Criteria

- **AC-3.1** An SPF record is a `TXT` value beginning with `v=spf1` followed by a space or the end of the value; case is not significant.
- **AC-3.2** The `SPF` DNS type is not queried.
- **AC-3.3** An absent record gives `FAIL` with severity `warning`, not `UNKNOWN`.
- **AC-3.4** More than one record gives `FAIL` with severity `critical`.
- **AC-3.5** The number of query-causing terms is counted as the worst case of walking the record together with nested `include` and `redirect`; more than ten gives `FAIL` with severity `critical`.
- **AC-3.6** The terms `all`, `ip4` and `ip6` do not count towards that number.
- **AC-3.7** Exceeding the recommended limit on void queries gives `warning`, not `critical`.
- **AC-3.8** A loop of `include` or `redirect` is detected and gives `FAIL` with severity `critical`.
- **AC-3.9** `+all` gives `FAIL` with severity `critical`; `~all` and `-all` give `PASS`.
- **AC-3.10** The presence of the `ptr` mechanism gives `warning`.
- **AC-3.11** An incomplete walk gives `UNKNOWN` with a `reasonCode`, not `FAIL` on the number of terms.
- **AC-3.12** The check's messages assert nothing about the delivery of a particular message and do not judge the ownership of the listed addresses.

---

<a id="appendix-a"></a>

# Appendix A. Responsible Sections

Each requirement has one responsible section. Where sections conflict, the provision in the responsible one applies.

| Subject | Responsible section |
|---|---|
| Release boundary | §1 |
| Check groups and the dependency on `MX` | §2 |

Requirements whose responsible section is in MVP 1.0 are not overridden by this document.
