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

<a id="appendix-a"></a>

# Appendix A. Responsible Sections

Each requirement has one responsible section. Where sections conflict, the provision in the responsible one applies.

| Subject | Responsible section |
|---|---|
| Release boundary | §1 |
| Check groups and the dependency on `MX` | §2 |

Requirements whose responsible section is in MVP 1.0 are not overridden by this document.
