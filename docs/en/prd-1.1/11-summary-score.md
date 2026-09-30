# 11. Effect on the Summary, the Verdict and the Score

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/11-summary-score.md)
<!-- nav:end -->

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
