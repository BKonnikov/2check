# 18. Testing and Release Readiness

<!-- nav:start -->
[Concept](../01-concept.md) · [PRD 1.1 Contents](../03-prd-1.1.md) · [Русский](../../ru/prd-1.1/18-testing-readiness.md)
<!-- nav:end -->

§18 defines what establishes that the requirements of this document are met, and the conditions under which the category is released. The responsible section for the testing strategy is 1.0 §26.

## 18.1. What Is Checked Without a Network

Parsing records, counting limits and choosing a status are pure functions over answers recorded in advance. They are covered by tests that touch no network, and that coverage is mandatory.

The required data sets:

| Set | What is in it |
|---|---|
| SPF records | the term limit exceeded, a loop, every form of `all`, void queries |
| DMARC records | the tree walk, an unrecognised record, several records, `pct` |
| DKIM keys | an empty key, a short key, testing mode, `ed25519` |
| `MX` records | a declared refusal of mail, an implicit host, an alias, an address in place of a name |
| list answers | a hit, an absence, a refusal to serve the query |

The set of list answers is the most important of the five. A refusal is indistinguishable in form from a hit, and a test that contains one is the only thing keeping the mistake in §9 from coming back unnoticed.

## 18.2. What Is Checked With a Network

The encryption probe needs a connection and is therefore checked separately, outside the mandatory build set. What does not depend on a network stays mandatory: the fixed port, the absence of data commands, the source of host names, and the behaviour when access is denied.

## 18.3. Release Conditions

The category is released when all of these hold:

- the tests of §18.1 are covered;
- the list of forbidden causal claims in §12.2 is enforced automatically;
- the Uzbek wording has been read by a native speaker — §12;
- the set of blocklists holds only those that permit this use, with a link to the terms for each — §9;
- outbound connections to the mail port are available in the target deployment, or the category is released with an honest `UNKNOWN` for the encryption check — §7.

The last condition is written with a fork deliberately. An unavailable port is no reason to hold back six other checks, as long as the seventh says honestly that it cannot be performed.

## 18.4. What Is Checked by Hand

| What | Why it cannot be automatic |
|---|---|
| whether the messages are clear to an inexperienced reader | it needs a reader |
| the Uzbek wording | it needs a native speaker |
| the behaviour of the tool page on a phone | it needs a device — 1.0 §26 |

## 18.5. Acceptance Criteria

- **AC-18.1** Parsing records and choosing a status are covered by tests that touch no network.
- **AC-18.2** The data set of list answers contains a refusal, and a test confirms it is not read as an absence of a hit.
- **AC-18.3** The constraints of the encryption probe that do not depend on a network are covered by mandatory tests.
- **AC-18.4** The list of forbidden causal claims is enforced automatically.
- **AC-18.5** Release without Uzbek wording read by a native speaker is not permitted.
- **AC-18.6** Release with an unavailable mail port is permitted given an honest `UNKNOWN` for the encryption check.

---
