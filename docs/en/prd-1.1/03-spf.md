# 3. SPF

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/03-spf.md)
<!-- nav:end -->

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
