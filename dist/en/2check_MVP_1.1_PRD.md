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

<a id="appendix-a"></a>

# Appendix A. Responsible Sections

Each requirement has one responsible section. Where sections conflict, the provision in the responsible one applies.

| Subject | Responsible section |
|---|---|
| Release boundary | §1 |
| Check groups and the dependency on `MX` | §2 |

Requirements whose responsible section is in MVP 1.0 are not overridden by this document.
