# 4. DMARC

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/04-dmarc.md)
<!-- nav:end -->

[§4](04-dmarc.md#4-dmarc) defines the DMARC policy check: where the record is looked for, how it is recognized, what counts as a working policy, and how the check treats records written to the previous standard.

## 4.1. The Standard in Force

The check follows [RFC 9989](https://www.rfc-editor.org/rfc/rfc9989.html). Together with RFC 9990 and RFC 9991, it replaces RFC 7489.

The specification changes inherited-policy discovery, the set of tags, and reporting rules. In particular, discovery uses the DNS tree instead of a public suffix list, and the `pct` tag is no longer applied.

Records published under the previous specification are evaluated under the current rules. Possible differences in receiver behavior are described separately.

## 4.2. What Is Being Checked

What is checked is the domain's published policy, not the handling of a particular message. Alignment between the domains in the signature and in the envelope is a property of a message; without a message it is undefined and is not asserted.

## 4.3. Where the Record Is Looked For

The record is read from the `TXT` of the name `_dmarc` under the domain being checked.

If no applicable record is found, a parent-domain policy is sought under RFC 9989. The walk follows the stopping and policy-domain selection rules, including `psd` handling, and the eight-query limit with the specified shortening of long names. A usable inherited policy is determined by the standard's algorithm, not merely by the nearest record found. The responsible section for DNS queries is [1.0 §8](../prd/08-dns.md#8-dns-checks).

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

The addresses in `rua` and `ruf` belong to the domain's owner and are shown under the exposure rules of [1.0 §6](../prd/06-common-data-contracts-exposure.md#6-common-data-contracts-and-exposure-levels).

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

An incomplete walk gives `UNKNOWN`: not having reached the end, we do not know whether a policy exists further up. The rules for `reasonCode` and `blockedBy` are [1.0 §7](../prd/07-shared-status-dependency-category-scan-semantics.md#7-statuses-dependencies-and-scan-results).

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
