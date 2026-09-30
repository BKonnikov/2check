# 10. Effect on the Summary, the Verdict and the Score

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/10-summary-score.md)
<!-- nav:end -->

[§10](10-summary-score.md#10-effect-on-the-summary-the-verdict-and-the-score) defines how the results of the `email` category enter the summary and the numerical score. The responsible sections are [1.0 §11](../prd/11-domain-health-summary-issues.md#11-domain-health-summary-and-identified-issues) and [1.0 §12](../prd/12-domain-health-score.md#12-domain-health-score); the rules for the verdict, for confidence and the scoring formula are not changed here.

## 10.1. What Changes and What Does Not

The MVP 1.0 score is the base score minus Issue penalties. Adding a category changes neither the formula nor a division of weight between categories.

The `email` category creates Issues under the common rules. Multiple findings with one established cause are merged as specified in [§10.3](10-summary-score.md#103-merging-issues-inside-the-category).

## 10.2. A Domain That Sends No Mail

A domain may explicitly declare that it neither receives nor sends mail. This intent is identified from the combination:

| Sign | Value |
|---|---|
| `MX` | valid Null MX |
| SPF | `-all` with no permitting mechanisms |
| DMARC | `p=reject` |

This combination does not automatically assign `PASS` to every check:

- valid SPF and MX declarations receive `PASS`;
- DMARC is assessed under [§4](04-dmarc.md#4-dmarc), including additional conditions;
- STARTTLS and PTR receive `NOT_APPLICABLE` under [§2](02-check-groups-dependencies.md#2-check-groups-and-the-dependency-on-mx);
- DKIM is assessed under [§5](05-dkim.md#5-dkim); an unfound key without an explicit selector remains `UNKNOWN`.

The refusal of mail itself and inapplicable server checks create no penalties. Confirmed defects in published records remain reportable. An uncertain result reduces confidence under [§10.4](10-summary-score.md#104-effect-on-confidence).

An incomplete combination does not establish a refusal of mail; the ordinary rules of [§3](03-spf.md#3-spf)–[§8](08-ptr.md#8-ptr) apply.

## 10.3. Merging Issues Inside the Category

The merging rules are [1.0 §11](../prd/11-domain-health-summary-issues.md#11-domain-health-summary-and-identified-issues): one root defect gives one Issue and one penalty, and merging is permitted only inside a category.

The following merges are defined for this category:

| Root defect | What is merged |
|---|---|
| the domain declared no sending policy | an absent SPF and an absent DMARC |
| no receiving server was found | the `MX` result and everything it blocked |
| a policy is published but does not work | several records, an unrecognized record, a parse error |

Merging absent SPF and DMARC is an assessment rule of 2check: absence of both policies creates one Issue. It does not make the mechanisms functionally interchangeable. Errors in separate published policies are merged only when a shared cause is established.

Merging with the `dns`, `registry` and `tls` categories is not permitted — [1.0 §11](../prd/11-domain-health-summary-issues.md#11-domain-health-summary-and-identified-issues).

## 10.4. Effect on Confidence

This category produces `UNKNOWN` more often than the others, and the reasons are listed in [§3](03-spf.md#3-spf)–[§8](08-ptr.md#8-ptr). The substantial one is an unknown DKIM selector: it arises for any domain whose mail provider is unknown to us.

The rule in [1.0 §11](../prd/11-domain-health-summary-issues.md#11-domain-health-summary-and-identified-issues) is not softened for it: `UNKNOWN` makes the category's completeness `PARTIAL`, confidence `REDUCED`, and the verdict in the absence of issues `NO_CONFIRMED_ISSUES_INCOMPLETE` rather than `HEALTHY`.

An incomplete check of the published key cannot establish a fully verified category result. Verification of an individual message's signature is outside this release.

## 10.5. Penalty Values

The category introduces no penalty values of its own: the values in [1.0 §12](../prd/12-domain-health-score.md#12-domain-health-score) apply, by severity. The severities are assigned in [§3](03-spf.md#3-spf)–[§8](08-ptr.md#8-ptr).

## 10.6. Acceptance Criteria

- **AC-10.1** Adding the category changes neither the scoring formula nor the division of shares between categories.
- **AC-10.2** The combination of Null MX, `-all` with no permitting mechanisms, and `p=reject` does not assign `PASS` to all checks: STARTTLS and PTR retain `NOT_APPLICABLE`, DKIM is assessed under [§5](05-dkim.md#5-dkim), and DMARC under [§4](04-dmarc.md#4-dmarc).
- **AC-10.3** A partial match of the combination does not establish a refusal of mail; the ordinary check rules remain in effect.
- **AC-10.4** An absent SPF and an absent DMARC merge into one Issue with one penalty.
- **AC-10.5** Results blocked by an absent receiving server create no Issue of their own.
- **AC-10.6** Merging an `email` Issue with another category is rejected by the configuration check.
- **AC-10.7** `UNKNOWN` in this category reduces confidence under the rules of [1.0 §11](../prd/11-domain-health-summary-issues.md#11-domain-health-summary-and-identified-issues) and is not softened.
- **AC-10.8** The category introduces no penalty values of its own.

---
