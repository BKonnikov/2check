# 4. DMARC

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/04-dmarc.md)
<!-- nav:end -->

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
