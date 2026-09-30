# 2check.uz — Product Requirements (PRD), MVP 1.1

**Version:** 1.1

**Status:** in development.

**Basis:** `2check_Product_Concept_v1.0 — FINAL / FROZEN` and `2check_MVP_1.0_PRD`.

## Applying the Requirements

This document covers mail health only. The MVP 1.0 specification is frozen and is not amended here: where a 1.1 requirement touches behavior that is already defined, it is stated as an addition to it and names the responsible 1.0 section.

A reference written `§7` points to a section of this document. A reference to the frozen specification is written `1.0 §7`.

The Russian and English editions describe the same requirements. Identifiers, formulas, and acceptance criteria match; editorial changes are made in both editions together.

[01. Concept](../../docs/en/01-concept.md) · [PRD Sections](../../docs/en/03-prd-1.1.md) · [Русский](../ru/2check_MVP_1.1_PRD.md)

## Contents

- [1. Scope and Goals of MVP 1.1](#section-01)
- [2. Check Groups and the Dependency on MX](#section-02)
- [3. SPF](#section-03)
- [4. DMARC](#section-04)
- [5. DKIM](#section-05)
- [6. MX](#section-06)
- [7. STARTTLS](#section-07)
- [8. PTR](#section-08)
- [9. Data Contracts and Exposure Levels](#section-09)
- [10. Effect on the Summary, the Verdict and the Score](#section-10)
- [11. Messages and Localization](#section-11)
- [12. Caching and Data Freshness](#section-12)
- [13. Outbound Connection Safety](#section-13)
- [14. The Web API and Scan Modes](#section-14)
- [15. The Interface and the Tool Page](#section-15)
- [16. Observability and Analytics](#section-16)
- [17. Testing and Release Readiness](#section-17)
- [Appendix A. Responsible Sections](#appendix-a)

<a id="section-01"></a>

# 1. Scope and Goals of MVP 1.1

[§1](#1-scope-and-goals-of-mvp-11) defines what release 1.1 adds, what stays outside it, and how it relates to the frozen MVP 1.0 specification.

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
```

The category takes part in a full scan alongside `dns`, `registry` and `tls`, and is available as a separate tool.

## 1.2. What the Release Does Not Do

The release excludes:

- assessment of the domain's outbound mail reputation;
- receiving, parsing, and delivering messages;
- verification of an individual message's signature;
- provider-specific configuration advice unsupported by published records;
- checking receiving-server addresses against blocklists.

The project has not selected a blocklist source with confirmed permission for use by a public service. This feature is therefore excluded from the release.

Outbound mail reputation depends on the actual sending address. Receiving-server records do not establish that address — [§2](#2-check-groups-and-the-dependency-on-mx).

## 1.3. Relation to MVP 1.0

The `dns`, `registry`, and `tls` checks retain their MVP 1.0 behavior. Additions for the `email` category are assigned to the following sections:

| MVP 1.0 Sections | Addition | MVP 1.1 Sections |
|---|---|---|
| [1.0 §3](../../docs/en/prd/03-user-scenarios-scan-modes.md#3-user-scenarios-and-scan-modes), [1.0 §17](../../docs/en/prd/17-internal-web-api-contract.md#17-internal-web-api-contract) | scan modes and web API | [§14](#14-the-web-api-and-scan-modes) |
| [1.0 §6](../../docs/en/prd/06-common-data-contracts-exposure.md#6-common-data-contracts-and-exposure-levels) | data contracts and representations | [§9](#9-data-contracts-and-exposure-levels) |
| [1.0 §7](../../docs/en/prd/07-shared-status-dependency-category-scan-semantics.md#7-statuses-dependencies-and-scan-results) | statuses and dependencies | [§2](#2-check-groups-and-the-dependency-on-mx) |
| [1.0 §11](../../docs/en/prd/11-domain-health-summary-issues.md#11-domain-health-summary-and-identified-issues), [1.0 §12](../../docs/en/prd/12-domain-health-score.md#12-domain-health-score) | summary, verdict, and score | [§10](#10-effect-on-the-summary-the-verdict-and-the-score) |
| [1.0 §13](../../docs/en/prd/13-human-readable-messages-localization.md#13-user-messages-and-localization) | messages and localization | [§11](#11-messages-and-localization) |
| [1.0 §14](../../docs/en/prd/14-cache-freshness.md#14-caching-and-data-freshness) | caching | [§12](#12-caching-and-data-freshness) |
| [1.0 §15](../../docs/en/prd/15-security-ssrf.md#15-security-and-ssrf-protection), [1.0 §22](../../docs/en/prd/22-performance-resource-limits-nfr.md#22-performance-and-resource-limits) | security and resource limits | [§13](#13-outbound-connection-safety) |
| [1.0 §23](../../docs/en/prd/23-frontend-ux-result-presentation.md#23-user-interface-and-result-presentation), [1.0 §24](../../docs/en/prd/24-seo-routing-public-tool-pages.md#24-seo-routing-and-tool-pages) | interface and routing | [§15](#15-the-interface-and-the-tool-page) |
| [1.0 §21](../../docs/en/prd/21-observability-logging-operational-monitoring.md#21-observability-logging-and-monitoring), [1.0 §28](../../docs/en/prd/28-product-analytics-success-metrics.md#28-product-analytics-and-usage-metrics) | observability and analytics | [§16](#16-observability-and-analytics) |
| [1.0 §26](../../docs/en/prd/26-testing-quality-gates-acceptance-strategy.md#26-testing-and-release-criteria) | testing and release conditions | [§17](#17-testing-and-release-readiness) |

The MVP 1.0 text remains unchanged. Appendix A lists the responsible sections of this addition.

## 1.4. Acceptance Criteria

- **AC-1.1** The release adds exactly one category, `email`; the checks in the `dns`, `registry` and `tls` categories are unchanged.
- **AC-1.2** This document does not amend the text of MVP 1.0; in a conflict, the provision in the responsible section identified in Appendix A applies.
- **AC-1.3** Outbound mail reputation is outside the release boundary and is not inferred from the results of the `email` category.
- **AC-1.4** Receiving, parsing and delivering messages are outside the release boundary.
- **AC-1.5** The `email` category is available both in a full scan and as a separate tool.

---

<a id="section-02"></a>

# 2. Check Groups and the Dependency on MX

[§2](#2-check-groups-and-the-dependency-on-mx) defines how the `email` category is put together: which groups the checks fall into, which of them depend on `MX`, and what happens to each group when the domain has no mail server. The responsible section for status and dependency semantics is [1.0 §7](../../docs/en/prd/07-shared-status-dependency-category-scan-semantics.md#7-statuses-dependencies-and-scan-results); only their application to this category is defined here.

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

The second is a deliberate declaration by the owner under RFC 7505, not an omission. Both are detailed in [§6](#6-mx).

## 2.4. When There Is No Subject

| Check | Status |
|---|---|
| `SPF` | runs as usual |
| `DMARC` | runs as usual |
| `DKIM` | runs as usual |
| `STARTTLS` | `NOT_APPLICABLE` with `blockedBy` |
| `PTR` | `NOT_APPLICABLE` with `blockedBy` |

`NOT_APPLICABLE` rather than `UNKNOWN`: `UNKNOWN` means the check applies but no result could be obtained, whereas here the subject of the check is absent.

The `MX` check assesses the absence of a receiving server. Blocked checks add no penalties. `NOT_APPLICABLE` does not reduce confidence; the completeness and confidence rules in [1.0 §7](../../docs/en/prd/07-shared-status-dependency-category-scan-semantics.md#7-statuses-dependencies-and-scan-results) and [1.0 §11](../../docs/en/prd/11-domain-health-summary-issues.md#11-domain-health-summary-and-identified-issues) remain unchanged.

## 2.5. The Receiving Server, Not Outbound Mail

`MX` names the server that **receives** mail for the domain. The server the domain **sends** from may be a different one, and it does not follow from the domain's public records.

The results of `PTR` are therefore stated as the condition of the receiving server. Claims such as "mail from this domain will land in spam" are not permitted on this evidence: they rest on a link the data does not contain. The general rule against unproven causal claims is [1.0 §13](../../docs/en/prd/13-human-readable-messages-localization.md#13-user-messages-and-localization).

## 2.6. Acceptance Criteria

- **AC-2.1** The `SPF`, `DMARC` and `DKIM` checks run whether or not `MX` is present.
- **AC-2.2** With no `MX` but with address records for the domain, the checks of the receiving server run against the implicit server.
- **AC-2.3** Where there is no subject, the `STARTTLS` and `PTR` checks return `NOT_APPLICABLE` with a `blockedBy` drawn from the values `mx_missing` and `null_mx`.
- **AC-2.4** An absent receiving server is not itself a reason for `UNKNOWN` in the category.
- **AC-2.5** The state of the receiving server reduces the numerical score once, through the result of the `MX` check.
- **AC-2.6** The messages of the `PTR` check describe the receiving server and assert nothing about the domain's outbound mail.

---

<a id="section-03"></a>

# 3. SPF

[§3](#3-spf) defines the SPF policy check: what is read, how the RFC 7208 limits are counted, and which conclusions may be drawn from a record without a sending address.

## 3.1. What Is Being Checked

[RFC 7208](https://www.rfc-editor.org/rfc/rfc7208.html) defines `check_host()` as a check of whether a specific address may send mail for a domain. The sending address is a required input.

2check receives a domain and therefore performs static analysis of the published SPF policy. The check determines:

- whether a record exists and how many records are present;
- grammar compliance;
- DNS traversal limits;
- the policy for senders not listed in the record.

The result is not an evaluation of `check_host()` for an individual message.

## 3.2. Retrieving the Record

The record is read from the domain's `TXT`. The responsible section for the DNS queries themselves is [1.0 §8](../../docs/en/prd/08-dns.md#8-dns-checks).

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

If the `TXT` query gave no definite result, the check returns `UNKNOWN` with its own `reasonCode`. The rules for `reasonCode` and `blockedBy` are [1.0 §7](../../docs/en/prd/07-shared-status-dependency-category-scan-semantics.md#7-statuses-dependencies-and-scan-results).

| Cause | `reasonCode` |
|---|---|
| the query did not complete | `spf_lookup_failed` |
| the walk did not complete because a nested query failed | `spf_traversal_incomplete` |

An incomplete walk does not give `FAIL` on the number of terms: having failed to finish counting, we do not know whether the limit was exceeded.

## 3.8. What the Check Does Not Assert

- That the domain's mail will or will not be delivered: delivery depends on the receiver, not on the policy alone.
- That the listed addresses really belong to the domain's senders: the record states the owner's intent, and public data cannot confirm it.
- That the policy applies to a particular message: without a sending address that conclusion is undefined.

The general rule against unproven causal claims is [1.0 §13](../../docs/en/prd/13-human-readable-messages-localization.md#13-user-messages-and-localization).

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

<a id="section-04"></a>

# 4. DMARC

[§4](#4-dmarc) defines the DMARC policy check: where the record is looked for, how it is recognized, what counts as a working policy, and how the check treats records written to the previous standard.

## 4.1. The Standard in Force

The check follows [RFC 9989](https://www.rfc-editor.org/rfc/rfc9989.html). Together with RFC 9990 and RFC 9991, it replaces RFC 7489.

The specification changes inherited-policy discovery, the set of tags, and reporting rules. In particular, discovery uses the DNS tree instead of a public suffix list, and the `pct` tag is no longer applied.

Records published under the previous specification are evaluated under the current rules. Possible differences in receiver behavior are described separately.

## 4.2. What Is Being Checked

What is checked is the domain's published policy, not the handling of a particular message. Alignment between the domains in the signature and in the envelope is a property of a message; without a message it is undefined and is not asserted.

## 4.3. Where the Record Is Looked For

The record is read from the `TXT` of the name `_dmarc` under the domain being checked.

If no applicable record is found, a parent-domain policy is sought under RFC 9989. The walk follows the stopping and policy-domain selection rules, including `psd` handling, and the eight-query limit with the specified shortening of long names. A usable inherited policy is determined by the standard's algorithm, not merely by the nearest record found. The responsible section for DNS queries is [1.0 §8](../../docs/en/prd/08-dns.md#8-dns-checks).

The user is told which policy will apply to the domain and where it came from:

| Where the record was found | What is reported |
|---|---|
| at the domain being checked | the domain's own policy |
| at a parent domain | an inherited policy, naming the domain it came from |
| nowhere | there is no policy |

An inherited policy is a working state rather than a defect: that is how subdomains are meant to work.

## 4.4. Recognizing the Record

The `v` tag with the value `DMARC1` must come first in the record, case-sensitively. A record that does not meet this condition is not used for policy selection. Inheritance is considered under the discovery rules.

If more than one record is found for one name, all of them are discarded.

| Found | Status | Severity |
|---|---|---|
| no record anywhere along the walk | `FAIL` | `warning` |
| one usable record | analyzed further | — |
| a record exists but is not recognized | `FAIL` | `critical` |
| more than one for one name | `FAIL` | `critical` |

The levels distinguish different states: `warning` denotes an absent policy, while `critical` denotes a published record that a receiver cannot apply. These levels are assessment rules defined by 2check.

## 4.5. The Policy

| Effective policy value (`p`, `sp`, or `np`) | Requested receiver action | Status | Severity |
|---|---|---|---|
| `reject` | rejects failing messages | `PASS` | — |
| `quarantine` | quarantine | `PASS` | — |
| `none` | no handling preference | `FAIL` | `warning` |
| the tag is absent | read as `none` | `FAIL` | `warning` |

`p=none` is a valid monitoring policy. It requests neither rejection nor quarantine of messages that fail DMARC. The `warning` level communicates this limitation and does not indicate a syntax error.

For inheritance, the effective policy is selected using `sp` and `np` under RFC 9989. Their presence does not itself create a penalty; the applicable policy value determines the status. The message reports that value and its source.

## 4.6. Reports

An absent `rua` tag gives `FAIL` with severity `informational`: the record does not request aggregate DMARC reports. This limits the information about domain use available through this mechanism.

The addresses in `rua` and `ruf` belong to the domain's owner and are shown under the exposure rules of [1.0 §6](../../docs/en/prd/06-common-data-contracts-exposure.md#6-common-data-contracts-and-exposure-levels).

## 4.7. Compatibility with the Previous Standard

| What was found | Status | Severity |
|---|---|---|
| the `pct` tag | `FAIL` | `warning` |

RFC 9989 removes the `pct` tag. A receiver following the new standard ignores it; a receiver following RFC 7489 applies the policy to the stated share of messages. This may lead to different policy application. The message reports the obsolete tag and the possible difference without estimating a share of protected messages.

## 4.8. Technical Failure

| Cause | `reasonCode` |
|---|---|
| the query did not complete | `dmarc_lookup_failed` |
| the tree walk did not complete | `dmarc_tree_walk_incomplete` |

An incomplete walk gives `UNKNOWN`: not having reached the end, we do not know whether a policy exists further up. The rules for `reasonCode` and `blockedBy` are [1.0 §7](../../docs/en/prd/07-shared-status-dependency-category-scan-semantics.md#7-statuses-dependencies-and-scan-results).

## 4.9. What the Check Does Not Assert

- That the domain's mail does or does not pass DMARC: that is a property of a message, not of a record.
- That the policy is applied by every receiver: application is the receiver's decision.
- That `reject` protects the domain completely: DMARC describes what happens on a mismatch, not the authenticity of the content.

## 4.10. Acceptance Criteria

- **AC-4.1** The check follows RFC 9989; a record written to RFC 7489 is recognized as valid.
- **AC-4.2** The record is read from the `TXT` of the name `_dmarc` under the domain; if it is absent, the name tree is walked, in no more than eight queries.
- **AC-4.3** The source of the policy that applies is reported to the user; an inherited policy is not treated as a defect.
- **AC-4.4** The `v` tag with the value `DMARC1` must come first, case-sensitively; otherwise the record is ignored outright.
- **AC-4.5** More than one record for one name gives `FAIL` with severity `critical`.
- **AC-4.6** An absent policy gives `FAIL` with severity `warning`; an unrecognized record gives `FAIL` with severity `critical`.
- **AC-4.7** `p=reject` and `p=quarantine` give `PASS`; `p=none` and an absent `p` tag give `FAIL` with severity `warning`.
- **AC-4.8** Inherited policy uses `sp` and `np` as specified by the standard; their presence is not itself penalized. The effective policy is assessed.
- **AC-4.9** An absent `rua` gives `FAIL` with severity `informational`.
- **AC-4.10** The presence of the `pct` tag gives `FAIL` with severity `warning`, explaining the divergence between the standards.
- **AC-4.11** An incomplete tree walk gives `UNKNOWN` with a `reasonCode`, not a conclusion that no policy exists.
- **AC-4.12** The check's messages assert nothing about the fate of a particular message.

---

<a id="section-05"></a>

# 5. DKIM

[§5](#5-dkim) defines the DKIM check: where selectors come from, what is examined in a key that was found, and why a key that was not found is not the same as a key that is absent.

## 5.1. Why a Selector Cannot Be Discovered

A DKIM key is published at the name `<selector>._domainkey.<domain>`. The owner chooses the selector, and a domain's selectors cannot be enumerated through DNS: a name can only be queried by someone who already knows it.

An absent response at the queried names does not establish that no keys exist under other selectors. The result is limited to the names actually queried.

## 5.2. Where Selectors Come From

Two sources, in the order they are used:

1. A selector entered by the user. An optional field beside the domain.
2. The selectors of the mail provider recognized from the domain's `MX`.

The provider-to-selector mapping contains known candidates and is versioned configuration under the rules of [1.0 §20](../../docs/en/prd/20-configuration-policy-management.md#20-configuration-and-policy-management). Recognizing a receiving provider from `MX` supplies search candidates; it does not establish that outbound mail uses the same provider.

At most eight names from these sources are queried per check. Arbitrary selectors are not enumerated.

If no provider is recognized from `MX` and the user entered no selector, there is nothing to query.

## 5.3. Recognizing the Record

The record is read from the `TXT` of the selector's name. The responsible section for DNS queries is [1.0 §8](../../docs/en/prd/08-dns.md#8-dns-checks).

The `v` tag, when present, must have the value `DKIM1`. The key is held in the `p` tag.

## 5.4. What Is Examined in the Key

| What was found | Status | Severity |
|---|---|---|
| the key is usable | `PASS` | — |
| the `p` tag is empty | `FAIL` | `critical` |
| an `rsa` key shorter than `1024` bits | `FAIL` | `critical` |
| the `h` tag permits only `sha1` | `FAIL` | `critical` |
| the `t` tag contains `y` | `FAIL` | `warning` |

An empty `p` tag is a revoked key: the record is there, and signatures made under it verify against nothing.

The key length limit comes from RFC 8301, which updates RFC 6376: a verifier must not consider signatures valid when the key is shorter than `1024` bits. The ban on `sha1` comes from the same place: signatures using it have permanently failed evaluation.

A `t` tag containing `y` declares testing mode as described in [RFC 6376](https://www.rfc-editor.org/rfc/rfc6376.html#section-3.6.1). The check reports this mode and assigns the product-defined `warning` level.

`ed25519` keys are recognized alongside `rsa` under RFC 8463; the length limit does not apply to them.

## 5.5. When No Key Is Found

| What happened | Status | `reasonCode` |
|---|---|---|
| none of the names held a record | `UNKNOWN` | `dkim_selector_unknown` |
| the user entered a selector and it holds no record | `FAIL` | — |
| the query did not complete | `UNKNOWN` | `dkim_lookup_failed` |

An unsuccessful search using configured candidates gives an uncertain result. For an explicitly supplied selector, absence is established only at that name and gives `FAIL`. This finding does not extend to other selectors of the domain.

`UNKNOWN` reduces confidence in the result under the rules of [1.0 §11](../../docs/en/prd/11-domain-health-summary-issues.md#11-domain-health-summary-and-identified-issues). The check's message says plainly which names were tried and offers to take a selector.

## 5.6. What the Check Does Not Assert

- That the domain's mail is signed: publishing a key and signing messages are different acts, and the second cannot be checked through DNS.
- That the signature on a particular message is valid: without a message that is undefined.
- That the domain has no DKIM, when no key was found at the names tried.

## 5.7. Acceptance Criteria

- **AC-5.1** Selectors come from the value entered by the user and from the mapping for the provider recognized from `MX`; the mapping is versioned configuration.
- **AC-5.2** No more than eight selector names are queried in one check.
- **AC-5.3** An empty `p` tag gives `FAIL` with severity `critical`.
- **AC-5.4** An `rsa` key shorter than `1024` bits gives `FAIL` with severity `critical`.
- **AC-5.5** An `h` tag permitting only `sha1` gives `FAIL` with severity `critical`.
- **AC-5.6** A `t` tag holding `y` gives `FAIL` with severity `warning`.
- **AC-5.7** `ed25519` keys are recognized as valid; the length limit does not apply to them.
- **AC-5.8** No record at the names tried gives `UNKNOWN` with a `reasonCode`, not `FAIL`.
- **AC-5.9** No record at a selector entered by the user gives `FAIL`.
- **AC-5.10** The check's message names the selectors tried and does not assert that the domain has no DKIM.

---

<a id="section-06"></a>

# 6. MX

[§6](#6-mx) defines the check of the `MX` records: how the receiving server is located, what counts as a sound configuration, and what this check hands to the rest of the group.

## 6.1. What Is Being Checked

What is checked is where mail addressed at this domain will go, and whether what was found can take delivery.

The check sends no mail and does not contact the server it finds: connecting to it is the subject of [§7](#7-starttls).

## 6.2. How the Server Is Located

The order is laid down by RFC 5321 and restated in RFC 7505: a sender queries the domain's `MX`, and failing to find one, turns to the domain's own address records.

| What is published | The receiving server |
|---|---|
| one or more `MX` records | the hosts in those records, in order of preference |
| no `MX`, address records present | the domain itself, implicitly |
| an `MX` saying "I accept no mail" | there is deliberately no server |
| neither `MX` nor address records | there is no server |

Null MX is a sole `MX` record with preference `0` and exchange `.` (the root name), defined in [RFC 7505](https://www.rfc-editor.org/rfc/rfc7505.html#section-3). It declares that the domain accepts no mail. An empty string is not its textual representation.

## 6.3. Results

| State | Status | Severity | What is handed on |
|---|---|---|---|
| `MX` records present and usable | `PASS` | — | the hosts, for [§7](#7-starttls) and [§8](#8-ptr) |
| the "I accept no mail" record | `PASS` | — | `blockedBy = null_mx` |
| no `MX`, delivery will follow the address records | `FAIL` | `warning` | the domain itself as a host |
| neither `MX` nor address records | `FAIL` | `warning` | `blockedBy = mx_missing` |
| `MX` records present but no host is usable | `FAIL` | `critical` | `blockedBy = mx_missing` |

A valid Null MX record receives `PASS` for explicitly declaring that the domain accepts no mail.

Without `MX`, address records define an implicit delivery route. The `warning` level recommends naming the mail servers explicitly or declaring that no mail is accepted. It does not mean that delivery has been tested.

## 6.4. Whether a Host Is Usable

| What was found at the host | Status | Severity |
|---|---|---|
| address records present | the host is usable | — |
| the host is a `CNAME` alias | `FAIL` | `warning` |
| no address records | the host is unusable | — |
| an address written in place of a name | `FAIL` | `critical` |

An `MX` host must have address records and must not be an alias — RFC 2181. The `warning` level for an alias and `critical` for an address in place of a name are product assessment rules; individual senders' behavior is not tested.

If every host is unusable, the result receives `critical`. If only some are unusable, the result is `FAIL` with severity `warning` and lists the affected hosts. A usable DNS route does not establish actual delivery.

## 6.5. Technical Failure

| Cause | `reasonCode` |
|---|---|
| the `MX` query did not complete | `mx_lookup_failed` |
| host addresses did not resolve for technical reasons | `mx_host_resolution_failed` |

An incomplete query gives `UNKNOWN`, not a conclusion that no records exist. The rules for `reasonCode` and `blockedBy` are [1.0 §7](../../docs/en/prd/07-shared-status-dependency-category-scan-semantics.md#7-statuses-dependencies-and-scan-results).

## 6.6. What the Check Does Not Assert

- That the server accepts mail: DNS records do not establish this; the probe in [§7](#7-starttls) checks only whether an encrypted connection can be established.
- That mail will reach a mailbox: the route beyond the receiving server is not visible in public data.
- That the order of preference is the right one: preference expresses the owner's intent.

## 6.7. Acceptance Criteria

- **AC-6.1** The receiving server is located in the order laid down by RFC 5321: `MX` records, then the domain's address records.
- **AC-6.2** A sole `MX` record with preference `0` and exchange `.` is recognized as Null MX and gives `PASS`.
- **AC-6.3** No `MX` with address records present gives `FAIL` with severity `warning` and hands on the domain itself as a host.
- **AC-6.4** Neither `MX` nor address records gives `FAIL` with severity `warning` and `blockedBy = mx_missing` for the dependent checks.
- **AC-6.5** No usable host gives `FAIL` with severity `critical`.
- **AC-6.6** An alias host gives `FAIL` with severity `warning`; an address in place of a name gives `FAIL` with severity `critical`.
- **AC-6.7** An incomplete query gives `UNKNOWN` with a `reasonCode`, not a conclusion that no records exist.
- **AC-6.8** The check opens no connection to the hosts it finds.

---

<a id="section-07"></a>

# 7. STARTTLS

[§7](#7-starttls) defines the check of encryption at the receiving server: what the probe does, which hosts it touches, and how its result differs from a result we simply could not obtain.

## 7.1. What Is Being Checked

The check determines whether the receiving server offers STARTTLS and whether an encrypted connection can be established.

The release adds an SMTP probe to the existing DNS, registration, and TLS checks. SMTP connection admission is defined in [§13](#13-outbound-connection-safety); destination-address validation is defined in [1.0 §15](../../docs/en/prd/15-security-ssrf.md#15-security-and-ssrf-protection).

## 7.2. What the Probe Does

A connection to port `25` of the host, a greeting, a request for extensions, the move to encryption, and the end of the session.

The probe sends no mail: the sender, recipient and data commands are not issued under any circumstances. From the receiving server's point of view this is a visit that leaves behind neither a message nor a deferred delivery.

The port is fixed. Arbitrary ports are accepted neither from input nor from the domain's records — [1.0 §25](../../docs/en/prd/25-privacy-data-protection-abuse-boundaries.md#25-privacy-access-and-abuse-prevention).

## 7.3. Which Hosts Are Probed

The hosts come from [§6](#6-mx), in order of preference. No more than four hosts are probed in one check.

The limit exists because each host is a separate connection and a separate handshake, while the scan's time budget is shared across all categories and is set by [1.0 §22](../../docs/en/prd/22-performance-resource-limits-nfr.md#22-performance-and-resource-limits). Hosts beyond the limit are listed as not probed; the result then covers only the hosts that were, and the message says so plainly.

## 7.4. Results

| What happened | Status | Severity |
|---|---|---|
| every probed host offers encryption and the move succeeds | `PASS` | — |
| some hosts offer no encryption | `FAIL` | `warning` |
| no host offers encryption | `FAIL` | `critical` |
| encryption is offered but the move fails | `FAIL` | `critical` |

An unsuccessful transition after STARTTLS is offered is assessed as `critical` when a failure at the target server is confirmed. A technical inability to complete the observation is handled separately under [§7.6](#76-technical-failure).

## 7.5. The Host's Certificate

The certificate is examined under the rules of [1.0 §10](../../docs/en/prd/10-ssl-tls.md#10-ssltls-checks): validity period, name match, chain of trust.

A validity-period, name-match, or trust failure gives `FAIL` with severity `warning`. This level is an assessment rule of 2check. The certificate result cannot establish whether an individual sender will accept the connection or deliver a message.

The protocol version is assessed in the same place, under [1.0 §10](../../docs/en/prd/10-ssl-tls.md#10-ssltls-checks), and gets no separate rules here.

## 7.6. Technical Failure

| Cause | `reasonCode` |
|---|---|
| the connection was not established | `starttls_connect_failed` |
| the session broke off before a result | `starttls_session_incomplete` |
| outbound connections are unavailable in this deployment | `outbound_smtp_unavailable` |

An unavailable outbound mail port is a deployment limitation. It is shown separately from a confirmed fault at the receiving server and does not reduce the domain's score. This follows the rule in [1.0 §15](../../docs/en/prd/15-security-ssrf.md#15-security-and-ssrf-protection).

In all three cases the status is `UNKNOWN`.

## 7.7. What the Check Does Not Assert

- That the server will accept a message: the probe never reaches the point of sending one and cannot know.
- That the domain's correspondence is encrypted: what is encrypted is the leg up to the receiving server, not the message's whole journey.
- That senders actually use encryption: that is the sender's decision.

## 7.8. Acceptance Criteria

- **AC-7.1** The probe connects only to port `25` and only to hosts obtained from [§6](#6-mx).
- **AC-7.2** The probe issues no sender, recipient or data commands.
- **AC-7.3** No more than four hosts are probed in one check; those not probed are listed, and the result covers only the ones that were.
- **AC-7.4** No encryption on some hosts gives `FAIL` with severity `warning`; on all of them, `FAIL` with severity `critical`.
- **AC-7.5** Encryption offered but not completed gives `FAIL` with severity `critical`.
- **AC-7.6** Faults in the certificate give `FAIL` with severity `warning`.
- **AC-7.7** Unavailable outbound connections give `UNKNOWN` with `reasonCode = outbound_smtp_unavailable` and do not reduce the domain's numerical score.
- **AC-7.8** The check's messages do not assert that the server will or will not accept a message.

---

<a id="section-08"></a>

# 8. PTR

[§8](#8-ptr) defines the check of the receiving server's reverse names: what counts as a configured reverse name, how its confirmation is tested, and what does not follow from either.

## 8.1. What Is Being Checked

What is checked are the addresses of the hosts obtained from [§6](#6-mx). Each address is asked for its reverse name, and each name for the address it points to.

## 8.2. A Confirmed Reverse Name

A reverse name is confirmed when the name returned for an address resolves back to that address. Forward and reverse record consistency is described in RFC 1912.

A missing match indicates inconsistent DNS records. It establishes neither ownership of the name or address nor malicious intent.

## 8.3. Separate IPv4 and IPv6 Results

IPv4 and IPv6 are checked separately. A result for one address family is not applied to the other: reverse-name availability and confirmation may differ.

## 8.4. Results

| What was found | Status | Severity |
|---|---|---|
| a reverse name exists and is confirmed | `PASS` | — |
| a reverse name exists but is not confirmed | `FAIL` | `warning` |
| no reverse name for a version four address | `FAIL` | `warning` |
| no reverse name for a version six address | `FAIL` | `informational` |
| the reverse name points at an alias | `FAIL` | `informational` |

Several reverse names for one address are permitted and are reported as fact.

## 8.5. What Is Not Judged

The appearance of a name does not affect its status. A name containing an address or resembling an automatically generated value is not treated as a defect.

A name's form does not establish server configuration quality or the handling of outbound messages. Limits on causal claims are defined in [1.0 §13](../../docs/en/prd/13-human-readable-messages-localization.md#13-user-messages-and-localization).

## 8.6. Technical Failure

| Cause | `reasonCode` |
|---|---|
| the reverse query did not complete | `ptr_lookup_failed` |
| the forward query for confirmation did not complete | `ptr_confirmation_incomplete` |

An incomplete confirmation gives `UNKNOWN`: without the forward answer we do not know whether the name is confirmed, and we are not entitled to call it unconfirmed.

## 8.7. What the Check Does Not Assert

- That the domain's mail will or will not land in spam: the reverse name of a receiving host does not describe the sending one and says nothing about the fate of outbound messages — [§2](#2-check-groups-and-the-dependency-on-mx).
- That the host is badly configured in general: a reverse name is one setting, not an assessment of a host.
- That the name belongs to the domain's owner: the addresses of a receiving host often belong to a mail provider.

## 8.8. Acceptance Criteria

- **AC-8.1** The addresses checked are those of the hosts obtained from [§6](#6-mx); no other address is queried.
- **AC-8.2** A reverse name counts as confirmed only when it resolves back to the same address.
- **AC-8.3** Addresses of version four and version six give separate results.
- **AC-8.4** No reverse name for a version four address gives `FAIL` with severity `warning`, and for version six with severity `informational`.
- **AC-8.5** An unconfirmed reverse name gives `FAIL` with severity `warning`.
- **AC-8.6** The look of a reverse name affects no status and is not judged in the message.
- **AC-8.7** An incomplete confirmation gives `UNKNOWN` with a `reasonCode`, not a conclusion that the name is unconfirmed.
- **AC-8.8** The check's messages assert nothing about the fate of the domain's outbound mail.

---

<a id="section-09"></a>

# 9. Data Contracts and Exposure Levels

[§9](#9-data-contracts-and-exposure-levels) defines the structures the `email` category uses inside the common contracts of 1.0, and which of its data reach which representation. The responsible section for the contracts themselves is [1.0 §6](../../docs/en/prd/06-common-data-contracts-exposure.md#6-common-data-contracts-and-exposure-levels); only this category's variants are defined here.

## 9.1. The Category

The enumeration of categories gains one value:

```text
category: dns | registry | tls | email
```

The order they appear in the interface is set by [1.0 §23](../../docs/en/prd/23-frontend-ux-result-presentation.md#23-user-interface-and-result-presentation) and is not fixed in this section.

## 9.2. The Subject of a Check

```text
EmailCheckTarget =
  EmailPolicyTarget |
  MailHostTarget

EmailPolicyTarget {
  kind: EMAIL_POLICY
  policy: SPF | DMARC | DKIM
  queriedName
}

MailHostTarget {
  kind: MAIL_HOST
  hostname
  preference?
  ipFamily?: IPV4 | IPV6
  implicit?
}
```

`queriedName` is the name the policy was asked for. For DMARC that name may belong to a parent domain, and for DKIM it carries a selector, so it is part of the subject of the check rather than a detail: without it the result cannot be read.

`implicit` marks a host obtained from the domain's address records where there is no `MX` — [§6](#6-mx).

## 9.3. Where a Result Came From

```text
EmailCheckSource =
  DnsRecordSource |
  SmtpProbeSource

DnsRecordSource {
  kind: DNS_RECORD
  traversedNames?
  voidLookups?
}

SmtpProbeSource {
  kind: SMTP_PROBE
  hostsProbed
  hostsSkipped
}
```

`hostsProbed` and `hostsSkipped` separately represent probed and skipped hosts. Any skipped hosts indicate incomplete coverage. Equality or inequality of these counts does not itself determine completeness — [§7](#7-starttls).

## 9.4. Exposure Levels

| Data | Representation |
|---|---|
| status, severity, message | Public |
| the policy and its key values | Public |
| the name the policy was found at | Public |
| `MX` hosts and their order of preference | Public |
| host addresses | Technical |
| the original text of records | Technical |
| the selector names queried | Technical |
| the domains of DMARC report recipients | Public |
| the full addresses of DMARC report recipients | Technical |

The recipient domain identifies whether reports are sent to a third-party service. The full address is available in the technical representation on explicit request. Omitting it from the public summary limits further distribution of addresses already published in DNS.

The category defines no Gated data.

## 9.5. Machine Values

The list in [1.0 §6](../../docs/en/prd/06-common-data-contracts-exposure.md#6-common-data-contracts-and-exposure-levels) gains, as values that are not localized:

- the names and values of policy tags;
- selector names;
- host names and their order of preference.

## 9.6. Acceptance Criteria

- **AC-9.1** The enumeration of categories gains the single value `email`.
- **AC-9.2** `EmailCheckTarget` and `EmailCheckSource` have the structure defined in this section and are not arbitrary fields.
- **AC-9.3** The name a policy was asked for is part of the subject of the check.
- **AC-9.4** A host obtained from the domain's address records is marked `implicit`.
- **AC-9.5** The number of hosts probed and the number left unprobed are distinguished in the result data.
- **AC-9.6** Host addresses and the original text of records are not part of the Public representation.
- **AC-9.7** The full addresses of DMARC report recipients are not part of the Public representation; their domains are.
- **AC-9.8** The category defines no Gated data.

---

<a id="section-10"></a>

# 10. Effect on the Summary, the Verdict and the Score

[§10](#10-effect-on-the-summary-the-verdict-and-the-score) defines how the results of the `email` category enter the summary and the numerical score. The responsible sections are [1.0 §11](../../docs/en/prd/11-domain-health-summary-issues.md#11-domain-health-summary-and-identified-issues) and [1.0 §12](../../docs/en/prd/12-domain-health-score.md#12-domain-health-score); the rules for the verdict, for confidence and the scoring formula are not changed here.

## 10.1. What Changes and What Does Not

The MVP 1.0 score is the base score minus Issue penalties. Adding a category changes neither the formula nor a division of weight between categories.

The `email` category creates Issues under the common rules. Multiple findings with one established cause are merged as specified in [§10.3](#103-merging-issues-inside-the-category).

## 10.2. A Domain That Sends No Mail

A domain may explicitly declare that it neither receives nor sends mail. This intent is identified from the combination:

| Sign | Value |
|---|---|
| `MX` | valid Null MX |
| SPF | `-all` with no permitting mechanisms |
| DMARC | `p=reject` |

This combination does not automatically assign `PASS` to every check:

- valid SPF and MX declarations receive `PASS`;
- DMARC is assessed under [§4](#4-dmarc), including additional conditions;
- STARTTLS and PTR receive `NOT_APPLICABLE` under [§2](#2-check-groups-and-the-dependency-on-mx);
- DKIM is assessed under [§5](#5-dkim); an unfound key without an explicit selector remains `UNKNOWN`.

The refusal of mail itself and inapplicable server checks create no penalties. Confirmed defects in published records remain reportable. An uncertain result reduces confidence under [§10.4](#104-effect-on-confidence).

An incomplete combination does not establish a refusal of mail; the ordinary rules of [§3](#3-spf)–[§8](#8-ptr) apply.

## 10.3. Merging Issues Inside the Category

The merging rules are [1.0 §11](../../docs/en/prd/11-domain-health-summary-issues.md#11-domain-health-summary-and-identified-issues): one root defect gives one Issue and one penalty, and merging is permitted only inside a category.

The following merges are defined for this category:

| Root defect | What is merged |
|---|---|
| the domain declared no sending policy | an absent SPF and an absent DMARC |
| no receiving server was found | the `MX` result and everything it blocked |
| a policy is published but does not work | several records, an unrecognized record, a parse error |

Merging absent SPF and DMARC is an assessment rule of 2check: absence of both policies creates one Issue. It does not make the mechanisms functionally interchangeable. Errors in separate published policies are merged only when a shared cause is established.

Merging with the `dns`, `registry` and `tls` categories is not permitted — [1.0 §11](../../docs/en/prd/11-domain-health-summary-issues.md#11-domain-health-summary-and-identified-issues).

## 10.4. Effect on Confidence

This category produces `UNKNOWN` more often than the others, and the reasons are listed in [§3](#3-spf)–[§8](#8-ptr). The substantial one is an unknown DKIM selector: it arises for any domain whose mail provider is unknown to us.

The rule in [1.0 §11](../../docs/en/prd/11-domain-health-summary-issues.md#11-domain-health-summary-and-identified-issues) is not softened for it: `UNKNOWN` makes the category's completeness `PARTIAL`, confidence `REDUCED`, and the verdict in the absence of issues `NO_CONFIRMED_ISSUES_INCOMPLETE` rather than `HEALTHY`.

An incomplete check of the published key cannot establish a fully verified category result. Verification of an individual message's signature is outside this release.

## 10.5. Penalty Values

The category introduces no penalty values of its own: the values in [1.0 §12](../../docs/en/prd/12-domain-health-score.md#12-domain-health-score) apply, by severity. The severities are assigned in [§3](#3-spf)–[§8](#8-ptr).

## 10.6. Acceptance Criteria

- **AC-10.1** Adding the category changes neither the scoring formula nor the division of shares between categories.
- **AC-10.2** The combination of Null MX, `-all` with no permitting mechanisms, and `p=reject` does not assign `PASS` to all checks: STARTTLS and PTR retain `NOT_APPLICABLE`, DKIM is assessed under [§5](#5-dkim), and DMARC under [§4](#4-dmarc).
- **AC-10.3** A partial match of the combination does not establish a refusal of mail; the ordinary check rules remain in effect.
- **AC-10.4** An absent SPF and an absent DMARC merge into one Issue with one penalty.
- **AC-10.5** Results blocked by an absent receiving server create no Issue of their own.
- **AC-10.6** Merging an `email` Issue with another category is rejected by the configuration check.
- **AC-10.7** `UNKNOWN` in this category reduces confidence under the rules of [1.0 §11](../../docs/en/prd/11-domain-health-summary-issues.md#11-domain-health-summary-and-identified-issues) and is not softened.
- **AC-10.8** The category introduces no penalty values of its own.

---

<a id="section-11"></a>

# 11. Messages and Localization

[§11](#11-messages-and-localization) defines what the messages of the `email` category tell the user, and what they do not. The responsible section is [1.0 §13](../../docs/en/prd/13-human-readable-messages-localization.md#13-user-messages-and-localization); the rules for the message model, the order of explanation and localization are not changed here.

## 11.1. What a Check Reports

The order in [1.0 §13](../../docs/en/prd/13-human-readable-messages-localization.md#13-user-messages-and-localization) is retained: observation, consequence, recommendation. A consequence and a recommendation for correcting a defect are included only for a confirmed issue.

The message describes a specific observation: a record found, its value, or a connection result. A definition of SPF, DMARC, or DKIM does not replace the check result.

## 11.2. Forbidden Causal Claims

The list in [1.0 §13](../../docs/en/prd/13-human-readable-messages-localization.md#13-user-messages-and-localization) gains the claims that may not be made in this category:

- an absent policy means the domain's mail lands in spam;
- a present policy means nobody can write in the domain's name;
- `p=reject` means forging mail is impossible;
- a key that was not found means the domain's mail is unsigned;
- a receiving host without a reverse name means trouble sending;
- `~all` means weak or incomplete protection.

These claims exceed the observation. DNS record state alone does not establish message handling, which also depends on the sending server, content, and receiver policy.

## 11.3. Wording for UNKNOWN

The rule in [1.0 §13](../../docs/en/prd/13-human-readable-messages-localization.md#13-user-messages-and-localization) applies unchanged: `UNKNOWN` is described as "could not be checked", with no claim that the domain is faulty.

Two cases are explained plainly as a limitation of 2check rather than a property of the domain:

| Case | What is said |
|---|---|
| the DKIM selector is unknown | we do not know where to look for the key, and we list what was tried |
| outbound connections are unavailable | encryption cannot be checked in this deployment |

The unknown-selector message offers the user a field to refine the search.

## 11.4. Wording for PASS

`PASS` does not become "everything is configured correctly" — [1.0 §13](../../docs/en/prd/13-human-readable-messages-localization.md#13-user-messages-and-localization).

Two cases matter for this category. The "I accept no mail" record is described as a declared refusal of mail, not as a missing setting. A `p=quarantine` policy is described as in force, with no comparison to `p=reject`: the choice between them belongs to the owner and depends on how sure they are that their list of senders is complete.

## 11.5. Localization

Russian, Uzbek, and English are required under [1.0 §13](../../docs/en/prd/13-human-readable-messages-localization.md#13-user-messages-and-localization). A missing translation of any message remains a build error.

The Uzbek catalogue is prepared alongside the others. Native-speaker review takes place after release and is not a release gate. Until that review, the quality of specialized terminology remains a translation limitation.

## 11.6. Acceptance Criteria

- **AC-11.1** A check's message describes what was read in the records, not the purpose of the mechanism.
- **AC-11.2** The list of forbidden causal claims in [§11.2](#112-forbidden-causal-claims) is enforced by the message configuration check.
- **AC-11.3** No message in the category asserts anything about the fate of a message.
- **AC-11.4** An unknown selector and unavailable outbound connections are explained as a limitation of 2check.
- **AC-11.5** The message about an unknown selector lists the names tried and offers to take a selector.
- **AC-11.6** The "I accept no mail" record is described as a declared refusal, not as a missing setting.
- **AC-11.7** `p=quarantine` is described as a policy in force, with no comparison to `p=reject`.
- **AC-11.8** Uzbek wording is present for every message in the category; its absence remains a build error.

---

<a id="section-12"></a>

# 12. Caching and Data Freshness

[§12](#12-caching-and-data-freshness) defines the cache keys of the `email` category, how long entries live, and what may not be cached. The responsible section is [1.0 §14](../../docs/en/prd/14-cache-freshness.md#14-caching-and-data-freshness); the cache modes, the coalescing of concurrent requests and the staleness rules are not changed here.

## 12.1. Keys

A key is built separately for policies and for hosts.

```text
asciiHostname
policy
selector?
resolverSetVersion
emailModuleConfigVersion
cacheContractVersion
```

```text
mailHost
ipFamily?
emailModuleConfigVersion
cacheContractVersion
```

`selector` is part of the policy key and is required for DKIM. Without it an answer for one selector would be reused for another, and a user would be handed somebody else's key as their own.

Language is not part of a key — [1.0 §14](../../docs/en/prd/14-cache-freshness.md#14-caching-and-data-freshness).

## 12.2. Lifetimes

| Observations | Lifetime Scale |
|---|---|
| SPF, DMARC, and DKIM policies | hours |
| `MX` records and host addresses | hours |
| encryption-probe result | hours |

Exact values are set by versioned configuration under [1.0 §20](../../docs/en/prd/20-configuration-policy-management.md#20-configuration-and-policy-management). The encryption probe may use a longer lifetime than policies, accounting for the cost of a connection.

A repeat check after records change follows the cache modes in [1.0 §14](../../docs/en/prd/14-cache-freshness.md#14-caching-and-data-freshness). It must not present an earlier observation as a new one.

## 12.3. What May Not Be Cached

| What | Why |
|---|---|
| an incomplete DMARC tree walk | a result was not obtained; a negative result was not obtained either |
| an incomplete encryption probe | the same |
| a selector entered by the user | it belongs to the request, not to the domain |

An entered selector is not automatically added to the domain's selector candidates for other requests. A request without a selector performs its own search under [§5](#5-dkim); a previous result must not replace its `UNKNOWN`.

The rules for caching technical failures are otherwise those of [1.0 §14](../../docs/en/prd/14-cache-freshness.md#14-caching-and-data-freshness).

## 12.4. Freshness

`checkedAt` holds the time of the observation, not of the cache lookup — [1.0 §6](../../docs/en/prd/06-common-data-contracts-exposure.md#6-common-data-contracts-and-exposure-levels).

For the check that queries several hosts — [§7](#7-starttls) — the time of observation is the earliest of the times that went into the result. A result is no fresher than its oldest part.

## 12.5. Acceptance Criteria

- **AC-12.1** A policy key includes the selector; for DKIM the selector is required.
- **AC-12.2** An incomplete walk and an incomplete probe are not written to the cache as results.
- **AC-12.3** A result found through a selector entered by the user is not reused for a request that names no selector.
- **AC-12.4** The observation time of a composite result is the earliest of the times of its parts.

---

<a id="section-13"></a>

# 13. Outbound Connection Safety

[§13](#13-outbound-connection-safety) defines the rules under which a connection to a mail host is permitted. The responsible section for address validation is [1.0 §15](../../docs/en/prd/15-security-ssrf.md#15-security-and-ssrf-protection); its sequence, address classification and blocking rule are not changed here but extended to a new kind of connection.

## 13.1. Applying Existing Security Controls

MVP 1.0 already establishes a TLS connection to an address of the domain under test after security validation. Release 1.1 applies the same sequence to mail servers obtained under [§6](#6-mx).

Additional constraints define the SMTP port, permitted commands, and number of servers probed. The common address-validation and selected-IP pinning rules remain in effect.

## 13.2. The Sequence

The order in [1.0 §15](../../docs/en/prd/15-security-ssrf.md#15-security-and-ssrf-protection) applies without exception:

```text
MailHostTarget
→ DNS A/AAAA
→ full candidate set
→ Security Validation
→ ALLOW | BLOCK | INDETERMINATE
→ selected validated endpoint
→ pinned connection
```

The host's full set of addresses is validated without prior truncation. If even one address is forbidden the whole host is blocked; dropping the forbidden address and connecting to the rest is not permitted — [1.0 §15](../../docs/en/prd/15-security-ssrf.md#15-security-and-ssrf-protection).

The connection goes to the pinned address. The host name is not resolved again by the connection library.

## 13.3. What Is Held Fixed

| Constraint | Value |
|---|---|
| port | `25` only |
| source of host names | [§6](#6-mx) only |
| session commands | the greeting, the request for extensions, the move to encryption, the close |
| hosts per check | no more than four — [§7](#7-starttls) |

The port is not accepted from user input or DNS records. The implementation provides no override.

The sender, recipient and data commands are never issued. The probe sends no mail and therefore cannot be used either to deliver messages or to test whether an address exists.

## 13.4. What This Rules Out

| Scenario | Limiting Control |
|---|---|
| making the service connect to an internal address | a host's address is validated under [1.0 §15](../../docs/en/prd/15-security-ssrf.md#15-security-and-ssrf-protection) like any other |
| swapping the address between validation and connection | the connection goes to the pinned address |
| using the service to scan ports | the port is fixed |
| creating excessive outbound load | the host count is bounded; request-rate and concurrency limits in [1.0 §22](../../docs/en/prd/22-performance-resource-limits-nfr.md#22-performance-and-resource-limits) and [1.0 §25](../../docs/en/prd/25-privacy-data-protection-abuse-boundaries.md#25-privacy-access-and-abuse-prevention) also apply |
| sending mail through somebody else's hands | the data commands are never issued |

## 13.5. Our Own Infrastructure

The ban on reaching our own infrastructure — [1.0 §15](../../docs/en/prd/15-security-ssrf.md#15-security-and-ssrf-protection) — extends to mail hosts unchanged.

Blocking for this reason gives `UNKNOWN`, explains the service limitation, and does not reduce the domain's score.

## 13.6. Time Budget

The probe is subject to the scan's shared budget in [1.0 §22](../../docs/en/prd/22-performance-resource-limits-nfr.md#22-performance-and-resource-limits). The category introduces no budget of its own.

The rule in [§7](#7-starttls) follows from that: hosts beyond the limit are listed as not probed rather than waiting for time to free up. A result obtained in part is reported as partial.

## 13.7. Acceptance Criteria

- **AC-13.1** A mail host's addresses pass the safety validation of [1.0 §15](../../docs/en/prd/15-security-ssrf.md#15-security-and-ssrf-protection) as a full set, without truncation.
- **AC-13.2** A forbidden address blocks the whole host.
- **AC-13.3** The connection is made to the pinned address; re-resolving the name is not permitted.
- **AC-13.4** The connection port is `25` and cannot be set by input or by the domain's records.
- **AC-13.5** Host names come only from the result of [§6](#6-mx).
- **AC-13.6** The session issues no sender, recipient or data commands.
- **AC-13.7** Blocking under the ban on our own infrastructure gives `UNKNOWN` and does not reduce the domain's score.
- **AC-13.8** The category introduces no time budget of its own.

---

<a id="section-14"></a>

# 14. The Web API and Scan Modes

[§14](#14-the-web-api-and-scan-modes) defines how the `email` category enters the contract of the internal web API and the scan modes. The responsible sections are [1.0 §17](../../docs/en/prd/17-internal-web-api-contract.md#17-internal-web-api-contract) and [1.0 §3](../../docs/en/prd/03-user-scenarios-scan-modes.md#3-user-scenarios-and-scan-modes); the endpoints, the acceptance model and the polling rules are not changed here.

## 14.1. Selecting Categories

The enumeration in the request gains one value:

```text
selectedCategories?: (dns | registry | tls | email)[]
```

The rule in [1.0 §17](../../docs/en/prd/17-internal-web-api-contract.md#17-internal-web-api-contract) is kept word for word: `PARTIAL` takes a non-empty proper subset of the categories, and selecting them all creates a `FULL` scan. A proper subset is now a subset of four categories rather than of three.

After `email` is added, a `PARTIAL` request selecting `dns`, `registry`, and `tls` is valid because it selects a proper subset of the available categories.

## 14.2. The Selector

The request to create a scan gains an optional field:

```text
CreateScanRequest {
  input
  mode: FULL | PARTIAL
  selectedCategories?
  cacheMode?
  dkimSelector?
}
```

The field is accepted only when `email` is within the scan scope. Otherwise, the request is rejected with HTTP `422`, identifying the invalid field. The supplied value is not ignored.

The value is validated as a DNS name label. A selector that fails that validation is rejected before any query is made, rather than becoming a search that finds nothing.

The selector belongs to the request and not to the domain: the cache rules are [§12](#12-caching-and-data-freshness).

## 14.3. Score and Verdict

An overall score and an overall verdict exist only for `FULL + FINAL` — [1.0 §3](../../docs/en/prd/03-user-scenarios-scan-modes.md#3-user-scenarios-and-scan-modes). Adding a category does not change that: a `PARTIAL` scan of the `email` category alone shows its results without an overall score for the domain.

## 14.4. Errors

The category introduces no error codes of its own. A rejection over the selector uses the common `WebApiError` contract of [1.0 §17](../../docs/en/prd/17-internal-web-api-contract.md#17-internal-web-api-contract), naming the field.

## 14.5. Acceptance Criteria

- **AC-14.1** The enumeration of selectable categories gains the value `email`.
- **AC-14.2** Selecting all four categories creates a `FULL` scan; `PARTIAL` with all four is rejected with HTTP `422`.
- **AC-14.3** `PARTIAL` with the `dns`, `registry` and `tls` categories is permitted.
- **AC-14.4** The `dkimSelector` field is accepted only when the `email` category is within the scope of the scan.
- **AC-14.5** A request carrying `dkimSelector` without the `email` category is rejected with HTTP `422` and is not executed.
- **AC-14.6** The value of `dkimSelector` is validated as a DNS name label before any query is made.
- **AC-14.7** A `PARTIAL` scan with the `email` category receives no overall score and no overall verdict.
- **AC-14.8** The category introduces no web API error codes of its own.

---

<a id="section-15"></a>

# 15. The Interface and the Tool Page

[§15](#15-the-interface-and-the-tool-page) defines how the `email` category is shown to the user and which tool page corresponds to it. The responsible sections are [1.0 §23](../../docs/en/prd/23-frontend-ux-result-presentation.md#23-user-interface-and-result-presentation) and [1.0 §24](../../docs/en/prd/24-seo-routing-public-tool-pages.md#24-seo-routing-and-tool-pages); the order of result elements, the verdict rules and the scan route are not changed here.

## 15.1. The Name of the Category

The main name of the category in the interface is "Mail". The Russian and Uzbek editions use their own names, set by the localization.

The names of the checks use the terms the industry uses — `SPF`, `DMARC`, `DKIM`, `MX`, `STARTTLS`, `PTR` — because those are what the user will see in their hosting panel. They are not translated.

The name of a check group is shown in the category card, while the group itself is not a result of its own — [§2](#2-check-groups-and-the-dependency-on-mx).

## 15.2. The Tool Page

The list of indexable pages in [1.0 §24](../../docs/en/prd/24-seo-routing-public-tool-pages.md#24-seo-routing-and-tool-pages) gains one:

```text
/{locale}/email-check
```

The page creates a `PARTIAL` scan of the single category `email` — the same arrangement the other tool pages have in [1.0 §3](../../docs/en/prd/03-user-scenarios-scan-modes.md#3-user-scenarios-and-scan-modes).

The rules for the canonical address, hreflang and language prefixes are those of [1.0 §24](../../docs/en/prd/24-seo-routing-public-tool-pages.md#24-seo-routing-and-tool-pages), unchanged.

## 15.3. The Selector Field

An optional DKIM selector field sits beside the domain field.

The field is immediately available on the tool page. In a full scan it is hidden by default and revealed through an additional action. Omitting a selector does not prevent the scan from starting.

The field carries an explanation that without it the key is looked for at the known selectors of the mail provider, and that a key not found does not mean there is none — [§5](#5-dkim).

## 15.4. Showing Partial Results

The encryption check may cover part of what was available: not every host was probed — [§7](#7-starttls).

The result is then shown together with a statement of what it covers. Showing a partial result as a complete one is not permitted: it is true of what was asked and says nothing about the rest.

## 15.5. The Result Card

Inapplicable checks are shown neutrally and may be collapsed — [1.0 §23](../../docs/en/prd/23-frontend-ux-result-presentation.md#23-user-interface-and-result-presentation). For this category it matters that the reason for inapplicability stays visible: a domain that deliberately accepts no mail and a domain with no records look the same when collapsed and mean different things — [§6](#6-mx).

## 15.6. Acceptance Criteria

- **AC-15.1** The main name of the category in the interface is "Mail"; the names of the checks are not translated.
- **AC-15.2** The list of indexable pages gains the page `/{locale}/email-check`.
- **AC-15.3** The tool page creates a `PARTIAL` scan of the single category `email`.
- **AC-15.4** The selector field is optional and hidden by default in a full scan.
- **AC-15.5** The selector field carries an explanation that a key not found does not mean there is none.
- **AC-15.6** A partial result is shown together with a statement of what it covers.
- **AC-15.7** The reason a check is inapplicable stays visible when collapsed.

---

<a id="section-16"></a>

# 16. Observability and Analytics

[§16](#16-observability-and-analytics) defines what the `email` category adds to logs, metrics and analytics. The responsible sections are [1.0 §21](../../docs/en/prd/21-observability-logging-operational-monitoring.md#21-observability-logging-and-monitoring) and [1.0 §28](../../docs/en/prd/28-product-analytics-success-metrics.md#28-product-analytics-and-usage-metrics); the boundaries of analytics are not widened here.

## 16.1. What Analytics Gains

The enumeration of tools gains one value:

```text
tool: home | dns | registry | tls | email
```

Domain policy, key availability, and encryption support are not sent to analytics. The analytics defined in [1.0 §28](../../docs/en/prd/28-product-analytics-success-metrics.md#28-product-analytics-and-usage-metrics) measures service use without collecting characteristics of the domains being checked.

## 16.2. What Is Additionally Forbidden

The list in [1.0 §28](../../docs/en/prd/28-product-analytics-success-metrics.md#28-product-analytics-and-usage-metrics) gains, as values that are not sent:

- the names and addresses of mail hosts;
- a selector entered by the user;
- the values of policy tags.

The entered selector belongs to the user's request. Excluding it avoids an additional link between an analytics event and the domain being checked.

## 16.3. Metrics

The metrics of [1.0 §21](../../docs/en/prd/21-observability-logging-operational-monitoring.md#21-observability-logging-and-monitoring) gain:

| Metric | What it counts |
|---|---|
| `email_smtp_probe_total` | encryption probes, by outcome |
| `email_smtp_probe_blocked_total` | probes rejected by the safety validation |
| `email_dkim_selector_unknown_total` | checks that finished without finding a key |

The unknown-selector metric counts DKIM searches that found no key. It is considered alongside the total check count when assessing selector-configuration coverage — [§5](#5-dkim).

## 16.4. Logs

The rules of [1.0 §21](../../docs/en/prd/21-observability-logging-operational-monitoring.md#21-observability-logging-and-monitoring) apply unchanged. The names and addresses of mail hosts are permitted in logs: a log is an internal diagnostic instrument with restricted access, not analytics. A selector entered by the user is not written to logs.

## 16.5. Acceptance Criteria

- **AC-16.1** The enumeration of tools in analytics gains the value `email`.
- **AC-16.2** The results of the category's checks are not sent to analytics.
- **AC-16.3** The names and addresses of mail hosts and the values of policy tags are not sent to analytics.
- **AC-16.4** A selector entered by the user is neither sent to analytics nor written to logs.
- **AC-16.5** The metrics in [§16.3](#163-metrics) are defined and are incremented on the corresponding events.

---

<a id="section-17"></a>

# 17. Testing and Release Readiness

[§17](#17-testing-and-release-readiness) defines what establishes that the requirements of this document are met, and the conditions under which the category is released. The responsible section for the testing strategy is [1.0 §26](../../docs/en/prd/26-testing-quality-gates-acceptance-strategy.md#26-testing-and-release-criteria).

## 17.1. What Is Checked Without a Network

Parsing records, counting limits and choosing a status are pure functions over answers recorded in advance. They are covered by tests that touch no network, and that coverage is mandatory.

The required data sets:

| Set | What is in it |
|---|---|
| SPF records | the term limit exceeded, a loop, every form of `all`, void queries |
| DMARC records | the tree walk, an unrecognized record, several records, `pct` |
| DKIM keys | an empty key, a short key, testing mode, `ed25519` |
| `MX` records | a declared refusal of mail, an implicit host, an alias, an address in place of a name |

DMARC tests must establish that the discovered policy applies to the target domain. The data set must distinguish the domain's own policy from an inherited one and verify the reported source.

## 17.2. What Is Checked With a Network

The encryption probe needs a connection and is therefore checked separately, outside the mandatory build set. What does not depend on a network stays mandatory: the fixed port, the absence of data commands, the source of host names, and the behavior when access is denied.

## 17.3. Release Conditions

The category is released when all of these hold:

- the tests of [§17.1](#171-what-is-checked-without-a-network) are covered;
- the list of forbidden causal claims in [§11.2](#112-forbidden-causal-claims) is enforced automatically;
- Uzbek wording is present for every message — [§11](#11-messages-and-localization);
- outbound connections to the mail port are available in the target deployment, or the category is released with `UNKNOWN` and an explanation of the deployment limitation for the encryption check — [§7](#7-starttls).

An unavailable SMTP port does not block release of the other five checks. STARTTLS must then identify the deployment limitation without treating it as a domain defect.

## 17.4. What Is Checked by Hand

| Subject | Review Method |
|---|---|
| message clarity | reading by users without mail-administration experience |
| mobile interface | review on target devices and browsers from [1.0 §26](../../docs/en/prd/26-testing-quality-gates-acceptance-strategy.md#26-testing-and-release-criteria) |

Manual review supplements automated interface and accessibility checks.

## 17.5. Acceptance Criteria

- **AC-17.1** Parsing records and choosing a status are covered by tests that touch no network.
- **AC-17.2** The DMARC data set contains a record at a parent domain, and a test confirms the source of the policy is reported correctly.
- **AC-17.3** The constraints of the encryption probe that do not depend on a network are covered by mandatory tests.
- **AC-17.4** The list of forbidden causal claims is enforced automatically.
- **AC-17.5** Release with an unavailable mail port is permitted given `UNKNOWN` and an explanation of the deployment limitation for the encryption check.

---

<a id="appendix-a"></a>

# Appendix A. Responsible Sections

Each requirement has one responsible section. Where sections conflict, the provision in the responsible one applies.

| Subject | Responsible section |
|---|---|
| Release boundary | [§1](#1-scope-and-goals-of-mvp-11) |
| Check groups and the dependency on `MX` | [§2](#2-check-groups-and-the-dependency-on-mx) |
| Parsing SPF and its limits | [§3](#3-spf) |
| The DMARC policy and the tree walk | [§4](#4-dmarc) |
| Finding a DKIM key and its selectors | [§5](#5-dkim) |
| The receiving server | [§6](#6-mx) |
| The encryption probe | [§7](#7-starttls) |
| Reverse names | [§8](#8-ptr) |
| Data contracts and exposure levels | [§9](#9-data-contracts-and-exposure-levels) |
| Merging issues and the effect on the score | [§10](#10-effect-on-the-summary-the-verdict-and-the-score) |
| Wording and the forbidden causal claims | [§11](#11-messages-and-localization) |
| Cache keys and lifetimes | [§12](#12-caching-and-data-freshness) |
| Rules for outbound connections | [§13](#13-outbound-connection-safety) |
| The web API contract and the scope of a scan | [§14](#14-the-web-api-and-scan-modes) |
| The interface and the tool page | [§15](#15-the-interface-and-the-tool-page) |
| Metrics and the boundaries of analytics | [§16](#16-observability-and-analytics) |
| Release conditions | [§17](#17-testing-and-release-readiness) |

Requirements whose responsible section is in MVP 1.0 are not overridden by this document.
