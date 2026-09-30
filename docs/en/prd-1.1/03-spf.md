# 3. SPF

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/03-spf.md)
<!-- nav:end -->

[§3](03-spf.md#3-spf) defines the SPF policy check: what is read, how the RFC 7208 limits are counted, and which conclusions may be drawn from a record without a sending address.

## 3.1. What Is Being Checked

[RFC 7208](https://www.rfc-editor.org/rfc/rfc7208.html) defines `check_host()` as a check of whether a specific address may send mail for a domain. The sending address is a required input.

2check receives a domain and therefore performs static analysis of the published SPF policy. The check determines:

- whether a record exists and how many records are present;
- grammar compliance;
- DNS traversal limits;
- the policy for senders not listed in the record.

The result is not an evaluation of `check_host()` for an individual message.

## 3.2. Retrieving the Record

The record is read from the domain's `TXT`. The responsible section for the DNS queries themselves is [1.0 §8](../prd/08-dns.md#8-dns-checks).

An SPF record is a `TXT` value beginning with `v=spf1` followed by a space or the end of the value. Case is not significant. Several strings of one `TXT` value are joined with no separator.

The `SPF` DNS type is not queried: RFC 7208 requires the policy to be published in `TXT` only.

## 3.3. Number of Records

| Found | Status | Severity |
|---|---|---|
| none | `FAIL` | `warning` |
| one | analyzed further | — |
| more than one | `FAIL` | `critical` |

Multiple records cause `permerror` under RFC 7208: a receiver does not choose one of them. The `critical` level in 2check denotes a published policy that cannot be applied.

An absent record is a confirmed fact rather than an unknown one, hence `FAIL` and not `UNKNOWN`.

## 3.4. The Limit on DNS Queries

RFC 7208 limits the evaluated terms that cause DNS queries: `include`, `a`, `mx`, `ptr`, `exists`, and `redirect`. At most ten such terms may be evaluated, including nested policies. This is not a count of network packets. The terms `all`, `ip4`, and `ip6` do not count; exceeding the limit gives `permerror`.

2check assesses the **worst reachable path**, including nested `include` and an applicable `redirect`. Mechanisms after `all` are not evaluated; `redirect` is ignored when `all` is present. Mutually exclusive paths are not added as one. If path reachability or macro expansion depends on the unknown sender, an excess is not established: the affected condition returns `UNKNOWN` with `spf_traversal_incomplete`.

| Query-causing terms | Status | Severity |
|---|---|---|
| ten or fewer | condition met | — |
| more than ten | `FAIL` | `critical` |

Void queries are counted separately — answers holding no records, and "name does not exist" answers. RFC 7208 recommends limiting them to two. The recommendation is not a requirement and receivers honour it unevenly, so exceeding it gives `warning` rather than `critical`.

The walk stops when a loop of `include` or `redirect` is found; a loop is a `permerror`.

## 3.5. What the Record Says About Unlisted Senders

The first reached `all` mechanism sets the SPF result for an address that matched no earlier mechanism. An SPF result does not determine the final delivery decision.

| Record | Meaning | Status | Severity |
|---|---|---|---|
| `-all` | SPF fail result | `PASS` | — |
| `~all` | SPF softfail result | `PASS` | — |
| `?all` | state nothing | `FAIL` | `warning` |
| `+all` | allow everyone | `FAIL` | `critical` |
| neither `all` nor `redirect` | state nothing | `FAIL` | `warning` |

`+all` produces an SPF pass for any address reaching that mechanism and does not restrict the set of senders.

`~all` is not treated as a defect: it is the working setting for a domain that is not yet sure its list of senders is complete.

## 3.6. A Deprecated Mechanism

The presence of `ptr` gives `warning`. RFC 7208 discourages its use because of complexity, reliability, and additional DNS load. Other conditions are assessed independently.

## 3.7. Technical Failure

If the `TXT` query gave no definite result, the check returns `UNKNOWN` with its own `reasonCode`. The rules for `reasonCode` and `blockedBy` are [1.0 §7](../prd/07-shared-status-dependency-category-scan-semantics.md#7-statuses-dependencies-and-scan-results).

| Cause | `reasonCode` |
|---|---|
| the query did not complete | `spf_lookup_failed` |
| the walk did not complete because a nested query failed | `spf_traversal_incomplete` |

An incomplete walk does not give `FAIL` on the number of terms: having failed to finish counting, we do not know whether the limit was exceeded.

## 3.8. What the Check Does Not Assert

- That the domain's mail will or will not be delivered: delivery depends on the receiver, not on the policy alone.
- That the listed addresses really belong to the domain's senders: the record states the owner's intent, and public data cannot confirm it.
- That the policy applies to a particular message: without a sending address that conclusion is undefined.

The general rule against unproven causal claims is [1.0 §13](../prd/13-human-readable-messages-localization.md#13-user-messages-and-localization).

## 3.9. Acceptance Criteria

- **AC-3.1** An SPF record is a `TXT` value beginning with `v=spf1` followed by a space or the end of the value; case is not significant.
- **AC-3.2** The `SPF` DNS type is not queried.
- **AC-3.3** An absent record gives `FAIL` with severity `warning`, not `UNKNOWN`.
- **AC-3.4** More than one record gives `FAIL` with severity `critical`.
- **AC-3.5** DNS terms are assessed along the worst reachable path with nested `include` and an applicable `redirect`; a confirmed excess over ten gives `FAIL` with severity `critical`. Unestablished reachability does not give `FAIL`.
- **AC-3.6** The terms `all`, `ip4` and `ip6` do not count towards that number.
- **AC-3.7** Exceeding the recommended limit on void queries gives `warning`, not `critical`.
- **AC-3.8** A loop of `include` or `redirect` is detected and gives `FAIL` with severity `critical`.
- **AC-3.9** `+all` gives `FAIL` with severity `critical`; `~all` and `-all` give `PASS`.
- **AC-3.10** The presence of the `ptr` mechanism gives `warning`.
- **AC-3.11** An incomplete walk gives `UNKNOWN` with a `reasonCode`, not `FAIL` on the number of terms.
- **AC-3.12** The check's messages assert nothing about the delivery of a particular message and do not judge the ownership of the listed addresses.

---
