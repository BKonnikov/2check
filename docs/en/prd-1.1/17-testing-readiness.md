# 17. Testing and Release Readiness

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/17-testing-readiness.md)
<!-- nav:end -->

[§17](17-testing-readiness.md#17-testing-and-release-readiness) defines what establishes that the requirements of this document are met, and the conditions under which the category is released. The responsible section for the testing strategy is [1.0 §26](../prd/26-testing-quality-gates-acceptance-strategy.md#26-testing-and-release-criteria).

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

- the tests of [§17.1](17-testing-readiness.md#171-what-is-checked-without-a-network) are covered;
- the list of forbidden causal claims in [§11.2](11-messages.md#112-forbidden-causal-claims) is enforced automatically;
- Uzbek wording is present for every message — [§11](11-messages.md#11-messages-and-localization);
- outbound connections to the mail port are available in the target deployment, or the category is released with `UNKNOWN` and an explanation of the deployment limitation for the encryption check — [§7](07-starttls.md#7-starttls).

An unavailable SMTP port does not block release of the other five checks. STARTTLS must then identify the deployment limitation without treating it as a domain defect.

## 17.4. What Is Checked by Hand

| Subject | Review Method |
|---|---|
| message clarity | reading by users without mail-administration experience |
| mobile interface | review on target devices and browsers from [1.0 §26](../prd/26-testing-quality-gates-acceptance-strategy.md#26-testing-and-release-criteria) |

Manual review supplements automated interface and accessibility checks.

## 17.5. Acceptance Criteria

- **AC-17.1** Parsing records and choosing a status are covered by tests that touch no network.
- **AC-17.2** The DMARC data set contains a record at a parent domain, and a test confirms the source of the policy is reported correctly.
- **AC-17.3** The constraints of the encryption probe that do not depend on a network are covered by mandatory tests.
- **AC-17.4** The list of forbidden causal claims is enforced automatically.
- **AC-17.5** Release with an unavailable mail port is permitted given `UNKNOWN` and an explanation of the deployment limitation for the encryption check.

---
