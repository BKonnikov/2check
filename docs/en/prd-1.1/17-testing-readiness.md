# 17. Testing and Release Readiness

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/17-testing-readiness.md)
<!-- nav:end -->

§17 defines what establishes that the requirements of this document are met, and the conditions under which the category is released. The responsible section for the testing strategy is 1.0 §26.

## 17.1. What Is Checked Without a Network

Parsing records, counting limits and choosing a status are pure functions over answers recorded in advance. They are covered by tests that touch no network, and that coverage is mandatory.

The required data sets:

| Set | What is in it |
|---|---|
| SPF records | the term limit exceeded, a loop, every form of `all`, void queries |
| DMARC records | the tree walk, an unrecognised record, several records, `pct` |
| DKIM keys | an empty key, a short key, testing mode, `ed25519` |
| `MX` records | a declared refusal of mail, an implicit host, an alias, an address in place of a name |

The set of DMARC records is the most important of the four. The tree walk is the only place where a check decides for itself which domain its find belongs to, and a mistake there produces not a wrong status but a right status about the wrong domain.

## 17.2. What Is Checked With a Network

The encryption probe needs a connection and is therefore checked separately, outside the mandatory build set. What does not depend on a network stays mandatory: the fixed port, the absence of data commands, the source of host names, and the behaviour when access is denied.

## 17.3. Release Conditions

The category is released when all of these hold:

- the tests of §16.1 are covered;
- the list of forbidden causal claims in §11.2 is enforced automatically;
- Uzbek wording is present for every message — §11;
- outbound connections to the mail port are available in the target deployment, or the category is released with an honest `UNKNOWN` for the encryption check — §7.

The last condition is written with a fork deliberately. An unavailable port is no reason to hold back six other checks, as long as the seventh says honestly that it cannot be performed.

## 17.4. What Is Checked by Hand

| What | Why it cannot be automatic |
|---|---|
| whether the messages are clear to an inexperienced reader | it needs a reader |
| the behaviour of the tool page on a phone | it needs a device — 1.0 §26 |

## 17.5. Acceptance Criteria

- **AC-17.1** Parsing records and choosing a status are covered by tests that touch no network.
- **AC-17.2** The DMARC data set contains a record at a parent domain, and a test confirms the source of the policy is reported correctly.
- **AC-17.3** The constraints of the encryption probe that do not depend on a network are covered by mandatory tests.
- **AC-17.4** The list of forbidden causal claims is enforced automatically.
- **AC-17.5** Release with an unavailable mail port is permitted given an honest `UNKNOWN` for the encryption check.

---
