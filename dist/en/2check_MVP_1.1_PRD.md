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
- [4. DMARC](#section-04)
- [5. DKIM](#section-05)
- [6. MX](#section-06)
- [7. STARTTLS](#section-07)
- [8. PTR](#section-08)
- [9. Blocklists of the Receiving Server](#section-09)
- [10. Data Contracts and Exposure Levels](#section-10)
- [11. Effect on the Summary, the Verdict and the Score](#section-11)
- [12. Messages and Localization](#section-12)
- [13. Cache and Freshness](#section-13)
- [14. Outbound Connection Safety](#section-14)
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

`STARTTLS`, `PTR` and `DNSBL` describe one specific server. That server is determined by the domain's records, and where there is none these checks have no subject — the answer is not unknown, there is nothing to ask about.

## 2.3. What Counts as a Receiving Server

No `MX` does not mean mail has nowhere to go. RFC 7505 describes the order laid down by RFC 5321: finding no `MX`, a sender turns to the domain's own address records. Such a server is called implicit, and the checks of the receiving server do have a subject.

There is no subject in two cases:

| State of the domain | Value of `blockedBy` |
|---|---|
| neither `MX` nor address records | `mx_missing` |
| an `MX` published to say "I accept no mail" | `null_mx` |

The second is a deliberate declaration by the owner under RFC 7505, not an omission. Both are detailed in §6.

## 2.4. When There Is No Subject

| Check | Status |
|---|---|
| `SPF` | runs as usual |
| `DMARC` | runs as usual |
| `DKIM` | runs as usual |
| `STARTTLS` | `NOT_APPLICABLE` with `blockedBy` |
| `PTR` | `NOT_APPLICABLE` with `blockedBy` |
| `DNSBL` | `NOT_APPLICABLE` with `blockedBy` |

`NOT_APPLICABLE` rather than `UNKNOWN`: `UNKNOWN` means the check applies but no result could be obtained, whereas here the subject of the check is absent.

The state of the domain is scored once, by the `MX` check. The checks it blocks add no further penalty; otherwise one cause would penalise the domain four times over. How `NOT_APPLICABLE` affects confidence is defined in 1.0 §11 and is unchanged here.

## 2.5. The Receiving Server, Not Outbound Mail

`MX` names the server that **receives** mail for the domain. The server the domain **sends** from may be a different one, and it does not follow from the domain's public records.

The results of `PTR` and `DNSBL` are therefore stated as the condition of the receiving server. Claims such as "mail from this domain will land in spam" are not permitted on this evidence: they rest on a link the data does not contain. The general rule against unproven causal claims is 1.0 §13.

## 2.6. Acceptance Criteria

- **AC-2.1** The `SPF`, `DMARC` and `DKIM` checks run whether or not `MX` is present.
- **AC-2.2** With no `MX` but with address records for the domain, the checks of the receiving server run against the implicit server.
- **AC-2.3** Where there is no subject, the `STARTTLS`, `PTR` and `DNSBL` checks return `NOT_APPLICABLE` with a `blockedBy` drawn from the values `mx_missing` and `null_mx`.
- **AC-2.4** An absent receiving server gives no check in the category the status `UNKNOWN`.
- **AC-2.5** The state of the receiving server reduces the numerical score once, through the result of the `MX` check.
- **AC-2.6** The messages of the `PTR` and `DNSBL` checks describe the receiving server and assert nothing about the domain's outbound mail.

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

<a id="section-04"></a>

# 4. DMARC

§4 defines the DMARC policy check: where the record is looked for, how it is recognised, what counts as a working policy, and how the check treats records written to the previous standard.

## 4.1. The Standard in Force

The check follows RFC 9989, which together with RFC 9990 and RFC 9991 replaced RFC 7489.

This is not a formality: the new standard removes the `pct` tag, adds the `np` and `psd` tags, and finds a parent policy by walking the name tree instead of consulting a public suffix list. A record written to RFC 7489 remains valid — no new tag was made mandatory.

Receivers do not adopt the new standard at the same moment. The check therefore reports both what a record means under the standard in force and where its behaviour may differ between receivers.

## 4.2. What Is Being Checked

What is checked is the domain's published policy, not the handling of a particular message. Alignment between the domains in the signature and in the envelope is a property of a message; without a message it is undefined and is not asserted.

## 4.3. Where the Record Is Looked For

The record is read from the `TXT` of the name `_dmarc` under the domain being checked.

If there is no record there, the policy of a parent domain applies. RFC 9989 defines a walk of the name tree to find it: queries proceed upward from the domain being checked, and for a name of any length no more than eight of them are made. The responsible section for the DNS queries themselves is 1.0 §8.

The reader is told which policy will apply to the domain and where it came from:

| Where the record was found | What is reported |
|---|---|
| at the domain being checked | the domain's own policy |
| at a parent domain | an inherited policy, naming the domain it came from |
| nowhere | there is no policy |

An inherited policy is a working state rather than a defect: that is how subdomains are meant to work.

## 4.4. Recognising the Record

The `v` tag with the value `DMARC1` must come first in the record, case-sensitively. A record where it does not is ignored outright — which, from a receiver's point of view, means there is no policy.

If more than one record is found for one name, all of them are discarded.

| Found | Status | Severity |
|---|---|---|
| no record anywhere along the walk | `FAIL` | `warning` |
| one usable record | analysed further | — |
| a record exists but is not recognised | `FAIL` | `critical` |
| more than one for one name | `FAIL` | `critical` |

The severities differ deliberately. An absent record is a door left open. A record that exists but does not work is worse: its owner believes protection is configured and never comes back to it.

## 4.5. The Policy

| Value of `p` | What a receiver does | Status | Severity |
|---|---|---|---|
| `reject` | rejects failing messages | `PASS` | — |
| `quarantine` | files them as spam | `PASS` | — |
| `none` | nothing, reports only | `FAIL` | `warning` |
| the tag is absent | read as `none` | `FAIL` | `warning` |

`p=none` is not a mistake but the first step of a rollout: it is there to collect reports and confirm that the domain's own mail passes. It affords no protection, though, and a domain that stays on it forever is protected exactly as much as a domain with no DMARC at all. The check's message says that, and does not call `none` a misconfiguration.

The `sp` and `np` tags set the policy for subdomains and for non-existent subdomains. They do not change the status of the check: their values are reported as fact.

## 4.6. Reports

An absent `rua` tag gives `FAIL` with severity `informational`. With no address for reports, an owner never sees who sends mail in the domain's name and has no grounds on which to move from `none` to `quarantine`.

The addresses in `rua` and `ruf` belong to the domain's owner and are shown under the exposure rules of 1.0 §6.

## 4.7. Compatibility with the Previous Standard

| What was found | Status | Severity |
|---|---|---|
| the `pct` tag | `FAIL` | `warning` |

RFC 9989 removes the `pct` tag. A receiver following the new standard ignores it; a receiver following RFC 7489 applies the policy to the stated share of messages. One record therefore behaves differently at different receivers, and the owner cannot say what share of their mail is protected.

## 4.8. Technical Failure

| Cause | `reasonCode` |
|---|---|
| the query did not complete | `dmarc_lookup_failed` |
| the tree walk did not complete | `dmarc_tree_walk_incomplete` |

An incomplete walk gives `UNKNOWN`: not having reached the end, we do not know whether a policy exists further up. The rules for `reasonCode` and `blockedBy` are 1.0 §7.

## 4.9. What the Check Does Not Assert

- That the domain's mail does or does not pass DMARC: that is a property of a message, not of a record.
- That the policy is applied by every receiver: application is the receiver's decision.
- That `reject` protects the domain completely: DMARC describes what happens on a mismatch, not the authenticity of the content.

## 4.10. Acceptance Criteria

- **AC-4.1** The check follows RFC 9989; a record written to RFC 7489 is recognised as valid.
- **AC-4.2** The record is read from the `TXT` of the name `_dmarc` under the domain; if it is absent, the name tree is walked, in no more than eight queries.
- **AC-4.3** The source of the policy that applies is reported to the reader; an inherited policy is not treated as a defect.
- **AC-4.4** The `v` tag with the value `DMARC1` must come first, case-sensitively; otherwise the record is ignored outright.
- **AC-4.5** More than one record for one name gives `FAIL` with severity `critical`.
- **AC-4.6** An absent policy gives `FAIL` with severity `warning`; an unrecognised record gives `FAIL` with severity `critical`.
- **AC-4.7** `p=reject` and `p=quarantine` give `PASS`; `p=none` and an absent `p` tag give `FAIL` with severity `warning`.
- **AC-4.8** The values of `sp` and `np` are reported as fact and do not change the status of the check.
- **AC-4.9** An absent `rua` gives `FAIL` with severity `informational`.
- **AC-4.10** The presence of the `pct` tag gives `FAIL` with severity `warning`, explaining the divergence between the standards.
- **AC-4.11** An incomplete tree walk gives `UNKNOWN` with a `reasonCode`, not a conclusion that no policy exists.
- **AC-4.12** The check's messages assert nothing about the fate of a particular message.

---

<a id="section-05"></a>

# 5. DKIM

§5 defines the DKIM check: where selectors come from, what is examined in a key that was found, and why a key that was not found is not the same as a key that is absent.

## 5.1. Why a Selector Cannot Be Discovered

A DKIM key is published at the name `<selector>._domainkey.<domain>`. The owner chooses the selector, and a domain's selectors cannot be enumerated through DNS: a name can only be queried by someone who already knows it.

This is a property of the protocol, not a gap in the check. The section's main rule follows from it: having failed to find a key, we know that we did not find one at the names we tried — and nothing about whether a key exists at some other name.

## 5.2. Where Selectors Come From

Two sources, in the order they are used:

1. A selector entered by the reader. An optional field beside the domain.
2. The selectors of the mail provider recognised from the domain's `MX`.

The second source works because providers use fixed selectors: a domain whose `MX` points at a provider's mail almost certainly publishes a key at that provider's selector. The mapping from provider to selectors is versioned configuration under the rules of 1.0 §20 and is not part of the code.

The number of names queried in one check does not exceed eight. This is a bound rather than a sweep: the check asks for names it has reason to believe are right, and does not guess them.

If no provider is recognised from `MX` and the reader entered no selector, there is nothing to query.

## 5.3. Recognising the Record

The record is read from the `TXT` of the selector's name. The responsible section for DNS queries is 1.0 §8.

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

A `t` tag holding `y` declares testing mode: a receiver may disregard the outcome of verifying a signature. For a domain that considers DKIM configured, that is protection quietly lost.

`ed25519` keys are recognised alongside `rsa` under RFC 8463; the length limit does not apply to them.

## 5.5. When No Key Is Found

| What happened | Status | `reasonCode` |
|---|---|---|
| none of the names held a record | `UNKNOWN` | `dkim_selector_unknown` |
| the reader entered a selector and it holds no record | `FAIL` | — |
| the query did not complete | `UNKNOWN` | `dkim_lookup_failed` |

The difference between the first row and the second is the difference between "we do not know where to look" and "we looked where the owner said". Only in the second case is the absence of a record a confirmed fact, and only there does it give `FAIL`.

`UNKNOWN` reduces confidence in the result under the rules of 1.0 §11. The check's message says plainly which names were tried and offers to take a selector.

## 5.6. What the Check Does Not Assert

- That the domain's mail is signed: publishing a key and signing messages are different acts, and the second cannot be checked through DNS.
- That the signature on a particular message is valid: without a message that is undefined.
- That the domain has no DKIM, when no key was found at the names tried.

## 5.7. Acceptance Criteria

- **AC-5.1** Selectors come from the value entered by the reader and from the mapping for the provider recognised from `MX`; the mapping is versioned configuration.
- **AC-5.2** No more than eight selector names are queried in one check.
- **AC-5.3** An empty `p` tag gives `FAIL` with severity `critical`.
- **AC-5.4** An `rsa` key shorter than `1024` bits gives `FAIL` with severity `critical`.
- **AC-5.5** An `h` tag permitting only `sha1` gives `FAIL` with severity `critical`.
- **AC-5.6** A `t` tag holding `y` gives `FAIL` with severity `warning`.
- **AC-5.7** `ed25519` keys are recognised as valid; the length limit does not apply to them.
- **AC-5.8** No record at the names tried gives `UNKNOWN` with a `reasonCode`, not `FAIL`.
- **AC-5.9** No record at a selector entered by the reader gives `FAIL`.
- **AC-5.10** The check's message names the selectors tried and does not assert that the domain has no DKIM.

---

<a id="section-06"></a>

# 6. MX

§6 defines the check of the `MX` records: how the receiving server is located, what counts as a sound configuration, and what this check hands to the rest of the group.

## 6.1. What Is Being Checked

What is checked is where mail addressed at this domain will go, and whether what was found can take delivery.

The check sends no mail and does not contact the server it finds: connecting to it is the subject of §7.

## 6.2. How the Server Is Located

The order is laid down by RFC 5321 and restated in RFC 7505: a sender queries the domain's `MX`, and failing to find one, turns to the domain's own address records.

| What is published | The receiving server |
|---|---|
| one or more `MX` records | the hosts in those records, in order of preference |
| no `MX`, address records present | the domain itself, implicitly |
| an `MX` saying "I accept no mail" | there is deliberately no server |
| neither `MX` nor address records | there is no server |

The record saying "I accept no mail" is an `MX` with preference `0` and an empty host, defined in RFC 7505. A domain publishing it must publish no other `MX` record.

## 6.3. Results

| State | Status | Severity | What is handed on |
|---|---|---|---|
| `MX` records present and usable | `PASS` | — | the hosts, for §7, §8 and §9 |
| the "I accept no mail" record | `PASS` | — | `blockedBy = null_mx` |
| no `MX`, delivery will follow the address records | `FAIL` | `warning` | the domain itself as a host |
| neither `MX` nor address records | `FAIL` | `warning` | `blockedBy = mx_missing` |
| `MX` records present but no host is usable | `FAIL` | `critical` | `blockedBy = mx_missing` |

The "I accept no mail" record is a `PASS`: a domain that takes no mail and says so plainly is correctly configured. RFC 7505 exists for the sake of that declaration.

Delivery by address records works, but it was arrived at by accident: an address record answers the question "where is the site", not "where should mail go". The owner should either publish an `MX` or declare that they accept no mail. Hence `warning` and not `critical`: the mail does arrive.

## 6.4. Whether a Host Is Usable

| What was found at the host | Status | Severity |
|---|---|---|
| address records present | the host is usable | — |
| the host is a `CNAME` alias | `FAIL` | `warning` |
| no address records | the host is unusable | — |
| an address written in place of a name | `FAIL` | `critical` |

An `MX` host must not be an alias and must have address records — RFC 2181. An alias does still work with most senders, hence `warning`; an address written in place of a name works with nobody.

If every host is unusable there is no delivery, and that is `critical`. If some are, delivery proceeds through the rest: `FAIL` with severity `warning`, naming the hosts that dropped out.

## 6.5. Technical Failure

| Cause | `reasonCode` |
|---|---|
| the `MX` query did not complete | `mx_lookup_failed` |
| host addresses did not resolve for technical reasons | `mx_host_resolution_failed` |

An incomplete query gives `UNKNOWN`, not a conclusion that no records exist. The rules for `reasonCode` and `blockedBy` are 1.0 §7.

## 6.6. What the Check Does Not Assert

- That the server accepts mail: that is established by connecting, not by records, and belongs to §7.
- That mail will reach a mailbox: the route beyond the receiving server is not visible in public data.
- That the order of preference is the right one: preference expresses the owner's intent.

## 6.7. Acceptance Criteria

- **AC-6.1** The receiving server is located in the order laid down by RFC 5321: `MX` records, then the domain's address records.
- **AC-6.2** A record with preference `0` and an empty host is recognised as a declaration that no mail is accepted and gives `PASS`.
- **AC-6.3** No `MX` with address records present gives `FAIL` with severity `warning` and hands on the domain itself as a host.
- **AC-6.4** Neither `MX` nor address records gives `FAIL` with severity `warning` and `blockedBy = mx_missing` for the dependent checks.
- **AC-6.5** No usable host gives `FAIL` with severity `critical`.
- **AC-6.6** An alias host gives `FAIL` with severity `warning`; an address in place of a name gives `FAIL` with severity `critical`.
- **AC-6.7** An incomplete query gives `UNKNOWN` with a `reasonCode`, not a conclusion that no records exist.
- **AC-6.8** The check opens no connection to the hosts it finds.

---

<a id="section-07"></a>

# 7. STARTTLS

§7 defines the check of encryption at the receiving server: what the probe does, which hosts it touches, and how its result differs from a result we simply could not obtain.

## 7.1. What Is Being Checked

What is checked is whether the receiving server offers to move to encryption, and whether the move succeeds.

This is the first outbound connection in the product that is neither a DNS query nor an HTTPS request. The rules under which it is permitted are §14; the responsible section for validating destination addresses is 1.0 §15.

## 7.2. What the Probe Does

A connection to port `25` of the host, a greeting, a request for extensions, the move to encryption, and the end of the session.

The probe sends no mail: the sender, recipient and data commands are not issued under any circumstances. From the receiving server's point of view this is a visit that leaves behind neither a message nor a deferred delivery.

The port is fixed. Arbitrary ports are accepted neither from input nor from the domain's records — 1.0 §25.

## 7.3. Which Hosts Are Probed

The hosts come from §6, in order of preference. No more than four hosts are probed in one check.

The limit exists because each host is a separate connection and a separate handshake, while the scan's time budget is shared across all categories and is set by 1.0 §22. Hosts beyond the limit are listed as not probed; the result then covers only the hosts that were, and the message says so plainly.

## 7.4. Results

| What happened | Status | Severity |
|---|---|---|
| every probed host offers encryption and the move succeeds | `PASS` | — |
| some hosts offer no encryption | `FAIL` | `warning` |
| no host offers encryption | `FAIL` | `critical` |
| encryption is offered but the move fails | `FAIL` | `critical` |

Encryption offered but broken is worse than encryption not offered. A sender that requires encryption will not deliver to such a host at all, and a sender with ordinary settings loses time on the attempt.

## 7.5. The Host's Certificate

The certificate is examined under the rules of 1.0 §10: validity period, name match, chain of trust.

Faults in it give `FAIL` with severity `warning` rather than `critical`, and here is why: in mail delivery, encryption is opportunistic by default. Most senders accept any certificate at all, because the alternative is to send the message in the clear. An expired certificate on a mail host is therefore a real defect, but not a cause of non-delivery, and we will not call it one.

The protocol version is assessed in the same place, under 1.0 §10, and gets no separate rules here.

## 7.6. Technical Failure

| Cause | `reasonCode` |
|---|---|
| the connection was not established | `starttls_connect_failed` |
| the session broke off before a result | `starttls_session_incomplete` |
| outbound connections are unavailable in this deployment | `outbound_smtp_unavailable` |

The last row is about us, not about the domain. If the environment lets no connection out to the mail port, no domain can be checked at all, and the result is obliged to look like our limitation. The same principle as for our own infrastructure in 1.0 §15: a failure on our side does not become a defect of somebody else's domain.

In all three cases the status is `UNKNOWN`.

## 7.7. What the Check Does Not Assert

- That the server will accept a message: the probe never reaches the point of sending one and cannot know.
- That the domain's correspondence is encrypted: what is encrypted is the leg up to the receiving server, not the message's whole journey.
- That senders actually use encryption: that is the sender's decision.

## 7.8. Acceptance Criteria

- **AC-7.1** The probe connects only to port `25` and only to hosts obtained from §6.
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

§8 defines the check of the receiving server's reverse names: what counts as a configured reverse name, how its confirmation is tested, and what does not follow from either.

## 8.1. What Is Being Checked

What is checked are the addresses of the hosts obtained from §6. Each address is asked for its reverse name, and each name for the address it points to.

## 8.2. A Confirmed Reverse Name

A reverse name counts as confirmed when the name obtained from an address resolves back to that same address. Such agreement is a long-standing requirement of host configuration: RFC 1912 requires forward and reverse records to be kept consistent and forbids pointing a reverse record at an alias.

An unconfirmed name means the address calls itself by a name that does not belong to it. That is a configuration error, not a sign of ill intent.

## 8.3. Addresses of Both Versions

Addresses of version four and version six are checked separately and give separate results.

The split is needed because a reverse zone for version six addresses is set up less often: a host with a configured reverse name for its version four address frequently has none for version six, and its owner does not know.

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

The look of the name itself is not judged. A name that contains the address, or that resembles one handed out automatically, is not treated as a defect.

Such a judgement would be a guess: a name cannot establish how a host is configured or how receivers regard it, and a message saying so would read as a claim about the fate of mail. The general rule is 1.0 §13.

## 8.6. Technical Failure

| Cause | `reasonCode` |
|---|---|
| the reverse query did not complete | `ptr_lookup_failed` |
| the forward query for confirmation did not complete | `ptr_confirmation_incomplete` |

An incomplete confirmation gives `UNKNOWN`: without the forward answer we do not know whether the name is confirmed, and we are not entitled to call it unconfirmed.

## 8.7. What the Check Does Not Assert

- That the domain's mail will or will not land in spam: the reverse name of a receiving host does not describe the sending one and says nothing about the fate of outbound messages — §2.
- That the host is badly configured in general: a reverse name is one setting, not an assessment of a host.
- That the name belongs to the domain's owner: the addresses of a receiving host often belong to a mail provider.

## 8.8. Acceptance Criteria

- **AC-8.1** The addresses checked are those of the hosts obtained from §6; no other address is queried.
- **AC-8.2** A reverse name counts as confirmed only when it resolves back to the same address.
- **AC-8.3** Addresses of version four and version six give separate results.
- **AC-8.4** No reverse name for a version four address gives `FAIL` with severity `warning`, and for version six with severity `informational`.
- **AC-8.5** An unconfirmed reverse name gives `FAIL` with severity `warning`.
- **AC-8.6** The look of a reverse name affects no status and is not judged in the message.
- **AC-8.7** An incomplete confirmation gives `UNKNOWN` with a `reasonCode`, not a conclusion that the name is unconfirmed.
- **AC-8.8** The check's messages assert nothing about the fate of the domain's outbound mail.

---

<a id="section-09"></a>

# 9. Blocklists of the Receiving Server

§9 defines the check of the receiving server's addresses against blocklists: which lists may be used, how their answers are read, and why a refusal never means "clean".

## 9.1. What Is Being Checked

What is checked are the addresses of the hosts obtained from §6. The check answers whether the receiving server's address is listed, and nothing else.

## 9.2. Which Lists May Be Used

Only lists whose published terms permit a public checking service to query them are used.

The set of lists is not enumerated in this section. It is set by versioned configuration under the rules of 1.0 §20, and for each list the configuration holds a link to the terms that permit this use. Terms change more often than a specification does, and a section naming providers by name would go stale before it was implemented.

The rule is strict for a reason rather than out of caution. The terms of the largest of them, Spamhaus, explicitly exclude free queries from services answering other people's requests and require a paid subscription or a key. Another well-known list, SORBS, was closed by its owner in the year two thousand and twenty-four. The obvious set of providers turns out not to be one.

## 9.3. How an Answer Is Read

A list answers a query in one of three ways, and telling them apart is mandatory:

| Answer | What it means |
|---|---|
| the address is listed | a confirmed hit |
| the address is not listed | a confirmed absence |
| the query was refused | there is no answer |

The third is a refusal to serve the query: a rate limit exceeded, an unrecognised source, a key demanded. Lists answer such a query with codes from their own reserved range, for example `127.255.255.254`, and in form those codes are indistinguishable from an answer of "listed".

A refusal is never read as "clean". A check that quietly turns a refusal into a favourable result is worse than no check: it asserts something nobody verified.

## 9.4. Results

| State | Status | Severity |
|---|---|---|
| no address is listed in any list | `PASS` | — |
| an address is listed in at least one list | `FAIL` | `warning` |
| every list refused the query | `UNKNOWN` | — |
| some lists refused the query and there are no hits | `UNKNOWN` | — |

A partial answer gives `UNKNOWN` rather than `PASS`: without having asked them all, we do not know whether the address is clean. A hit, meanwhile, is settled and is reported whether or not the remaining lists answered.

The severity of a hit is `warning` rather than `critical`: being listed does not stop a domain receiving mail, and these data say nothing about the mail it sends — §2.

## 9.5. What the Reader Is Told

The name of the list holding the address, and the address of that list's page where an owner can see the reason and ask to be removed. The reason for the listing is not retold: it is the list that states it, not us.

If no permitted list is configured, the check gives `UNKNOWN` with `reasonCode = dnsbl_no_permitted_source`. That is a state of the deployment, not a property of the domain, and it does not reduce the domain's score.

## 9.6. Technical Failure

| Cause | `reasonCode` |
|---|---|
| the queries to the lists did not complete | `dnsbl_lookup_failed` |
| every list refused the query | `dnsbl_query_refused` |
| no permitted list is configured | `dnsbl_no_permitted_source` |

## 9.7. What the Check Does Not Assert

- That the domain's mail will land in spam: the lists describe the address of the receiving server, not the address the domain sends from — §2.
- That a listing is deserved: the grounds for inclusion are stated by the list, and public data cannot confirm them.
- That absence from the lists means a good reputation: reputation is not assessed this way and is outside the release boundary — §1.

## 9.8. Acceptance Criteria

- **AC-9.1** Only lists whose published terms permit a public checking service to query them are used; the configuration holds a link to those terms for each list.
- **AC-9.2** The set of lists is set by versioned configuration and is not held in the code.
- **AC-9.3** An answer refusing to serve the query is distinguished from an answer of "listed" and is never read as "not listed".
- **AC-9.4** A hit in at least one list gives `FAIL` with severity `warning`.
- **AC-9.5** No hits with an incomplete set of answers gives `UNKNOWN`, not `PASS`.
- **AC-9.6** No configured permitted list gives `UNKNOWN` with a `reasonCode` and does not reduce the domain's numerical score.
- **AC-9.7** The reader is told the name of the list and the address of its page; the reason for the listing is not retold.
- **AC-9.8** The check's messages assert nothing about the domain's outbound mail and do not assess its reputation.

---

<a id="section-10"></a>

# 10. Data Contracts and Exposure Levels

§10 defines the structures the `email` category uses inside the common contracts of 1.0, and which of its data reach which representation. The responsible section for the contracts themselves is 1.0 §6; only this category's variants are defined here.

## 10.1. The Category

The enumeration of categories gains one value:

```text
category: dns | registry | tls | email
```

The order they appear in the interface is set by 1.0 §23 and is not fixed in this section.

## 10.2. The Subject of a Check

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

`implicit` marks a host obtained from the domain's address records where there is no `MX` — §6.

## 10.3. Where a Result Came From

```text
EmailCheckSource =
  DnsRecordSource |
  SmtpProbeSource |
  BlocklistSource

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

BlocklistSource {
  kind: BLOCKLIST
  listsQueried
  listsAnswered
}
```

`listsQueried` and `listsAnswered` differ deliberately: a mismatch between them is exactly the state in which no hits does not mean "clean", and it has to be visible in the data rather than only in the text of a message — §9.

## 10.4. Exposure Levels

| Data | Representation |
|---|---|
| status, severity, message | Public |
| the policy and its key values | Public |
| the name the policy was found at | Public |
| `MX` hosts and their order of preference | Public |
| the name of a list holding a hit and the address of its page | Public |
| host addresses | Technical |
| the original text of records | Technical |
| the selector names queried | Technical |
| the domains of DMARC report recipients | Public |
| the full addresses of DMARC report recipients | Technical |

The split of the report addresses is deliberate. The recipient's domain answers a question worth asking — whether reports go to a third-party service — and the full address adds nothing to that, while turning a result page into a convenient source of addresses to harvest. The data are published in DNS and are not secret; the point is not to make collecting them easier than it needs to be.

The category defines no Gated data.

## 10.5. Machine Values

The list in 1.0 §6 gains, as values that are not localised:

- the names and values of policy tags;
- selector names;
- host names and their order of preference;
- the names of blocklists;
- the response codes of blocklists.

## 10.6. Acceptance Criteria

- **AC-10.1** The enumeration of categories gains the single value `email`.
- **AC-10.2** `EmailCheckTarget` and `EmailCheckSource` have the structure defined in this section and are not arbitrary fields.
- **AC-10.3** The name a policy was asked for is part of the subject of the check.
- **AC-10.4** A host obtained from the domain's address records is marked `implicit`.
- **AC-10.5** The number of lists queried and the number that answered are distinguished in the result data.
- **AC-10.6** Host addresses and the original text of records are not part of the Public representation.
- **AC-10.7** The full addresses of DMARC report recipients are not part of the Public representation; their domains are.
- **AC-10.8** The category defines no Gated data.

---

<a id="section-11"></a>

# 11. Effect on the Summary, the Verdict and the Score

§11 defines how the results of the `email` category enter the summary and the numerical score. The responsible sections are 1.0 §11 and 1.0 §12; the rules for the verdict, for confidence and the scoring formula are not changed here.

## 11.1. What Changes and What Does Not

The score in 1.0 is not divided between categories: it is a hundred minus the sum of the penalties for issues. A fourth category therefore takes no share from the others — it adds issues that penalties are charged for.

The real question of this section follows from that: how many issues the category may create for one root defect. Without an answer, a domain that simply has no mail is penalised several times for the same thing.

## 11.2. A Domain That Sends No Mail

A domain is entitled to send no mail, and RFC 7208 calls `v=spf1 -all` normal practice for such a domain in as many words.

A declared refusal of mail is recognised from a combination:

| Sign | Value |
|---|---|
| `MX` | the "I accept no mail" record |
| SPF | `-all` with no permitting mechanisms |
| DMARC | `p=reject` |

On a full match every check in the category gives `PASS`: the domain is correctly configured for what it does. No issues, no penalties.

On a partial match the ordinary rules of §3–§9 apply. A domain that declared a refusal halfway declared nothing.

## 11.3. Merging Issues Inside the Category

The merging rules are 1.0 §11: one root defect gives one Issue and one penalty, and merging is permitted only inside a category.

The following merges are defined for this category:

| Root defect | What is merged |
|---|---|
| the domain declared no sending policy | an absent SPF and an absent DMARC |
| no receiving server was found | the `MX` result and everything it blocked |
| a policy is published but does not work | several records, an unrecognised record, a parse error |

The first merge is the important one. An absent SPF and an absent DMARC are not two mistakes but one: the owner never described who may send in the domain's name. Two penalties for it would punish the domain twice for one decision.

Merging with the `dns`, `registry` and `tls` categories is not permitted — 1.0 §11.

## 11.4. Effect on Confidence

This category produces `UNKNOWN` more often than the others, and the reasons are listed in §3–§9. The substantial one is an unknown DKIM selector: it arises for any domain whose mail provider is unknown to us.

The rule in 1.0 §11 is not softened for it: `UNKNOWN` makes the category's completeness `PARTIAL`, confidence `REDUCED`, and the verdict in the absence of issues `NO_CONFIRMED_ISSUES_INCOMPLETE` rather than `HEALTHY`.

That is a price paid deliberately. To say "all is well" without having managed to check a signature is to assert more than we know.

## 11.5. Penalty Values

The category introduces no penalty values of its own: the values in 1.0 §12 apply, by severity. The severities are assigned in §3–§9.

## 11.6. Acceptance Criteria

- **AC-11.1** Adding the category changes neither the scoring formula nor the division of shares between categories.
- **AC-11.2** The combination of the "I accept no mail" record, `-all` with no permitting mechanisms and `p=reject` gives `PASS` for every check in the category.
- **AC-11.3** A partial match of that combination grants no exemption from the checks.
- **AC-11.4** An absent SPF and an absent DMARC merge into one Issue with one penalty.
- **AC-11.5** Results blocked by an absent receiving server create no Issue of their own.
- **AC-11.6** Merging an `email` Issue with another category is rejected by the configuration check.
- **AC-11.7** `UNKNOWN` in this category reduces confidence under the rules of 1.0 §11 and is not softened.
- **AC-11.8** The category introduces no penalty values of its own.

---

<a id="section-12"></a>

# 12. Messages and Localization

§12 defines what the messages of the `email` category tell the reader, and what they do not. The responsible section is 1.0 §13; the rules for the message model, the order of explanation and localization are not changed here.

## 12.1. What a Check Reports

The order in 1.0 §13 holds: what was measured, then the consequence, then the recommendation. Consequence and recommendation appear only for confirmed issues.

What is measured, in this category, is what was read in a record, not a restatement of what the record is for. "The sending policy permits everyone" is measured. "SPF protects against forged mail" is a definition, and the message of a particular check is not the place for it.

## 12.2. Forbidden Causal Claims

The list in 1.0 §13 gains the claims that may not be made in this category:

- an absent policy means the domain's mail lands in spam;
- a present policy means nobody can write in the domain's name;
- `p=reject` means forging mail is impossible;
- a key that was not found means the domain's mail is unsigned;
- a receiving server's address on a list means the domain's mail does not arrive;
- a receiving host without a reverse name means trouble sending;
- `~all` means weak or incomplete protection.

Each of them sounds reasonable, and each connects what we observed to something we did not. They share one shape of error: a conclusion about the fate of messages is drawn from the state of a domain's records, while the fate of a message depends on the receiver, on the content and on the sending server, none of which we saw.

## 12.3. Wording for UNKNOWN

The rule in 1.0 §13 applies unchanged: `UNKNOWN` is described as "could not be checked", with no claim that the domain is faulty.

Two cases are explained plainly as a limitation of 2check rather than a property of the domain:

| Case | What is said |
|---|---|
| the DKIM selector is unknown | we do not know where to look for the key, and we list what was tried |
| outbound connections are unavailable | encryption cannot be checked in this deployment |

The message about an unknown selector offers to take one — the single place in the category where a reader can add to the check something that public data does not hold.

## 12.4. Wording for PASS

`PASS` does not become "everything is configured correctly" — 1.0 §13.

Two cases matter for this category. The "I accept no mail" record is described as a declared refusal of mail, not as a missing setting. A `p=quarantine` policy is described as in force, with no comparison to `p=reject`: the choice between them belongs to the owner and depends on how sure they are that their list of senders is complete.

## 12.5. Localization

The required languages are those of 1.0 §13: Russian, Uzbek and English. A missing translation remains a build error.

The Uzbek wording of this category must be read by a native speaker before release. The category introduces more terms than any other, and a mechanically correct translation of a term the industry uses differently reads as a mistake and undermines trust in everything else.

## 12.6. Acceptance Criteria

- **AC-12.1** A check's message describes what was read in the records, not the purpose of the mechanism.
- **AC-12.2** The list of forbidden causal claims in §12.2 is enforced by the message configuration check.
- **AC-12.3** No message in the category asserts anything about the fate of a message.
- **AC-12.4** An unknown selector and unavailable outbound connections are explained as a limitation of 2check.
- **AC-12.5** The message about an unknown selector lists the names tried and offers to take a selector.
- **AC-12.6** The "I accept no mail" record is described as a declared refusal, not as a missing setting.
- **AC-12.7** `p=quarantine` is described as a policy in force, with no comparison to `p=reject`.
- **AC-12.8** The Uzbek wording of the category is read by a native speaker before release.

---

<a id="section-13"></a>

# 13. Cache and Freshness

§13 defines the cache keys of the `email` category, how long entries live, and what may not be cached. The responsible section is 1.0 §14; the cache modes, the coalescing of concurrent requests and the staleness rules are not changed here.

## 13.1. Keys

A key is built separately for policies, for hosts and for blocklists.

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

```text
address
blocklistSetVersion
emailModuleConfigVersion
cacheContractVersion
```

`selector` is part of the policy key and is required for DKIM. Without it an answer for one selector would be reused for another, and a reader would be handed somebody else's key as their own.

`blocklistSetVersion` changes when the set of lists changes — §9. Changing the set devalues earlier answers: "not listed" refers to the lists that were asked, not to lists in general.

Language is not part of a key — 1.0 §14.

## 13.2. Lifetimes

| What is cached | Order of the lifetime |
|---|---|
| the SPF, DMARC and DKIM policies | hours |
| `MX` records and host addresses | hours |
| the result of the encryption probe | hours |
| a blocklist's answer | minutes |

Exact values are set by versioned configuration under the rules of 1.0 §20.

The lifetime for blocklists is short deliberately. A listing is a state an owner clears within minutes, and showing yesterday's listing as today's means accusing them of something they have already fixed.

The lifetime for the encryption probe is long for the opposite reason: it is the only check in the category that needs a connection, and the encryption settings of a mail host rarely change.

## 13.3. What May Not Be Cached

| What | Why |
|---|---|
| a list's refusal to serve a query | it is not an answer, and storing it as one turns it into a result — §9 |
| an incomplete DMARC tree walk | a result was not obtained; a negative result was not obtained either |
| an incomplete encryption probe | the same |
| a selector entered by the reader | it belongs to the request, not to the domain |

The last row matters: an entered selector does not make the result the domain's property. Another reader who names no selector must get `UNKNOWN`, not a ready answer found on somebody else's hint.

The rules for caching technical failures are otherwise those of 1.0 §14.

## 13.4. Freshness

`checkedAt` holds the time of the observation, not of the cache lookup — 1.0 §6.

For checks that query several sources — hosts in §7, lists in §9 — the time of observation is the earliest of the times that went into the result. A result is no fresher than its oldest part.

## 13.5. Acceptance Criteria

- **AC-13.1** A policy key includes the selector; for DKIM the selector is required.
- **AC-13.2** Changing the set of blocklists changes the key and devalues earlier answers.
- **AC-13.3** A list's refusal to serve a query is not written to the cache.
- **AC-13.4** An incomplete walk and an incomplete probe are not written to the cache as results.
- **AC-13.5** A result found through a selector entered by the reader is not reused for a request that names no selector.
- **AC-13.6** A blocklist answer's lifetime is shorter than that of the category's other entries.
- **AC-13.7** The observation time of a composite result is the earliest of the times of its parts.

---

<a id="section-14"></a>

# 14. Outbound Connection Safety

§14 defines the rules under which a connection to a mail host is permitted. The responsible section for address validation is 1.0 §15; its sequence, address classification and blocking rule are not changed here but extended to a new kind of connection.

## 14.1. Why This Needs a Section

Before this release the product made outbound connections of two kinds: queries to resolvers and HTTPS requests to the registry. Both go to fixed addresses set by configuration.

The encryption probe is built differently: it connects to a host whose name the domain under test supplied. This is the first time somebody else's record influences where we connect — and it is exactly the shape of thing 1.0 §15 exists to defend against.

## 14.2. The Sequence

The order in 1.0 §15 applies without exception:

```text
MailHostTarget
→ DNS A/AAAA
→ full candidate set
→ Security Validation
→ ALLOW | BLOCK | INDETERMINATE
→ selected validated endpoint
→ pinned connection
```

The host's full set of addresses is validated without prior truncation. If even one address is forbidden the whole host is blocked; dropping the forbidden address and connecting to the rest is not permitted — 1.0 §15.

The connection goes to the pinned address. The host name is not resolved again by the connection library.

## 14.3. What Is Held Fixed

| Constraint | Value |
|---|---|
| port | `25` only |
| source of host names | §6 only |
| session commands | the greeting, the request for extensions, the move to encryption, the close |
| hosts per check | no more than four — §7 |

The port is taken neither from the reader's input nor from the domain's records. An `MX` record holds a name and no port, and there is nowhere for one to come from — this row exists so that a future implementation does not "improve" the check with an arbitrary port.

The sender, recipient and data commands are never issued. The probe sends no mail and therefore cannot be used either to deliver messages or to test whether an address exists.

## 14.4. What This Rules Out

| Attempt | Why it fails |
|---|---|
| making the service connect to an internal address | a host's address is validated under 1.0 §15 like any other |
| swapping the address between validation and connection | the connection goes to the pinned address |
| using the service to scan ports | the port is fixed |
| using the service to amplify load | hosts come only from the records of the domain under test, and their number is bounded |
| sending mail through somebody else's hands | the data commands are never issued |

## 14.5. Our Own Infrastructure

The ban on reaching our own infrastructure — 1.0 §15 — extends to mail hosts unchanged.

Blocking for that reason gives `UNKNOWN` with an explanation that it is a limitation of the service, and does not reduce the domain's score. A check that calls our own network policy a defect of somebody's domain is wrong in both directions at once: it accuses the innocent and hides our own problem.

## 14.6. Time Budget

The probe is subject to the scan's shared budget in 1.0 §22. The category introduces no budget of its own.

The rule in §7 follows from that: hosts beyond the limit are listed as not probed rather than waiting for time to free up. A result obtained in part is reported as partial.

## 14.7. Acceptance Criteria

- **AC-14.1** A mail host's addresses pass the safety validation of 1.0 §15 as a full set, without truncation.
- **AC-14.2** A forbidden address blocks the whole host.
- **AC-14.3** The connection is made to the pinned address; re-resolving the name is not permitted.
- **AC-14.4** The connection port is `25` and cannot be set by input or by the domain's records.
- **AC-14.5** Host names come only from the result of §6.
- **AC-14.6** The session issues no sender, recipient or data commands.
- **AC-14.7** Blocking under the ban on our own infrastructure gives `UNKNOWN` and does not reduce the domain's score.
- **AC-14.8** The category introduces no time budget of its own.

---

<a id="appendix-a"></a>

# Appendix A. Responsible Sections

Each requirement has one responsible section. Where sections conflict, the provision in the responsible one applies.

| Subject | Responsible section |
|---|---|
| Release boundary | §1 |
| Check groups and the dependency on `MX` | §2 |

Requirements whose responsible section is in MVP 1.0 are not overridden by this document.
